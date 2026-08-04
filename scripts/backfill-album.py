#!/usr/bin/env python3
"""Backfill gym-log.json from iCloud Rise shared album screenshots."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import urllib.request
from collections import defaultdict
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GYM_LOG = ROOT / "data/sessions/gym-log.json"
WEBSTREAM_CACHE = ROOT / "data/album-webstream.json"
IMAGE_CACHE = ROOT / "tmp/album/cache"
TOKEN = "B22GWZuqDHkpFVq"
HOST = "p126-sharedstreams.icloud.com"

NAME_FIX = {
    "바별": "바벨",
    "바델": "바벨",
    "답스": "딥스",
    "편들레이": "펜들레이",
    "트라이밥스": "트라이셉스",
    "인플라인": "인클라인",
    "오버 헤드": "오버헤드",
    "오버헤드 프레스": "바벨 오버헤드 프레스",
}

SET_RE = re.compile(r"(\d+(?:\.\d+)?)\s*[*x×X]\s*(\d+)")
DATE_RE = re.compile(r"(\d{2})\.(\d{1,2})\.(\d{1,2})")
VOL_RE = re.compile(r"([\d,]+)\s*kg")
REPS_ONLY = re.compile(r"^\d{1,2}$")

READER = None


def get_reader():
    global READER
    if READER is None:
        import easyocr

        READER = easyocr.Reader(["ko", "en"], gpu=False, verbose=False)
    return READER


def fetch_webstream(force: bool = False) -> dict:
    if WEBSTREAM_CACHE.exists() and not force:
        return json.loads(WEBSTREAM_CACHE.read_text())
    req = urllib.request.Request(
        f"https://{HOST}/{TOKEN}/sharedstreams/webstream",
        data=b'{"streamCtag":null}',
        method="POST",
        headers={
            "Content-Type": "text/plain",
            "User-Agent": "Photos/5.0 (Macintosh; OS X 10.15.4) AppleWebKit/605.1.15",
        },
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        data = json.load(r)
    WEBSTREAM_CACHE.write_text(json.dumps(data, ensure_ascii=False))
    return data


def pick_rise_detail(photos: list) -> tuple[dict, dict] | tuple[None, None]:
    cands = []
    for p in photos:
        for deriv in p.get("derivatives", {}).values():
            fs = int(deriv.get("fileSize", 0) or 0)
            h = int(deriv.get("height", 0) or 0)
            w = int(deriv.get("width", 0) or 0)
            if 120_000 <= fs <= 450_000 and h >= 1100 and w >= 900:
                cands.append((abs(fs - 220_000), p, deriv))
    if not cands:
        return None, None
    cands.sort(key=lambda x: x[0])
    return cands[0][1], cands[0][2]


def download_photo(photo: dict, deriv: dict, dest: Path) -> None:
    if dest.exists() and dest.stat().st_size > 10_000:
        return
    dest.parent.mkdir(parents=True, exist_ok=True)
    body = json.dumps({"photoGuids": [photo["photoGuid"]]}).encode()
    req = urllib.request.Request(
        f"https://{HOST}/{TOKEN}/sharedstreams/webasseturls",
        data=body,
        method="POST",
        headers={"Content-Type": "text/plain"},
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        assets = json.load(r)
    item = assets["items"][deriv["checksum"]]
    url = f"https://{item['url_location']}{item['url_path']}"
    subprocess.run(["curl", "-sL", url, "-o", str(dest)], check=True, timeout=120)


def ocr_image(path: Path) -> list[str]:
    lines = get_reader().readtext(str(path), detail=0, paragraph=False)
    return [ln.strip() for ln in lines if ln and ln.strip()]


def normalize_name(name: str) -> str:
    n = name.strip()
    for a, b in NAME_FIX.items():
        n = n.replace(a, b)
    n = re.sub(r"\s+", " ", n)
    return n


def parse_rise_date(lines: list[str]) -> str | None:
    for ln in lines[:8]:
        m = DATE_RE.search(ln.replace(" ", ""))
        if m:
            y, mo, d = m.groups()
            return f"20{y}-{int(mo):02d}-{int(d):02d}"
    return None


def parse_meta(lines: list[str]) -> dict:
    meta = {"durationMin": None, "totalSets": None, "totalVolumeKg": None, "title": "운동"}
    for ln in lines:
        if "운동" in ln and len(ln) < 20:
            meta["title"] = ln
        if ln.endswith("분") and meta["durationMin"] is None:
            m = re.search(r"(\d+)", ln)
            if m:
                meta["durationMin"] = int(m.group(1))
        if "세트" in ln and meta["totalSets"] is None:
            m = re.search(r"(\d+)", ln)
            if m:
                meta["totalSets"] = int(m.group(1))
        m = VOL_RE.search(ln)
        if m and meta["totalVolumeKg"] is None:
            meta["totalVolumeKg"] = int(m.group(1).replace(",", ""))
    return meta


def infer_type(names: list[str]) -> str:
    text = " ".join(names)
    if re.search(r"스내치|클린|저크|인상|용상|역도", text):
        return "Olympic"
    if re.search(r"스쿼트|레그|런지|프레스|익스텐션|컬|힙|데드", text) and re.search(
        r"스쿼트|레그 프레스|수평|익스텐션|힙", text
    ):
        if re.search(r"벤치|체스트|플라이|딥스|푸시|트라이|오버헤드 프레스", text):
            pass
        else:
            return "Leg"
    if re.search(r"벤치|체스트|플라이|딥스|푸시|트라이|오버헤드 프레스|숄더", text):
        return "Push"
    if re.search(r"풀|로우|랫|데드|펜들레이|페이스", text):
        return "Pull"
    return "Pull"


def parse_exercises(lines: list[str]) -> list[dict]:
    exercises = []
    i = 0
    while i < len(lines):
        ln = lines[i]
        if SET_RE.search(ln.replace(" ", "")):
            i += 1
            continue
        if re.search(r"\d+세트|\d+회", ln) or ln in {"RISE", "오전 운동", "오후 운동"}:
            i += 1
            continue
        if DATE_RE.search(ln.replace(" ", "")) or ln.endswith("분") or "Cal" in ln:
            i += 1
            continue
        if not re.search(r"[가-힣]", ln):
            i += 1
            continue

        name_parts = [ln]
        j = i + 1
        while j < len(lines) and not SET_RE.search(lines[j].replace(" ", "")):
            nxt = lines[j]
            if re.search(r"\d+세트|\d+회", nxt) or DATE_RE.search(nxt.replace(" ", "")):
                break
            if re.search(r"[가-힣]", nxt) and not REPS_ONLY.match(nxt):
                if len(nxt) < 30:
                    name_parts.append(nxt)
                    j += 1
                    continue
            break
        name = normalize_name(" ".join(name_parts))
        if len(name) < 2:
            i += 1
            continue

        sets = []
        k = j
        while k < len(lines):
            tok = lines[k].replace(" ", "")
            m = SET_RE.search(tok)
            if m:
                kg, reps = float(m.group(1)), int(m.group(2))
                sets.append({"kg": int(kg) if kg == int(kg) else kg, "reps": reps})
                k += 1
                continue
            if REPS_ONLY.match(lines[k]) and not sets:
                # bodyweight block starting
                while k < len(lines) and REPS_ONLY.match(lines[k]):
                    sets.append({"kg": 0, "reps": int(lines[k])})
                    k += 1
                break
            if re.search(r"[가-힣]{2,}", lines[k]) and k > j:
                break
            if SET_RE.search(lines[k].replace(" ", "")):
                k += 1
                continue
            if re.search(r"\d+세트", lines[k]):
                k += 1
                continue
            k += 1
            if len(sets) >= 12:
                break

        if sets:
            ex = {"name": name, "sets": sets}
            kgs = [s["kg"] for s in sets if s["kg"] > 0 and s["reps"] > 0]
            if kgs:
                top = max(kgs)
                at_top = [s for s in sets if s["kg"] == top and s["reps"] > 0]
                if at_top:
                    best = max(at_top, key=lambda s: s["reps"])
                    ex["workingHighlight"] = f"{best['kg']}×{best['reps']}"
            elif sets:
                ex["workingHighlight"] = f"총 {sum(s['reps'] for s in sets)}회"
            exercises.append(ex)
        i = max(k, i + 1)

    return exercises


def session_from_lines(lines: list[str], date: str) -> dict | None:
    exercises = parse_exercises(lines)
    if not exercises:
        return None
    meta = parse_meta(lines)
    names = [e["name"] for e in exercises]
    stype = infer_type(names)
    vol = meta["totalVolumeKg"]
    if vol is None:
        vol = sum(s["kg"] * s["reps"] for e in exercises for s in e["sets"])
    return {
        "id": f"gym-{date}",
        "date": date,
        "type": stype,
        "title": meta["title"],
        "durationMin": meta["durationMin"],
        "totalSets": meta["totalSets"] or sum(len(e["sets"]) for e in exercises),
        "totalVolumeKg": vol,
        "exercises": exercises,
        "source": "album-backfill",
    }


def backfill(
    from_date: str | None,
    to_date: str | None,
    skip_existing: bool = True,
    limit: int | None = None,
) -> tuple[int, int]:
    stream = fetch_webstream()
    by_date: dict[str, list] = defaultdict(list)
    for p in stream["photos"]:
        by_date[p["dateCreated"][:10]].append(p)

    gym = json.loads(GYM_LOG.read_text())
    existing = {s["date"]: s for s in gym["sessions"]}
    added = 0
    skipped = 0

    dates = sorted(by_date.keys())
    if from_date:
        dates = [d for d in dates if d >= from_date]
    if to_date:
        dates = [d for d in dates if d <= to_date]

    for idx, date in enumerate(dates):
        if limit is not None and added >= limit:
            break
        if skip_existing and date in existing:
            skipped += 1
            continue
        photo, deriv = pick_rise_detail(by_date[date])
        if not photo:
            print(f"skip {date}: no detail screenshot", file=sys.stderr)
            continue
        img = IMAGE_CACHE / f"{date}.jpg"
        try:
            download_photo(photo, deriv, img)
            lines = ocr_image(img)
            session = session_from_lines(lines, date)
        except Exception as e:
            print(f"fail {date}: {e}", file=sys.stderr)
            continue
        if not session:
            print(f"skip {date}: parse failed", file=sys.stderr)
            continue
        existing[date] = session
        added += 1
        if added % 10 == 0:
            print(f"progress {added} added ({date})", file=sys.stderr)

    gym["sessions"] = sorted(existing.values(), key=lambda s: s["date"])
    gym["note"] = (
        f"Rise 공유앨범 backfill · {len(gym['sessions'])}세션 · "
        f"앨범 {len(stream.get('photos', []))}장"
    )
    GYM_LOG.write_text(json.dumps(gym, ensure_ascii=False, indent=2) + "\n")
    return added, skipped


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--from", dest="from_date", default="2024-07-01")
    ap.add_argument("--to", dest="to_date", default="2026-12-31")
    ap.add_argument("--force-refetch", action="store_true")
    ap.add_argument("--include-existing", action="store_true")
    ap.add_argument("--limit", type=int, default=None)
    args = ap.parse_args()
    if args.force_refetch:
        fetch_webstream(force=True)
    added, skipped = backfill(
        args.from_date,
        args.to_date,
        skip_existing=not args.include_existing,
        limit=args.limit,
    )
    print(json.dumps({"added": added, "skipped_existing": skipped, "total": added + skipped}))


if __name__ == "__main__":
    main()
