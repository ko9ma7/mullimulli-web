# v4.3 배포/복구 체크

1. `REPAIR_ONLINE.cmd` 실행 결과가 `SUCCESS`인지 확인
2. Worker health: `https://mullimulli-api.mullimulli-api.workers.dev/api/health`
   - `ok: true`
   - `version: 4.3.0`
   - `database.ok: true`
   - `schema.ok: true`
3. `UPDATE_V4_3.cmd` 실행 후 GitHub Pages 배포
4. `https://ko9ma7.github.io/mullimulli-web/version.txt`가 `MULLIMULLI 4.3.0`인지 확인
5. PC A에서 온라인 계정 가입 → PC B에서 같은 아이디 검색 확인
6. 양쪽 위치 업데이트 → 친구 추가 → 편지 발송 → 수신 측 `나에게 오는 편지` 확인
