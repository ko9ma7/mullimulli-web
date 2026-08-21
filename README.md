> **v3.7 온라인 배포/편지 활성화 수정**: 자동설정기가 Worker/D1만 만들고 원격 GitHub에 최신 프로젝트가 없으면 사이트가 계속 `로컬 데모`로 남던 문제를 수정했습니다. 이제 `SETUP_ONLINE.cmd`가 현재 프로젝트 전체와 `.github/workflows/deploy.yml`을 `ko9ma7/mullimulli-web`에 자동 업로드하고 Pages 배포 성공까지 확인합니다. 온라인 편지 버튼은 친구의 공개 `updatedAt` 값이 아니라 서버의 거리 계산 성공 여부를 기준으로 활성화되어, 위치 업데이트 시각을 비공개로 해도 정상 발송됩니다.


> **v3.7 Windows 자동설정 개선**: Wrangler 4.x가 JSON 출력을 캡처하는 명령을 비대화식 환경으로 판단해 `CLOUDFLARE_API_TOKEN`을 요구하는 경우가 있습니다. 자동설정기는 `wrangler auth token --json`으로 이미 승인된 OAuth 세션 토큰을 현재 프로세스에만 임시 전달해 이 오류를 자동 처리합니다. 토큰은 프로젝트 파일이나 GitHub에 저장하지 않습니다.

# 멀리멀리 (MulliMulli)

**느리게, 멀리, 마음을 전하세요.**

멀리멀리는 메시지가 즉시 도착하지 않고, **발송 순간의 두 사용자 마지막 위치**, **선택한 전달자의 서비스 기준 속도**, **최소 대기시간**, **우회 계수**, **실패 확률**에 따라 실제 시간을 기다리는 메시지 웹서비스입니다.

한 번 출발한 메시지는 사용자가 취소하거나 목적지를 바꿀 수 없습니다. 매우 느린 전달자를 선택하면 수개월~수년, 길게는 10년 이상 기다리는 타임캡슐이 됩니다.


## 가장 쉬운 온라인 계정 연결 (Windows)

**명령어를 직접 입력할 필요가 없습니다.** ZIP을 압축 해제한 뒤 프로젝트 루트의 아래 파일을 더블클릭하세요.

```text
SETUP_ONLINE.cmd
```

또는 한글 바로가기:

```text
온라인계정_자동설정.cmd
```

자동 설정 프로그램이 다음을 순서대로 처리합니다.

1. Node.js LTS / GitHub CLI가 없으면 `winget`으로 설치 시도
2. Cloudflare 로그인 창 열기
3. `mullimulli-db` D1 생성 또는 기존 DB 재사용
4. `wrangler.toml`의 D1 ID와 GitHub Pages CORS 자동 입력
5. 신규/기존 DB 스키마 자동 판별 및 필요한 컬럼만 보완
6. 기존 `MESSAGE_KEY`는 보존하고, 없을 때만 새 암호화 키 생성
7. Worker 배포 및 `/api/health` 확인
8. GitHub 로그인 창 열기
9. Repository Actions Variable `MULLIMULLI_API_BASE_URL` 자동 등록
10. GitHub Pages를 Workflow 방식으로 준비하고 `deploy.yml` 재실행
11. 완료 후 사이트 자동 열기

보안상 **Cloudflare와 GitHub의 브라우저 로그인 승인만 사용자가 직접 해야 합니다.** 이미 로그인되어 있으면 그 단계도 자동으로 건너뜁니다. 같은 파일을 다시 실행해도 기존 D1과 암호화 키를 재사용하도록 만들었습니다.

## Preview

- 데스크톱/모바일 반응형 웹앱
- 전달자 선택 → 받는 사람 → 메시지 → ETA 확인 → 취소 불가 확인 → 발송
- GitHub Pages 단독 데모와 Cloudflare Worker + D1 온라인 모드 지원
- 샘플 친구를 자동 생성하지 않음
- 데모 모드에서는 **관리자 테스트 우편함**만 별도로 제공해 내 위치 기준 500m~12,000km 가상 거리로 규칙을 테스트할 수 있음

## Features

