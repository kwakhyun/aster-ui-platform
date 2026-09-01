import { Alert, Badge, Button, TextField } from "@aster-ui/react";

export function ClinicReviewQueue() {
  return (
    <section aria-labelledby="review-heading">
      <h1 id="review-heading">클리닉 정보 검수</h1>
      <Alert tone="info" title="검수 기준이 업데이트됐습니다.">
        공개 전 필수 항목을 다시 확인하세요.
      </Alert>
      <TextField label="클리닉 검색" placeholder="병원명 또는 담당자명" />
      <p><Badge tone="accent">검토 필요</Badge></p>
      <Button tone="secondary">필터 적용</Button>
    </section>
  );
}
