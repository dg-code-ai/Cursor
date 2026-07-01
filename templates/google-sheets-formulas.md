# Google Sheets 템플릿 설정 가이드

## 1. 시트 구조

[`daily-log-template.csv`](daily-log-template.csv)를 Google Sheets에 업로드하거나, 아래 컬럼으로 새 시트를 만듭니다.

| 컬럼 | 설명 | 예시 |
|---|---|---|
| date | 훈련 날짜 | 2026-07-01 |
| lift | snatch / cj / accessory | snatch |
| training_max_kg | 해당 종목 TM (보조는 0) | 100 |
| weight_kg | 무게 | 85 |
| percent | TM 대비 % (자동 계산 가능) | 85 |
| sets | 세트 수 | 3 |
| reps | 세트당 반복 | 2 |
| success_reps | 성공 rep 수 | 6 |
| fail_reps | 실패 rep 수 | 0 |
| result | O / X / partial | O |
| memo | 한 줄 메모 | 2rep째 무릎 일찍 펴짐 |
| condition | 컨디션 | 수면 7h |

## 2. TM 설정 시트 (별도 탭)

| 항목 | 값 |
|---|---|
| 스내치 TM | 100 |
| C&J TM | 120 |

## 3. 자동 계산 수식

**무게 → % (percent 컬럼, lift가 snatch/cj일 때):**
```
=IF(OR(D2="snatch",D2="cj"), ROUND(E2/VLOOKUP(D2,TM!A:B,2,FALSE)*100, 1), "")
```

간단 버전 (스내치 TM이 B1 셀, C&J TM이 B2 셀):
```
=IF(A2="snatch", ROUND(D2/$B$1*100,1), IF(A2="cj", ROUND(D2/$B$2*100,1), ""))
```

**% → 무게 (weight_kg 컬럼):**
```
=IF(A2="snatch", ROUND(F2/100*$B$1,1), IF(A2="cj", ROUND(F2/100*$B$2,1), D2))
```

**총 rep (success + fail 검증):**
```
=G2*H2
```

## 4. 주간 80%+ 볼륨 (요약 탭)

스내치 80% 이상 총 reps:
```
=SUMIFS(success_reps:success_reps, lift:lift, "snatch", percent:percent, ">=80", date:date, ">="&week_start, date:date, "<="&week_end)
```

C&J 80% 이상 총 reps:
```
=SUMIFS(success_reps:success_reps, lift:lift, "cj", percent:percent, ">=80", date:date, ">="&week_start, date:date, "<="&week_end)
```

## 5. 웹 로거와 연동

1. 웹 로거에서 **JSON 내보내기**
2. 또는 CSV로 변환 후 Sheets 업로드
3. 주간 리뷰는 웹 로거 **주간 리뷰** 탭에서도 자동 계산됨
