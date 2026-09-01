# TextField

> 이 문서는 `packages/react/component-manifest.json`에서 자동 생성됩니다. 직접 수정하지 마세요.

레이블, 도움말, 오류 메시지의 접근성 연결을 보장하는 텍스트 입력 필드입니다.

- 패키지: `@aster-ui/react`
- 버전: `3.1.0-beta.2`
- 상태: beta
- 카테고리: Form
- 컴포넌트 플랫폼: Web
- 토큰 산출물: CSS, Swift, Compose
- 표준 속성 계약: `InputHTMLAttributes<HTMLInputElement>`
- ref: `HTMLInputElement`

## API

| Prop | Type | Required | Default |
| --- | --- | --- | --- |
| `label` | `string` | 예 | — |
| `hint` | `string` | 아니요 | — |
| `error` | `string` | 아니요 | — |
| `hideLabel` | `boolean` | 아니요 | `false` |
| `fieldSize` | `TextFieldSize` | 아니요 | `"md"` |

## 필수 검증 명령

- unit: `pnpm --filter @aster-ui/react test`
- apiCompatibility: `pnpm api:check`
- browserAccessibility: `pnpm test:visual`
