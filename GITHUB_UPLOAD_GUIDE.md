# 멀리멀리 v4.0 GitHub 업로드·배포 안내

대상 저장소: `ko9ma7/mullimulli-web`

## 먼저 알아둘 점

**Repository에 파일이 올라간 것과 GitHub Pages에 새 사이트가 배포된 것은 서로 다른 단계입니다.**

GitHub 웹 화면에서 `docs/app.js`가 최신이어도, `.github/workflows/deploy.yml`이 없거나 Actions가 실행되지 않으면 실제 사이트는 이전 배포본을 계속 보여줍니다.

## 권장: 한 번에 업데이트

이미 온라인 연결을 마쳤다면 프로젝트 루트의 다음 파일을 더블클릭합니다.

```text
PUBLISH_UPDATE.cmd
```

이 파일은 기존 `SETUP_ONLINE.cmd`를 사용해:

1. 기존 D1/Worker 재사용
2. `.github/workflows/deploy.yml` 포함 최신 프로젝트 업로드
3. `MULLIMULLI_API_BASE_URL` 확인
4. GitHub Pages workflow 실행
5. Actions 완료 대기
6. 실제 Pages의 `config.js`와 `version.txt` 확인

까지 수행합니다.

## 수동 업로드를 할 경우 반드시 확인

Repository 최상단에 아래 폴더가 보여야 합니다.

```text
.github/
  workflows/
    deploy.yml
```

GitHub 화면에서 `.github` 폴더가 보이지 않으면 **GitHub Actions 배포 파일이 빠진 것**입니다.

그 다음 Repository → **Actions → Deploy GitHub Pages**에서 최신 실행이 녹색으로 완료되어야 합니다.

## 최종 버전 확인

아래 주소를 직접 엽니다.

```text
https://ko9ma7.github.io/mullimulli-web/version.txt
```

v4.0이면 다음 문자열이 표시됩니다.

```text
MULLIMULLI 4.0.0 — concept-aligned UI — 2026-08-21
```

이 값이 4.0.0이 아니면 새 UI가 아직 Pages에 배포되지 않은 것입니다.

## Pages 설정

Repository → Settings → Pages → Build and deployment → **Source: GitHub Actions**

## Actions Variable

Repository → Settings → Secrets and variables → Actions → Variables

```text
MULLIMULLI_API_BASE_URL=https://mullimulli-api.mullimulli-api.workers.dev
```

Worker 주소가 다르면 본인 Worker URL을 사용합니다.
