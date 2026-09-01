# Badge

> 이 문서는 `packages/react/component-manifest.json`에서 자동 생성됩니다. 직접 수정하지 마세요.

짧은 상태와 분류 정보를 토큰 기반 톤으로 표시하는 인라인 레이블입니다.

- 패키지: `@aster-ui/react`
- 버전: `3.1.0-beta.2`
- 상태: beta
- 카테고리: Feedback
- 컴포넌트 플랫폼: Web
- 토큰 산출물: CSS, Swift, Compose
- 표준 속성 계약: `HTMLAttributes<HTMLSpanElement>`
- ref: `HTMLSpanElement`

## API

| Prop | Type | Required | Default |
| --- | --- | --- | --- |
| `tone` | `BadgeTone` | 아니요 | `"neutral"` |
| `size` | `BadgeSize` | 아니요 | `"md"` |

## 필수 검증 명령

- unit: `pnpm --filter @aster-ui/react test`
- apiCompatibility: `pnpm api:check`
- browserAccessibility: `pnpm test:visual`
