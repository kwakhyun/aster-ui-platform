# Alert

> 이 문서는 `packages/react/component-manifest.json`에서 자동 생성됩니다. 직접 수정하지 마세요.

상태의 긴급도에 맞는 라이브 리전과 선택적 해제 동작을 제공하는 알림입니다.

- 패키지: `@aster-ui/react`
- 버전: `3.1.0-beta.2`
- 상태: beta
- 카테고리: Feedback
- 컴포넌트 플랫폼: Web
- 토큰 산출물: CSS, Swift, Compose
- 표준 속성 계약: `HTMLAttributes<HTMLDivElement>`
- ref: `HTMLDivElement`

## API

| Prop | Type | Required | Default |
| --- | --- | --- | --- |
| `tone` | `AlertTone` | 아니요 | `"info"` |
| `title` | `ReactNode` | 예 | — |
| `action` | `ReactNode` | 아니요 | — |
| `dismissLabel` | `string` | 아니요 | `"알림 닫기"` |
| `onDismiss` | `() => void` | 아니요 | — |

## 필수 검증 명령

- unit: `pnpm --filter @aster-ui/react test`
- apiCompatibility: `pnpm api:check`
- browserAccessibility: `pnpm test:visual`
