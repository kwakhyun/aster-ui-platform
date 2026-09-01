# 접근성 품질 계약

- 모든 핵심 조작을 키보드로 완료할 수 있어야 합니다.
- modal과 drawer는 최초 초점, Tab 순환, Escape 닫기, 이전 초점 복귀를 제공합니다.
- 선택 상태는 색상 외에도 `aria-selected`, `aria-pressed`, `aria-current`로 전달합니다.
- 현재 화면에 없는 platform tab은 DOM에서 제거해 잘못된 `aria-controls` 관계를 만들지 않습니다.
- 컴포넌트 상태 샘플은 `inert`와 `aria-hidden`으로 중복 조작 요소를 노출하지 않습니다.
- 카드 이미지는 대체 텍스트, 고정 intrinsic size, responsive source를 제공합니다.
- 애니메이션은 `prefers-reduced-motion`에서 제거합니다.

Vitest axe는 initial, Figma drawer, release dialog 상태에서 WCAG 2.0 A/AA, 2.1 A/AA, 2.2 AA 태그에 해당하는 모든 위반을 impact 등급과 관계없이 차단합니다. JSDOM은 실제 paint를 수행하지 않으므로 이 단계에서 color contrast 규칙만 비활성화합니다.

Playwright는 실제 Chromium에서 같은 WCAG 태그 전체와 color contrast를 다시 실행합니다. 같은 스위트가 roving tab, scrollable region의 키보드 접근, 1280px 경계, 200% 확대 상당 viewport, 모바일 drawer, forced-colors focus, 6개 시각 기준 이미지를 검사하며 전체 위반 배열을 실패 근거로 보존합니다. `minor`, `moderate`, `serious`, `critical` 등급을 필터링하지 않습니다.

자동화는 실제 스크린리더 발화를 완전히 대신하지 않습니다. 배포 전 VoiceOver와 NVDA 또는 동등한 보조 기술에서 읽기 순서와 안내 문구를 수동 확인해야 하며, 이 저장소는 해당 수동 인증을 실행했다고 주장하지 않습니다.
