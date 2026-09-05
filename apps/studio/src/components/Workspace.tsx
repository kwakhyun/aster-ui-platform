import {
  CheckCircle,
  CopySimple,
  DeviceMobile,
  Globe,
  WarningCircle,
} from "@phosphor-icons/react";
import { Alert, Badge, Button, Tabs, TextField, TreatmentCard } from "@aster-ui/react";
import { themeNames, tokenArtifactPlatforms } from "@aster-ui/tokens";
import {
  getApiProperties,
  getComponent,
  getComponentUsage,
  responsiveTreatmentImage,
  treatment,
} from "../data/catalog";
import { handleHorizontalTabKeyDown } from "../lib/tabs";
import type {
  Platform,
  PreviewStateOption,
  QualityEvidence,
  StudioTheme,
  WorkspaceTab,
} from "../types";
import { StateStrip } from "./StateStrip";
import { EvidenceProvenance } from "./EvidenceProvenance";
import { NativeArtifactPreview } from "./NativeArtifactPreview";
import type { FigmaSyncReview } from "@aster-ui/figma-bridge";
import { TokenSwatch } from "./TokenSwatch";
import { TokenComparison } from "./TokenComparison";
import { resolveTokenColor } from "../lib/tokenColors";

interface WorkspaceProps {
  readonly review: FigmaSyncReview;
  readonly tab: WorkspaceTab;
  readonly componentName: string;
  readonly platform: Platform;
  readonly theme: StudioTheme;
  readonly previewState: PreviewStateOption["id"];
  readonly saved: boolean;
  readonly qualityEvidence: QualityEvidence;
  readonly onTabChange: (tab: WorkspaceTab) => void;
  readonly onPlatformChange: (platform: Platform) => void;
  readonly onThemeChange: (theme: StudioTheme) => void;
  readonly onStateChange: (state: PreviewStateOption["id"]) => void;
  readonly onSavedChange: (saved: boolean) => void;
  readonly onCardSelect: () => void;
  readonly onCopyUsage: (usage: string) => void;
}

const tabs: readonly { id: WorkspaceTab; label: string }[] = [
  { id: "preview", label: "Preview" },
  { id: "api", label: "API" },
  { id: "tokens", label: "Tokens" },
  { id: "quality", label: "Quality" },
] as const;

const platforms: readonly { id: Platform; label: string }[] = [
  { id: "web", label: "Web" },
  { id: "ios", label: "iOS" },
  { id: "android", label: "Android" },
] as const;

