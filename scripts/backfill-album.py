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
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GYM_LOG = ROOT / "data/sessions/gym-log.json"
WEBSTREAM_CACHE = ROOT / "data/album-webstream.json"
IMAGE_CACHE = ROOT / "tmp/album/cache"
TOKEN = "B22GWZuqDHkpFVq"
HOST = "p126-sharedstreams.icloud.com"

NAME_FIX = {
    "바별": "바벨",
    "바빛": "바벨",
    "바델": "바벨",
    "답스": "딥스",
    "담벌": "덤벨",
    "덥벌": "덤벨",
    "편들레이": "펜들레이",
    "트라이밥스": "트라이셉스",
    "인플라인": "인클라인",
    "오버 헤드": "오버헤드",
    "오버헤드 프레스": "바벨 오버헤드 프레스",
    "쓸더": "숄더",
    "테이즈": "레이즈",
    "레이주": "레이즈",
    "데피섯": "디피티",
    "데드리퍽": "데드리프트",
    "폐이스": "페이스",
    "머신-": "머신 ",
    "뒤신": "머신",
    "퍼신": "머신",
    "햇-": "랫 ",
    "스랜딩": "스트랜딩",
    "덤빛": "덤벨",
    "팀벌": "덤벨",
    "친 업": "친업",
    "풀업": "풀 업",
    "레터럽": "레터럴",
    "런넣": "런닝",
    "런갈": "런닝",
}

JUNK_NAME = re.compile(
    r"총 운동|리포트|요일별|월 리포트|^\d+초$|^\d+분|분\s*\d+초|km$|위크 \d|인출라인 런|라이프 리셋|일립티컬|런닝머신|실내 자전거",
    re.I,
)

SET_RE = re.compile(r"(\d+(?:\.\d+)?)\s*[*x×X]\s*(\d+)")
DATE_RE = re.compile(r"(\d{2})\.(\d{1,2})\.(\d{1,2})")
VOL_RE = re.compile(r"^['\"]?[\d,.]+\s*kg", re.I)
REPS_ONLY = re.compile(r"^\d{1,2}$")
META_SETS = re.compile(r"^\d+\s*세트[*'Xx×\s]*$")
META_REPS = re.compile(r"^\d+\s*회$")
SUMMARY_INLINE_RE = re.compile(
    r"(?P<sets>\d+)\s*세트\s*[x×X*]?\s*(?:(?P<kg>\d+(?:\.\d+)?)\s*(?:kg|k8|ke))?\s*[x×X*스]?\s*(?P<reps>\d+)\s*회",
    re.I,
)
PREFIX_SETS_NAME_RE = re.compile(r"^(?P<sets>\d+)\s*세트\s+(?P<name>.+)$")
KG_ONLY_RE = re.compile(r"^['\"]?(?P<kg>\d+(?:\.\d+)?)\s*kg$", re.I)
DURATION_MIN_RE = re.compile(r"(?:(?P<h>\d+)\s*시간)?\s*(?P<m>\d+)\s*분")

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


def rank_rise_details(photos: list) -> list[tuple[dict, dict]]:
    """Rank likely Rise detail screenshots (best first)."""
    cands: list[tuple[int, dict, dict]] = []
    for p in photos:
        for deriv in p.get("derivatives", {}).values():
            fs = int(deriv.get("fileSize", 0) or 0)
            h = int(deriv.get("height", 0) or 0)
            w = int(deriv.get("width", 0) or 0)
            # Portrait detail (~1200h) or landscape detail (~700h, full width)
            portrait = h >= 900 and w >= 900
            landscape = w >= 1100 and 650 <= h <= 1000
            if not (portrait or landscape):
                continue
            if fs < 90_000:
                continue
            # Prefer workout detail screens over large mirror selfies
            if fs > 600_000:
                continue
            if landscape:
                # Landscape detail screens often hold full set rows.
                score = abs(fs - 120_000) - 50_000
            else:
                score = abs(fs - 210_000) + abs(h - 1200) * 50
                if fs > 520_000:
                    score += 80_000
            cands.append((score, p, deriv))
    if not cands:
        # Fallback: tallest/largest non-tiny image
        for p in photos:
            for deriv in p.get("derivatives", {}).values():
                fs = int(deriv.get("fileSize", 0) or 0)
                h = int(deriv.get("height", 0) or 0)
                w = int(deriv.get("width", 0) or 0)
                if min(h, w) >= 650 and fs < 650_000:
                    cands.append((abs(fs - 210_000), p, deriv))
    if not cands:
        return []
    cands.sort(key=lambda x: x[0])
    # De-duplicate by checksum to avoid trying same image repeatedly.
    out: list[tuple[dict, dict]] = []
    seen: set[str] = set()
    for _, p, d in cands:
        key = d.get("checksum")
        if key in seen:
            continue
        seen.add(key)
        out.append((p, d))
    return out


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


