# GitHub Repository 설정값 — ko9ma7/mullimulli-web

Repository: `https://github.com/ko9ma7/mullimulli-web`

## About → Description

> 거리와 전달자에 따라 메시지가 실제 시간 동안 여행하는 지연 메신저. 친구에게 느리게 보내는 편지, D-Day 여정 추적, 50가지 전달자와 타임캡슐을 제공합니다.

## About → Website

```text
https://ko9ma7.github.io/mullimulli-web/
```

## Topics

GitHub Repository → About → ⚙ → Topics에 아래 값을 추가하세요.

```text
delayed-messaging
slow-messaging
time-capsule
location-based
geolocation
messaging-app
social-app
friend-system
github-pages
cloudflare-workers
cloudflare-d1
serverless
pwa
vanilla-javascript
web-crypto
aes-gcm
privacy-by-design
responsive-design
korean-webapp
playful-ui
```

GitHub Topics는 최대 20개까지 등록할 수 있으므로 위 목록은 그대로 사용해도 됩니다.

## Social Preview

Repository → **Settings → General → Social preview → Edit**에서 아래 파일을 업로드합니다.

```text
docs/assets/repository-social-preview.png
```

## GitHub Actions Variable

Repository → **Settings → Secrets and variables → Actions → Variables**

```text
Name: MULLIMULLI_API_BASE_URL
Value: https://mullimulli-api.mullimulli-api.workers.dev
```

실제 Worker 주소가 다르면 자동설정기 결과에 표시된 Worker URL을 사용하세요.

## Pages

Repository → **Settings → Pages → Build and deployment → Source: GitHub Actions**

`.github/workflows/deploy.yml`이 `docs/` 폴더를 자동 배포합니다.

## GitHub CLI로 About/Topics 한 번에 설정

```bash
gh repo edit ko9ma7/mullimulli-web \
  --description "거리와 전달자에 따라 메시지가 실제 시간 동안 여행하는 지연 메신저. 친구에게 느리게 보내는 편지, D-Day 여정 추적, 50가지 전달자와 타임캡슐을 제공합니다." \
  --homepage "https://ko9ma7.github.io/mullimulli-web/" \
  --add-topic delayed-messaging \
  --add-topic slow-messaging \
  --add-topic time-capsule \
  --add-topic location-based \
  --add-topic geolocation \
  --add-topic messaging-app \
  --add-topic social-app \
  --add-topic friend-system \
  --add-topic github-pages \
  --add-topic cloudflare-workers \
  --add-topic cloudflare-d1 \
  --add-topic serverless \
  --add-topic pwa \
  --add-topic vanilla-javascript \
  --add-topic web-crypto \
  --add-topic aes-gcm \
  --add-topic privacy-by-design \
  --add-topic responsive-design \
  --add-topic korean-webapp \
  --add-topic playful-ui
```
