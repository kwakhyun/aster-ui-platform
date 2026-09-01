import componentManifestJson from "@aster-ui/react/manifest";
import treatmentCardExampleSource from "../examples/TreatmentCardUsage.example.tsx?raw";
import type { PreviewStateOption } from "../types";

export interface ComponentTreeGroup {
  readonly label: string;
  readonly items: readonly string[];
}

export const previewStates: readonly PreviewStateOption[] = [
  { id: "default", label: "Default" },
  { id: "hover", label: "Hover" },
  { id: "focus", label: "Focus" },
  { id: "disabled", label: "Disabled" },
] as const;

export const treatment = {
  title: "Laser toning",
  category: "Brightening · Pigmentation",
  imageUrl: `${import.meta.env.BASE_URL}assets/laser-toning-portrait-800.webp`,
  imageAlt: "레이저 토닝 시술 정보를 소개하는 성인 여성 모델",
  price: 79_000,
  downtime: "Minimal",
  sessions: "3–5",
} as const;

export const responsiveTreatmentImage = {
  srcSet:
    `${import.meta.env.BASE_URL}assets/laser-toning-portrait-400.webp 400w, ${import.meta.env.BASE_URL}assets/laser-toning-portrait-800.webp 800w`,
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
  readonly components: readonly {
    readonly name: string;
    readonly category: string;
    readonly propsInterface: string;
    readonly description: string;
    readonly props: readonly ComponentManifestProp[];
  }[];
}

const componentManifest = componentManifestJson as ComponentManifest;

export const components = componentManifest.components;

export const componentTree: readonly ComponentTreeGroup[] = [
  "Actions",
  "Navigation",
  "Form",
  "Feedback",
  "Treatment",
].flatMap((category) => {
  const items = components
    .filter((component) => component.category === category)
    .map((component) => component.name);
  return items.length > 0 ? [{ label: category, items }] : [];
});

export function getComponent(name: string) {
  return components.find((component) => component.name === name) ?? components[0];
}

export function getApiProperties(name: string) {
  return (getComponent(name)?.props ?? []).map((property) => ({
    name: property.name,
    type: property.type,
    required: property.required,
    defaultValue: property.default ?? "—",
  }));
}

const usageByComponent: Readonly<Record<string, string>> = {
  Alert: `<Alert tone="success" title="토큰 동기화 완료">\n  3개 변경을 검증했습니다.\n</Alert>`,
  Badge: `<Badge tone="success">Ready</Badge>`,
  Button: `<Button tone="primary">Review changes</Button>`,
  Tabs: `<Tabs\n  ariaLabel="시술 정보"\n  items={treatmentTabs}\n/>`,
  TextField: `<TextField\n  label="클리닉 검색"\n  hint="병원명 또는 지역을 입력하세요."\n/>`,
  TreatmentCard: treatmentCardExampleSource
    .replace(/^\/\/ example:start\s*\n/, "")
    .replace(/\n\/\/ example:end\s*$/, "")
    .trim(),
};

export function getComponentUsage(name: string) {
  return usageByComponent[name] ?? `import { ${name} } from "@aster-ui/react";`;
}
