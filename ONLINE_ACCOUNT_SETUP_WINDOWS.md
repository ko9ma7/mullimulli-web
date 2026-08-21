# 가장 쉬운 방법: 자동 설정

이 문서는 이제 **수동 복구용**입니다. 일반적인 Windows 사용자는 명령어를 직접 입력하지 않아도 됩니다.

1. 프로젝트 ZIP을 압축 해제합니다.
2. 루트의 `SETUP_ONLINE.cmd`를 더블클릭합니다.
3. Cloudflare 로그인 브라우저가 열리면 승인합니다.
4. GitHub 로그인 브라우저가 열리면 승인합니다.
5. 완료될 때까지 창을 닫지 않습니다.

프로그램이 D1 생성/재사용, 스키마 보완, Secret 보존/생성, Worker 배포, GitHub Actions Variable 등록, Pages Workflow 실행까지 자동 처리합니다. 실행 도중 실패해도 같은 파일을 다시 실행하면 이미 완료된 단계는 가능한 한 재사용합니다.

---

# 멀리멀리 온라인 계정 연결 가이드 — Windows + Git Bash

이 문서는 GitHub Pages로 배포한 멀리멀리 프런트엔드와 Cloudflare Worker + D1 백엔드를 연결해, 서로 다른 브라우저·PC·휴대폰에서 만든 계정이 서로 검색되고 친구 추가와 메시지 발송이 가능하도록 만드는 절차입니다.

## 먼저 이해할 구조

```text
Chrome / 휴대폰 / 다른 PC
        ↓
GitHub Pages (docs/)
        ↓  MULLIMULLI_API_BASE_URL
Cloudflare Worker (mullimulli-api)
        ↓  DB binding
Cloudflare D1 (mullimulli-db)
```

GitHub Pages만 배포하면 로컬 데모 모드입니다. 이 경우 계정은 각 브라우저의 LocalStorage에만 저장되므로 다른 기기에서 검색되지 않습니다.

온라인 계정 연결은 아래 3개 연결이 모두 완료되어야 합니다.

1. 로컬 PC ↔ Cloudflare 계정: Wrangler 로그인
2. Worker ↔ D1: `wrangler.toml`의 `database_id`
3. GitHub Pages ↔ Worker: GitHub Actions Variable `MULLIMULLI_API_BASE_URL`

---

## 0. 현재 오류의 의미

터미널이 아래처럼 `C:/Users/kohojung`에 있을 때:

```text
MINGW64 ~
```

`cd worker`를 실행하면 현재 폴더 아래에 `worker` 폴더가 없기 때문에 실패합니다.

또한:

```text
bash: wrangler: command not found
```

은 Wrangler가 전역 설치되어 있지 않다는 뜻입니다. 이 프로젝트에서는 전역 설치 대신 `npx wrangler@latest ...` 명령을 사용하는 것을 권장합니다.

---

## 1. 프로젝트 폴더 찾기

Git Bash에서 다음을 실행합니다.

```bash
find /c/Users/kohojung -maxdepth 6 -type f -name wrangler.toml 2>/dev/null
```

예를 들어 다음처럼 나온다면:

```text
/c/Users/kohojung/Downloads/mullimulli-web-v3/worker/wrangler.toml
```

프로젝트 루트로 이동합니다.

```bash
cd "/c/Users/kohojung/Downloads/mullimulli-web-v3"
```

확인:

```bash
pwd
ls
```

정상이라면 대략 다음이 보여야 합니다.

```text
data  docs  scripts  worker  README.md
```

그 다음 Worker 폴더로 이동합니다.

```bash
cd worker
ls
```

정상이라면 다음이 보여야 합니다.

```text
migrations  schema.sql  src  wrangler.toml
```

### `find` 결과가 하나도 없으면

아직 ZIP을 압축 해제하지 않았거나 GitHub Repository를 PC에 clone하지 않은 상태입니다. 먼저 v3 ZIP을 압축 해제하거나 Repository를 clone한 후 위 명령을 다시 실행합니다.

---

## 2. Node.js / npm / npx 확인

```bash
node -v
npm -v
npx -v
```

세 명령 모두 버전이 출력되어야 합니다.

예:

```text
v24.x.x
11.x.x
11.x.x
```

