# Tabs

> 이 문서는 `packages/react/component-manifest.json`에서 자동 생성됩니다. 직접 수정하지 마세요.

ARIA 탭 패턴과 방향별 키보드 이동을 지원하는 제어 및 비제어 탐색 컴포넌트입니다.

- 패키지: `@aster-ui/react`
- 버전: `3.1.0-beta.2`
- 상태: beta
- 카테고리: Navigation
- 컴포넌트 플랫폼: Web
- 토큰 산출물: CSS, Swift, Compose
- 표준 속성 계약: `HTMLAttributes<HTMLDivElement>`
- ref: `HTMLDivElement`

## API

| Prop | Type | Required | Default |
| --- | --- | --- | --- |
| `items` | `readonly TabItem[]` | 예 | — |
| `value` | `string` | 아니요 | — |
| `defaultValue` | `string` | 아니요 | — |
| `onValueChange` | `(value: string) => void` | 아니요 | — |
| `ariaLabel` | `string` | 예 | — |
| `orientation` | `TabsOrientation` | 아니요 | `"horizontal"` |

## 필수 검증 명령

- unit: `pnpm --filter @aster-ui/react test`
- apiCompatibility: `pnpm api:check`
- browserAccessibility: `pnpm test:visual`
