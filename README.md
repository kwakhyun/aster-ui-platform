# Aster UI Platform

의료미용 제품군을 가정해 디자인 변경이 토큰, 공용 React API, Studio와 두 개의 검증용 소비 예제에 전달되는 과정을 구현한 개인 PoC입니다.
Figma 데이터를 변경하거나 npm에 배포하지 않고도 별칭 변경, 저장소 표본의 사용 현황, 릴리스 준비 근거를 확인할 수 있습니다.

Figma Variables의 별칭을 W3C DTCG 토큰과 React 공개 API에 대조하고, AI 제안은 사람의 검토와 승인을 거치도록 구성했습니다.

[![CI](https://github.com/kwakhyun/aster-ui-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/kwakhyun/aster-ui-platform/actions/workflows/ci.yml)

[라이브 데모](https://kwakhyun.github.io/aster-ui-platform/) | [케이스 스터디](docs/case-study.md) | [자동 생성 검증 보고서](reports/verification.md) | [디자인 QA](design-qa.md)

제출한 포트폴리오 PDF는 2026년 9월 4일 검증 기준의 고정된 기록입니다. 이후 개선한 화면과 검증 범위는 현재 저장소에 반영하며, 제출본과의 차이는 [제출본 정합성 확인](docs/submission-consistency.md)에 정리했습니다. 최신 수치는 자동 생성 검증 보고서를 기준으로 확인해 주세요.

![Aster UI Studio 데스크톱 구현 화면](design/implementation-desktop-final.png)

## 왜 이 프로젝트를 만들었나

이 프로젝트는 디자인 시스템의 변경 전달 과정을 구현 대상으로 삼았습니다. 컴포넌트 갤러리만으로 확인하기 어려운 다음 운영 질문을 다뤘습니다.

- Figma의 시맨틱 별칭 변경을 코드 계약과 어떻게 일치시킬 것인가
- 여러 개발자가 쓰는 API의 하위 호환성과 문서를 어떻게 자동으로 유지할 것인가
- 작은 검증용 앱에서도 과장 없이 소비 현황과 지원 중단 예정 API 사용을 어떻게 계산할 것인가
- AI가 만든 변경안을 어디까지 자동화하고 어느 단계에서 사람 검토로 전환할 것인가
- 로컬 통과, CI 통과, 실제 배포를 어떻게 구분해 근거로 남길 것인가

의사결정과 한계는 [케이스 스터디](docs/case-study.md)에 정리했습니다.

## 구현 범위와 경계

| 영역 | 구현 |
| --- | --- |
| Studio | React, Vite, Tailwind CSS로 구현한 반응형 컴포넌트 변경 검토 및 릴리스 준비 도구 |
| React 패키지 | Button, Badge, Alert, Tabs, TextField, TreatmentCard의 HTML 속성 전달과 ref 계약 |
| API 자동화 | 레지스트리와 TypeScript AST로 6개 컴포넌트의 공개 prop 38개를 추출하고, 타입 체커로 공개 export 23개를 비교 |
| 토큰 | 색상, 간격, 모서리 반경을 다루는 W3C DTCG 핵심 경로 31개와 Coral 및 Ocean 테마, CSS, JSON, Swift, Compose 산출물 |
| Figma | Figma Variables REST API 어댑터, PAT 및 OAuth 인증, 비식별 테스트 픽스처, 사람 검토 모델 |
| AI | JSON Schema로 제한한 Claude Code 제안, SemVer, 테스트와 위험 검증, 제한 시간과 경로 격리, 제안부터 승인까지의 전체 흐름 검증 |
| 소비 표본 | Studio와 두 개의 작은 검증용 소비 앱이 선언한 대상의 실제 import와 JSX 사용 분석 |
| 마이그레이션 | `PrimaryButton`을 `Button`으로 바꾸는 TypeScript AST 코드 변환 도구와 테스트 픽스처 |
| 배포 | release-please, 커밋 SHA로 고정한 GitHub Actions, 비루트 컨테이너, 전체 검증 뒤 GitHub Pages를 배포하는 워크플로 |

React 컴포넌트는 웹 전용입니다. Swift와 Compose 파일은 같은 토큰 소스에서 만든 네이티브 토큰 산출물이며 iOS 또는 Android 컴포넌트 구현으로 표현하지 않습니다.

## 핵심 흐름

```text
Figma Variables REST API / 비식별 테스트 픽스처
  → 시맨틱 별칭 비교 및 DTCG 검증
  → CSS, JSON, Swift, Compose 토큰 빌드
  → React 컴포넌트 6개 빌드, 공개 export 및 API 문서 검사
  → 저장소의 검증용 소비 앱 3개에서 선언 표본과 마이그레이션 검사
  → Claude Code 제안, 결정론적 검증, 사람 검토
  → 단위 및 상호작용, axe, 브라우저 시각, 성능, 보안 검증
  → 로컬 릴리스 리허설 또는 release-please
  → 품질 검사와 컨테이너 검증을 통과한 main 브랜치의 GitHub Pages 배포
```

Studio의 `Run rehearsal`은 외부 레지스트리를 바꾸지 않는 로컬 리허설입니다. 실제 Figma 쓰기와 npm 배포는 이 PoC의 실행 범위에 포함하지 않았습니다.

작업 영역의 `Tokens`에서는 선택한 테마의 실제 색상 값과 Figma 검토 대상의 변경 전후 Button을 확인할 수 있습니다. 견본은 빌드된 토큰 JSON에서 별칭을 해석합니다. 비교 영역은 검토 대상 테마를 따르며, 미리보기 테마를 바꿔도 승인할 변경의 의미가 바뀌지 않습니다. 변경 전후 표본은 조작할 수 없는 시각 참고 자료이고, 별칭과 색상 값은 별도 텍스트로 제공합니다.

브라우저 정책이 저장소 접근을 차단해도 컴포넌트 탐색은 유지됩니다. 이때 화면에 저장 불가 상태를 표시하며, 검토나 리허설 기록을 저장했다고 처리하지 않습니다. 취소된 요청은 완료 기록을 남기지 않고, 취소 뒤 늦게 도착한 응답도 현재 작업 상태를 덮어쓰지 않습니다.

## 실행

Node.js 22 이상과 pnpm 10.29.2가 필요합니다. 전체 검증의 로컬 시각 회귀 검사는 설치된 Google Chrome을 사용합니다.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

전체 검증:

```bash
pnpm verify
```

`pnpm verify`는 선행 관계가 있는 단계를 순서대로 실행하고, 프로덕션 빌드 이후 서로 독립적인 검사는 최대 4개씩 병렬 실행합니다.
의존성 감사 API가 일시적으로 응답하지 않으면 제한적으로 재시도합니다. 계속 실패할 때는 `pnpm-lock.yaml`이 같고 24시간이 지나지 않은 성공 기록만 재사용하며, 그 외에는 검증을 중단합니다.

- 의존성 감사, 린트, 엄격한 TypeScript 검사, 단위 및 상호작용 테스트
- 소스 리비전과 해시를 포함한 커버리지 근거 기록 및 프로덕션 빌드
- 토큰 및 네이티브 산출물, Figma 테스트 픽스처, AI 제안부터 승인까지의 전체 흐름 검증
- 매니페스트와 문서, 저장소 표본 커버리지, 코드 변환 도구, API 호환성
- 릴리스, 성능, 패키지 내용, Kubernetes, 공급망, Sites 런타임
- 브라우저 시각 회귀와 axe 검사. 로컬에서는 Google Chrome, CI에서는 Ubuntu 24.04의 Playwright Chromium을 사용합니다.
- 초기 로드 FCP와 LCP, 관찰 구간의 CLS를 고정된 브라우저 조건에서 3회 측정합니다. 자산 용량과 렌더링 성능이 모두 예산 안에 있어야 품질 근거를 통과시킵니다.
- macOS와 Linux의 글꼴 렌더링 차이는 플랫폼별 승인 이미지로 분리합니다. Linux 기준 이미지는 수동 워크플로로 전체 세트를 생성하고 사람이 검토한 뒤에만 반영합니다.

마지막에는 구조화된 검증 결과에서 보고서를 다시 만들고 최신성을 확인합니다.

성능 검사의 조건과 예산, 오류 재현을 막는 테스트는 [검토 후 개선 사항](docs/review-improvements.md)에 정리했습니다. 초기 화면, 토큰 비교, Figma 검토, 릴리스 대화상자의 단위 axe 검사는 상태별 테스트로 분리해 실패 원인과 실행 시간을 구분합니다.

## Figma 및 AI 워크플로 실행 범위

Figma 테스트 픽스처 재현:

```bash
pnpm figma:fixture
pnpm figma:check
```

라이브 Figma 읽기에는 변경 전 기준으로 승인된 스냅샷, 파일 키, 컬렉션, 모드와 `FIGMA_ACCESS_TOKEN`이 필요합니다. 자세한 명령은 [Figma 파이프라인](docs/figma-pipeline.md)에 있습니다.

Claude Code 제안:

```bash
pnpm ai:propose -- \
  --provider claude \
  --request ai/requests/localize-treatment-card-save-label.md \
  --output reports/ai-proposals/treatment-card-label.claude.json
```

Claude Code는 도구 사용을 비활성화한 상태에서 구조화된 제안만 반환합니다.
CI에서는 `pnpm ai:check`가 결정론적 제안 검증과 사람 승인 기록을 오프라인으로 재현합니다.
이 과정에서 변조, 허용 경로 이탈, 제공자 응답 제한 시간 초과, 소스 변경 여부도 검사합니다.
사람 승인은 제안 상태와 감사 기록만 남기며 코드를 자동으로 적용하지 않습니다.
자세한 정책은 [AI 워크플로](docs/ai-governance.md)를 참고하세요.

## 검증 가능한 계약

- 컴포넌트 레지스트리와 소스 인터페이스가 다르면 매니페스트 및 문서 검사가 실패합니다.
- TypeScript 진입점의 공개 export 23개와 컴포넌트 prop 38개를 기준 계약과 비교합니다. export 또는 컴포넌트 제거, 타입과 기본값 변경, 선택적 prop의 필수 전환, ref와 DOM 계약 변경을 차단합니다.
- Figma 컬렉션, 모드, 별칭 대상 또는 DTCG 경로가 없으면 검토 모델을 만들지 않습니다.
- AI가 필수 prop 추가, prop 제거 또는 타입 변경을 제안하면 메이저 변경으로 분류되지 않은 경우 차단합니다. 승인 단계에서는 현재 매니페스트와 요청 및 프롬프트 해시를 다시 검증합니다.
- 검증용 소비 앱이 스스로 선언한 대상 컴포넌트를 사용하지 않거나 지원 중단 예정 API를 사용하면 저장소 표본 검사가 실패합니다.
- JavaScript, CSS, 글꼴, 반응형 이미지 예산을 초과하거나 배포 산출물에 PNG가 포함되면 실패합니다.
- 소스 리비전과 근거 해시가 맞지 않으면 릴리스 리허설을 차단합니다.
- Docker 기본 이미지, GitHub Actions, Kubernetes 이미지에 변경 가능한 참조를 사용하면 실패합니다.
- 실제 브라우저에서 페이지 오류, 콘솔 오류, HTTP 4xx 및 5xx 응답, axe 위반이 발생하면 실패합니다.

## 저장소 안내

- [`apps/studio`](apps/studio): 디자인 변경 검토 및 릴리스 준비 Studio
- [`apps/clinic-web`](apps/clinic-web): 사용자 제품 소비 예시
- [`apps/backoffice-web`](apps/backoffice-web): 백오피스 소비 예시
- [`packages/react`](packages/react): 공용 React 컴포넌트와 API 기준 계약
- [`packages/tokens`](packages/tokens): DTCG 토큰의 다중 플랫폼 빌드
- [`packages/figma-bridge`](packages/figma-bridge): Figma REST 어댑터와 검토 계약
- [`ai`](ai): Claude Code 요청, 프롬프트, 스키마, 테스트 픽스처
- [`scripts`](scripts): 문서 생성, 계약 검사, 저장소 표본 분석, 마이그레이션, 품질 근거 자동화
- [`.github/workflows`](.github/workflows): 전체 검증과 Pages 배포를 수행하는 CI, CI 성공 뒤 실행되는 release-please 워크플로

접근성과 운영 세부 내용은 [아키텍처](docs/architecture.md), [접근성](docs/accessibility.md), [릴리스와 호환성](docs/release-and-compatibility.md)에서 확인할 수 있습니다. 현재 범위를 넓힐 때의 순서와 완료 조건은 [확장 로드맵](docs/roadmap.md)에 정리했습니다.

## 현재 범위와 검증 경계

- Figma 라이브 API는 파일과 계정 권한이 있는 환경에서만 실행할 수 있습니다.
- Claude 라이브 제안은 실행 환경의 Claude Code 로그인이 필요합니다.
- `13/13`은 세 검증용 앱이 직접 선언한 대상의 저장소 표본 커버리지입니다. 실제 조직 도입률이나 사용자 성과 지표가 아닙니다.
- 공개 API 자동 검사는 TypeScript 선언과 메타데이터 변화를 다룹니다. CSS의 시각적 의미와 런타임 상호작용은 각각 시각 회귀와 상호작용 테스트로 보완하지만, 모든 소비 환경의 호환성을 보장하지는 않습니다.
- 저장소에 커밋한 JSON 검증 근거는 로컬 최종 검증 결과입니다. 공개 CI와 Pages 배포 상태는 [GitHub Actions](https://github.com/kwakhyun/aster-ui-platform/actions)에서 별도로 확인합니다.
- 공개 저장소의 release-please 작업은 main 브랜치 CI가 통과한 뒤에만 실행됩니다. 릴리스 PR 생성은 저장소 소유자가 Actions의 PR 생성 권한과 `RELEASE_PLEASE_PR_ENABLED=true` 변수를 명시적으로 설정한 경우에만 활성화됩니다.

[MIT License](LICENSE)

### 화면 탐색과 검증 상세

컴포넌트의 탭, 테마, 플랫폼 선택은 URL에 반영됩니다. 예를 들어
`?component=Button&tab=tokens&theme=ocean&platform=web`으로 같은 화면을 다시 열 수 있습니다.
상단은 Component Lab의 위치를 표시하고, 중앙 탭은 컴포넌트 화면을 전환합니다.
오른쪽 Review summary의 Props, Changes, Checks는 속성, 변경점, 검증 상태를 요약합니다.

`View details`에서 기록된 검증 명령과 출처, 브라우저 시나리오와 lab 성능 측정값을 확인하고
JSON 보고서를 내려받을 수 있습니다. 현재 소스와 일치하지 않는 보고서는 성공 근거로 취급하지 않습니다.

개발 중에는 `pnpm check`로 기본 검증을, 최종 확인에는 `pnpm verify`로 커버리지와 브라우저 검증까지 실행합니다.
`verify`는 일반 단위 테스트를 다시 실행하지 않고 커버리지 실행에서 동일한 테스트를 검증합니다.
Studio 소스 테스트는 Studio의 production 번들을 요구하지 않으며, 의존 패키지의 빌드는 유지합니다.
