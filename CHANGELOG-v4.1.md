# v4.1 — GitHub Pages 배포 복구

- `.github/workflows/deploy.yml` 누락 여부를 배포 전에 검사합니다.
- GitHub CLI OAuth에 `workflow` 권한이 없으면 자동으로 권한 추가 승인을 요청합니다.
- `FIX_GITHUB_PAGES.cmd`를 추가해 Cloudflare/D1을 다시 건드리지 않고 GitHub Pages만 복구합니다.
- 원격 저장소에 workflow 파일과 `docs/version.txt`가 실제 올라갔는지 GitHub API로 확인한 뒤 Actions를 실행합니다.
- Actions 성공 후 실제 Pages의 `version.txt`가 `MULLIMULLI 4.1.0`인지 확인해야 성공 처리합니다.
- 오류 발생 시 Git push/Actions의 실제 오류 메시지를 숨기지 않고 출력합니다.
