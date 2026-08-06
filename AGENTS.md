# AGENTS.md

## Cursor Cloud specific instructions

This repository is a **static, single-page web app** (역도 운동 기록 / weightlifting log). It is plain
HTML/CSS/vanilla JS with data persisted to browser `localStorage`. There is **no package manager, no
build step, no automated tests, and no linter** configured.

### Running the app (development)

Serve the repo root with any static file server and open `index.html`. The documented command
(see `README.md`) is:

```bash
python3 -m http.server 8080
# then open http://localhost:8080/index.html
```

`python3` is preinstalled on the VM, so no dependency installation is required.

### Notes / caveats

- All state (TM settings, sessions, weekly adjustments) lives in the browser's `localStorage`, so a
  "fresh" run needs no database or backend. Clearing browser storage resets the app.
- `js/app.js` fetches `data/sample-2week-log.json` for the "2주 시범 데이터 불러오기" button, so the app
  must be accessed over `http://` (not `file://`) for that feature to work — always use the static server.
- Deployment is handled by GitHub Pages via `.github/workflows/pages.yml`; it only copies `index.html`,
  `css/`, and `js/`. There is nothing to run locally for deployment.
- Lint/test/build: none exist. Do not fabricate lint/test commands; validate changes by loading the app
  in a browser and exercising the relevant tab (오늘 기록 / 기록 보기 / 주간 리뷰 / 설정).
