# 삼성 AI 구독 계산기 (GitHub Pages)

여수본점 김동욱 제작

## 폴더 구성
| 파일 | 내용 |
|---|---|
| `index.html` | 계산기 화면 |
| `config.js` | Apps Script API 주소 설정 (`window.API_URL`) |
| `data/price.js` | 기본 단가표 (월별 교체 가능) |
| `data/promo.js` | 기본 추가 판촉 대상 모델 |
| `care/` | 케어 가이드 이미지 59장 |
| `lg.html` | LG 가전구독 계산기 화면 (위쪽 [삼성 / LG] 버튼으로 전환) |
| `lg-parse.js` | LG 단가 엑셀 → 계산기 데이터 변환 |
| `data/lg.js` | LG 기본 단가표 + 활성화 (전자랜드_1110 · 11월 3주말) |
| `cuckoo.html` | 쿠쿠 렌탈 · 구독 계산기 (위쪽 [삼성 / LG / 쿠쿠] 버튼으로 전환) |
| `data/ck.js` · `ck-parse.js` | 쿠쿠 구독 엑셀(구독 모델별 내용) → 약정 할인가 · 반값 · 패키지 |
| `data/ck-img.js` | 쿠쿠 홈페이지 사진 · 일시불가 · 기본 구독료 |
| `data/ck-multi.js` | 쿠쿠 다품목 캐시백 가이드 (일시불 대상 · 구독 모델별 캐시백 · 더블 기간) |
| `ckcard/` | 쿠쿠 제휴카드 이미지 |
| `common.js` | 삼성 · LG · 쿠쿠가 같이 쓰는 코드 (📸 견적 캡처 · 캡처 지점명) — 한 번 고치면 세 계산기에 반영 |
| `test/` | 테스트 화면 (정식과 같은 구성 · 노란 '테스트 버전' 띠) |
| `tools/` | 테스트 → 정식 옮기기 · 자동 점검 스크립트 |

## 단가 · 판촉 변경
- 관리자 모드(화면 맨 아래 ⚙ 관리자)에서 엑셀을 올리면 모든 사용자에게 자동 적용됩니다. (API 연결 필요)
- 또는 `data/price.js`, `data/promo.js` 파일을 새 데이터로 교체해도 됩니다.

## Apps Script 자동 배포
- `apps-script/Code.gs`를 수정해서 main에 올리면 GitHub Actions가 Apps Script에 반영하고, 기존 웹앱 주소(`/exec`)를 유지한 채 새 버전으로 배포합니다.
- 처음 한 번 저장소 Settings > Secrets and variables > Actions 에 `CLASPRC_JSON` 등록, Apps Script 스크립트 속성에 `ADMIN_PW` 등록이 필요합니다.

## LG 단가 변경
- LG 화면 맨 아래 ⚙ LG 단가 관리에서 엑셀을 올리면 '전자랜드_MMDD' 단가표 시트와 최신 '구독 활성화 요약' 시트를 자동으로 골라 적용합니다.
- 활성화 요약의 추가(주말) 금액이 단가표에 아직 없으면 (활성화 K원 ÷ 72개월, 100원 올림)만큼 월 요금에서 더 빼 줍니다. 소상공인 요금에는 더하지 않습니다.

## 수정 순서 (테스트 → 정식)
1. `test/` 폴더의 파일을 고친다 (`test/index.html`, `test/lg.html`, `test/cuckoo.html`, `test/common.js` …)
2. 자동 점검: `python3 tools/smoke.py` — 입장 · 모델 담기 · 금액 · 📸 캡처 · 관리자 탭 전부 · 화면 오류
3. 테스트 화면(`/test/`)에서 직접 확인
4. 정식 적용: `python3 tools/promote.py promote` — 테스트 표시(노란 띠 · noindex · TEST_MODE · ../ 경로)만 빼고 그대로 옮김
5. `python3 tools/smoke.py prod` 로 정식도 점검 후 main에 올림 (GitHub Actions '계산기 자동 점검'이 한 번 더 돌림)

- 버전업: `python3 tools/bump.py next "바뀐 점 1" "바뀐 점 2"` — 6개 파일 버전 번호 + 수정 내역 한 줄을 한 번에 (번호 지정은 `v8.50`)
- 테스트와 정식이 같은지 확인: `python3 tools/promote.py check`
- 정식에서 급하게 바로 고쳤다면 `python3 tools/promote.py totest` 로 테스트에도 맞춰 둔다
- 세 계산기 공통 기능은 `common.js`에 둔다. 페이지 코드는 함수로 감싸져 있어서, 페이지가 `window.PG`(meGet · esc · toast · fuLog · markAct · emp)로 필요한 걸 넘겨 준다