- 고유 `@아이디` + 닉네임 가입/로그인
- 프로필 설정: 닉네임, 프로필 아이콘, 한 줄 소개
- 프로필 공개 범위: 검색 노출, 친구 추가 허용, 위치 업데이트 시각 공개 여부
- 신규 계정의 기본 친구 **0명**
- `@아이디`·아이디·닉네임 친구 검색 및 친구 추가
- 친구 추가 시 양쪽 친구 목록에 연결되는 상호 친구 모델
- 브라우저 Geolocation API로 명시적 위치 업데이트
- 위치 좌표는 친구 화면에 직접 노출하지 않고 거리 계산에만 사용
- **50가지 전달자**: 동물, 곤충, 사물, 자연, 판타지, 타임캡슐
- 거리 구간: 0~3 / 3~15 / 15~50 / 50~200 / 200~800 / 800~2,500 / 2,500km+
- 서비스 시간 = `max(최소 대기시간, 거리 × 우회계수 ÷ 기준속도)`
- 발송 순간 출발·도착 위치 스냅샷 고정
- 전달자별 실패 확률 및 여정 중간 실패 시점
- 발송 후 취소/수정/Delete API 없음
- 수신자는 도착 전 메시지 본문 열람 불가
- Worker 모드에서 메시지 본문 AES-GCM 암호화 저장
- LocalStorage 데모 영속 저장
- Light / Dark 모드
- PWA manifest, favicon 세트, Apple icon, maskable icon, OG image, 404, robots, sitemap
- GitHub Actions 자동 Pages 배포

## 시간 규칙

이전 데모는 긴 배송을 빠르게 확인하기 위해 86,400× 배속이었지만, 현재 기본값은 **1×**입니다. 즉 데모에서도 표시된 서비스 시간이 그대로 흐릅니다.

각 전달자는 단순 `거리 ÷ 속도`만 쓰지 않습니다. 가까운 거리도 몇 분 만에 끝나지 않도록 `minHours`와 `routeFactor`를 적용합니다.

예를 들어 비둘기는 기준 속도 18km/h, 최소 6시간, 우회계수 1.32를 사용합니다. 2km 거리라도 최소 6시간이 걸립니다.

QA에서만 시간을 빠르게 확인하고 싶다면 `docs/config.js`의 `demoTimeAcceleration` 값을 임시로 높일 수 있습니다. 배포용 기본값은 1을 권장합니다.

## 50가지 전달자 데이터

전달자 규칙은 코드에 흩어놓지 않고 다음 파일을 원본으로 관리합니다.

```text
data/catalog.json
```

수정 후:

```bash
python scripts/sync_couriers.py
```

을 실행하면 아래 파일이 함께 생성됩니다.

```text
docs/couriers.generated.js
worker/src/couriers.generated.js
```

따라서 프런트와 백엔드의 속도/최소시간/실패확률이 서로 달라지는 문제를 줄였습니다.

## v3에서 수정한 친구/프로필 문제

사용자 테스트에서 확인된 두 문제를 v3에서 분리해 수정했습니다.

1. **예전 샘플 친구가 계속 남는 문제**
   - 이전 LocalStorage v2에 `sunnyday`, `windcloud`, `moonstar` 등이 저장되어 있으면 새 코드만 배포해도 브라우저에 계속 남았습니다.
   - v3 데이터 마이그레이션은 이 레거시 샘플 사용자와 연결만 제거하고, 사용자가 직접 만든 계정과 메시지는 보존합니다.

2. **부계정이 검색되지 않는 문제**
   - GitHub Pages 단독 모드는 LocalStorage이므로 계정 데이터가 브라우저마다 완전히 분리됩니다.
   - Chrome에서 만든 `@ko9ma7`은 다른 브라우저, 시크릿 창, 휴대폰의 LocalStorage에서는 존재하지 않습니다. 따라서 서로 검색할 수 없는 것이 브라우저 저장 구조의 한계입니다.
   - 실제 여러 기기에서 검색/친구 추가를 하려면 아래의 **Cloudflare Worker + D1**을 배포하고 Pages에 API 주소를 연결해야 합니다.

친구 화면에는 현재 `로컬 데모 모드`인지 `온라인 계정 연결됨`인지 명확하게 표시됩니다.

### 기존 D1 사용자는 프로필 마이그레이션 적용

이미 v2 D1 데이터베이스를 만들었다면 새 프로필 필드를 추가해야 합니다.