def parse_set_line(ln: str) -> dict | None:
    tok = ln.replace(" ", "")
    m = SET_RE.search(tok)
    if not m:
        return None
    kg, reps = float(m.group(1)), int(m.group(2))
    if kg > 500 and reps <= 5:
        return None  # OCR noise like 1100x3 km
    return {"kg": int(kg) if kg == int(kg) else kg, "reps": reps}


def is_header_line(ln: str) -> bool:
    if ln in {"RISE", "오전 운동", "오후 운동"}:
        return True
    if DATE_RE.search(ln.replace(" ", "")):
        return True
    if re.match(r"^\d{1,2}[\.:]\d{2}$", ln):
        return True
    if DURATION_MIN_RE.fullmatch(ln.replace(" ", "")) or (
        ln.endswith("분") and "위크" not in ln and "세트" not in ln
    ):
        return True
    if "Cal" in ln:
        return True
    if VOL_RE.match(ln) and "(" in ln:
        return True
    return False


def is_meta_line(ln: str) -> bool:
    if META_SETS.match(ln) or META_REPS.match(ln):
        return True
    if VOL_RE.match(ln):
        return True
    if ln.startswith("(+"):
        return True
    if ln in {"X", "x", "*", "×"}:
        return True
    return False


def is_exercise_name(ln: str) -> bool:
    if not re.search(r"[가-힣]", ln):
        return False
    if is_header_line(ln) or is_meta_line(ln):
        return False
    if parse_set_line(ln):
        return False
    if REPS_ONLY.match(ln):
        return False
    if re.search(r"^\d+\s*회", ln):
        return False
    if re.match(r"^[Xx×*]", ln):
        return False
    if re.search(r"\d+\s*m$", ln, re.I):
        return False
    if len(ln) > 40:
        return False
    if JUNK_NAME.search(ln):
        return False
    return True


def working_highlight(sets: list[dict]) -> str | None:
    kgs = [s["kg"] for s in sets if s["kg"] > 0 and s["reps"] > 0]
    if kgs:
        top = max(kgs)
        at_top = [s for s in sets if s["kg"] == top and s["reps"] > 0]
        if at_top:
            best = max(at_top, key=lambda s: s["reps"])
            return f"{best['kg']}×{best['reps']}"
    bw = [s for s in sets if s["kg"] == 0 and s["reps"] > 0]
    if bw:
        return f"총 {sum(s['reps'] for s in bw)}회"
    return None


def parse_summary_inline(ln: str) -> list[dict]:
    m = SUMMARY_INLINE_RE.search(ln.replace(" ", ""))
    if not m:
        return []
    count = int(m.group("sets"))
    reps = int(m.group("reps"))
    kg_text = m.group("kg")
    kg = float(kg_text) if kg_text is not None else 0
    if count <= 0 or count > 20 or reps <= 0 or reps > 50:
        return []
    if kg > 500:
        return []
    kg_value = int(kg) if kg == int(kg) else kg
    return [{"kg": kg_value, "reps": reps} for _ in range(count)]


