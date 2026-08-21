# 멀리멀리 (MulliMulli)

메시지가 즉시 도착하지 않고 **발송 순간의 두 사용자 마지막 위치**, **선택한 전달자의 서비스 기준 속도**, **전달자별 실패 확률**에 따라 실제 시간을 기다리는 메시지 웹서비스입니다.

한 번 출발한 메시지는 사용자가 취소하거나 목적지를 바꿀 수 없습니다. 매우 느린 전달자를 선택하면 장거리 편지가 수개월~수년 뒤에 도착하는 타임캡슐이 됩니다.

## Preview

- 데스크톱: 전달자 선택 → 친구 선택 → 메시지 작성 → 예상 여정 확인 → 취소 불가 확인 → 발송
- 모바일: 동일한 기능을 하단 내비게이션으로 제공
- 데모 모드: GitHub Pages만 올려도 한 브라우저에서 전체 UI와 메시지 상태 변화를 체험 가능
- 온라인 모드: 포함된 Cloudflare Worker + D1을 배포하면 서로 다른 사용자가 실제로 가입하고 메시지를 주고받을 수 있음

## Features

- 고유 `@아이디` + 닉네임 가입/로그인
- 아이디·닉네임 친구 검색 및 친구 추가
- 브라우저 Geolocation API로 **명시적 위치 업데이트**
- 위치 좌표는 친구 화면에 직접 노출하지 않고 서버 거리 계산에만 사용
- 비둘기 / 종이비행기 / 나비 / 꿀벌 / 고슴도치 / 거북이 / 달팽이 전달자
- 거리 ÷ 서비스 기준 속도로 배송시간 계산
- 발송 시 출발·도착 좌표 스냅샷 고정
- 전달자별 실패 확률 및 여정 중간 실패 시점
- 발송 후 취소/수정/Delete API 없음
- 수신자는 도착 전 메시지 본문 열람 불가
- Worker 모드에서 메시지 본문 AES-GCM 암호화 저장
- 로컬 데모는 LocalStorage 영속 저장
- Light / Dark 모드
- PWA manifest, favicon, Apple icon, OG image, 404, robots, sitemap
- GitHub Actions 자동 Pages 배포

## Tech Stack

### Frontend

- HTML5
- CSS3
- Vanilla JavaScript ES Modules
- LocalStorage
- Geolocation API
- Web Crypto API

프런트는 외부 라이브러리 없이 구성했습니다. 따라서 GitHub Pages 하위 경로에서도 별도 빌드 없이 안정적으로 동작합니다.

### Production backend

- Cloudflare Workers
- Cloudflare D1
- Web Crypto API (PBKDF2, AES-GCM, SHA-256)

정적 GitHub Pages만으로는 **서로 다른 기기의 사용자 계정·마지막 위치·메시지 상태를 공유할 수 없기 때문에**, 실제 멀티유저 기능은 Serverless API가 필요합니다.

## Project Structure

```text
/
├─ site/
│  ├─ index.html
│  ├─ styles.css
│  ├─ app.js
│  ├─ config.js
│  ├─ manifest.webmanifest
│  ├─ robots.txt
│  ├─ sitemap.xml
│  ├─ 404.html
│  └─ assets/
├─ worker/
│  ├─ src/index.js
│  ├─ schema.sql
│  └─ wrangler.toml
├─ .github/workflows/deploy.yml
├─ .nojekyll
└─ README.md
```

## Local Development

프런트는 빌드가 필요 없습니다.

```bash
python -m http.server 8080 -d site
```

브라우저에서 `http://localhost:8080/` 접속.

데모 계정:

```text
ID: starlight
PIN: 123456
```

데모는 긴 배송을 체험할 수 있도록 서비스 시간이 86,400배 빠르게 흐릅니다. 실제 온라인 모드는 배속 없이 실제 서비스 시간으로 계산합니다.

## Build

별도 번들 빌드는 없습니다. 배포 아티팩트는 `site/` 디렉터리 자체입니다.

정적 파일 검증 예:

```bash
node --check site/app.js
```

## GitHub Pages Deployment

1. 새 GitHub Repository를 만듭니다.
2. 이 프로젝트 전체를 업로드하고 기본 브랜치를 `main`으로 둡니다.
3. Repository → **Settings → Pages**로 이동합니다.
4. Source를 **GitHub Actions**로 선택합니다.
5. `main`에 push하면 `.github/workflows/deploy.yml`이 `site/`를 자동 배포합니다.

배포 주소 예:

```text
https://USERNAME.github.io/REPOSITORY/
```

### 배포 전 메타 URL 변경

가장 빠른 방법은 설정 스크립트를 실행하는 것입니다.

```bash
python scripts/configure_site.py --owner YOUR_GITHUB_ID --repo YOUR_REPOSITORY
```

Worker까지 이미 배포했다면:

```bash
python scripts/configure_site.py --owner YOUR_GITHUB_ID --repo YOUR_REPOSITORY --api https://YOUR-WORKER.workers.dev
```

또는 아래 파일의 `USERNAME`과 `REPOSITORY`를 직접 실제 값으로 바꾸세요.

- `site/index.html`
- `site/config.js`
- `site/robots.txt`
- `site/sitemap.xml`

이는 계정별 GitHub Pages 주소가 프로젝트 생성 전에는 정해질 수 없기 때문에 필요한 배포 설정입니다.

## Online Multi-user Backend

### 1. Wrangler 설치/로그인

```bash
npm install -g wrangler
wrangler login
```

### 2. D1 생성

