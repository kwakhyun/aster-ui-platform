# Alert

> `packages/react/component-manifest.json`에서 자동 생성된 문서입니다. 직접 수정하지 마세요.

중요도에 맞는 라이브 리전과 선택형 닫기 동작을 제공하는 알림 컴포넌트입니다.

- 패키지: `@aster-ui/react`
- 버전: `3.1.0-beta.2`
- 상태: beta
- 분류: Feedback
- 지원 플랫폼: Web
- 토큰 산출물: CSS, Swift, Compose
- HTML 속성 계약: `HTMLAttributes<HTMLDivElement>`
- ref 대상: `HTMLDivElement`

## 공개 API

| Prop | 타입 | 필수 | 기본값 |
| --- | --- | --- | --- |
| `tone` | `AlertTone` | 아니요 | `"info"` |
| `title` | `ReactNode` | 예 | — |
| `action` | `ReactNode` | 아니요 | — |
| `dismissLabel` | `string` | 아니요 | `"알림 닫기"` |
| `onDismiss` | `() => void` | 아니요 | — |

## 필수 검증 명령

- 단위 테스트: `pnpm --filter @aster-ui/react test`
- API 호환성: `pnpm api:check`
- 브라우저 접근성: `pnpm test:visual`