```bash
cd worker
npx wrangler@latest d1 execute mullimulli-db --file=./migrations/0002_profile_settings.sql --remote --yes
npx wrangler@latest deploy
```

그 다음 GitHub Repository의 **Settings → Secrets and variables → Actions → Variables**에 아래 값을 등록합니다.

```text
MULLIMULLI_API_BASE_URL=https://YOUR-WORKER.workers.dev
```

`main`에 다시 push하면 `docs/config.js`에 API 주소가 주입되어 실제 멀티유저 모드로 배포됩니다.

## Demo Test Model

기본 샘플 친구는 없습니다.

데모 계정:

```text
ID: starlight
PIN: 123456
```

친구 목록은 0명으로 시작합니다. 보내기 화면의 **관리자 테스트 우편함**은 친구가 아니라 테스트 전용 시스템 대상입니다.

관리자까지의 가상 거리를 내 위치 기준으로 선택할 수 있습니다.

```text
500m / 2km / 8km / 25km / 80km / 300km / 1,000km / 5,000km / 12,000km
```

이를 이용하면 가짜 친구 여러 명을 만들지 않고도 거리별 ETA와 추천 전달자를 확인할 수 있습니다.

## Tech Stack

### Frontend

- HTML5
- CSS3
- Vanilla JavaScript
- LocalStorage
- Geolocation API
- PWA metadata

### Production backend

- Cloudflare Workers
- Cloudflare D1
- Web Crypto API: PBKDF2, AES-GCM, SHA-256

정적 GitHub Pages만으로는 서로 다른 기기의 사용자 계정·마지막 위치·메시지 상태를 공유할 수 없기 때문에 실제 멀티유저 기능은 Serverless API를 사용합니다.

## Project Structure

```text
/
├─ data/
│  ├─ catalog.json
│  ├─ site-meta.json
│  └─ README.md
├─ docs/
│  ├─ index.html
│  ├─ styles.css
│  ├─ app.js
│  ├─ config.js
│  ├─ couriers.generated.js
│  ├─ manifest.webmanifest
│  ├─ robots.txt
│  ├─ sitemap.xml
│  ├─ 404.html
│  └─ assets/
├─ worker/
│  ├─ src/index.js
│  ├─ src/couriers.generated.js
│  ├─ schema.sql
│  └─ wrangler.toml
├─ scripts/
│  ├─ configure_site.py
│  └─ sync_couriers.py
├─ .github/
│  ├─ workflows/deploy.yml
│  └─ REPOSITORY_SETUP.md
├─ SITE_METADATA.md
├─ .nojekyll
└─ README.md
```

## Local Development

별도 번들 빌드는 필요 없습니다.

```bash
python scripts/sync_couriers.py
python -m http.server 8080 -d docs
```

브라우저에서:

```text
http://localhost:8080/
```

## Validation

```bash
python scripts/sync_couriers.py
node --check docs/app.js
node --check docs/couriers.generated.js
node --check worker/src/index.js
node --check worker/src/couriers.generated.js
```

## GitHub Pages Deployment

1. 새 GitHub Repository를 생성합니다.
2. 프로젝트 전체를 `main` 브랜치에 올립니다.
3. Repository → **Settings → Pages**로 이동합니다.
4. Source를 **GitHub Actions**로 선택합니다.
5. `main`에 push하면 `.github/workflows/deploy.yml`이 `docs/` 폴더를 배포합니다.

배포 주소 예:

```text
https://USERNAME.github.io/REPOSITORY/
```

Workflow는 배포 전에 `data/catalog.json`을 동기화하고 JavaScript 및 필수 정적 자산을 검증합니다.

v3에서는 `styles.css`, `config.js`, `couriers.generated.js`, `app.js`에 `?v=3.0.0` 캐시 버전을 붙여 예전 86,400× 데모 JavaScript가 브라우저 캐시에 남아 표시되는 문제도 방지합니다.

## Pages URL Configuration

```bash
python scripts/configure_site.py --owner YOUR_GITHUB_ID --repo YOUR_REPOSITORY
```

Worker까지 연결한다면:

```bash
python scripts/configure_site.py \
  --owner YOUR_GITHUB_ID \
  --repo YOUR_REPOSITORY \
  --api https://YOUR-WORKER.workers.dev
```