export function Workspace({
  review,
  tab,
  componentName,
  platform,
  theme,
  previewState,
  saved,
  qualityEvidence,
  onTabChange,
  onPlatformChange,
  onThemeChange,
  onStateChange,
  onSavedChange,
  onCardSelect,
  onCopyUsage,
}: WorkspaceProps) {
  const passedCount = qualityEvidence.checks.filter((check) => check.status === "passed").length;
  const component = getComponent(componentName);
  const apiProperties = getApiProperties(componentName);
  const componentUsage = getComponentUsage(componentName);

  return (
    <div className="workspace">
      <div className="workspace__toolbar">
        <div className="workspace__tabs" role="tablist" aria-label="Component workspace views">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`workspace-tab-${item.id}`}
              aria-controls="workspace-panel"
              aria-selected={tab === item.id}
              tabIndex={tab === item.id ? 0 : -1}
              className={tab === item.id ? "is-active" : ""}
              onKeyDown={handleHorizontalTabKeyDown}
              onClick={() => onTabChange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="workspace__toolbar-actions">
          <label className="theme-selector">
            <span>Theme</span>
            <select
              aria-label="Preview theme"
              value={theme}
              onChange={(event) => onThemeChange(event.currentTarget.value as StudioTheme)}
            >
              {themeNames.map((name) => (
                <option key={name} value={name}>{name === "coral" ? "Coral" : "Ocean"}</option>
              ))}
            </select>
          </label>

          {tab === "preview" ? (
            <div className="workspace__platforms" role="tablist" aria-label="Platform preview">
              {platforms.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  id={`platform-tab-${item.id}`}
                  aria-controls="component-preview-canvas"
                  aria-selected={platform === item.id}
                  tabIndex={platform === item.id ? 0 : -1}
                  className={platform === item.id ? "is-active" : ""}
                  onKeyDown={handleHorizontalTabKeyDown}
                  onClick={() => onPlatformChange(item.id)}
                >
                  {item.id === "web" ? <Globe aria-hidden="true" /> : <DeviceMobile aria-hidden="true" />}
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div
        id="workspace-panel"
        className="workspace__body"
        role="tabpanel"
        aria-labelledby={`workspace-tab-${tab}`}
      >
        {tab === "preview" ? (
          <>
            <div
              id="component-preview-canvas"
              className="preview-canvas"
              data-platform={platform}
              role="tabpanel"
              aria-labelledby={`platform-tab-${platform}`}
            >
              {platform === "web" ? (
                <div className="preview-canvas__state-preview" data-preview-state={previewState}>
                  <ComponentPreview
                    componentName={componentName}
                    previewState={previewState}
                    saved={saved}
                    onSavedChange={onSavedChange}
                    onCardSelect={onCardSelect}
                  />
                </div>
              ) : (
                <NativeArtifactPreview platform={platform} theme={theme} />
              )}
            </div>
            {platform === "web" && componentName === "TreatmentCard" ? (
              <StateStrip selected={previewState} onSelect={onStateChange} />
            ) : null}
          </>
        ) : null}

        {tab === "api" ? (
          <section className="workspace-panel api-panel" aria-labelledby="api-heading">
            <div className="workspace-panel__heading">
              <div>
                <span>Typed public API</span>
                <h2 id="api-heading">{component?.propsInterface ?? `${componentName}Props`}</h2>
              </div>
              <button
                type="button"
                aria-label="Copy usage example"
                onClick={() => onCopyUsage(componentUsage)}
              >
                <CopySimple /> Copy example
              </button>
            </div>
            <div className="api-panel__grid">
              <pre tabIndex={0} aria-label={`${componentName} usage example`}><code>{componentUsage}</code></pre>
              <table>
                <thead><tr><th>Prop</th><th>Type</th><th>Default</th></tr></thead>
                <tbody>
                  {apiProperties.map((property) => (
                    <tr key={property.name}>
                      <td>{property.name}{property.required ? <b aria-label="Required">*</b> : null}</td>
                      <td>{property.type}</td>
                      <td>{property.defaultValue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {tab === "tokens" ? (
          <section className="workspace-panel token-map" aria-labelledby="token-map-heading">
            <div className="workspace-panel__heading">
              <div>
                <span>W3C DTCG aliases · {themeNames.length} themes</span>
                <h2 id="token-map-heading">Resolved token map</h2>
              </div>
              <span className="status-pill">{tokenArtifactPlatforms.length} output formats generated</span>
            </div>
            {["color.action.primary", "color.focus.ring", "color.text.accent"].map((token) => (
              <div className="token-map__row" key={token}>
                <TokenSwatch alias={`{semantic.${token}}`} theme={theme} />
                <strong>{token}</strong>
                <code>{`{semantic.${token}}`} = {resolveTokenColor(`{semantic.${token}}`, theme) ?? "Unresolved"}</code>
                <span>CSS · Swift · Compose</span>
              </div>
            ))}
            <TokenComparison review={review} />
          </section>
        ) : null}

        {tab === "quality" ? (
          <section className="workspace-panel quality-panel" aria-labelledby="quality-heading">
            <div className="workspace-panel__heading">
              <div>
                <span>Generated from repository checks</span>
                <h2 id="quality-heading">Release quality checks</h2>
              </div>
              <span className={passedCount === qualityEvidence.checks.length ? "status-pill" : "status-pill status-pill--attention"}>
                {passedCount} of {qualityEvidence.checks.length} checks passed
              </span>
            </div>
            <EvidenceProvenance evidence={qualityEvidence} />
            <ul>
              {qualityEvidence.checks.map((check) => (
                <li key={check.id} data-status={check.status}>
                  {check.status === "passed"
                    ? <CheckCircle weight="fill" aria-hidden="true" />
                    : <WarningCircle weight="fill" aria-hidden="true" />}
                  <div>
                    <strong>{check.label}</strong>
                    <span>{check.detail}</span>
                    <code>{check.command}</code>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}

interface ComponentPreviewProps {
  readonly componentName: string;
  readonly previewState: PreviewStateOption["id"];
  readonly saved: boolean;
  readonly onSavedChange: (saved: boolean) => void;
  readonly onCardSelect: () => void;
}

function ComponentPreview({
  componentName,
  previewState,
  saved,
  onSavedChange,
  onCardSelect,
}: ComponentPreviewProps) {
  const disabled = previewState === "disabled";

  if (componentName === "TreatmentCard") {
    return (
      <TreatmentCard
        {...treatment}
        imageProps={{
          ...responsiveTreatmentImage,
          loading: "eager",
          fetchPriority: "high",
        }}
        disabled={disabled}
        saved={saved}
        onSavedChange={onSavedChange}
        onSelect={onCardSelect}
      />
    );
  }

  return (
    <div className="component-showcase" aria-label={`${componentName} preview`}>
      {componentName === "Alert" ? (
        <Alert tone="success" title="Tokens synced">Validated 3 changes.</Alert>
      ) : null}
      {componentName === "Badge" ? <Badge tone="success">Ready</Badge> : null}
      {componentName === "Button" ? <Button disabled={disabled}>Review changes</Button> : null}
      {componentName === "Tabs" ? (
        <Tabs
          ariaLabel="Treatment information"
          items={[
            { value: "overview", label: "Overview", content: "Laser toning overview" },
            { value: "aftercare", label: "Aftercare", content: "Use sunscreen after treatment." },
          ]}
        />
      ) : null}
      {componentName === "TextField" ? (
        <TextField
          label="Search clinics"
          hint="Enter a clinic name or location."
          placeholder="e.g. Gangnam"
          disabled={disabled}
        />
      ) : null}
    </div>
  );
}
