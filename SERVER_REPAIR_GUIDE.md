# 멀리멀리 v4.4 온라인 계정 서버 복구

## 현재 증상

사이트에는 "온라인 계정 서버에 연결되어 있습니다"가 표시되지만 가입/로그인/로컬 계정 이전에서 "서버에서 요청을 처리하지 못했습니다"가 표시되는 경우입니다.

## 원인

v4.2의 `/api/health`는 Worker가 응답하는지만 확인했고 D1 계정 DB의 테이블/컬럼 상태를 확인하지 않았습니다. 따라서 Worker는 정상이어도 D1 스키마가 빠졌거나 연결이 불완전하면 화면에는 온라인으로 보이면서 실제 가입 요청은 500으로 실패할 수 있었습니다.

또한 `UPDATE_V4_2.cmd`는 Worker와 GitHub Pages 업데이트용으로, D1 스키마 복구를 수행하지 않았습니다.

## v4.4 복구 방법

1. v4.4 ZIP을 새 폴더에 압축 해제합니다.
2. `UPDATE_V4_4.cmd`를 더블클릭합니다.
3. Cloudflare 또는 GitHub 승인 창이 뜨면 승인합니다.
4. 스크립트가 다음을 자동으로 수행합니다.
   - 기존 `mullimulli-db` 연결 확인
   - 누락 테이블/안전한 users 컬럼 보완
   - 기존 계정/친구/편지 유지
   - Worker v4.4 재배포
   - `/api/health`에서 D1 실제 검사
   - 임시 계정으로 실제 가입 + 로그인 API 테스트
   - 임시 계정 삭제
   - GitHub Pages v4.4 배포
5. 마지막에 SUCCESS가 표시된 뒤 사이트에서 `Ctrl+F5`를 누릅니다.

## 성공 확인

API health 주소:

`https://mullimulli-api.mullimulli-api.workers.dev/api/health`

정상 상태의 핵심 값:

```json
{
  "ok": true,
  "version": "4.4.0",
  "database": { "ok": true },
  "schema": { "ok": true }
}
```

페이지 버전:

`https://ko9ma7.github.io/mullimulli-web/version.txt`

`MULLIMULLI 4.4.0`이 보여야 합니다.

## 계정 주의

- 기존 온라인 D1 계정이 이미 있다면 `가입`이 아니라 `로그인`을 사용합니다.
- 브라우저에만 있던 로컬 계정은 서버 복구 후 `온라인으로 옮기기`를 사용합니다.
- 다른 컴퓨터에서 검색되려면 양쪽 계정 모두 온라인 D1 계정이어야 합니다.