`command not found`가 나오면 Node.js LTS를 설치하고 Git Bash를 완전히 닫았다가 다시 엽니다.

---

## 3. Wrangler를 `npx`로 실행

전역 `wrangler` 명령 대신 아래처럼 사용합니다.

```bash
npx wrangler@latest --version
```

처음 실행하면 Wrangler 패키지를 내려받을 수 있습니다.

Cloudflare 로그인:

```bash
npx wrangler@latest login
```

브라우저가 열리면 Cloudflare 계정으로 로그인하고 권한을 승인합니다.

로그인 확인:

```bash
npx wrangler@latest whoami
```

계정 정보가 나오면 성공입니다.

---

## 4. D1 데이터베이스가 이미 있는지 확인

```bash
npx wrangler@latest d1 list
```

목록에 `mullimulli-db`가 있으면 **기존 DB 경로**로 진행합니다.

없으면 **새 DB 경로**로 진행합니다.

---

# A. 새로 처음 연결하는 경우

## A-1. D1 생성

```bash
npx wrangler@latest d1 create mullimulli-db
```

출력에 `database_id` 또는 UUID가 표시됩니다.

예:

```text
database_name = "mullimulli-db"
database_id = "12345678-abcd-...."
```

이 ID를 복사합니다.

## A-2. `worker/wrangler.toml` 수정

현재 `worker` 폴더에 있으므로 파일은 `wrangler.toml`입니다.

아래 부분:

```toml
database_id = "REPLACE_AFTER_WRANGLER_D1_CREATE"
```

을 실제 ID로 바꿉니다.

```toml
database_id = "실제-D1-ID"
```

그리고 GitHub Pages 주소에 맞게 CORS origin을 수정합니다.

```toml
[vars]
ALLOWED_ORIGINS = "http://localhost:8080,https://YOUR_GITHUB_ID.github.io"
```

중요: GitHub Repository 경로는 넣지 않습니다.

올바른 예:

```text
https://mygithubid.github.io
```

잘못된 예:

```text
https://mygithubid.github.io/mullimulli/
```

브라우저의 `Origin`에는 `/mullimulli/` 같은 경로가 포함되지 않기 때문입니다.

## A-3. 새 DB에 전체 스키마 적용

```bash
npx wrangler@latest d1 execute mullimulli-db --file=./schema.sql --remote
```

확인을 묻는다면 `y`를 입력합니다.

새 DB에서는 `0002_profile_settings.sql`을 따로 실행하지 않습니다. `schema.sql`에 이미 최신 프로필 필드가 들어 있습니다.

---

# B. 예전에 v2 D1을 이미 만든 경우

먼저 실제 테이블 상태를 확인합니다.

```bash
npx wrangler@latest d1 execute mullimulli-db --remote --command="PRAGMA table_info(users);"
```

출력에 아래 컬럼들이 이미 있으면 마이그레이션을 다시 실행하지 않습니다.

```text
bio
discoverable
show_location_age
allow_friend_add
```

이 필드들이 없다면 딱 한 번만 실행합니다.

```bash
npx wrangler@latest d1 execute mullimulli-db --file=./migrations/0002_profile_settings.sql --remote
```

`ALTER TABLE ... ADD COLUMN` 마이그레이션은 반복 실행하면 오류가 날 수 있으므로 한 번만 적용합니다.

---

## 5. 메시지 암호화 키 등록

메시지 본문 암호화용 32바이트 키를 생성합니다.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

출력된 한 줄을 복사합니다.

그 다음:

```bash
npx wrangler@latest secret put MESSAGE_KEY
```

값을 입력하라는 프롬프트가 나오면 방금 복사한 키를 붙여넣고 Enter를 누릅니다.

이 키는 GitHub 코드, `config.js`, `wrangler.toml`에 직접 적지 않습니다.

---

## 6. Worker 배포

```bash
npx wrangler@latest deploy
```

성공하면 대략 다음 형식의 주소가 나옵니다.

```text
https://mullimulli-api.YOUR-SUBDOMAIN.workers.dev
```

이 URL을 복사해 둡니다. 이후 `WORKER_URL`이라고 부릅니다.

---

## 7. Worker 단독 동작 확인

Git Bash에서:

```bash
curl https://mullimulli-api.YOUR-SUBDOMAIN.workers.dev/api/health
```

정상 예:

