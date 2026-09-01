// example:start
import { TreatmentCard } from "@aster-ui/react";

const srcSet = "/laser-toning-400.webp 400w, /laser-toning-800.webp 800w";
const sizes = "(max-width: 720px) calc(100vw - 80px), 204px";

function openTreatment() {
  // Route to the treatment detail owned by the consuming product.
}

export function TreatmentCardUsageExample() {
  return (
    <TreatmentCard
      title="Laser toning"
      category="Brightening and pigmentation"
      imageUrl="/laser-toning-800.webp"
      imageAlt="레이저 토닝 시술 정보를 소개하는 성인 여성 모델"
      price={79_000}
      downtime="Minimal"
      sessions="3–5"
      headingLevel="h2"
      imageProps={{ srcSet, sizes }}
      onSelect={openTreatment}
    />
  );
}
// example:end