def parse_header_blocks(lines: list[str]) -> list[dict] | None:
    """Rise 2-column headers: name/N세트/vol repeated, then set rows."""
    i = 0
    n = len(lines)
    while i < n and (is_header_line(lines[i]) or is_meta_line(lines[i]) or not is_exercise_name(lines[i])):
        if parse_set_line(lines[i]) or REPS_ONLY.match(lines[i]):
            return None
        i += 1
    if i >= n:
        return None

    headers: list[tuple[str, int]] = []
    while i < n:
        if parse_set_line(lines[i]) or REPS_ONLY.match(lines[i]):
            break
        if not is_exercise_name(lines[i]):
            if is_meta_line(lines[i]) or is_header_line(lines[i]):
                i += 1
                continue
            break
        name = normalize_name(lines[i])
        i += 1
        count = None
        while i < n and is_meta_line(lines[i]):
            m = META_SETS.match(lines[i]) or re.match(r"^(\d+)\s*세트", lines[i])
            if m and count is None:
                count = int(re.search(r"\d+", lines[i]).group())
            i += 1
        if count:
            headers.append((name, count))
        else:
            return None
        # Stop header scan once we have at least 1 and next looks like sets
        if i < n and (parse_set_line(lines[i]) or REPS_ONLY.match(lines[i])):
            break

    if len(headers) < 1:
        return None

    sets: list[dict] = []
    while i < n:
        if is_exercise_name(lines[i]) and sets:
            break
        parsed = parse_set_line(lines[i])
        if parsed:
            sets.append(parsed)
            i += 1
            continue
        if REPS_ONLY.match(lines[i]):
            sets.append({"kg": 0, "reps": int(lines[i])})
            i += 1
            continue
        if is_meta_line(lines[i]) or is_header_line(lines[i]):
            i += 1
            continue
        if sets:
            break
        i += 1

    if not sets:
        return None

    exercises = []
    offset = 0
    for name, count in headers:
        part = sets[offset : offset + count]
        offset += count
        if not part:
            continue
        if JUNK_NAME.search(name) or len(name) < 2:
            continue
        ex = {"name": name, "sets": part}
        wh = working_highlight(part)
        if wh:
            ex["workingHighlight"] = wh
        exercises.append(ex)
    if offset < len(sets) and exercises:
        exercises[-1]["sets"].extend(sets[offset:])
        wh = working_highlight(exercises[-1]["sets"])
        if wh:
            exercises[-1]["workingHighlight"] = wh
    return exercises or None


def parse_exercises(lines: list[str]) -> list[dict]:
    header_ex = parse_header_blocks(lines)
    if header_ex and len(header_ex) >= 2:
        return header_ex

    exercises = []
    i = 0
    n = len(lines)

    while i < n:
        while i < n and not is_exercise_name(lines[i]):
            i += 1
        if i >= n:
            break

        names: list[str] = []
        while i < n and is_exercise_name(lines[i]):
            names.append(normalize_name(lines[i]))
            i += 1

        set_counts: list[int] = []
        while i < n and is_meta_line(lines[i]):
            m = META_SETS.match(lines[i])
            if m:
                set_counts.append(int(re.search(r"\d+", lines[i]).group()))
            i += 1

        sets: list[dict] = []
        while i < n:
            if is_exercise_name(lines[i]):
                break
            parsed = parse_set_line(lines[i])
            if parsed:
                sets.append(parsed)
                i += 1
                continue
            if REPS_ONLY.match(lines[i]):
                sets.append({"kg": 0, "reps": int(lines[i])})
                i += 1
                continue
            if is_meta_line(lines[i]):
                i += 1
                continue
            if sets:
                break
            i += 1

        if not sets:
            continue

        chunks: list[tuple[str, list[dict]]] = []
        if len(names) > 1 and len(set_counts) >= len(names):
            offset = 0
            for idx, name in enumerate(names):
                count = set_counts[idx] if idx < len(set_counts) else 0
                if count <= 0:
                    continue
                part = sets[offset : offset + count]
                offset += count
                if part:
                    chunks.append((name, part))
            if offset < len(sets) and chunks:
                chunks[-1] = (chunks[-1][0], chunks[-1][1] + sets[offset:])
        elif len(names) > 1:
            split = len(sets)
            seen_weight = False
            for idx, s in enumerate(sets):
                if s["kg"] > 0:
                    seen_weight = True
                elif seen_weight and s["kg"] == 0:
                    split = idx
                    break
            if 0 < split < len(sets):
                chunks = [(names[0], sets[:split]), (names[1], sets[split:])]
            else:
                mid = len(sets) * len(names[0]) // max(sum(len(x) for x in names), 1)
                mid = max(1, min(mid, len(sets) - 1)) if len(sets) > 1 else len(sets)
                chunks = [(names[0], sets[:mid]), (names[1], sets[mid:])]
        elif names:
            chunks = [(names[0], sets)]

        for name, part in chunks:
            if not part or JUNK_NAME.search(name) or len(name) < 2:
                continue
            if name in {"0 회", "회"}:
                continue
            ex = {"name": name, "sets": part}
            wh = working_highlight(part)
            if wh:
                ex["workingHighlight"] = wh
            exercises.append(ex)

    if header_ex and (not exercises or len(header_ex) > len(exercises)):
        return header_ex
    return exercises


