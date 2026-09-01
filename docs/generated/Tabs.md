# Tabs

> `packages/react/component-manifest.json`에서 자동 생성된 문서입니다. 직접 수정하지 마세요.

ARIA 탭 패턴과 가로·세로 키보드 탐색을 지원하는 제어형 및 비제어형 컴포넌트입니다.

- 패키지: `@aster-ui/react`
- 버전: `3.1.0-beta.2`
- 상태: beta
- 분류: Navigation
- 지원 플랫폼: Web
- 토큰 산출물: CSS, Swift, Compose
- HTML 속성 계약: `HTMLAttributes<HTMLDivElement>`
- ref 대상: `HTMLDivElement`

## 공개 API

| Prop | 타입 | 필수 | 기본값 |
| --- | --- | --- | --- |
| `items` | `readonly TabItem[]` | 예 | — |
| `value` | `string` | 아니요 | — |
| `defaultValue` | `string` | 아니요 | — |
| `onValueChange` | `(value: string) => void` | 아니요 | — |
| `ariaLabel` | `string` | 예 | — |
| `orientation` | `TabsOrientation` | 아니요 | `"horizontal"` |

## 필수 검증 명령

- 단위 테스트: `pnpm --filter @aster-ui/react test`
- API 호환성: `pnpm api:check`
- 브라우저 접근성: `pnpm test:visual`
