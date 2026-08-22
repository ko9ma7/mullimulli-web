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

## v4.2 핵심 확인

Repository 루트에 `.github` 폴더가 보이고 그 안에 `workflows/deploy.yml`이 있어야 합니다.
Settings → Pages의 Source가 `GitHub Actions`인 것만으로는 배포되지 않습니다. workflow 파일이 실제 repository에 있어야 main push가 Actions를 시작합니다.

`FIX_GITHUB_PAGES.cmd`는 GitHub OAuth의 `workflow` 권한을 확인/추가하고, 원격 `.github/workflows/deploy.yml`, `docs/version.txt`, Actions 결과, 실제 Pages `version.txt`까지 4단계로 확인합니다.


## v4.2 기기 간 계정 확인

1. 사이트 상단에 `● 온라인`이 보이는지 확인합니다.
2. 컴퓨터 A에서 가입한 계정을 로그아웃한 뒤 컴퓨터 B에서 같은 사이트 URL을 엽니다.
3. 컴퓨터 B의 별도 계정으로 로그인하여 친구 메뉴에서 A의 `@아이디`를 검색합니다.
4. 검색된다면 D1 공유가 정상입니다.
5. A가 B에게 편지를 보내면 B 화면의 모든 탭 상단에 `나에게 오는 편지 1통` 배너가 10초 이내 표시되는지 확인합니다.
6. `받은편지` 메뉴에 숫자 배지가 생기고 본문은 도착 전까지 잠겨 있어야 합니다.
