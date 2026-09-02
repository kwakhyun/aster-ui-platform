# TextField

> `packages/react/component-manifest.json`에서 자동 생성된 문서입니다. 직접 수정하지 마세요.

레이블, 도움말, 오류 메시지를 접근성 속성으로 입력 요소와 연결하는 텍스트 필드입니다.

- 패키지: `@aster-ui/react`
- 버전: `3.1.0-beta.2`
- 상태: beta
- 분류: Form
- 지원 플랫폼: Web
- 토큰 산출물: CSS, Swift, Compose
- HTML 속성 계약: `InputHTMLAttributes<HTMLInputElement>`
- ref 대상: `HTMLInputElement`

## 공개 API

| Prop | 타입 | 필수 | 기본값 |
| --- | --- | --- | --- |
| `label` | `string` | 예 | — |
| `hint` | `string` | 아니요 | — |
| `error` | `string` | 아니요 | — |
| `hideLabel` | `boolean` | 아니요 | `false` |
| `fieldSize` | `TextFieldSize` | 아니요 | `"md"` |

## 필수 검증 명령

- 단위 테스트: `pnpm --filter @aster-ui/react test`
- API 호환성: `pnpm api:check`
- 브라우저 접근성: `pnpm test:visual`
