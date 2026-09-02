# Aster UI 디자인 시스템 플랫폼 케이스 스터디

## 한 줄 요약

의료미용 제품군의 웹, 앱, 백오피스가 같은 디자인 언어를 사용하도록 토큰 변경부터 React API, 소비 앱 도입률, 사람 검토, 릴리스 검증까지 이어지는 내부 디자인 시스템 제품을 개인 포트폴리오 PoC로 구축했습니다.

이 프로젝트의 목표는 컴포넌트 수를 늘리는 것이 아니라 다음 질문에 실행 가능한 답을 만드는 것이었습니다.

> 디자인 변경을 여러 플랫폼과 제품에 안전하게 전달하면서, 개발자와 디자이너가 변경 근거와 위험을 같은 화면에서 검토할 수 있는가?

## 맡은 범위

- 제품 문제 정의와 정보 구조
- 상용 서비스 수준의 운영 도구 UI 설계 및 반응형 구현
- TypeScript, React, Turborepo 기반 패키지 구조
- W3C DTCG 토큰과 Style Dictionary 다중 플랫폼 생성
- 공용 컴포넌트 API, 접근성, 하위 호환 계약
- Figma Variables REST 읽기 어댑터와 검토 모델
- Claude Code 구조화 제안과 사람 승인 경계
- CI, 시각 회귀, 보안, 성능, 릴리스 자동화

실제 회사 코드, 사용자 데이터, Figma 파일은 사용하지 않았습니다. 모든 도메인 데이터와 Figma 응답은 포트폴리오용 예시 또는 비식별 테스트 픽스처입니다.

## 문제와 핵심 판단

### 1. 디자인 시스템을 갤러리가 아니라 변경 운영 제품으로 본다

Storybook 형태의 컴포넌트 전시만으로는 디자인 시스템 실무의 도입률, Figma 일치, 버전 호환성, 문서 최신화, 사람 검토를 한 흐름으로 보여주기 어렵습니다. 그래서 Studio의 중심을 “선택한 컴포넌트의 현재 상태”와 “릴리스 가능한 변경 근거”로 잡았습니다.

Studio의 목록은 정적 데모 데이터가 아닙니다. 공용 패키지에서 생성한 매니페스트로 6개 실제 컴포넌트를 읽고, 선택한 컴포넌트의 실제 미리보기와 API 계약을 보여줍니다.

### 2. Figma와 코드는 값 복사가 아니라 검증 가능한 계약으로 연결한다

Figma Variables API의 로컬 변수 응답을 읽고 컬렉션, 모드, 별칭 대상을 해석합니다. 변경된 시맨틱 별칭만 추출한 뒤 DTCG 핵심 경로에 실제로 존재하는지 확인합니다. 별칭이 없거나 대상이 사라졌거나 범위가 잘못되면 검토 모델을 만들지 않습니다.

라이브 전송 계층은 PAT 또는 플랜 토큰의 `X-Figma-Token`과 OAuth Bearer 인증을 지원합니다. CI는 네트워크와 Figma 권한에 의존하지 않도록 공식 응답 구조를 본뜬 비식별 테스트 픽스처를 재생합니다. 이 프로젝트는 Figma 쓰기나 게시 성공을 주장하지 않습니다.

### 3. 여러 사람이 쓰는 API는 코드보다 계약을 먼저 관리한다

`component-registry.json`이 컴포넌트의 소스, props 인터페이스, 상태, 분류, DOM 속성 계약을 선언합니다. TypeScript AST 생성기가 6개 컴포넌트의 38개 공개 prop과 기본값을 추출해 하나의 매니페스트와 7개 API 문서를 만듭니다.

호환성 검사는 컴포넌트 제거, prop 제거, 타입과 기본값 변경, 선택적 prop의 필수 전환, ref와 DOM 속성 계약 변경을 차단합니다. 새 선택적 API는 허용하되 SemVer 근거를 남기게 했습니다.

### 4. AI는 구현 권한이 아니라 제한된 제안 권한만 가진다

Claude Code 경로는 도구 사용을 비활성화한 비대화형 프로세스로 실행됩니다. 요청, 현재 매니페스트, JSON Schema를 입력하고 구조화된 변경 제안만 받습니다. 이후 별도 검증기가 대상 컴포넌트, SemVer, 공개 API 충돌, 단위 및 접근성 테스트, 문서, 위험과 완화책을 검사합니다.

