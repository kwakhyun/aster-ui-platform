# 릴리스와 하위 호환

## 버전 계약

`3.1.0-beta.2`는 root, Studio, 세 패키지, token constant, component manifest, release-please manifest, changelog, Kubernetes version metadata에서 동일해야 합니다. 실제 Kubernetes image는 별도 renderer가 `repository@sha256:<digest>` 형식만 허용합니다. `pnpm release:check`가 하나라도 다르면 실패합니다.

## API 호환성

- patch: DOM 의미와 사용자 동작을 유지하는 오류 수정
- minor: optional prop, token, variant 추가
- major: prop 제거, 필수 prop 추가, 타입이나 상호작용 의미 변경
- prerelease: 실제 소비 앱 검증을 위한 beta 계약

Deprecated API에는 대체 API, 이전 지침, 최소 한 번의 minor 유예 기간이 필요합니다. `packages/react/api-baseline.json`과 생성 manifest 비교는 제거, 타입 변경, 필수 전환, 기본값 변경을 차단합니다.

## 로컬 리허설과 실제 배포

Studio의 버튼은 실제 npm 배포가 아니라 로컬 릴리스 리허설입니다. receipt에는 schema version, `local-rehearsal` mode, idempotency key, beta channel, 실행 시각과 함께 검토자, Figma source version 및 theme, change fingerprint, 품질 source revision, run ID, artifact digest를 기록합니다. 현재 문맥과 정확히 일치하는 receipt만 새로고침 뒤 복구하며, UI와 toast가 외부 레지스트리를 변경하지 않았음을 명시합니다.

빌드에 삽입된 source revision과 품질 근거의 revision이 다르거나 다섯 품질 gate가 모두 통과하지 않으면 checkbox와 실행 버튼이 비활성화됩니다. 사용자는 Quality 화면에서 실패하거나 오래된 근거를 먼저 확인해야 합니다.

실제 release-please workflow는 SHA로 고정된 Action에서 `pnpm verify`를 통과한 뒤에만 release 제안을 실행합니다. 이 순서는 품질 검사, 실제 브라우저 시각 및 접근성 검사, 프로덕션 의존성 감사를 먼저 수행하고, 근거 생성 후 Studio를 재빌드합니다. Studio의 로컬 근거는 Git commit을 기록하되 GitHub Actions 성공으로 표현하지 않으며, 공개 실행 상태는 저장소의 Actions 화면에서 별도로 확인합니다.
