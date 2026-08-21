# v3.9 QA notes

- `node --check docs/app.js` 문법 검사
- `node --check scripts/setup-online.mjs` 문법 검사
- `node --check worker/src/index.js` 문법 검사
- 여정 카드 출발/도착은 연도를 포함한 ko-KR 날짜 형식
- D-Day는 사용자 로컬 달력 날짜 차이로 계산
- 남은 시간은 일/시간/분, 장기 여정은 개월/년 단위
- 650px 이하 D-Day 영역 하단 전체 폭
- 390px 이하 출발/도착 타임라인 1열
