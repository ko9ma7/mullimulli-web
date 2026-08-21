# 멀리멀리 사이트·링크 설명 자료

## 서비스명

**멀리멀리 (MulliMulli)**

## 한 줄 문구

**느리게, 멀리, 마음을 전하세요.**

## 링크 공유용 짧은 설명

친구를 고르고 전달자를 선택하면 메시지가 즉시 도착하지 않고 실제 시간 동안 여행합니다. D-Day와 남은 시간, 정확한 도착 예정일을 확인하며 기다리는 메시지 서비스입니다.

## 검색/OG용 설명

비둘기, 곤충, 종이비행기, 열차, 범선, 타임캡슐 등 50가지 전달자를 골라 보내는 사람과 받는 사람의 마지막 위치 사이 거리와 서비스 규칙에 따라 도착 시간이 결정되는 지연 메시지 웹서비스입니다. 한 번 출발한 편지는 취소할 수 없으며, 여정 화면에서 D-Day·남은 시간·도착 예정일·진행률을 확인할 수 있습니다.

## v4.0 핵심 UI

- 받는 사람, 메시지, 전달자 선택을 **하나의 보내기 화면**에 통합
- 기본 추천 전달자 6개만 노출하고 필요 시 전체 50개 확장
- 전달자 선택 즉시 성공률, 거리, 예상 소요 시간 갱신
- 발송 전 **D-Day / 남은 시간 / 정확한 도착 예정 날짜·시각** 표시
- 진행 중인 여정 카드에도 D-Day, 남은 시간, 진행률, 도착 예정일 표시
- 전달자를 바꾸거나 화면을 다시 렌더링해도 작성 중 메시지 유지
- PC 2열 작업공간 / 모바일 1열 단계형 작업공간

## 계정·친구·프로필

- 닉네임 + 고유 `@아이디` 계정
- 친구 검색/추가, 기본 친구 0명
- 상대에게 보이는 프로필: 닉네임, 아이콘, 한 줄 소개
- 공개 범위: 검색 노출, 친구 추가 허용, 위치 업데이트 시각 공개
- 온라인 모드: Cloudflare Worker + D1 공유 계정
- 데모 모드: 같은 브라우저 LocalStorage에서만 계정 공유

## 브라우저/즐겨찾기 아이콘

| 용도 | 파일 |
|---|---|
| SVG favicon | `docs/assets/favicon.svg` |
| ICO favicon | `docs/assets/favicon.ico` |
| 16×16 | `docs/assets/favicon-16.png` |
| 32×32 | `docs/assets/favicon-32.png` |
| 48×48 | `docs/assets/favicon-48.png` |
| Apple Touch 180×180 | `docs/assets/apple-touch-icon.png` |
| PWA 192×192 | `docs/assets/icon-192.png` |
| PWA 512×512 | `docs/assets/icon-512.png` |
| Maskable 512×512 | `docs/assets/maskable-icon-512.png` |

## 링크 공유 이미지

- Open Graph: `docs/assets/og-image.png` — 1200×630
- GitHub Repository Social Preview: `docs/assets/repository-social-preview.png` — 1280×640

## GitHub Repository

- Repository: `https://github.com/ko9ma7/mullimulli-web`
- Website: `https://ko9ma7.github.io/mullimulli-web/`

## 추천 GitHub Topics

`delayed-messaging`, `slow-messaging`, `time-capsule`, `location-based`, `geolocation`, `messaging-app`, `social-app`, `friend-system`, `github-pages`, `cloudflare-workers`, `cloudflare-d1`, `serverless`, `pwa`, `vanilla-javascript`, `web-crypto`, `aes-gcm`, `privacy-by-design`, `responsive-design`, `korean-webapp`, `playful-ui`
