# Aster UI Platform

의료미용 제품군에 디자인 변경을 안전하게 배포하기 위한 디자인 시스템 운영 PoC입니다. Figma Variables 변경부터 W3C DTCG 토큰, React 공용 API, 소비 앱 도입률, AI 제안 검증, 사람 승인, 릴리스 품질 근거까지 하나의 흐름으로 연결했습니다.

[케이스 스터디](docs/case-study.md) | [자동 생성 검증 보고서](reports/verification.md) | [디자인 QA](design-qa.md) | [제품 문구 작성 원칙](docs/content-style.md)

![Aster UI Studio verified implementation](design/implementation-desktop-final.png)

## 왜 이 프로젝트를 만들었나

디자인 시스템의 실제 난점은 컴포넌트를 그리는 일이 아니라 변경을 여러 제품과 플랫폼에 안전하게 전달하는 일이라고 판단했습니다. 그래서 컴포넌트 갤러리보다 다음 운영 질문에 집중했습니다.

- Figma의 시맨틱 별칭 변경을 코드 계약과 어떻게 일치시킬 것인가
- 여러 개발자가 쓰는 API의 하위 호환성과 문서를 어떻게 자동으로 지킬 것인가
- 도입률의 분모와 지원 중단 예정 API 사용을 어떻게 재현 가능하게 계산할 것인가
- AI가 만든 변경안을 어디까지 자동화하고 어디서 사람에게 넘길 것인가
- 로컬 통과, CI 통과, 실제 배포를 어떻게 구분해 증거로 남길 것인가

의사결정과 한계는 [케이스 스터디](docs/case-study.md)에 정리했습니다.

## 구현된 제품 경계

| 영역 | 구현 |
| --- | --- |
| Studio | React, Vite, Tailwind CSS 기반의 반응형 컴포넌트 및 변경 검토 도구 |
| React 패키지 | Button, Badge, Alert, Tabs, TextField, TreatmentCard와 네이티브 속성 및 ref 계약 |
| API 자동화 | 레지스트리와 TypeScript AST에서 6개 컴포넌트, 38개 prop 매니페스트와 문서 생성 |
| Tokens | 31개 W3C DTCG 경로, Coral과 Ocean, CSS와 JSON과 Swift와 Compose 산출물 |
| Figma | 실제 Variables REST 스키마 어댑터, PAT와 OAuth 인증, 비식별 테스트 픽스처, 사람 검토 모델 |
| AI | Claude Code JSON Schema 제안, SemVer와 테스트 및 위험 검증, 제한 시간과 경로 격리, 별도 사람 승인 기록을 포함한 E2E |
| 도입률 | Studio, 클리닉 탐색 웹, 운영 백오피스의 실제 import와 JSX 사용 분석 |
| 마이그레이션 | `PrimaryButton`을 `Button`으로 바꾸는 TypeScript AST 코드 변환 도구와 테스트 픽스처 |
| 배포 | release-please, 변경 불가능한 Action SHA, 비루트 컨테이너, 전체 검증 후 Pages를 배포하는 워크플로 |

웹 컴포넌트는 Web 전용입니다. Swift와 Compose 파일은 같은 토큰 소스에서 만든 네이티브 토큰 산출물이며 iOS 또는 Android 컴포넌트 구현으로 표현하지 않습니다.

## 핵심 흐름

```text
Figma Variables REST / 비식별 테스트 픽스처
  → 시맨틱 별칭 비교 및 DTCG 검증
  → CSS, JSON, Swift, Compose 토큰 빌드
  → React 컴포넌트 6개와 API 문서 생성
  → 소비 앱 3개의 도입률 및 마이그레이션 검사
  → Claude Code 제안, 결정론적 검증, 사람 검토
  → 단위, axe, 브라우저 시각, 성능, 보안 검증
  → 로컬 릴리스 리허설 또는 release-please
  → 품질 및 컨테이너 CI 작업을 통과한 Pages 배포 워크플로
```

Studio의 `Run rehearsal`은 외부 레지스트리를 바꾸지 않는 로컬 리허설입니다. 실제 Figma 쓰기와 npm 배포를 수행했다고 주장하지 않습니다.

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

`pnpm verify`는 다음 검사를 순서대로 실행합니다.