def is_valid_exercise_name(name: str) -> bool:
    if len(name) < 2:
        return False
    if JUNK_NAME.search(name):
        return False
    if re.match(r"^[Xx×*'\"0-9]", name):
        return False
    if re.search(r"\d+\s*m$", name, re.I):
        return False
    if re.search(r"^\d+\s*회", name):
        return False
    if not re.search(r"[가-힣]", name):
        return False
    return True


def parse_prefix_sets_name(lines: list[str]) -> list[dict]:
    """Parse compact lines like '4세트 데드 행 스트레칭' / '8세트 풀업'."""
    exercises = []
    for ln in lines:
        m = PREFIX_SETS_NAME_RE.match(ln.strip())
        if not m:
            continue
        count = int(m.group("sets"))
        name = normalize_name(m.group("name"))
        if count <= 0 or count > 20 or not is_valid_exercise_name(name):
            continue
        sets = [{"kg": 0, "reps": 1} for _ in range(count)]
        ex = {"name": name, "sets": sets, "workingHighlight": f"{count}세트"}
        exercises.append(ex)
    return exercises


def parse_loose_summary_exercises(lines: list[str]) -> list[dict]:
    """Parse split OCR blocks: name / N세트 / kg / X / N회."""
    exercises = []
    i = 0
    n = len(lines)
    while i < n:
        if not is_exercise_name(lines[i]):
            i += 1
            continue
        name = normalize_name(lines[i])
        if JUNK_NAME.search(name):
            i += 1
            continue

        j = i + 1
        count = None
        kg = None
        reps = None
        while j < n and j <= i + 6:
            tok = lines[j].strip()
            if is_exercise_name(tok) and j > i + 1:
                break
            m_sets = META_SETS.match(tok) or re.match(r"^(\d+)\s*세트", tok)
            if m_sets and count is None:
                count = int(re.search(r"\d+", tok).group())
                j += 1
                continue
            m_kg = KG_ONLY_RE.match(tok.replace(" ", ""))
            if m_kg and kg is None:
                kg = float(m_kg.group("kg"))
                j += 1
                continue
            m_reps = META_REPS.match(tok) or re.match(r"^(\d+)\s*회$", tok)
            if m_reps and reps is None:
                reps = int(re.search(r"\d+", tok).group())
                j += 1
                continue
            if tok in {"X", "x", "*", "×"}:
                j += 1
                continue
            # Merged inline summary on following lines
            inline = parse_summary_inline(tok)
            if inline:
                count = len(inline)
                kg = inline[0]["kg"]
                reps = inline[0]["reps"]
                j += 1
                break
            if count is not None and (kg is not None or reps is not None):
                break
            j += 1

        if count and (reps is not None or kg is not None):
            kg_value = 0 if kg is None else (int(kg) if kg == int(kg) else kg)
            rep_value = reps if reps is not None else 0
            if rep_value <= 0 and kg_value <= 0:
                i += 1
                continue
            if rep_value <= 0:
                rep_value = 1
            sets = [{"kg": kg_value, "reps": rep_value} for _ in range(min(count, 20))]
            ex = {"name": name, "sets": sets}
            wh = working_highlight(sets)
            if wh:
                ex["workingHighlight"] = wh
            exercises.append(ex)
            i = max(j, i + 1)
            continue
        i += 1
    return exercises


def parse_summary_style_exercises(lines: list[str]) -> list[dict]:
    exercises = []
    i = 0
    n = len(lines)
    while i < n - 1:
        name = normalize_name(lines[i])
        next_ln = lines[i + 1]
        if not is_exercise_name(lines[i]):
            i += 1
            continue
        if JUNK_NAME.search(name):
            i += 1
            continue

        sets = parse_summary_inline(next_ln)
        if not sets and i + 2 < n:
            # Some OCR splits "140 kg" and "3회" across lines.
            merged = f"{lines[i + 1]} {lines[i + 2]}"
            sets = parse_summary_inline(merged)
            if sets:
                i += 1
        if not sets and i + 3 < n:
            merged = f"{lines[i + 1]} {lines[i + 2]} {lines[i + 3]}"
            sets = parse_summary_inline(merged)
            if sets:
                i += 2
        if not sets:
            i += 1
            continue

        ex = {"name": name, "sets": sets}
        wh = working_highlight(sets)
        if wh:
            ex["workingHighlight"] = wh
        exercises.append(ex)
        i += 2

    if len(exercises) < 2:
        for ex in parse_loose_summary_exercises(lines):
            if ex["name"] not in {e["name"] for e in exercises}:
                exercises.append(ex)
    if not exercises:
        exercises.extend(parse_prefix_sets_name(lines))
    return exercises


