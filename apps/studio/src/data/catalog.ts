import componentManifestJson from "@aster-ui/react/manifest";
import treatmentCardExampleSource from "../examples/TreatmentCardUsage.example.tsx?raw";
import type { PreviewStateOption } from "../types";

export interface ComponentTreeGroup {
  readonly label: string;
  readonly items: readonly string[];
}

export const componentTree: readonly ComponentTreeGroup[] = [
  { label: "Surfaces", items: ["Card", "Sheet", "Divider"] },
  {
    label: "Treatment",
    items: ["TreatmentCard", "TreatmentBadge", "TreatmentMeta", "PriceTag", "ClinicLabel"],
  },
  { label: "Navigation", items: ["Tabs", "Chip", "Breadcrumb"] },
  { label: "Feedback", items: ["Badge", "Toast", "Alert"] },
  { label: "Form", items: ["TextField", "Select", "Checkbox"] },
] as const;

export const previewStates: readonly PreviewStateOption[] = [
  { id: "default", label: "Default" },
  { id: "hover", label: "Hover" },
  { id: "focus", label: "Focus" },
  { id: "disabled", label: "Disabled" },
] as const;

export const treatment = {
  title: "Laser toning",
  category: "Brightening · Pigmentation",
  imageUrl: "/assets/laser-toning-portrait-800.webp",
  imageAlt: "레이저 토닝 시술 정보를 소개하는 성인 여성 모델",
  price: 79_000,
  downtime: "Minimal",
  sessions: "3–5",
} as const;

export const responsiveTreatmentImage = {
  srcSet:
    "/assets/laser-toning-portrait-400.webp 400w, /assets/laser-toning-portrait-800.webp 800w",
  sizes: "(max-width: 720px) calc(100vw - 80px), 204px",
  width: 800,
  height: 1000,
} as const;

interface ComponentManifestProp {
  readonly name: string;
  readonly type: string;
  readonly required: boolean;
  readonly default: string | null;
}

interface ComponentManifest {
  readonly props: readonly ComponentManifestProp[];
}

const componentManifest = componentManifestJson as ComponentManifest;

export const apiProperties = componentManifest.props.map((property) => ({
  name: property.name,
  type: property.type,
  required: property.required,
  defaultValue: property.default ?? "—",
}));

export const treatmentCardUsage = treatmentCardExampleSource
  .replace(/^\/\/ example:start\s*\n/, "")
  .replace(/\n\/\/ example:end\s*$/, "")
  .trim();
