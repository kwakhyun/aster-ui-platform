# 화면 및 문서 문구 검토 보고서

- 검토일: 2026-09-01
- 범위: Studio 데스크톱, Figma 변경 검토, 릴리스 리허설, 모바일 Studio, 소비 앱 예시, 저장소 내부 문서
- 목표: 사용 맥락에 맞는 자연스러운 문장, 언어 일관성, 정확한 실행 범위, 명확한 동작 이름 확보

## 검토 결과

화면과 문서에서 발견한 어색한 혼용 표현과 내부 구현 용어를 모두 수정했습니다. 개발자용 Studio는 영어, 한국어 소비 앱 예시는 한국어로 통일했습니다. 코드 식별자와 표준 이름은 그대로 유지했습니다.

## 화면 검토 순서

1. Studio 기본 화면
   - 변경 전: [`01-studio-before.png`](./01-studio-before.png)
   - 변경 후: [`05-studio-after.png`](./05-studio-after.png)
   - `Patterns`, `Rehearse`, `Review diff`, `fixture`처럼 맥락이 모호하거나 내부 구현에 가까운 표현을 `Quality`, `Run rehearsal`, `Review changes`, `test data`로 바꿨습니다.
   - 화면 언어와 접근성 이름을 영어로 통일하고 TreatmentCard의 영어 로케일 문구를 적용했습니다.

2. Figma 변경 검토
   - 변경 전: [`02-review-drawer-before.png`](./02-review-drawer-before.png)
   - 변경 후: [`06-review-drawer-after.png`](./06-review-drawer-after.png)
   - 제목, 검증 상태, 영향을 받는 산출물 문장을 자연스럽게 정리했습니다.
   - 플랫폼 목록은 영어 접속 규칙에 따라 `Web, iOS, and Android`로 표시합니다.

3. 릴리스 리허설
   - 변경 전: [`03-release-dialog-before.png`](./03-release-dialog-before.png)
   - 변경 후: [`07-release-dialog-after.png`](./07-release-dialog-after.png)
   - 실제 배포로 오해할 수 있는 표현을 제거하고 로컬 기록만 저장한다는 범위를 명시했습니다.
   - 검토 전 상태에서도 자연스럽도록 안내 문장을 보완하고, 주 동작을 `Start rehearsal`로 명확히 구분했습니다.

4. 모바일 Studio
   - 변경 전: [`04-mobile-before.png`](./04-mobile-before.png)
   - 변경 후: [`08-mobile-after.png`](./08-mobile-after.png)
   - 좁은 화면에서도 주요 상태와 동작 문구가 잘리지 않고 읽히는지 확인했습니다.
   - 상단의 `Run rehearsal`, 변경 검토 상태, `Review changes` 순서가 유지됩니다.

## 문서 검토

- README, 케이스 스터디, 아키텍처, 접근성, Figma, AI, 릴리스, 디자인 QA, 이전 감사 보고서의 혼용 표현을 다듬었습니다.
- `receipt`, `fixture`, `gate`, `source mutation` 같은 일반 설명 속 구현 용어를 승인 기록, 테스트 픽스처, 검증 항목, 소스 변경처럼 자연스러운 한국어로 바꿨습니다.
- 자동 생성 문서는 레지스트리와 생성 스크립트를 수정한 뒤 다시 만들었습니다.
- 이후 회귀를 막기 위해 [`docs/content-style.md`](../../docs/content-style.md)에 언어와 용어 기준을 추가했습니다.

## 잘 유지된 점

- 기존 디자인 시안의 레이아웃, 색상, 컴포넌트 계층을 바꾸지 않고 문구만 개선했습니다.
- 실제 실행 범위를 과장하지 않고 로컬 검증, CI 검증, 외부 배포 경계를 구분했습니다.
- 버튼은 동사와 목적어, 상태는 짧고 구체적인 문장으로 통일했습니다.

## 접근성 확인 범위

- 현재 실행에서는 DOM 접근성 이름과 초점 가능한 주요 동작을 화면별로 확인했습니다.
- 단위 테스트와 실제 Chrome axe, 키보드 탐색, 시각 회귀는 저장소의 자동 검증 단계에서 다시 실행합니다.
- VoiceOver와 NVDA의 실제 발화는 이번 로컬 자동 검토 범위에 포함하지 않았습니다.

## 판정

현재 검토 범위에서 추가로 남아 있는 P0, P1, P2 문구 문제는 없습니다.
