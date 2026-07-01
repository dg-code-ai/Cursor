# 역도 운동 기록

역도(올림픽 역도) 훈련을 위한 **메인 리프트 중심 기록 도구**입니다.  
헬스 앱과 달리 **TM 기준 % 자동 계산**, **성공/실패 rep**, **주간 80%+ 볼륨**에 맞춰 설계했습니다.

## 아이폰만으로 사용하기 (추천)

### 바로 시작 (PC·설정 불필요)

1. Safari에서 아래 주소 열기  
   **https://cdn.jsdelivr.net/gh/dg-code-ai/Cursor@main/index.html**
2. 공유 버튼(□↑) → **홈 화면에 추가** → 이름: `역도 기록`
3. 홈 화면 아이콘으로 실행

### 사용 순서

1. **설정** 탭 → 스내치/C&J TM 입력 (또는 **2주 시범 데이터 불러오기**)
2. **오늘 기록** 탭 → 세트 추가 → **세션 저장**
3. **주간 리뷰** 탭 → 80%+ 볼륨 확인

데이터는 아이폰 Safari에 저장됩니다. 가끔 **기록 보기 → JSON 내보내기**로 백업하세요.

### (선택) GitHub Pages 주소

저장소에서 Pages를 켜면 아래 주소도 사용할 수 있습니다.  
**https://dg-code-ai.github.io/Cursor/**

Pages 활성화: GitHub → 저장소 **Settings → Pages → Build and deployment → Source: GitHub Actions**

## PC에서 로컬 실행 (선택)

```bash
python3 -m http.server 8080
# 브라우저에서 http://localhost:8080 열기
```

## 구성

| 경로 | 설명 |
|---|---|
| [index.html](index.html) | 역도 전용 웹 로거 (localStorage) |
| [templates/daily-log-template.csv](templates/daily-log-template.csv) | Google Sheets용 CSV 템플릿 |
| [templates/google-sheets-formulas.md](templates/google-sheets-formulas.md) | 시트 자동 계산 수식 |
| [docs/method-choice.md](docs/method-choice.md) | 기록 방식 선택 가이드 |
| [docs/weekly-review-guide.md](docs/weekly-review-guide.md) | 주간 리뷰 체크리스트 |

## 기록 형식 (최소)

```
종목 + 무게(또는 %) + 세트×반복 + 성공/실패 rep + 한 줄 메모
```

## 추천 조합

1. **웹 로거** — 스내치/C&J 메인 리프트
2. **휴대폰 영상** — 실패 rep만 촬영
3. **헬스 앱 (Hevy/Strong)** — 보조운동 (선택)

## 데이터

- 브라우저 localStorage에 저장
- JSON/CSV 내보내기·가져오기 지원
- 코치 공유: CSV → Google Sheets 업로드

## 주간 리뷰 (매주 5분)

- [ ] 스내치 80%+ 총 reps
- [ ] C&J 80%+ 총 reps
- [ ] 이번 주 PR/테스트
- [ ] 컨디션 메모
- [ ] 다음 주 조정 (증량 / deload / 테크닉)

자세한 내용은 [docs/weekly-review-guide.md](docs/weekly-review-guide.md) 참고.
