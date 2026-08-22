# v4.4 배포 확인

1. `UPDATE_V4_4.cmd` 실행
2. 콘솔에서 `PBKDF2 100000회`가 health 검사에 표시되는지 확인
3. `실제 가입 + 로그인 API 테스트 성공` 확인
4. `https://mullimulli-api.mullimulli-api.workers.dev/api/health` 응답의 `version`이 `4.4.0`이고 `passwordKdf.iterations`가 `100000`인지 확인
5. `https://ko9ma7.github.io/mullimulli-web/version.txt`가 `MULLIMULLI 4.4.0`인지 확인
6. 사이트에서 Ctrl+F5 후 새 온라인 계정 가입 테스트

DB 스키마를 반복 재생성할 필요는 없습니다. 가입 500의 원인은 v4.3 비밀번호 KDF 반복 횟수였습니다.