```json
{"ok":true,"service":"mullimulli-api","version":"3.0.0"}
```

여기서 실패하면 GitHub Pages 연결 전에 Worker부터 해결해야 합니다.

---

## 8. GitHub Repository에 Worker URL 연결

GitHub Repository에서:

```text
Settings
→ Secrets and variables
→ Actions
→ Variables
→ New repository variable
```

다음 값을 만듭니다.

```text
Name
MULLIMULLI_API_BASE_URL

Value
https://mullimulli-api.YOUR-SUBDOMAIN.workers.dev
```

끝의 `/`는 없어도 됩니다.

이 값은 공개되어도 되는 Worker 주소이므로 **Secret이 아니라 Variable**로 등록합니다.

---

## 9. GitHub Pages 배포 방식 확인

Repository:

```text
Settings → Pages
```

Source가 **GitHub Actions**여야 합니다.

이 프로젝트는 `.github/workflows/deploy.yml`에서 `docs/` 폴더를 Pages에 배포합니다.

### 브랜치도 확인

프로젝트 루트에서:

```bash
cd ..
git branch --show-current
```

현재 workflow는 `main` 브랜치 push를 기준으로 자동 실행됩니다.

결과가 `master`인데 GitHub도 master를 사용 중이라면 둘 중 하나를 선택해야 합니다.

- 프로젝트 기본 브랜치를 `main`으로 변경
- 또는 `.github/workflows/deploy.yml`의 `branches: [main]`을 `branches: [master]`로 변경

`C:/Users/kohojung`의 `(master)` 표시는 실제 멀리멀리 프로젝트 브랜치라는 뜻이 아닐 수 있으므로 반드시 **프로젝트 루트에서** 확인합니다.

---

## 10. Pages 재배포

가장 쉬운 방법은 GitHub 웹에서:

```text
Actions
→ Deploy GitHub Pages
→ Run workflow
```

또는 `main`에 새 commit을 push합니다.

배포가 끝난 뒤 사이트를 새로 엽니다.

---

## 11. Pages에 Worker 주소가 실제로 들어갔는지 확인

브라우저에서 다음 파일을 직접 엽니다.

```text
https://YOUR_GITHUB_ID.github.io/YOUR_REPOSITORY/config.js
```

정상이라면:

```js
apiBaseUrl: 'https://mullimulli-api.YOUR-SUBDOMAIN.workers.dev'
```

처럼 Worker URL이 보여야 합니다.

아래처럼 비어 있으면 아직 온라인 연결이 안 된 상태입니다.

```js
apiBaseUrl: ''
```

이 경우 GitHub Actions Variable 또는 Pages 재배포를 다시 확인합니다.

---

## 12. 사이트에서 온라인 모드 확인

멀리멀리 사이트에 접속하고 친구 메뉴를 엽니다.

정상:

```text
● 온라인 계정 연결됨
```

비정상:

```text
○ 로컬 데모 모드
```

`로컬 데모 모드`가 보이면 계정 검색 문제를 보기 전에 `config.js`부터 확인해야 합니다.

---

## 13. 기존 로컬 계정은 자동으로 D1로 이동하지 않음

매우 중요합니다.

온라인 연결 전에 브라우저 LocalStorage에서 만든:

```text
@ko9ma7
@ko9ma0
```

같은 계정은 D1에 자동 업로드되지 않습니다.

온라인 모드로 바뀐 뒤에는 **D1에 다시 회원가입**해야 합니다.

따라서 테스트 순서는 다음과 같습니다.

```text
1. 사이트에서 “온라인 계정 연결됨” 확인
2. Chrome에서 @ko9ma7 신규 가입
3. Edge/휴대폰에서 @ko9ma0 신규 가입
4. 양쪽 프로필의 “검색에서 내 프로필 찾기” ON 확인
5. 양쪽 프로필의 “친구 추가 받기” ON 확인
6. @ko9ma7에서 @ko9ma0 검색
7. 친구 추가
8. @ko9ma0에서 친구 목록에 @ko9ma7도 나타나는지 확인
```

친구는 백엔드에서 양방향으로 연결됩니다.

---

## 14. 실제 메시지 테스트

친구 추가 후 두 계정 모두 각각 `위치 업데이트`를 한 번 실행합니다.

