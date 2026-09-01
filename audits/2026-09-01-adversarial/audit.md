# Aster UI 확대 반증 감사 — 폐쇄 보고서

- 최초 감사일: 2026-09-01
- 폐쇄 검증일: 2026-09-01
- 종료 기준: `adversarial-closure/2026-09-01.v2`
- 최종 소스 리비전: `workspace:3e7d2c8a7aa6bd38cda9`
- 검증 명령: `pnpm verify`

## 결론

최초 감사에서 발견한 P0 1건, P1 4건, P2 5건과 수정 과정에서 추가로 발견한 8건을 모두 닫았다. 현재 명시한 감사 매트릭스에서 열린 항목은 **P0 0건, P1 0건, P2 0건**이다.

이 문서는 “제품에 앞으로 개선할 여지가 전혀 없다”는 의미가 아니다. 재현 가능한 종료 기준과 근거 리비전을 고정해, 다음 변경에서는 같은 매트릭스를 다시 실행하고 새 위험을 별도로 분류할 수 있게 한다.

## 최초 발견 사항 폐쇄 내역

| ID | 최초 문제 | 적용한 개선 | 폐쇄 근거 |
| --- | --- | --- | --- |
| P0-1 | Swift와 Compose dimension이 16배로 생성됨 | px를 CGFloat와 dp로 명시 변환하고 두 테마의 11개 dimension 수치를 원본, CSS, Swift, Compose 사이에서 비교 | `pnpm native:check`, Swift iOS SDK typecheck passed |
| P1-1 | Studio API와 생성 manifest 불일치, 예제 미컴파일 | Studio가 package manifest를 직접 읽고 완전한 예제를 별도 TSX consumer로 타입 검사 | 17 props, 0 breaking changes |
| P1-2 | 품질 5/5가 현재 revision과 빌드에 결합되지 않음 | schema v3 provenance, timestamp, run ID, digest, workspace revision, 선택적 Git commit을 기록하고 evidence 이후 Studio 재빌드 | 5/5 보고서의 source revision과 digest 일치 |
| P1-3 | 문자열 예제를 실제 도입으로 집계 | import-aware TypeScript AST scanner와 alias, namespace, 문자열, 주석, shadowing fixture 추가 | 2/2 adopted, Button 6, TreatmentCard 2 |
| P1-4 | 검토와 릴리스 receipt가 reload 및 감사에 취약 | versioned schema, reviewer, source/version/theme, fingerprint, evidence digest, 엄격한 hydrate 검증, idempotency 추가 | reload, 손상, 구버전, stale evidence 테스트 passed |
| P2-1 | callback 없는 무동작 버튼과 고정 h3 | callback이 있을 때만 action을 렌더링하고 `headingLevel` API 추가 | React tests와 17-prop API contract passed |
| P2-2 | axe가 serious와 critical만 검사 | WCAG 태그가 있는 모든 impact를 실제 Chrome에서 실패 처리하고 스크롤 영역을 키보드 초점 가능하게 수정 | 4 axe states, 0 violations |
| P2-3 | Figma alias 5개 하드코딩, payload 검증 부족 | 31개 DTCG alias 계약 생성, source와 theme, version, timestamp, change ID, scope를 runtime 검증 | Figma bridge 100% coverage |
| P2-4 | iOS와 Android 탭이 HTML 카드를 표시 | 플랫폼별 실제 Swift와 Kotlin token artifact를 표시하고 선택 테마 alias를 반영 | Coral과 Ocean 플랫폼 탭 browser flow passed |
| P2-5 | tag 기반 공급망, token mount, 약한 health, test 산출물 포함 | action SHA와 image digest 고정, immutable workload renderer, token mount 차단, app-aware health, package allowlist 추가 | supply-chain, K8s, package checks passed |

## 수정 중 추가 발견 사항

| 추가 항목 | 개선 | 회귀 방지 |
| --- | --- | --- |
| 1280px에서 Sync 상태가 잘림 | 반응형 전환 기준을 1360px로 조정 | 1280 desktop visual contract |
| UI에 literal backtick이 노출됨 | 의미 있는 `<code>` 표현으로 교체 | browser snapshot |
| 실제 브라우저에서 근거 label 대비 부족 | 텍스트 색상을 WCAG 대비를 만족하도록 조정 | 전체 impact axe gate |
| 스크롤 가능한 Inspector가 키보드 초점을 받지 못함 | tabpanel에 초점 진입점 추가 | axe와 keyboard scenario |
| 오래된 품질 근거로 릴리스 가능 | 빌드 source revision 불일치 시 모든 check를 Attention으로 바꾸고 rehearsal 차단 | stale-evidence interaction test |
| Git commit과 작업공간 변경을 같은 revision으로 취급 | `sourceRevision`과 `gitCommit`을 분리 | provenance mutation self-check |
| 근거 필드 일부 변조를 놓칠 가능성 | stable payload 전체를 digest하고 stale, digest, commit 변조 fixture 추가 | `pnpm provenance:check` |
| 브라우저 console 404가 회귀 테스트를 통과함 | 누락된 favicon을 추가하고 page error, console error, HTTP 4xx/5xx를 전부 실패 처리 | 7개 Chrome scenario runtime gate |

## 고정 종료 매트릭스

1. DTCG와 CSS, Swift, Compose dimension 숫자와 단위 parity
2. 생성 manifest와 Studio API의 구조적 parity
3. 복사 예제 consumer typecheck
4. source revision, commit, run, timestamp, digest가 있는 근거와 evidence-after-test build 순서
5. import-aware AST 도입률 스캔
6. 검토와 receipt의 reload, corruption, legacy schema, idempotency 검증
7. 전체 WCAG-tagged axe 결과와 키보드 및 forced-colors 검증
8. 플랫폼 탭의 지원 범위와 실제 산출물 표현 일치
9. package contents, 네이티브 수치 계약, Swift compile smoke test
10. image digest, action SHA, service account, app-aware health check
11. 1440, 1280, 확대 상당 viewport, 모바일 반응형 시각 계약
12. 현재 build revision과 품질 근거가 다를 때 릴리스 차단
13. provenance stale 및 tamper rejection
14. page error, console error, HTTP 4xx/5xx가 없는 프로덕션 브라우저 흐름

모든 항목이 현재 리비전에서 통과했다. 자동화 상세 수치는 `reports/verification.md`와 `apps/studio/src/generated/quality-evidence.json`에 남긴다.

## 운영 환경에서 별도 수행할 항목

아래는 열린 P0/P1/P2 코드 결함이 아니라 현재 로컬 환경의 검증 경계다.

- Docker daemon을 켠 환경에서 non-root, read-only filesystem, `/healthz`, CSP, asset smoke test 실행
- Kotlin compiler가 있는 Android 소비자에서 Compose artifact compile
- 실제 Figma API 쓰기와 npm registry publish dry run
- Kubernetes cluster에서 immutable image rollout과 probe 확인
- VoiceOver와 NVDA를 사용한 수동 탐색 및 발화 검증

이 항목을 실행하지 않은 상태에서 컨테이너 운영 검증, Android compile, 실제 배포, 스크린리더 인증을 완료했다고 주장하지 않는다.

final result: passed