통과한 제안도 `humanReview: required`, `sourceMutation.applied: false` 상태로 저장됩니다. 사람 승인 명령은 `passed` 필드를 신뢰하지 않고 현재 매니페스트, 요청, 프롬프트 해시와 제안 규칙을 다시 계산합니다. 승인은 별도 기록일 뿐 코드를 적용하지 않으며, 구현과 병합은 일반 브랜치 검토와 전체 `pnpm verify`를 다시 거쳐야 합니다.

### 5. 도입률의 분모를 숨기지 않는다

도입률은 “전체 코드 중 디자인 시스템처럼 보이는 것”을 추정하지 않습니다. 각 소비 앱이 `design-system-consumer.json`에 대상 컴포넌트를 명시하고, TypeScript AST 분석기가 실제 import와 JSX 사용만 셉니다. 문자열, 주석, 지역 컴포넌트, 별칭, 네임스페이스 import를 구분합니다.

현재 저장소에는 Studio, 클리닉 탐색 웹, 운영 백오피스의 세 소비자가 있습니다. 선언한 13개 대상이 모두 실제로 사용되고 있으며 지원 중단 예정 API 사용은 0건입니다. 이는 저장소 내부 도입 증거이며 실제 조직의 사용자 지표로 확대 해석하지 않습니다.

## 결과

| 영역 | 저장소 근거 |
| --- | --- |
| 공용 React | 배포 가능한 컴포넌트 6개, 공개 prop 계약 38개 |
| 디자인 토큰 | 31개 DTCG 경로, Coral과 Ocean, CSS와 Swift와 Compose 산출물 |
| Figma | REST 스키마 어댑터, 별칭 변경 테스트 픽스처 3개, 읽기 전용 사람 검토 |
| 소비 제품 | 선언형 소비 앱 3개, 도입 대상 컴포넌트 13/13개 사용, 지원 중단 예정 API 사용 0건 |
| 마이그레이션 | `PrimaryButton`을 `Button`으로 바꾸는 TypeScript AST 코드 변환 테스트 픽스처 |
| AI | Claude Code 구조화 제안 래퍼, 제안 검증, 변조 및 경로 이탈 거부, 제한 시간, 별도 승인 기록 E2E |
| 품질 | 단위와 상호작용, axe, 실제 Chrome 시각 회귀, 확대, 모바일, forced-colors, 성능과 보안 게이트 |
| 운영 | release-please, 변경 불가능한 Action SHA와 이미지 해시, 비루트 읽기 전용 컨테이너, 전체 검증 후 Pages를 배포하는 워크플로 |

실행 시점과 소스 리비전이 포함된 최신 수치는 [`reports/verification.md`](../reports/verification.md)와 각 JSON 검증 근거에서 확인할 수 있습니다.

## 의도적으로 남긴 경계

- 실제 Figma Variables API 사용에는 Figma 플랜, 사용자 라이선스, 파일 권한과 `file_variables:read` 범위가 필요합니다.
- Swift와 Compose 산출물은 공유 토큰입니다. 네이티브 컴포넌트를 구현했다고 표현하지 않습니다.
- npm 레지스트리 배포와 실제 조직 도입 지표는 범위 밖입니다. `Run rehearsal`은 외부 상태를 바꾸지 않는 로컬 리허설입니다.
- Claude Code 라이브 실행에는 해당 환경의 로그인이 필요합니다. CI는 동일한 계약을 오프라인 테스트 픽스처로 검증합니다.
- 저장소에 커밋한 JSON 근거는 로컬 최종 검증 결과입니다. 공개 CI와 Pages 배포 상태는 [GitHub Actions](https://github.com/kwakhyun/aster-ui-platform/actions)에서 별도로 확인합니다.

## 5분 검토 순서

1. Studio에서 6개 컴포넌트를 선택해 실제 미리보기와 생성 API가 함께 바뀌는지 확인합니다.
2. `Review changes`에서 Figma 별칭 변경과 Web, iOS, Android 영향을 확인하고 사람 검토를 기록합니다.
3. `Quality`에서 소스 리비전과 각 근거 해시를 확인합니다.
4. 검토와 품질 근거가 준비된 상태에서 외부 배포 없는 릴리스 리허설을 실행합니다.
5. 코드에서는 `packages/figma-bridge`, `scripts/generate-component-manifest.mjs`, `scripts/generate-ai-proposal.mjs`, `scripts/scan-adoption.mjs`, `.github/workflows/ci.yml` 순서로 확인합니다.

## 재현

```bash
pnpm install --frozen-lockfile
pnpm verify
```

Figma와 AI 테스트 픽스처만 빠르게 확인하려면 다음을 실행합니다.

```bash
pnpm figma:check
pnpm ai:check
```
