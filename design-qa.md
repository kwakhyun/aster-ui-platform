# Design QA

## 비교 기준

- 승인 시안: `design/aster-ui-final-target.png`
- 최종 구현: `design/implementation-desktop-final.png`
- 통합 비교 입력: `design/qa-comparison-final.png`
- 상태: Preview, Web, Coral, Focus, Tokens inspector, 사람 검토 대기
- 크기: 양쪽 모두 1440 × 1024 CSS px, device pixel ratio 1

두 화면을 같은 크기로 나란히 배치한 통합 비교 입력에서 레이아웃, 타이포그래피, 여백, 테두리, radius, 이미지 crop, 상태 표현을 다시 검토했습니다.

## 판정

P0, P1, P2 시각 또는 사용성 문제가 남아 있지 않습니다.

- 검은 top bar, 3단 workspace, Coral accent, Blue focus, compact tree, 큰 TreatmentCard, 우측 inspector라는 핵심 구성이 유지됩니다.
- 264px navigation, 유동 main, 376px inspector 비율과 62px top bar, 350px preview frame의 구조가 시안과 같은 계층을 유지합니다.
- 자체 포함 Inter variable font로 macOS와 Linux CI의 영문 렌더링 편차를 줄였습니다. 한국어는 Pretendard와 시스템 글꼴로 안전하게 fallback합니다.
- 원본 800 × 1000 PNG 대신 400w와 800w WebP를 사용합니다. 최종 800w 파일은 33,812 bytes이며 slot crop과 밀도를 보존합니다.
- 실제 Chrome axe에서 발견한 Coral action, 작은 회색 보조 텍스트, success badge 대비 문제를 수정했습니다.

## 시안과 의도적으로 다른 부분

다음 차이는 기능 또는 데이터 무결성을 위해 승인 시안의 표현을 교정한 결과입니다.

- `4 incoming changes`를 실제 fixture 수와 같은 `3 incoming changes`로 변경했습니다.
- 존재하지 않던 brand alias를 실제 DTCG alias로 변경하고, 접근 가능한 Coral 700을 사용했습니다.
- 실제 배포로 오해할 수 있는 `Publish`를 `Rehearse`로 변경했습니다.
- Coral과 Ocean을 확인할 수 있는 theme selector를 추가했습니다.
- iOS와 Android 컴포넌트 호환 표현을 제거하고 Swift, Compose token output으로 정확히 표시했습니다.
- 하드코딩된 품질 성공 문구를 repository report에서 생성한 5개 근거로 교체했습니다.

## 자동 시각 근거

`pnpm test:visual`은 설치된 Google Chrome에서 업데이트 없이 통과했습니다.

- Desktop Coral 1440 × 1024
- Desktop Ocean 1440 × 1024
- Figma diff drawer 1440 × 1024
- Local release rehearsal dialog 1440 × 1024
- 200% 확대 상당 viewport 720 × 512
- Mobile component lab 390 × 844

같은 스위트에서 실제 브라우저 axe 4회, roving tab, dead `aria-controls` 부재, horizontal overflow, mobile drawer, forced-colors focus를 확인합니다.

추가로 1280 × 720 데스크톱에서 동기화 상태 strip이 workspace 경계를 넘지 않는지 검사합니다. 시각 비교 허용치는 전체 픽셀의 0.3%입니다.

## 수동 점검

- main card와 네 state card의 이미지 crop이 슬롯을 벗어나지 않습니다.
- theme selector를 추가해도 platform tabs와 workspace tabs가 겹치지 않습니다.
- 390px에서 top bar CTA, review button, theme, platform controls가 유지되며 세로 스크롤로 전체 flow를 완료할 수 있습니다.
- Figma drawer와 release dialog가 toast 위에 표시되고 focus trap과 복귀를 유지합니다.
- Quality inspector의 5개 항목과 API compatibility가 1024px 높이 안에서 읽힙니다.

## 남은 P3 차이

- portrait subject와 일부 임상 glyph는 승인 시안의 독점 원본이 아니라 가장 가까운 실제 asset과 Phosphor icon을 사용합니다.
- working tree에는 Git commit 이력이 없어 UI가 CI 실행 성공 대신 repository verification snapshot을 표시합니다.

final result: passed
