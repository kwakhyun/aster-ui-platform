# Button

> 이 문서는 `packages/react/component-manifest.json`에서 자동 생성됩니다. 직접 수정하지 마세요.

네이티브 버튼 계약과 포커스 가시성을 보존하는 기본 액션 컴포넌트입니다.

- 패키지: `@aster-ui/react`
- 버전: `3.1.0-beta.2`
- 상태: beta
- 카테고리: Actions
- 컴포넌트 플랫폼: Web
- 토큰 산출물: CSS, Swift, Compose
- 표준 속성 계약: `ButtonHTMLAttributes<HTMLButtonElement>`
- ref: `HTMLButtonElement`

## API

| Prop | Type | Required | Default |
| --- | --- | --- | --- |
| `tone` | `ButtonTone` | 아니요 | `"primary"` |
| `size` | `ButtonSize` | 아니요 | `"md"` |
| `leadingIcon` | `ReactNode` | 아니요 | — |

## 필수 검증 명령

- unit: `pnpm --filter @aster-ui/react test`
- apiCompatibility: `pnpm api:check`
- browserAccessibility: `pnpm test:visual`
