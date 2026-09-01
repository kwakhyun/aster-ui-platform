# Button

> `packages/react/component-manifest.json`에서 자동 생성된 문서입니다. 직접 수정하지 마세요.

기본 버튼 동작과 명확한 포커스 표시를 유지하는 버튼 컴포넌트입니다.

- 패키지: `@aster-ui/react`
- 버전: `3.1.0-beta.2`
- 상태: beta
- 분류: Actions
- 지원 플랫폼: Web
- 토큰 산출물: CSS, Swift, Compose
- HTML 속성 계약: `ButtonHTMLAttributes<HTMLButtonElement>`
- ref 대상: `HTMLButtonElement`

## 공개 API

| Prop | 타입 | 필수 | 기본값 |
| --- | --- | --- | --- |
| `tone` | `ButtonTone` | 아니요 | `"primary"` |
| `size` | `ButtonSize` | 아니요 | `"md"` |
| `leadingIcon` | `ReactNode` | 아니요 | — |

## 필수 검증 명령

- 단위 테스트: `pnpm --filter @aster-ui/react test`
- API 호환성: `pnpm api:check`
- 브라우저 접근성: `pnpm test:visual`