- 의존성 감사, 린트, 엄격한 TypeScript 검사, 단위 및 상호작용 테스트
- 출처 정보가 결합된 커버리지와 빌드
- 토큰 및 네이티브 산출물, Figma 테스트 픽스처, AI 제안 및 승인 E2E
- 매니페스트와 문서, 도입률, 코드 변환 도구, API 호환성
- 릴리스, 성능, 패키지 내용, Kubernetes, 공급망, Sites 런타임
- 실제 Chrome 시각 회귀와 axe

마지막에는 구조화된 근거로 검증 보고서를 다시 만들고 최신성을 확인합니다.

## 실행 가능한 Figma와 AI 경계

Figma 테스트 픽스처 재현:

```bash
pnpm figma:fixture
pnpm figma:check
```

라이브 Figma 읽기에는 승인된 이전 스냅샷, 파일 키, 컬렉션, 모드와 `FIGMA_ACCESS_TOKEN`이 필요합니다. 자세한 명령은 [Figma 파이프라인](docs/figma-pipeline.md)에 있습니다.

Claude Code 제안:

```bash
pnpm ai:propose -- \
  --provider claude \
  --request ai/requests/localize-treatment-card-save-label.md \
  --output reports/ai-proposals/treatment-card-label.claude.json
```

Claude Code는 도구 사용을 비활성화한 상태에서 구조화된 제안만 반환합니다. CI에서는 `pnpm ai:check`가 결정론적 제안 검증, 사람 승인 기록, 변조 및 경로 이탈 거부, 제공자 응답 제한 시간, 소스 무변경을 오프라인으로 재현합니다. 사람 승인도 코드를 적용하지 않습니다. 자세한 정책은 [AI 워크플로](docs/ai-governance.md)를 참고하세요.

## 검증 가능한 계약

- 컴포넌트 레지스트리와 소스 인터페이스가 다르면 매니페스트 및 문서 검사 실패
- 컴포넌트나 prop 제거, 타입과 기본값 변경, 선택적 prop의 필수 전환, ref와 DOM 계약 변경 차단
- Figma 컬렉션, 모드, 별칭 대상 또는 DTCG 경로가 없으면 검토 생성 차단
- AI가 필수 prop 추가, 제거 또는 타입 변경을 제안하면 메이저 변경이 아닌 경우 차단하고, 승인 시 현재 매니페스트와 요청 및 프롬프트 해시를 다시 검증
- 소비 앱이 선언한 대상 컴포넌트를 사용하지 않거나 지원 중단 예정 컴포넌트를 사용하면 도입률 검사 실패
- JavaScript, CSS, 글꼴, 반응형 이미지 예산 초과 및 PNG 배포 차단
- 소스 리비전과 근거 해시가 맞지 않으면 릴리스 리허설 차단
- Docker 기본 이미지, GitHub Action, Kubernetes 이미지에 변경 가능한 참조를 사용하면 실패
- 실제 브라우저에서 페이지 오류, 콘솔 오류, HTTP 4xx 및 5xx 응답, axe 위반이 발생하면 실패

## 저장소 안내

- [`apps/studio`](apps/studio): 디자인 시스템 운영 Studio
- [`apps/clinic-web`](apps/clinic-web): 사용자 제품 소비 예시
- [`apps/backoffice-web`](apps/backoffice-web): 운영 제품 소비 예시
- [`packages/react`](packages/react): 공용 React 컴포넌트와 API 기준 계약
- [`packages/tokens`](packages/tokens): DTCG와 다중 플랫폼 토큰 빌드
- [`packages/figma-bridge`](packages/figma-bridge): Figma REST 어댑터와 검토 계약
- [`ai`](ai): Claude Code 요청, 프롬프트, 스키마, 테스트 픽스처
- [`scripts`](scripts): 생성, 검사, 도입, 마이그레이션, 품질 근거 자동화
- [`.github/workflows`](.github/workflows): CI, Pages, release-please 워크플로

접근성과 운영 세부 내용은 [아키텍처](docs/architecture.md), [접근성](docs/accessibility.md), [릴리스와 호환성](docs/release-and-compatibility.md)에서 확인할 수 있습니다.

## 현재의 정직한 한계

- Figma 라이브 API는 파일과 계정 권한이 있는 환경에서만 실행할 수 있습니다.
- Claude 라이브 제안은 실행 환경의 Claude Code 로그인이 필요합니다.
- 저장소 내부 도입률은 실제 조직 도입률이나 사용자 성과 지표가 아닙니다.
- 공개 원격 저장소와 Pages 실행 이력은 아직 연결하지 않았습니다. 워크플로 구성과 로컬 검증 결과를 공개 CI 성공으로 표현하지 않습니다.

MIT License
