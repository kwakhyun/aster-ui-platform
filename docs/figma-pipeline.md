# Figma Variables에서 코드 검토까지

`@aster-ui/figma-bridge`는 Figma Variables REST API의 로컬 변수 응답을 실제 transport 경계로 사용합니다. 공식 엔드포인트는 `GET /v1/files/:file_key/variables/local`이며 `file_variables:read` scope가 필요합니다.

공식 문서:

- [Variables endpoints](https://developers.figma.com/docs/rest-api/variables-endpoints/)
- [REST API authentication](https://developers.figma.com/docs/rest-api/authentication/)
- [Personal access tokens](https://developers.figma.com/docs/rest-api/personal-access-tokens/)

## 처리 순서

```text
Figma local variables response
  → collection and mode selection
  → semantic variable alias resolution
  → previous and next snapshot diff
  → DTCG alias existence validation
  → Web, iOS, Android impact model
  → mandatory human review artifact
```

다음 조건에서는 실패를 우선합니다.

- response envelope 또는 variables map이 없음
- collection이나 mode가 없음
- 추적 대상 semantic variable이 literal 값을 가짐
- alias target variable이 사라짐
- source, version, theme, timestamp가 잘못됨
- 중복 change ID, 잘못된 dotted token name, no-op alias, 비어 있거나 중복된 scope
- before 또는 after alias가 생성된 DTCG core contract에 없음

## 인증

- Personal access token과 plan access token은 `X-Figma-Token` 헤더를 사용합니다.
- OAuth는 `Authorization: Bearer` 헤더를 사용합니다.
- CLI는 token을 URL, report, 오류 메시지에 기록하지 않습니다.

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

OAuth token을 사용할 때만 `FIGMA_AUTH_MODE=oauth`를 함께 지정합니다. 이 명령은 Figma나 token source를 수정하지 않습니다.

## CI fixture

Figma Variables API는 플랜, seat, 파일 권한에 따라 사용할 수 있으므로 CI는 비식별 공식 schema형 fixture를 재생합니다.

```bash
pnpm figma:fixture
pnpm figma:check
```

현재 fixture는 action primary, focus ring, text accent의 alias 변경 세 건을 재현합니다. 결과는 [`reports/figma-sync.json`](../reports/figma-sync.json)에 저장되고 `requiresHumanReview: true`를 유지합니다.

이 저장소는 실제 Figma 쓰기, 라이브 파일 동기화, library publish를 수행했다고 주장하지 않습니다. 쓰기 경로를 추가하더라도 별도 권한, atomic update 검증, publish 경계, 승인 정책이 필요합니다.
