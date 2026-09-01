# 아키텍처

Aster UI는 컴포넌트 갤러리가 아니라 디자인 변경을 검증 가능한 산출물로 전환하는 내부 제품입니다.

```text
Figma Variables REST 또는 schema형 fixture
  → collection, mode, alias 및 change count 검증
  → W3C DTCG core + semantic theme
  → CSS, JSON, Swift, Compose 토큰 생성
  → React 웹 컴포넌트 레지스트리와 전체 API manifest
  → Claude Code 구조화 제안과 결정론적 검증
  → 단위, axe, 시각, API, 성능, 보안 검증
  → 사람 검토
  → 로컬 릴리스 리허설 또는 release-please 제안
  → 세 소비 앱의 선언형 도입률 및 deprecated 사용 스캔
```

## 패키지 경계

- 앱은 공개 패키지만 소비하며 `@aster-ui/react`는 앱 코드를 참조하지 않습니다.
- `@aster-ui/figma-bridge`는 Figma Variables REST 응답을 읽고 collection과 mode를 선택합니다. semantic alias를 `TokenChange`로 정규화하기 전에 대상 variable과 DTCG 경로를 거부 우선 방식으로 검증합니다.
- `@aster-ui/tokens`의 DTCG JSON이 단일 진실 공급원입니다. Coral과 Ocean의 semantic key parity를 테스트합니다.
- `@aster-ui/react`는 Web 컴포넌트만 제공합니다. Swift와 Compose 파일은 공유 토큰 산출물이며 네이티브 UI 구현으로 표현하지 않습니다.
- Studio 전용 hover, focus 미리보기 상태는 공개 컴포넌트 API와 분리됩니다.

## 공개 API와 호환성

컴포넌트 레지스트리가 source와 props interface, 카테고리, 상태, ref 및 DOM 속성 계약을 선언합니다. 생성기는 6개 컴포넌트의 TypeScript AST에서 38개 공개 prop과 기본값을 읽어 manifest와 API 문서를 만듭니다. Studio의 탐색 목록과 API 패널도 이 manifest를 사용하므로 구현되지 않은 컴포넌트를 노출하지 않습니다.

`TreatmentCard`는 `HTMLElement` ref와 표준 article 속성을 전달하고, 통화와 locale을 실제 포맷에 반영합니다. 이미지는 `srcSet`, `sizes`, `loading`, `fetchPriority`를 포함한 표준 이미지 속성을 받을 수 있습니다. Button, Badge, Alert, Tabs, TextField도 native 속성과 ref를 전달하며 키보드 및 ARIA 계약을 테스트합니다.

`pnpm api:check`는 모든 컴포넌트의 현재 manifest를 기준 계약과 비교합니다. 컴포넌트와 prop 제거, 타입 변경, optional prop의 필수 전환, 기본값 변경, forwarded ref, DOM 속성 계약, 토큰 산출물 제거를 breaking change로 처리합니다.

## 소비 앱과 마이그레이션

Studio, 클리닉 탐색 웹, 운영 백오피스가 공용 패키지를 소비합니다. 각 앱은 eligible component와 deprecated component를 선언하고 AST 스캐너는 실제 import와 JSX 사용만 집계합니다. 두 소비 예제는 공용 컴포넌트를 실제로 렌더링하고 WCAG 태그 기반 axe 검사를 실행합니다. `PrimaryButton` 마이그레이션 도구는 TypeScript AST로 import, JSX tag, 기본 tone을 바꾸며 before와 after fixture로 회귀를 검사합니다.

## AI 경계

Claude Code는 tools가 없는 비대화형 프로세스로 실행되어 JSON Schema 제안만 반환합니다. 별도 검증기가 현재 manifest, semver, unit 및 접근성 테스트, 문서와 위험 항목을 검사합니다. 승인 명령도 현재 request, prompt, manifest digest와 검증 결과를 다시 계산해 `passed` 필드 변조를 신뢰하지 않습니다. 제안과 승인 receipt는 source mutation을 수행하지 않으며 실제 구현은 일반 브랜치 검토와 전체 품질 게이트를 거칩니다.

## 실패 처리

- React error boundary가 렌더링 실패를 복구 가능한 화면으로 전환합니다.
- 릴리스 리허설은 `AbortSignal`, idempotency key, 실패 메시지, 재시도, reset을 지원합니다.
- 사람 검토는 `aster-ui:review:v1`, 릴리스 리허설은 `aster-ui:release:v3`에 저장합니다. source, version, theme, change fingerprint, reviewer, 품질 revision과 digest가 모두 현재 문맥과 일치할 때만 복구합니다.
- 손상되었거나 구버전인 저장 데이터는 성공 상태로 해석하지 않습니다.
- Studio build에는 앱과 패키지뿐 아니라 AI 계약, CI, 컨테이너, 인프라, 마이그레이션 fixture와 사용자 문서를 포함한 배포 입력으로 계산한 workspace source revision을 삽입합니다. 생성 보고서와 캡처 이미지는 순환을 막기 위해 제외합니다. 최신 source 변경 commit은 별도 감사 필드로 보존하므로 evidence 전용 commit 뒤에도 같은 입력은 같은 revision과 commit을 가리킵니다. 품질 근거의 revision이 다르거나 다섯 gate 중 하나라도 통과하지 않으면 릴리스 리허설 확인과 실행을 차단합니다.
- 리허설 실패나 취소 시 성공 receipt를 기록하지 않습니다.
- Figma alias가 하나라도 해석되지 않으면 review 모델을 만들지 않습니다.

## 운영 경계

- 정적 SPA는 비루트 Nginx 컨테이너로 빌드합니다.
- root filesystem은 읽기 전용이며 cache와 PID에 필요한 경로만 제한적으로 씁니다.
- CSP는 inline script와 inline style을 허용하지 않습니다. 정적 asset은 장기 캐시하고 압축합니다.
- Docker base image와 GitHub Action은 digest 또는 commit SHA로 고정합니다.
- Kubernetes는 immutable image digest만 입력받는 renderer를 사용하고, UID/GID 101, service account token 미탑재, capability drop, seccomp, privilege escalation 차단을 적용합니다.
- `/healthz`는 단순 문자열이 아니라 실제 빌드된 `index.html`의 존재를 확인하며, CI는 문서가 참조하는 정적 asset까지 요청합니다.
- release-please 실행 전 `pnpm verify`를 수행합니다. 검증 보고서 생성 뒤 Studio를 다시 빌드하므로 배포 파일과 화면의 품질 근거가 같은 source revision을 가리킵니다.
- 시각 회귀 빌드는 checked-in passing evidence fixture를 명시적으로 사용하고, reporter는 현재 source revision으로 결과를 기록합니다. 최종 빌드는 fixture override를 제거하며 Turborepo 캐시 키에는 이 입력과 Pages base path가 모두 포함됩니다. 루트 build는 캐시 복원 전에 각 workspace의 `dist`를 지워 오래된 해시 자산이 다음 성능 측정이나 배포 산출물에 섞이지 않게 합니다.
- GitHub Pages 배포는 CI의 전체 품질 job과 hardened container job이 모두 통과한 main push에서만 실행됩니다. Vite base path는 저장소 경로를 입력으로 받아 서브패스의 정적 자산을 보존합니다.
