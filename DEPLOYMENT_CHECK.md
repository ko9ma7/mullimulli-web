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

## v4.1 핵심 확인

Repository 루트에 `.github` 폴더가 보이고 그 안에 `workflows/deploy.yml`이 있어야 합니다.
Settings → Pages의 Source가 `GitHub Actions`인 것만으로는 배포되지 않습니다. workflow 파일이 실제 repository에 있어야 main push가 Actions를 시작합니다.

`FIX_GITHUB_PAGES.cmd`는 GitHub OAuth의 `workflow` 권한을 확인/추가하고, 원격 `.github/workflows/deploy.yml`, `docs/version.txt`, Actions 결과, 실제 Pages `version.txt`까지 4단계로 확인합니다.
