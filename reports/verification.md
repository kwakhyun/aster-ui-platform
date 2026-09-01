# Production Verification

이 문서는 저장소의 구조화된 JSON 근거와 coverage summary에서 자동 생성됩니다. 수치를 직접 편집하지 않으며 `pnpm verification:check`가 현재 소스와의 정합성을 검사합니다.

- 생성 기준: 2026. 09. 01. 17:53 KST
- 소스 리비전: `workspace:9189313fd24befa9bb9f`
- Git commit: `473e784c4da02402a0fccca7ba0281069c9d128d`

## 판정

로컬에서 재현 가능한 종료 매트릭스 기준으로 열린 P0, P1, P2는 0건입니다. 이 판정은 아래 자동 근거와 사람 검토 경계가 모두 유효할 때만 생성됩니다. 공개 GitHub 실행, 실제 Figma 계정, npm registry, Kubernetes cluster처럼 자격 증명이나 외부 환경이 필요한 결과는 별도 경계로 남깁니다.

## 자동화 근거

| Gate | Result |
| --- | --- |
| Workspace unit and interaction suites | 6 package suites passed |
| Consumer contract tests | Clinic과 backoffice 렌더링 및 WCAG-tagged axe 검사 passed |
| Sites worker | 4 runtime route cases passed |
| API compatibility | 6 components, 38 props, 0 breaking changes |
| Adoption | 13/13 eligible components across 3 consumers, 0 deprecated usages |
| Figma review fixture | 3 aliases resolved, human review required, source mutation disabled |
| AI proposal fixture | 6 deterministic checks passed, human review required, source mutation disabled |
| Browser visual and accessibility | 7 scenarios, 6 snapshots, 4 axe checks |
| Production dependency audit | 0 known vulnerabilities |
| Evidence provenance | revision, run ID, Git commit, artifact digest verified |

## Coverage

| Scope | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| Clinic consumer | 100% | 100% | 100% | 100% |
| Backoffice consumer | 100% | 100% | 100% | 100% |
| Tokens | 100% | 100% | 100% | 100% |
| Figma bridge | 96.77% | 96.93% | 100% | 97.64% |
| React | 93.24% | 82.45% | 95% | 98.36% |
| Studio | 92.44% | 88.4% | 91.66% | 95.5% |

## 성능 예산

| Asset | Actual | Budget |
| --- | ---: | ---: |
| JavaScript gzip | 92,413 B | 190,000 B |
| CSS gzip | 10,359 B | 35,000 B |
| Largest responsive image | 33,812 B | 60,000 B |
| Self-hosted font | 48,256 B | 120,000 B |

## 검증 범위와 한계

- 실제 Chrome에서 1440px Coral과 Ocean, Figma 검토 및 릴리스 리허설, 1280px, 확대 상당 viewport, 모바일, forced-colors를 검사합니다.
- 각 브라우저 시나리오는 page error, console error, HTTP 4xx와 5xx, WCAG 태그가 있는 axe violation을 실패 처리합니다.
- Figma REST와 Claude Code 경로는 실행 가능하지만, 라이브 호출은 각 서비스의 권한과 로그인이 필요합니다. CI는 비식별 fixture를 같은 계약으로 재생합니다.
- Swift와 Compose는 공유 토큰 산출물입니다. 네이티브 컴포넌트 구현이나 실제 앱 배포를 주장하지 않습니다.
- VoiceOver와 NVDA 수동 검증, npm 배포, cluster smoke test는 자동 근거에 포함하지 않습니다.

final result: passed
