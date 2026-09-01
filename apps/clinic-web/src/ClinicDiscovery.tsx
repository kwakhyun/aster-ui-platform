import { Button, Tabs, TreatmentCard } from "@aster-ui/react";

const image = "/assets/laser-toning-portrait-800.webp";

export function ClinicDiscovery() {
  return (
    <main>
      <Tabs
        ariaLabel="시술 탐색"
        items={[
          {
            value: "recommended",
            label: "추천",
            content: (
              <TreatmentCard
                title="레이저 토닝"
                category="미백과 색소 개선"
                imageUrl={image}
                imageAlt="레이저 토닝 시술 예시"
                price={79_000}
                downtime="거의 없음"
                sessions="3~5회"
              />
            ),
          },
          { value: "saved", label: "저장", content: "저장한 시술이 없습니다." },
        ]}
      />
      <Button>상담 신청</Button>
    </main>
  );
}
