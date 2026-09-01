# Aster UI Platform

의료미용 제품군의 디자인 언어를 안전하게 전달하는 디자인 시스템 운영 제품 PoC입니다. Figma Variables 변경, W3C DTCG 토큰, React 공용 API, 소비 앱 도입률, AI 제안 검증, 사람 승인, 릴리스 품질 근거를 하나의 흐름으로 연결했습니다.

[케이스 스터디](docs/case-study.md) | [자동 생성 검증 보고서](reports/verification.md) | [디자인 QA](design-qa.md) | [GitHub Actions](https://github.com/kwakhyun/aster-ui-platform/actions) | [GitHub Pages](https://kwakhyun.github.io/aster-ui-platform/)

![Aster UI Studio verified implementation](design/implementation-desktop-final.png)

## 왜 이 프로젝트를 만들었나

디자인 시스템의 실제 난점은 컴포넌트를 그리는 일이 아니라 변경을 여러 제품과 플랫폼에 안전하게 전달하는 일이라고 판단했습니다. 그래서 컴포넌트 갤러리보다 다음 운영 질문에 집중했습니다.

- Figma의 semantic alias 변경을 코드 계약과 어떻게 일치시킬 것인가
- 여러 개발자가 쓰는 API의 하위 호환성과 문서를 어떻게 자동으로 지킬 것인가
- 도입률의 분모와 deprecated 사용을 어떻게 재현 가능하게 계산할 것인가
- AI가 만든 변경안을 어디까지 자동화하고 어디서 사람에게 넘길 것인가
- 로컬 통과, CI 통과, 실제 배포를 어떻게 구분해 증거로 남길 것인가

의사결정과 한계는 [케이스 스터디](docs/case-study.md)에 정리했습니다.

## 구현된 제품 경계

| 영역 | 구현 |
| --- | --- |
| Studio | React, Vite, Tailwind CSS 기반의 반응형 컴포넌트 및 변경 검토 도구 |
| React package | Button, Badge, Alert, Tabs, TextField, TreatmentCard와 native 속성 및 ref 계약 |
| API automation | 레지스트리와 TypeScript AST에서 6개 컴포넌트, 38개 prop manifest와 문서 생성 |
| Tokens | 31개 W3C DTCG 경로, Coral과 Ocean, CSS와 JSON과 Swift와 Compose 산출물 |
| Figma | 실제 Variables REST schema adapter, PAT와 OAuth 인증, 비식별 fixture, 사람 검토 모델 |
| AI | Claude Code JSON Schema 제안, semver와 테스트 및 위험 검증, 현재 입력 재검증, 별도 사람 승인 receipt |
| Adoption | Studio, 클리닉 탐색 웹, 운영 백오피스의 실제 import와 JSX 사용 스캔 |
| Migration | `PrimaryButton`을 `Button`으로 바꾸는 TypeScript AST codemod와 fixture |
| Delivery | release-please, immutable Action SHA, 비루트 컨테이너, CI 뒤 GitHub Pages 배포 |

웹 컴포넌트는 Web 전용입니다. Swift와 Compose 파일은 같은 토큰 소스에서 만든 네이티브 토큰 산출물이며 iOS 또는 Android 컴포넌트 구현으로 표현하지 않습니다.

## 핵심 흐름

```text
Figma Variables REST / sanitized fixture
  → semantic alias diff and DTCG validation
  → CSS, JSON, Swift, Compose token build
  → six React components and generated API docs
  → three-consumer adoption and migration checks
  → Claude Code proposal, deterministic validation, human review
  → unit, axe, browser visual, performance, security gates
  → local release rehearsal or release-please
  → GitHub Pages only after quality and container CI jobs
```

Studio의 `Publish`는 외부 registry를 바꾸지 않는 로컬 리허설입니다. 실제 Figma 쓰기와 npm 배포도 수행했다고 주장하지 않습니다.

## 실행

Node.js 22와 pnpm 10.29.2가 필요합니다.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

전체 검증:

```bash
pnpm verify
```

`pnpm verify`는 의존성 감사, lint, strict TypeScript, unit과 interaction, coverage, build, 토큰 및 네이티브 산출물, Figma와 AI fixture, manifest와 문서, 도입률과 codemod, API 호환성, 릴리스, 성능, 패키지 내용, Kubernetes, 공급망, Sites runtime, 실제 Chrome 시각 회귀와 axe를 순서대로 실행합니다. 마지막에는 구조화된 근거에서 검증 보고서를 다시 만들고 최신성을 검사합니다.

## 실행 가능한 Figma와 AI 경계

Figma fixture 재현:

```bash
pnpm figma:fixture
pnpm figma:check
```

라이브 Figma 읽기는 승인된 이전 snapshot, file key, collection, mode와 `FIGMA_ACCESS_TOKEN`이 필요합니다. 자세한 명령은 [Figma 파이프라인](docs/figma-pipeline.md)에 있습니다.

Claude Code 제안:

```bash
pnpm ai:propose -- \
  --provider claude \
  --request ai/requests/localize-treatment-card-save-label.md \
  --output reports/ai-proposals/treatment-card-label.claude.json
```

Claude Code는 tools가 비활성화된 상태에서 구조화 제안만 반환합니다. CI에서는 `pnpm ai:check`가 같은 결정론적 검증을 오프라인으로 재생합니다. 사람 승인도 코드를 적용하지 않습니다. 상세 정책은 [AI 워크플로](docs/ai-governance.md)를 참고하세요.

## 검증 가능한 계약

- component registry와 source interface가 다르면 manifest 및 문서 check 실패
- 컴포넌트나 prop 제거, 타입과 기본값 변경, optional-to-required, ref와 DOM 계약 변경 차단
- Figma collection, mode, alias target, DTCG path가 없으면 review 생성 차단
- AI의 required prop 추가, 제거, 타입 변경은 major가 아니면 차단하고, 승인 시 현재 manifest와 요청 및 prompt digest를 다시 검증
- 소비 앱이 선언한 eligible component 미사용 또는 deprecated component 사용 시 adoption 실패
- JavaScript, CSS, font, responsive image 예산과 PNG 출시 차단
- source revision과 evidence digest가 맞지 않으면 릴리스 리허설 차단
- Docker base, GitHub Action, Kubernetes image에 mutable reference 사용 시 실패
- 실제 브라우저의 page error, console error, HTTP 4xx와 5xx, axe 위반 시 실패

## 저장소 안내

- [`apps/studio`](apps/studio): 디자인 시스템 운영 Studio
- [`apps/clinic-web`](apps/clinic-web): 사용자 제품 소비 예시
- [`apps/backoffice-web`](apps/backoffice-web): 운영 제품 소비 예시
- [`packages/react`](packages/react): 공용 React 컴포넌트와 API baseline
- [`packages/tokens`](packages/tokens): DTCG와 다중 플랫폼 토큰 빌드
- [`packages/figma-bridge`](packages/figma-bridge): Figma REST adapter와 검토 계약
- [`ai`](ai): Claude Code request, prompt, schema, fixture
- [`scripts`](scripts): 생성, 검사, 도입, 마이그레이션, 품질 근거 자동화
- [`.github/workflows`](.github/workflows): CI, Pages, release-please

접근성과 운영 세부 내용은 [아키텍처](docs/architecture.md), [접근성](docs/accessibility.md), [릴리스와 호환성](docs/release-and-compatibility.md)에서 확인할 수 있습니다.

## 현재의 정직한 한계

- Figma 라이브 API는 파일과 계정 권한이 있는 환경에서만 실행할 수 있습니다.
- Claude 라이브 제안은 실행 환경의 Claude Code 로그인이 필요합니다.
- 저장소 내부 도입률은 실제 조직 도입률이나 사용자 성과 지표가 아닙니다.
- GitHub Actions와 Pages 링크는 공개 저장소의 첫 main workflow가 완료된 뒤 실행 근거가 됩니다.

MIT License
