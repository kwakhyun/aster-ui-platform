# 실행 가능한 AI 제안 워크플로

이 워크플로는 범위가 정해진 디자인 시스템 요청을 구조화된 제안으로 바꿉니다. AI 에이전트에는 소스 수정이나 패키지 배포 권한을 주지 않습니다.

## 결정론적 CI 경로

```bash
pnpm ai:fixture
pnpm ai:check
```

이 검사는 라이브 경로와 같은 제안 스키마, 현재 컴포넌트 매니페스트, SemVer 규칙을 검증합니다. 단위 및 접근성 테스트 요건, 문서와 위험 항목도 확인합니다.

이어서 임시 사람 승인 기록을 만들고 변조, 덮어쓰기, 허용되지 않은 경로, 잘못된 검토자 입력, 제공자 응답 제한 시간 초과를 거부합니다. 검사가 끝난 뒤 소스 리비전이 바뀌지 않았는지도 확인합니다.

## Claude Code 라이브 경로

```bash
pnpm ai:propose -- \
  --provider claude \
  --request ai/requests/localize-treatment-card-save-label.md \
  --output reports/ai-proposals/treatment-card-label.claude.json
```

래퍼는 Claude Code를 비대화형으로 호출합니다. 도구 사용과 세션 저장은 비활성화하고 JSON Schema 구조화 출력, 비용 한도, 실행 시간과 출력 크기 제한을 적용합니다.

요청은 `ai/requests/`, 새 보고서는 `reports/ai-proposals/` 안에서만 만들 수 있으며 기존 파일은 덮어쓸 수 없습니다. 생성 보고서에는 제공자 버전과 요청, 프롬프트, 매니페스트 해시를 기록합니다. 파일을 쓰기 전에 결정론적 검증을 실행합니다.

## 사람 승인 경계

```bash
pnpm ai:approve -- \
  --proposal reports/ai-proposals/treatment-card-label.claude.json \
  --reviewer "Reviewer name" \
  --output reports/ai-approvals/treatment-card-label.json
```

승인 명령은 현재 요청, 프롬프트, 컴포넌트 매니페스트를 기준으로 제안 보고서 전체를 다시 검증합니다. 그런 다음 `reports/ai-approvals/`에 새 승인 기록을 만듭니다.

승인 기록은 보고서 전체와 결합되며 보고서나 기존 승인 기록을 덮어쓸 수 없습니다. 승인 후에도 코드는 자동으로 적용되지 않습니다. 구현은 일반 검토 브랜치에서 진행하고 `pnpm verify`와 릴리스 워크플로를 거칩니다.

`reviewer` 값은 로컬 감사용 표시 이름이며 인증된 신원이나 전자서명이 아닙니다. 라이브 제안과 승인 디렉터리는 기본적으로 Git 추적 대상에서 제외됩니다.
