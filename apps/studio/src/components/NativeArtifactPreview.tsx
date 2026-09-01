import {
  CheckCircle,
  DeviceMobile,
  FileCode,
  Info,
} from "@phosphor-icons/react";
import type { ThemeName } from "@aster-ui/tokens";
import type { Platform } from "../types";

interface NativeArtifactPreviewProps {
  readonly platform: Exclude<Platform, "web">;
  readonly theme: ThemeName;
}

const platformContract = {
  ios: {
    title: "iOS Swift token contract",
    language: "Swift",
    unit: "pt",
    fileName: (theme: string) => `AsterTokens${theme}.swift`,
  },
  android: {
    title: "Android Compose token contract",
    language: "Kotlin",
    unit: "dp",
    fileName: (theme: string) => `AsterTokens${theme}.kt`,
  },
} as const;

export function NativeArtifactPreview({ platform, theme }: NativeArtifactPreviewProps) {
  const contract = platformContract[platform];
  const pascalTheme = `${theme.charAt(0).toUpperCase()}${theme.slice(1)}`;
  const themeAlias = theme === "coral" ? "color.coral.700" : "color.blue.500";
  const artifactPath = `packages/tokens/dist/themes/${theme}/${platform}/${contract.fileName(pascalTheme)}`;

  return (
    <section className="native-artifact" aria-labelledby="native-artifact-title">
      <header>
        <span className="native-artifact__icon"><DeviceMobile weight="bold" aria-hidden="true" /></span>
        <div>
          <p>Generated token artifact</p>
          <h2 id="native-artifact-title">{contract.title}</h2>
        </div>
        <span className="native-artifact__status">
          <CheckCircle weight="fill" aria-hidden="true" /> Numeric values verified
        </span>
      </header>

      <div className="native-artifact__path">
        <FileCode aria-hidden="true" />
        <span>{contract.language} file</span>
        <code>{artifactPath}</code>
      </div>

      <dl>
        <div><dt>space.4</dt><dd>16 {contract.unit}</dd></div>
        <div><dt>radius.md</dt><dd>10 {contract.unit}</dd></div>
        <div><dt>color.action.primary</dt><dd><code>{`{${themeAlias}}`}</code></dd></div>
      </dl>

      <p className="native-artifact__boundary">
        <Info weight="fill" aria-hidden="true" />
        <span>
          <code>TreatmentCard</code> is available only as a web component. This view verifies shared
          native tokens; it does not represent a SwiftUI or Compose component implementation.
        </span>
      </p>
    </section>
  );
}
