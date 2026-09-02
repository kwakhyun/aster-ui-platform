# Figma Variables에서 코드 검토까지

`@aster-ui/figma-bridge`는 Figma Variables REST API에서 받은 로컬 변수 응답을 입력으로 사용합니다. 공식 엔드포인트는 `GET /v1/files/:file_key/variables/local`이며 `file_variables:read` 범위가 필요합니다.

공식 문서:

- [Variables endpoints](https://developers.figma.com/docs/rest-api/variables-endpoints/)
- [REST API authentication](https://developers.figma.com/docs/rest-api/authentication/)
- [Personal access tokens](https://developers.figma.com/docs/rest-api/personal-access-tokens/)

## 처리 순서

```text
Figma 로컬 변수 응답
  → 컬렉션과 모드 선택
  → 시맨틱 변수 별칭 해석
  → 이전 및 다음 스냅샷 비교
  → DTCG 별칭 존재 여부 검증
  → Web, iOS, Android 영향 모델
  → 사람 검토용 변경 내역 생성
```

다음 조건 중 하나라도 해당하면 검토 모델 생성을 중단합니다.

- 응답 객체 또는 변수 맵이 없음
- 컬렉션이나 모드가 없음
- 추적 대상 시맨틱 변수가 리터럴 값을 가짐
- 별칭 대상 변수가 사라짐
- 소스, 버전, 테마, 시각 정보가 잘못됨
- 중복 변경 ID, 잘못된 점 표기 토큰 이름, 변화가 없는 별칭, 비어 있거나 중복된 범위
- 변경 전후 별칭이 생성된 DTCG 핵심 계약에 없음

## 인증

- Personal access token과 plan access token은 `X-Figma-Token` 헤더를 사용합니다.
- OAuth는 `Authorization: Bearer` 헤더를 사용합니다.
- CLI는 토큰을 URL, 보고서, 오류 메시지에 기록하지 않습니다.

라이브 읽기 예시:

```bash
FIGMA_ACCESS_TOKEN='<token>' pnpm figma:sync -- \
  --before path/to/approved-snapshot.json \
  --file-key '<figma-file-key>' \
  --collection 'Aster semantic tokens' \
  --mode 'Coral' \
  --theme coral \
  --source-version 13 \
  --output reports/figma-live-review.json
```

OAuth 토큰을 사용할 때만 `FIGMA_AUTH_MODE=oauth`를 함께 지정합니다. 이 명령은 Figma나 토큰 소스를 수정하지 않습니다.

## CI 테스트 픽스처

Figma Variables API는 플랜, 사용자 라이선스, 파일 권한에 따라 사용할 수 있으므로 CI는 공식 스키마를 본뜬 비식별 테스트 픽스처를 재생합니다.

```bash
pnpm figma:fixture
pnpm figma:check
```

현재 테스트 픽스처는 기본 동작 색상, 포커스 링, 강조 텍스트의 별칭 변경 3건을 재현합니다. 결과는 [`reports/figma-sync.json`](../reports/figma-sync.json)에 저장되고 `requiresHumanReview: true`를 유지합니다.

이 저장소는 실제 Figma 쓰기, 라이브 파일 동기화, 라이브러리 게시를 수행했다고 주장하지 않습니다. 쓰기 경로를 추가하더라도 별도 권한, 원자적 업데이트 검증, 게시 경계, 승인 정책이 필요합니다.
