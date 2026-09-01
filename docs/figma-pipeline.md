# Figma에서 코드까지

`@aster-ui/figma-bridge`는 결정적인 `FigmaVariablesPayload` fixture를 다음 조건으로 정규화합니다.

- source, 양의 정수 source version, source theme, sync timestamp 검증
- UI 표시 수와 동일한 payload change count 사용
- generated DTCG core alias contract에서 before와 after alias 검증
- 중복되지 않은 change ID, dotted token name, 실제 alias 변경, 비어 있지 않은 고유 Web, iOS, Android scope 검증
- Web, iOS, Android scope를 CSS, Swift, Compose 토큰 영향으로 변환
- `requiresHumanReview: true` 강제

현재 fixture에는 3개 변경이 있으며 action과 text accent는 접근 가능한 Coral 700, focus ring은 Blue 500을 가리킵니다. 토큰 추가 시 allowlist를 수동 수정하지 않고 DTCG source에서 계약을 다시 생성합니다. 구조가 잘못되었거나 존재하지 않는 alias는 `FigmaContractError`로 중단됩니다.

실제 환경에서는 transport만 Figma REST API 또는 Plugin message channel로 교체합니다. 인증과 rate limit, pagination, token 삭제, 참조 순환, mode mapping은 transport 계층에서 처리하고 정규화 계약과 사람 검토 단계는 유지합니다. 이 저장소는 실제 Figma 쓰기를 수행했다고 주장하지 않습니다.
