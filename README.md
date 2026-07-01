# 역도 운동 기록

역도(올림픽 역도) 훈련을 위한 **메인 리프트 중심 기록 도구**입니다.  
헬스 앱과 달리 **TM 기준 % 자동 계산**, **성공/실패 rep**, **주간 80%+ 볼륨**에 맞춰 설계했습니다.

## 빠른 시작

```bash
# 로컬에서 실행 (Python 내장 서버)
python3 -m http.server 8080
# 브라우저에서 http://localhost:8080 열기
```

1. **설정** 탭 → 스내치/C&J TM 입력
2. **오늘 기록** 탭 → 세트 추가 → 세션 저장
3. **주간 리뷰** 탭 → 80%+ 볼륨, PR, 다음 주 조정 확인

시범 데이터: 설정 탭 **「2주 시범 데이터 불러오기」** 클릭

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
