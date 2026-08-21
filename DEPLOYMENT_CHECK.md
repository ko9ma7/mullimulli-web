# v4.0 배포 확인 체크리스트

- [ ] Repository 루트에 `.github` 폴더가 있다.
- [ ] `.github/workflows/deploy.yml`이 있다.
- [ ] `docs/index.html`이 `app.js?v=4.0.0`을 참조한다.
- [ ] `docs/version.txt`가 `MULLIMULLI 4.0.0`이다.
- [ ] GitHub Actions의 최신 `Deploy GitHub Pages` 실행이 성공(초록색)이다.
- [ ] `https://ko9ma7.github.io/mullimulli-web/version.txt`가 `MULLIMULLI 4.0.0`을 표시한다.
- [ ] 사이트 Footer에 `v4.0.0`이 표시된다.
- [ ] 친구 화면에서 `온라인 계정 연결됨`이 표시된다.

Repository 파일 시간은 최신인데 `Deployments` 시간이 오래됐다면 새 Pages 배포가 실행되지 않은 상태입니다.
