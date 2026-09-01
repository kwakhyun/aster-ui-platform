# TreatmentCard

> `packages/react/component-manifest.json`에서 자동 생성된 문서입니다. 직접 수정하지 마세요.

의료미용 시술 정보를 접근 가능한 HTML article 요소로 제공하는 도메인 컴포넌트입니다.

- 패키지: `@aster-ui/react`
- 버전: `3.1.0-beta.2`
- 상태: beta
- 분류: Treatment
- 지원 플랫폼: Web
- 토큰 산출물: CSS, Swift, Compose
- HTML 속성 계약: `ComponentPropsWithoutRef<article>`
- ref 대상: `HTMLElement`

## 공개 API

| Prop | 타입 | 필수 | 기본값 |
| --- | --- | --- | --- |
| `title` | `string` | 예 | — |
| `category` | `string` | 예 | — |
| `imageUrl` | `string` | 예 | — |
| `imageAlt` | `string` | 예 | — |
| `imageProps` | `Omit<ImgHTMLAttributes<HTMLImageElement>, "alt" | "src">` | 아니요 | — |
| `price` | `number` | 예 | — |
| `currency` | `TreatmentCardCurrency` | 아니요 | `"KRW"` |
| `locale` | `string` | 아니요 | `"ko-KR"` |
| `downtime` | `string` | 예 | — |
| `sessions` | `string` | 예 | — |
| `results` | `string` | 아니요 | — |
| `headingLevel` | `TreatmentCardHeadingLevel` | 아니요 | `"h3"` |
| `variant` | `TreatmentCardVariant` | 아니요 | `"default"` |
| `disabled` | `boolean` | 아니요 | `false` |
| `saved` | `boolean` | 아니요 | `false` |
| `onSavedChange` | `( saved: boolean, event: Parameters<MouseEventHandler<HTMLButtonElement>>[0], ) => void` | 아니요 | — |
| `onSelect` | `MouseEventHandler<HTMLButtonElement>` | 아니요 | — |

## 필수 검증 명령

- 단위 테스트: `pnpm --filter @aster-ui/react test`
- API 호환성: `pnpm api:check`
- 브라우저 접근성: `pnpm test:visual`
