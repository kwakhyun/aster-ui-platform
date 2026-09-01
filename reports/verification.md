# Production Verification

검증일: 2026-09-01  
종료 기준: `adversarial-closure/2026-09-01.v2`  
소스 리비전: `workspace:3e7d2c8a7aa6bd38cda9`

## 최종 판정

명시한 종료 매트릭스에서 열린 결함은 **P0 0건, P1 0건, P2 0건**이다. `pnpm verify`가 보안 감사, 정적 분석, 타입 검사, 테스트, 생성물 계약, 브라우저 검증, 근거 생성, 근거 포함 재빌드를 순서대로 완료했다.

이 판정은 저장소에서 자동 또는 정적으로 재현할 수 있는 범위에 한정한다. Docker daemon, 실제 Figma 쓰기, npm registry 배포, Kubernetes cluster, VoiceOver와 NVDA 실기 검증은 외부 실행 환경이나 자격 증명이 필요한 별도 운영 검증이다.

## 자동화 게이트

| Gate | Result |
| --- | --- |
| ESLint | passed |
| TypeScript package graph | passed |
| 단위 및 상호작용 테스트 | 37 passed |
| Coverage | passed |
| Sites worker tests | 4 passed |
| 프로덕션 빌드 | passed |
| 토큰 및 네이티브 수치 계약 | 11 dimensions × 2 themes passed |
| Swift 생성물 타입 검사 | passed |
| 컴포넌트 manifest와 문서 | current |
| 도입률 스캔 | 2/2 eligible, 8 JSX usages, 0 deprecated |
| API 호환성 | 17 props, 0 breaking changes |
| 릴리스 계약 | 5 packages와 배포 metadata 일치 |
| 성능 예산 | passed |
| 프로덕션 의존성 감사 | 0 known vulnerabilities |
| 브라우저 시나리오 | 7 passed, 6 snapshots |
| 실제 브라우저 axe | 4 states, 0 WCAG-tagged violations |
| 브라우저 런타임 오류 | 0 page errors, console errors, HTTP 4xx/5xx |
| 품질 근거 무결성 | 5/5 passed, revision과 digest 일치 |

Coverage 결과는 다음과 같다.

- Tokens: statements, branches, functions, lines 100%
- Figma bridge: statements, branches, functions, lines 100%
- React component: statements, functions, lines 100%, branches 85.29%
- Studio: statements 90.76%, branches 89.07%, functions 88.97%, lines 94.08%

## 브라우저 종단 검증

- 1440 × 1024에서 Coral과 Ocean 테마를 승인 기준선과 비교했다.
- Figma fixture의 3개 변경, DTCG alias, source theme, 검토자와 검토 fingerprint를 확인했다.
- 검토 선행 조건, 현재 품질 근거 5/5, 책임 확인, 중복 실행 방지, 성공 receipt 저장과 reload 복구를 검사했다.
- 1280px 데스크톱에서 Sync 상태 영역의 잘림과 가로 넘침이 없음을 확인했다.
- 720 × 512 확대 상당 viewport와 390 × 844 모바일에서 탐색, drawer, 단일 열 카드, 이미지 crop을 검사했다.
- 키보드 탭, focus trap, Escape, trigger focus 복원, forced-colors 선택과 초점을 검사했다.
- 실제 Chrome axe는 impact 수준을 누락하지 않고 WCAG 태그가 있는 모든 violation을 실패 대상으로 삼는다.
- 각 브라우저 시나리오는 page error, console error, HTTP 4xx/5xx 응답도 함께 실패 처리한다.
- 시각 회귀 허용치는 0.3%이며 6개 기준선을 사용한다.

## 성능과 도입률

- JavaScript: 89,876 B gzip / budget 190,000 B
- CSS: 9,665 B gzip / budget 35,000 B
- Largest responsive image: 33,812 B / budget 60,000 B
- Self-hosted font: 48,256 B / budget 120,000 B
- 도입률 분모: consumer manifest가 명시한 eligible component 2개
- 도입률 결과: 1개 consumer에서 2/2 도입, Button 6회와 TreatmentCard 2회 사용
- scanner는 TypeScript AST와 실제 package import를 기준으로 문자열, 주석, 예제, 로컬 이름을 제외한다.
- 이 결과는 단일 portfolio consumer 신호이며 조직 전체 도입률로 일반화하지 않는다.

## 근거 신뢰성

품질 근거 schema v3는 실행 시각, workspace source revision, 선택적 Git commit, run ID, artifact digest를 기록한다. 집계기는 오래됐거나 변조됐거나 서로 다른 리비전의 보고서를 거부한다. Studio 빌드는 자신의 source revision과 근거 revision이 다르면 5개 검사를 `Attention`으로 바꾸며, 릴리스 리허설도 차단한다.

검토 receipt와 릴리스 receipt는 각각 versioned schema를 사용한다. 검토자, Figma source version, source theme, 변경 fingerprint, 근거 digest와 리비전이 현재 문맥에 정확히 일치할 때만 reload 상태를 복구한다. 손상 데이터와 구버전 데이터는 안전하게 무시한다.

## 공급망과 런타임 경계

GitHub Actions는 commit SHA, Docker base image는 digest, Kubernetes workload image는 렌더 시 검증한 `repository@sha256:<64-hex>` 값으로 고정한다. Pod는 service account token 자동 mount를 끄며, 패키지 검사는 11개 배포 파일과 4개 export만 허용하고 테스트 산출물을 거부한다. `/healthz`는 실제 app shell이 없으면 503을 반환하고 CI는 HTML과 모든 정적 asset을 확인한다.

현재 로컬에는 Docker CLI만 있고 daemon이 없어 컨테이너 실행은 재검증하지 못했다. Kotlin compiler도 설치되어 있지 않아 Compose 생성물은 원본, CSS, Swift와의 수치 parity까지 검증했고 Swift 생성물은 iOS SDK로 타입 검사했다. CI와 실제 배포 환경에서의 container, Compose compile, cluster smoke test는 운영 승격 체크리스트로 유지한다.

VoiceOver와 NVDA는 자동 axe 결과를 대체하지 않는다. 이번 판정은 스크린리더 인증을 주장하지 않으며, 실제 보조기기 수동 검증은 릴리스 전 별도 서명 항목이다.

final result: passed