둘 중 한 명만 위치가 있으면 거리를 계산할 수 없으므로 메시지를 보낼 수 없습니다.

정상 순서:

```text
계정 A 위치 업데이트
계정 B 위치 업데이트
→ 친구 선택
→ 전달자 선택
→ 거리/서비스 시간 계산
→ 메시지 작성
→ 발송
```

위치 좌표 자체는 친구에게 내려주지 않고 Worker가 거리만 계산해 반환합니다.

---

# 오류별 빠른 진단

## `bash: cd: worker: No such file or directory`

현재 폴더가 프로젝트 루트가 아닙니다.

```bash
find /c/Users/kohojung -maxdepth 6 -type f -name wrangler.toml 2>/dev/null
```

으로 실제 프로젝트 위치부터 찾습니다.

## `bash: wrangler: command not found`

전역 Wrangler를 쓰지 말고:

```bash
npx wrangler@latest --version
```

을 사용합니다.

## `bash: npx: command not found`

Node.js/npm이 설치되어 있지 않거나 PATH가 반영되지 않았습니다. Node.js LTS를 설치하고 터미널을 다시 시작합니다.

## `No D1 database found` / DB binding 오류

`wrangler.toml`의:

```toml
database_id = "..."
```

이 실제 `mullimulli-db` UUID인지 확인합니다.

## Worker는 열리는데 사이트에서 `Failed to fetch`

대부분 CORS입니다.

`wrangler.toml`:

```toml
ALLOWED_ORIGINS = "http://localhost:8080,https://YOUR_GITHUB_ID.github.io"
```

을 확인하고 수정했다면 다시:

```bash
npx wrangler@latest deploy
```

해야 합니다.

## 사이트가 계속 `로컬 데모 모드`

배포된 `config.js`에서 `apiBaseUrl`이 비어 있습니다.

GitHub의 `MULLIMULLI_API_BASE_URL` Variable과 Actions 재배포를 확인합니다.

## 온라인인데 부계정 검색이 안 됨

다음 순서로 확인합니다.

```text
1. 두 계정 모두 온라인 연결 후 다시 가입했는가?
2. 검색 대상 계정의 “검색에서 내 프로필 찾기”가 ON인가?
3. 친구 추가하려면 “친구 추가 받기”가 ON인가?
4. 입력한 @아이디가 정확한가?
5. Worker/D1이 같은 Cloudflare 계정과 같은 DB를 보고 있는가?
```

## 친구는 되는데 메시지가 안 보내짐

두 계정 모두 마지막 위치가 있어야 합니다. 양쪽에서 `위치 업데이트`를 실행합니다.

---

# 가장 짧은 정상 설치 순서

프로젝트 위치를 이미 안다는 가정입니다.

```bash
cd "/c/Users/kohojung/실제-프로젝트-폴더/worker"
node -v
npx wrangler@latest login
npx wrangler@latest whoami
npx wrangler@latest d1 list
npx wrangler@latest d1 create mullimulli-db
# wrangler.toml에 실제 database_id와 GitHub Pages origin 입력
npx wrangler@latest d1 execute mullimulli-db --file=./schema.sql --remote
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
npx wrangler@latest secret put MESSAGE_KEY
npx wrangler@latest deploy
```

그 다음 GitHub에:

```text
MULLIMULLI_API_BASE_URL = Worker URL
```

을 Repository Variable로 등록하고 GitHub Pages Action을 다시 실행합니다.

마지막 확인은 다음 3개입니다.

```text
Worker /api/health = ok
배포된 config.js의 apiBaseUrl = Worker URL
친구 화면 = ● 온라인 계정 연결됨
```

이 세 가지가 모두 맞으면 기기 간 계정 검색을 테스트할 단계입니다.

## v3.8 Windows 실행기 수정

v3.4에서 `spawnSync npx.cmd EINVAL`이 발생할 수 있었습니다. v3.8부터 Node.js가 `npx.cmd`를 직접 실행하지 않습니다. `scripts/run-wrangler.ps1`이 PowerShell에서 `npx.cmd`를 호출하고, Node.js 자동설정기는 PowerShell 프로세스만 실행합니다.

따라서 사용자는 수동 Wrangler 명령을 입력하지 말고 루트의 `SETUP_ONLINE.cmd`만 실행하면 됩니다.
