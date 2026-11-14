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

## 단가 · 판촉 변경
- 관리자 모드(화면 맨 아래 ⚙ 관리자)에서 엑셀을 올리면 모든 사용자에게 자동 적용됩니다. (API 연결 필요)
- 또는 `data/price.js`, `data/promo.js` 파일을 새 데이터로 교체해도 됩니다.

## Apps Script 자동 배포
- `apps-script/Code.gs`를 수정해서 main에 올리면 GitHub Actions가 Apps Script에 반영하고, 기존 웹앱 주소(`/exec`)를 유지한 채 새 버전으로 배포합니다.
- 처음 한 번 저장소 Settings > Secrets and variables > Actions 에 `CLASPRC_JSON` 등록, Apps Script 스크립트 속성에 `ADMIN_PW` 등록이 필요합니다.

## LG 단가 변경
- LG 화면 맨 아래 ⚙ LG 단가 관리에서 엑셀을 올리면 '전자랜드_MMDD' 단가표 시트와 최신 '구독 활성화 요약' 시트를 자동으로 골라 적용합니다.
- 활성화 요약의 추가(주말) 금액이 단가표에 아직 없으면 (활성화 K원 ÷ 72개월, 100원 올림)만큼 월 요금에서 더 빼 줍니다. 소상공인 요금에는 더하지 않습니다.