def is_junk_exercise_name(name: str) -> bool:
    return bool(JUNK_NAME.search(name))


def is_junk_session(session: dict) -> bool:
    names = [e.get("name", "") for e in session.get("exercises", [])]
    return bool(names) and all(is_junk_exercise_name(name) for name in names)


def parse_meta(lines: list[str]) -> dict:
    meta = {"durationMin": None, "totalSets": None, "totalVolumeKg": None, "title": "운동"}
    seen_kg: list[int] = []
    for ln in lines:
        if "운동" in ln and len(ln) < 20:
            meta["title"] = ln
        if meta["durationMin"] is None:
            m = DURATION_MIN_RE.search(ln.replace(" ", ""))
            if m and ("시간" in ln or ln.endswith("분")) and "세트" not in ln:
                hours = int(m.group("h") or 0)
                minutes = int(m.group("m") or 0)
                total = hours * 60 + minutes
                if 0 < total <= 240:
                    meta["durationMin"] = total
        if META_SETS.match(ln) and meta["totalSets"] is None:
            m = re.search(r"(\d+)", ln)
            if m:
                meta["totalSets"] = int(m.group(1))
        m = re.search(r"([\d,]+)\s*kg", ln, re.I)
        if m:
            seen_kg.append(int(m.group(1).replace(",", "")))
            if meta["totalVolumeKg"] is None and "(" in ln:
                meta["totalVolumeKg"] = int(m.group(1).replace(",", ""))
    if meta["totalVolumeKg"] is None and seen_kg:
        # In low-quality OCR, summary line can lose "(+delta)" suffix.
        meta["totalVolumeKg"] = max(seen_kg)
    return meta


def infer_type(names: list[str]) -> str:
    text = " ".join(names)
    if re.search(r"스내치|클린|저크|인상|용상|역도", text):
        return "Olympic"
    leg_kw = r"스쿼트|레그 프레스|런지|레그 익스|힙|프론트 스쿼트|오버헤드 스쿼트"
    push_kw = r"벤치|체스트|플라이|딥스|푸시|트라이|오버헤드 프레스|숄더"
    if re.search(leg_kw, text) and not re.search(push_kw, text):
        return "Leg"
    if re.search(push_kw, text):
        return "Push"
    if re.search(r"풀|로우|랫|데드|펜들레이|페이스", text):
        return "Pull"
    return "Pull"


def session_from_lines(lines: list[str], date: str) -> dict | None:
    exercises = parse_exercises(lines)
    if len(exercises) < 2:
        summary_exercises = parse_summary_style_exercises(lines)
        seen_names = {e["name"] for e in exercises}
        for ex in summary_exercises:
            if ex["name"] not in seen_names:
                exercises.append(ex)
                seen_names.add(ex["name"])
    exercises = [
        {**ex, "name": normalize_name(ex["name"].lstrip("'\""))}
        for ex in exercises
        if is_valid_exercise_name(normalize_name(ex["name"].lstrip("'\"")))
    ]
    if not exercises:
        return None
    meta = parse_meta(lines)
    names = [e["name"] for e in exercises]
    if all(is_junk_exercise_name(name) for name in names):
        return None
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


def should_process(existing: dict | None, skip_existing: bool, refresh_ocr: bool) -> bool:
    if existing is None:
        return True
    if skip_existing and not refresh_ocr:
        return False
    if refresh_ocr:
        return existing.get("source") == "album-backfill"
    return False


