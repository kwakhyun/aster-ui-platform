# 실행 가능한 AI 제안 워크플로

AI는 공용 API를 직접 수정하거나 릴리스하지 않습니다. 이 저장소의 Claude Code 통합은 요청을 구조화된 제안으로 바꾸는 읽기 전용 단계입니다.

```text
범위가 정해진 요청
  → 현재 컴포넌트 매니페스트 생성
  → Claude Code JSON Schema 출력, 도구 사용 비활성화
  → 결정론적 API 및 SemVer 검증
  → 제안 보고서, 소스 변경 없음
  → 명시적인 사람 승인 기록
  → 일반 구현 브랜치 및 pnpm verify
```

## 라이브 경로

```bash
pnpm ai:propose -- \
  --provider claude \
  --request ai/requests/localize-treatment-card-save-label.md \
  --output reports/ai-proposals/treatment-card-label.claude.json
```

래퍼는 설치된 Claude Code CLI를 비대화형 모드로 호출합니다.

- JSON Schema 구조화 출력
- 도구 사용 비활성화
- 계획 전용 권한 모드
- 세션 저장 비활성화
- 기본 비용 상한 0.50달러
- 기본 제한 시간 120초와 표준 출력 및 오류 출력 상한
- 요청은 `ai/requests/`, 결과는 `reports/ai-proposals/` 내부로 제한
- 기존 결과 파일 덮어쓰기 차단
- 요청, 프롬프트, 매니페스트 해시와 Claude Code 버전 기록

로그인되지 않았거나 구조화 출력이 없으면 실패합니다. 제공자 오류는 프롬프트 전체나 인증 정보를 다시 출력하지 않고 짧은 실패 사유로 정리합니다.

## 결정론적 검증

`pnpm ai:check`는 라이브 제공자 없이 제안부터 승인까지 같은 경계 조건을 검증합니다.

- 대상 컴포넌트가 현재 매니페스트에 존재하는가
- 새 prop이 기존 API와 충돌하지 않는가
- 제거, 타입 변경, 필수 prop 추가가 메이저 변경으로 분류됐는가
- 선택적 prop 추가가 마이너 이상으로 분류됐는가
- 단위 테스트와 접근성 테스트가 모두 제안됐는가
- 문서 변경, 위험, 완화책이 있는가
- 소스 변경이 비활성화돼 있는가
- 사람 검토 상태가 `required`인가
- 승인 시점의 요청, 프롬프트, 매니페스트 해시가 현재 파일과 일치하는가
- 자동 통과 필드, 매니페스트 해시, 소스 변경 경계가 변조되지 않았는가
- 승인 기록이 제안 보고서 전체와 요청, 프롬프트, 매니페스트 해시에 결합됐는가
- 승인 또는 제안 경로가 허용된 디렉터리를 벗어나지 않는가
- 승인 기록과 제안 보고서를 덮어쓰지 않는가
- 제공자가 응답하지 않을 때 제한 시간 안에 종료되는가
- 전체 검증 전후 소스 리비전이 동일한가

테스트 픽스처 보고서는 [`reports/ai-workflow.json`](../reports/ai-workflow.json)에 있습니다.

## 사람 승인

```bash
pnpm ai:approve -- \
  --proposal reports/ai-proposals/treatment-card-label.claude.json \
  --reviewer "Reviewer name" \
  --output reports/ai-approvals/treatment-card-label.json
```

승인 명령은 현재 파일을 기준으로 제안과 보고서 무결성을 다시 검증합니다. 그다음 보고서 전체와 제안, 요청, 프롬프트, 매니페스트 해시를 담은 별도 승인 기록을 새 파일로 만듭니다.

기존 제안이나 승인 기록은 덮어쓰지 않으며 승인 기록도 코드를 적용하지 않습니다. 구현 뒤에는 매니페스트와 문서 재생성, API 호환성 검사, 실제 브라우저 axe와 시각 회귀를 포함한 `pnpm verify`가 필요합니다.

`reviewer`는 로컬 감사용 표시 이름이며 인증된 신원이나 전자서명이 아닙니다. 라이브 제안과 승인 파일은 기본적으로 Git 추적 대상에서 제외해 제공자 출력이나 검토 메모가 실수로 커밋되지 않게 합니다.

## 자동 승인하지 않는 결정

- 공개 컴포넌트 API 변경
- 시맨틱 토큰의 의미 변경
- 접근성 예외와 대비 기준 완화
- SemVer 분류와 지원 중단 유예 종료
- 패키지 배포 또는 소비 앱 병합

전체 명령과 예시는 [`ai/README.md`](../ai/README.md)에 있습니다.
