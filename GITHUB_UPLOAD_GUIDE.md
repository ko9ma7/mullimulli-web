# ko9ma7/mullimulli-web 업로드 가이드

이 ZIP의 **내용 전체**를 GitHub Repository `ko9ma7/mullimulli-web`의 루트에 올리면 됩니다. `docs/`만 따로 올리면 Worker·자동설정·Actions가 빠지므로 프로젝트 전체를 업로드하세요.

## 가장 쉬운 방법

이미 온라인 Worker/D1을 연결한 PC라면 프로젝트 루트의:

```text
SETUP_ONLINE.cmd
```

을 실행하면 최신 프로젝트를 `ko9ma7/mullimulli-web`에 업로드하고 GitHub Pages Workflow까지 실행하도록 구성되어 있습니다.

## Git으로 직접 업로드할 경우

```bash
git init
git branch -M main
git remote remove origin 2>nul || true
git remote add origin https://github.com/ko9ma7/mullimulli-web.git
git add .
git commit -m "Update MulliMulli v3.9 send experience"
git push -u origin main --force-with-lease
```

기존 저장소를 clone해서 수정 중이라면 `git init`, `remote add`는 필요 없습니다.

```bash
git add .
git commit -m "Update MulliMulli v3.9 send experience"
git push origin main
```

## 반드시 함께 올라가야 하는 항목

```text
.github/workflows/deploy.yml
data/
docs/
scripts/
worker/
SETUP_ONLINE.cmd
README.md
SITE_METADATA.md
GITHUB_UPLOAD_GUIDE.md
LICENSE
```

## GitHub Repository 설정

자세한 Description, Website, Topics, Social Preview, Actions Variable 값은:

```text
.github/REPOSITORY_SETUP.md
```

파일에 정리되어 있습니다.

## 배포 확인

GitHub → Actions → `Deploy GitHub Pages`가 초록색으로 완료되어야 합니다.

배포 주소:

```text
https://ko9ma7.github.io/mullimulli-web/
```

사이트 상단이 `● 온라인`으로 표시되면 Worker API까지 연결된 상태입니다.