def backfill(
    from_date: str | None,
    to_date: str | None,
    skip_existing: bool = True,
    refresh_ocr: bool = False,
    limit: int | None = None,
    only_dates: list[str] | None = None,
) -> tuple[int, int, int]:
    stream = fetch_webstream()
    by_date: dict[str, list] = defaultdict(list)
    for p in stream["photos"]:
        by_date[p["dateCreated"][:10]].append(p)

    gym = json.loads(GYM_LOG.read_text())
    existing = {s["date"]: s for s in gym["sessions"]}
    added = 0
    refreshed = 0
    skipped = 0

    if only_dates:
        dates = sorted(set(only_dates))
    else:
        dates = sorted(by_date.keys())
        if from_date:
            dates = [d for d in dates if d >= from_date]
        if to_date:
            dates = [d for d in dates if d <= to_date]

    for date in dates:
        if limit is not None and (added + refreshed) >= limit:
            break
        prev = existing.get(date)

        if prev and prev.get("source") != "album-backfill":
            skipped += 1
            continue

        if prev and skip_existing and not refresh_ocr:
            skipped += 1
            continue

        photos = by_date.get(date, [])
        if not photos:
            continue

        candidates = rank_rise_details(photos)
        if not candidates:
            print(f"skip {date}: no detail screenshot", file=sys.stderr)
            continue

        session = None
        last_error = None
        best_score = -1
        for idx, (photo, deriv) in enumerate(candidates[:6]):
            checksum = str(deriv.get("checksum") or idx)[:16]
            img = IMAGE_CACHE / f"{date}-{checksum}.jpg"
            try:
                download_photo(photo, deriv, img)
                lines = ocr_image(img)
                cand_session = session_from_lines(lines, date)
                if not cand_session or is_junk_session(cand_session):
                    continue
                score = len(cand_session["exercises"]) * 10 + sum(
                    len(e.get("sets", [])) for e in cand_session["exercises"]
                )
                # Prefer sessions with real loaded sets over placeholder-only.
                loaded = sum(
                    1
                    for e in cand_session["exercises"]
                    for s in e.get("sets", [])
                    if s.get("kg", 0) > 0 or s.get("reps", 0) > 1
                )
                score += loaded
                if score > best_score:
                    best_score = score
                    session = cand_session
            except Exception as e:
                last_error = e
                continue

        if not session:
            if prev and prev.get("source") == "album-backfill" and is_junk_session(prev):
                del existing[date]
            if last_error:
                print(f"fail {date}: {last_error}", file=sys.stderr)
            print(f"skip {date}: parse failed", file=sys.stderr)
            continue

        is_refresh = prev is not None and prev.get("source") == "album-backfill"
        existing[date] = session
        if is_refresh:
            refreshed += 1
        else:
            added += 1
        total = added + refreshed
        if total % 10 == 0:
            print(f"progress {total} ({date})", file=sys.stderr)

    gym["sessions"] = sorted(existing.values(), key=lambda s: s["date"])
    manual = sum(1 for s in gym["sessions"] if s.get("source") != "album-backfill")
    ocr_n = sum(1 for s in gym["sessions"] if s.get("source") == "album-backfill")
    gym["note"] = (
        f"Rise 공유앨범 backfill · {len(gym['sessions'])}세션 · "
        f"앨범 {len(stream.get('photos', []))}장 · manual {manual} + OCR {ocr_n}"
    )
    GYM_LOG.write_text(json.dumps(gym, ensure_ascii=False, indent=2) + "\n")
    return added, refreshed, skipped


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--from", dest="from_date", default="2024-07-01")
    ap.add_argument("--to", dest="to_date", default="2026-12-31")
    ap.add_argument("--dates", nargs="*", help="Process only these YYYY-MM-DD dates")
    ap.add_argument("--force-refetch", action="store_true")
    ap.add_argument("--include-existing", action="store_true", help="Overwrite all existing dates")
    ap.add_argument("--refresh-ocr", action="store_true", help="Re-OCR album-backfill sessions only")
    ap.add_argument("--limit", type=int, default=None)
    args = ap.parse_args()

    if args.force_refetch:
        fetch_webstream(force=True)

    skip = not args.include_existing
    if args.refresh_ocr and not args.include_existing:
        skip = True

    added, refreshed, skipped = backfill(
        args.from_date,
        args.to_date,
        skip_existing=skip,
        refresh_ocr=args.refresh_ocr or args.include_existing,
        limit=args.limit,
        only_dates=args.dates,
    )
    print(
        json.dumps(
            {
                "added": added,
                "refreshed": refreshed,
                "skipped_existing": skipped,
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
