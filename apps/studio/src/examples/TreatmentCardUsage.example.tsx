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
      category="Brightening and pigmentation care"
      imageUrl="/laser-toning-800.webp"
      imageAlt="Portrait of an adult model for laser toning"
      price={79_000}
      locale="en-US"
      downtime="Minimal"
      sessions="3–5"
      headingLevel="h2"
      imageProps={{ srcSet, sizes }}
      onSelect={openTreatment}
    />
  );
}
// example:end