```bash
cd worker
wrangler d1 create mullimulli-db
```

출력된 `database_id`를 `worker/wrangler.toml`의 `database_id`에 넣습니다.

### 3. Schema 적용

```bash
wrangler d1 execute mullimulli-db --file=./schema.sql --remote
```

### 4. 메시지 암호화 키 등록

32바이트 랜덤 키를 Base64로 만들고 Worker secret으로 등록합니다.

```bash
openssl rand -base64 32
wrangler secret put MESSAGE_KEY
```

키는 JavaScript, GitHub Pages, Git 저장소에 넣지 마세요.

### 5. CORS 허용 출처 변경

`worker/wrangler.toml`의 `ALLOWED_ORIGINS`를 실제 Pages 주소의 origin으로 바꿉니다.

예:

```toml
ALLOWED_ORIGINS = "http://localhost:8080,https://USERNAME.github.io"
```

### 6. Worker 배포

```bash
wrangler deploy
```

예: `https://mullimulli-api.<account>.workers.dev`

### 7. Frontend 연결

`site/config.js`:

```js
window.MULLIMULLI_CONFIG = {
  serviceName: '멀리멀리',
  apiBaseUrl: 'https://mullimulli-api.<account>.workers.dev',
  demoTimeAcceleration: 86400,
  siteUrl: 'https://USERNAME.github.io/REPOSITORY/'
};
```

이후 GitHub Pages를 다시 배포하면 실제 멀티유저 모드로 작동합니다.

GitHub에서 코드를 직접 수정하지 않고 연결하려면 Repository → Settings → Secrets and variables → Actions → **Variables**에 `MULLIMULLI_API_BASE_URL` 이름으로 Worker URL을 등록해도 됩니다. 배포 워크플로가 이 값을 읽어 `site/config.js`에 자동 반영합니다.

## Data / Privacy Model

- 현재 위치를 백그라운드에서 계속 추적하지 않습니다. 저장 시 약 100m 단위로 좌표를 축약합니다.
- 사용자가 `위치 업데이트`를 눌렀을 때만 최신 좌표를 저장합니다.
- 친구 검색 결과에는 실제 좌표를 반환하지 않습니다.
- 발송 순간의 보내는 사람/받는 사람 마지막 위치로 거리를 계산하고, 메시지 레코드에는 원 좌표를 중복 저장하지 않고 거리와 도착 시간만 고정합니다.
- 메시지 본문은 AES-GCM으로 암호화해 D1에 저장합니다.
- 수신자는 `arrival_at` 이전에는 본문을 API에서 받을 수 없습니다.
- 실패한 메시지는 수신자에게 본문을 반환하지 않습니다.
- 메시지 DELETE / cancel API는 존재하지 않습니다.

## Courier Rules

| 전달자 | 기준속도 | 실패확률 | 용도 |
|---|---:|---:|---|
| 비둘기 | 60 km/h | 8% | 균형형 |
| 종이비행기 | 120 km/h | 16% | 빠른 편지 |
| 나비 | 12 km/h | 18% | 느린 편지 |
| 꿀벌 | 24 km/h | 12% | 보통 |
| 고슴도치 | 4 km/h | 10% | 매우 느림 |
| 거북이 | 0.7 km/h | 6% | 타임캡슐 |
| 달팽이 | 0.03 km/h | 3% | 초장기 타임캡슐 |

위 속도는 실제 동물의 생태학적 평균속도를 주장하는 값이 아니라 **서비스 내 게임 규칙**입니다.

## Configuration

`site/config.js`에서 다음 항목을 바꿀 수 있습니다.

- `serviceName`
- `apiBaseUrl`
- `demoTimeAcceleration`
- `siteUrl`

전달자 속도와 실패 확률은 프런트 UI와 `worker/src/index.js` 양쪽에 정의되어 있으며, 온라인 모드에서는 서버 값이 최종 규칙입니다.

## Custom Domain

GitHub Pages에 Custom Domain을 연결할 경우 Repository Settings → Pages에서 도메인을 등록하고 HTTPS를 활성화하세요. 필요하면 `site/CNAME`에 도메인 한 줄을 넣습니다.

Worker의 `ALLOWED_ORIGINS`에도 새 도메인 origin을 추가해야 합니다.

## Social Preview

- `site/assets/og-image.png` — 1200×630
- `site/assets/repository-social-preview.png` — 1280×640

GitHub Repository → Settings → Social preview에서 `repository-social-preview.png`를 업로드할 수 있습니다.

## Security Notes

- `MESSAGE_KEY`는 반드시 Worker Secret으로 저장합니다.
- 브라우저 코드에는 API Secret, Private Key, GitHub PAT 등을 넣지 않습니다.
- 계정 비밀번호/PIN은 PBKDF2-SHA-256으로 파생해 저장합니다.
- 실서비스라면 추가로 rate limit, abuse report, 계정 복구, 관리자 moderation, 데이터 보존/삭제 정책을 마련하는 것을 권장합니다.

## License

프로젝트 코드에는 MIT License를 적용하기 적합합니다. 서비스명·일러스트·브랜드 자산은 실제 공개 전 별도 브랜드 정책을 정하는 것을 권장합니다.


## QA Evidence

`qa/` 폴더에는 실제 브라우저 자동화로 확인한 데스크톱/모바일 캡처와 `qa-report.json`이 포함되어 있습니다. 320, 375, 390, 430, 768, 1024, 1440 px에서 문서 수준 가로 오버플로가 없음을 확인했습니다.
