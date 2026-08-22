# 멀리멀리 v4.4

## 가입/로그인 500 오류 수정

원인은 Cloudflare D1이 아니라 Worker의 비밀번호 해시 설정이었습니다.

- v4.3: PBKDF2-SHA-256 **210,000회**
- Cloudflare workerd: PBKDF2 반복 횟수를 **100,000회까지** 허용
- 결과: `crypto.subtle.deriveBits()`가 사용자 INSERT 전에 실패하여 `SIGNUP_FAILED` 500 반환
- v4.4: Cloudflare 호환 **100,000회**로 수정
- health 응답에 `passwordKdf` 정보를 추가해 배포가 실제 수정본인지 확인
- 자동 복구 스크립트가 실제 가입 + 로그인까지 통과해야 성공 처리

현재 원격 D1 로그에서 `users 0`인 경우 기존 온라인 계정 데이터는 없으므로 해시 호환성 마이그레이션은 필요하지 않습니다.
