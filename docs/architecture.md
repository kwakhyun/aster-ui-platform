# 아키텍처

Aster UI는 컴포넌트 갤러리가 아니라 디자인 변경을 검증 가능한 산출물로 전환하는 내부 제품입니다.

```text
Figma fixture
  → alias 및 change count 검증
  → W3C DTCG core + semantic theme
  → CSS, JSON, Swift, Compose 토큰 생성
  → React 웹 컴포넌트와 생성형 API manifest
  → 단위, axe, 시각, API, 성능, 보안 검증
  → 사람 검토
  → 로컬 릴리스 리허설 또는 release-please 제안
  → 선언형 소비 앱 도입률 스캔
```

## 패키지 경계

- 앱은 공개 패키지만 소비하며 `@aster-ui/react`는 앱 코드를 참조하지 않습니다.
- `@aster-ui/figma-bridge`는 transport payload를 `TokenChange`로 정규화하기 전에 모든 alias를 거부 우선 방식으로 검증합니다.
- `@aster-ui/tokens`의 DTCG JSON이 단일 진실 공급원입니다. Coral과 Ocean의 semantic key parity를 테스트합니다.
- `@aster-ui/react`는 Web 컴포넌트만 제공합니다. Swift와 Compose 파일은 공유 토큰 산출물이며 네이티브 UI 구현으로 표현하지 않습니다.
- Studio 전용 hover, focus 미리보기 상태는 공개 컴포넌트 API와 분리됩니다.

## 공개 API와 호환성

`TreatmentCardProps`는 TypeScript AST에서 manifest로 생성됩니다. 컴포넌트는 `HTMLElement` ref와 표준 article 속성을 전달하고, 통화와 locale을 실제 포맷에 반영합니다. 이미지는 `srcSet`, `sizes`, `loading`, `fetchPriority`를 포함한 표준 이미지 속성을 받을 수 있습니다.

`pnpm api:check`는 현재 manifest를 기준 계약과 비교합니다. prop 제거, 타입 변경, optional prop의 필수 전환, 기본값 변경뿐 아니라 package 및 component identity, forwarded ref, article attribute 전달, 지원 플랫폼과 토큰 산출물 제거를 breaking change로 처리합니다.

## 실패 처리

- React error boundary가 렌더링 실패를 복구 가능한 화면으로 전환합니다.
- 릴리스 리허설은 `AbortSignal`, idempotency key, 실패 메시지, 재시도, reset을 지원합니다.
- 사람 검토는 `aster-ui:review:v1`, 릴리스 리허설은 `aster-ui:release:v3`에 저장합니다. source, version, theme, change fingerprint, reviewer, 품질 revision과 digest가 모두 현재 문맥과 일치할 때만 복구합니다.
- 손상되었거나 구버전인 저장 데이터는 성공 상태로 해석하지 않습니다.
- Studio build에는 배포 입력으로 계산한 workspace source revision을 삽입합니다. Git commit은 별도 감사 필드로 보존하므로 `.git`이 없는 container에서도 같은 입력은 같은 revision이 됩니다. 품질 근거의 revision이 다르거나 다섯 gate 중 하나라도 통과하지 않으면 릴리스 리허설 확인과 실행을 차단합니다.
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
