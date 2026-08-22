# 가입 500 오류 원인

## 확인된 증상

- D1 테이블은 정상
- Worker health 정상
- `users` 수는 0
- `/api/signup`만 `500 SIGNUP_FAILED`

이 조합은 `INSERT INTO users`보다 앞 단계에서 실패했다는 뜻입니다. v4.3의 가입 순서는 `중복 아이디 조회 → PBKDF2 비밀번호 해시 → users INSERT`입니다.

## 원인

v4.3은 `PBKDF2-SHA-256`을 210,000회 반복했습니다. Cloudflare workerd에는 PBKDF2 반복 횟수 상한이 100,000회인 제약이 있어 이 해시 단계가 실패했습니다. 그래서 DB 스키마를 아무리 다시 만들어도 같은 오류가 반복됐습니다.

## v4.4 수정

- PBKDF2 반복 횟수: 100,000
- `/api/health`에 비밀번호 KDF 설정 표시
- 복구 스크립트가 임시 계정을 실제 가입/로그인한 뒤 삭제
- 이 테스트까지 성공해야 `SUCCESS` 표시