또는 GitHub Actions Variable `MULLIMULLI_API_BASE_URL`에 Worker URL을 등록할 수 있습니다.

## Online Multi-user Backend

Windows에서는 **수동 명령보다 `SETUP_ONLINE.cmd` 사용을 권장**합니다. 프로젝트 경로와 상관없이 파일 위치를 기준으로 실행하므로 `cd worker`에서 막힐 필요가 없습니다. 자세한 수동 복구 절차는 [ONLINE_ACCOUNT_SETUP_WINDOWS.md](./ONLINE_ACCOUNT_SETUP_WINDOWS.md)에 남겨두었습니다.

### 자동 설정

```text
SETUP_ONLINE.cmd 더블클릭
```

이 스크립트는 Wrangler를 전역 설치하지 않고 `npx --yes wrangler@latest`로 실행합니다. D1이 이미 있으면 재사용하고, 기존 `MESSAGE_KEY` Secret도 덮어쓰지 않습니다. GitHub 저장소를 현재 Git remote에서 찾지 못하는 경우에만 `owner/repository`를 한 번 입력받습니다.

### 수동 실행이 필요한 경우

자동 설정이 특정 PC 정책 때문에 중단된 경우에만 아래 문서를 사용하세요.

```text
ONLINE_ACCOUNT_SETUP_WINDOWS.md
```

## Data / Privacy Model

- 현재 위치를 백그라운드에서 계속 추적하지 않습니다.
- 사용자가 `위치 업데이트`를 눌렀을 때만 위치를 저장합니다.
- 친구 목록/검색 결과에 실제 좌표를 공개하지 않습니다.
- 발송 순간의 마지막 위치로 거리를 계산하고 이후 위치 변화는 해당 편지에 반영하지 않습니다.
- 메시지 본문은 Worker 모드에서 AES-GCM으로 암호화합니다.
- 수신자는 도착 이전에는 본문을 API에서 받을 수 없습니다.
- 실패한 메시지는 수신자에게 본문을 반환하지 않습니다.
- 메시지 DELETE / cancel API는 없습니다.

## Courier Rule Fields

`data/catalog.json`의 주요 필드:

| 필드 | 의미 |
|---|---|
| `speed` | 서비스 내부 기준속도 km/h |
| `minHours` | 최소 대기시간 |
| `routeFactor` | 직선거리 대비 우회/휴식 계수 |
| `fail` | 실패확률 0~1 |
| `minKm`, `maxKm` | 추천 거리 |
| `capsule` | 장기 타임캡슐 계열 여부 |

표시된 속도는 실제 동물 생태학적 평균속도를 주장하는 값이 아니라 **서비스 게임 규칙**입니다.

## Site Metadata / Link Preview

사이트 설명, 링크 공유 문구, 아이콘 목록은 다음 문서에 정리되어 있습니다.

```text
SITE_METADATA.md
data/site-meta.json
```

주요 이미지:

- `docs/assets/og-image.png` — Open Graph 1200×630
- `docs/assets/repository-social-preview.png` — GitHub Social Preview 1280×640

즐겨찾기/PWA 아이콘:

- `favicon.svg`
- `favicon.ico`
- `favicon-16.png`
- `favicon-32.png`
- `favicon-48.png`
- `apple-touch-icon.png`
- `icon-192.png`
- `icon-512.png`
- `maskable-icon-512.png`

## GitHub Repository About / Topics

복사해서 사용할 Repository 설명, Website, Topics, GitHub CLI 명령은:

```text
.github/REPOSITORY_SETUP.md
```

추천 Topics:

```text
delayed-messaging
location-based
time-capsule
web-messaging
social-app
geolocation
github-pages
cloudflare-workers
cloudflare-d1
pwa
vanilla-javascript
static-webapp
korean-webapp
playful-ui
privacy-by-design
```

## Custom Domain

GitHub Pages Settings에서 Custom Domain을 등록하고 HTTPS를 활성화합니다. 필요하면 `docs/CNAME`에 도메인 한 줄을 넣습니다.

Worker의 `ALLOWED_ORIGINS`에도 새 도메인 origin을 추가해야 합니다.

## License

MIT License. 단, 서비스 운영 시 개인정보·위치정보·메시지 보관정책은 실제 운영 환경에 맞는 별도 약관과 개인정보처리방침을 준비해야 합니다.
