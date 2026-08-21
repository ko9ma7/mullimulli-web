# Data source

이 디렉터리는 멀리멀리의 Git 저장소에서 사람이 직접 관리하는 **원본 데이터**입니다.

## `catalog.json`

거리 구간과 50가지 전달자의 서비스 규칙을 한곳에서 관리합니다.

주요 필드:

- `id`: 코드에서 사용하는 고유 식별자
- `name`, `emoji`, `kind`, `note`: UI 표시 정보
- `speed`: 서비스 내부 기준 속도(km/h)
- `minHours`: 거리와 상관없이 보장되는 최소 대기시간
- `routeFactor`: 직선거리보다 실제 여정이 길어지는 서비스 우회 계수
- `fail`: 0~1 사이 실패 확률
- `minKm`, `maxKm`: 추천 거리 범위
- `capsule`: 타임캡슐 계열 여부

`catalog.json`을 수정한 뒤 아래 명령을 실행하면 프런트와 Worker 규칙이 함께 갱신됩니다.

```bash
python scripts/sync_couriers.py
```

생성 파일은 직접 수정하지 않습니다.

- `docs/couriers.generated.js`
- `worker/src/couriers.generated.js`

## `site-meta.json`

사이트 설명, 공유 문구, GitHub Repository 설명/Topics, 아이콘 경로를 관리하는 참고 메타데이터입니다.
