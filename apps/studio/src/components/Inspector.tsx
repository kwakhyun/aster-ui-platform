import type { FigmaSyncReview } from "@aster-ui/figma-bridge";
import {
  CaretRight,
  CheckCircle,
  WarningCircle,
} from "@phosphor-icons/react";
import { getApiProperties } from "../data/catalog";
import { handleHorizontalTabKeyDown } from "../lib/tabs";
import type { InspectorTab, QualityEvidence } from "../types";
import { EvidenceProvenance } from "./EvidenceProvenance";
import { TokenSwatch } from "./TokenSwatch";

interface InspectorProps {
  readonly tab: InspectorTab;
  readonly componentName: string;
  readonly blocked: boolean;
  readonly review: FigmaSyncReview;
  readonly qualityEvidence: QualityEvidence;
  readonly onTabChange: (tab: InspectorTab) => void;
  readonly onOpenDiff: () => void;
  readonly onViewVisualTests: () => void;
}

const tabs: readonly { id: InspectorTab; label: string }[] = [
  { id: "api", label: "Props" },
  { id: "tokens", label: "Changes" },
  { id: "quality", label: "Checks" },
] as const;

export function Inspector({
  tab,
  componentName,
  blocked,
  review,
  qualityEvidence,
  onTabChange,
  onOpenDiff,
  onViewVisualTests,
}: InspectorProps) {
  const apiEvidence = qualityEvidence.checks.find((check) => check.id === "api");
  const passedCount = qualityEvidence.checks.filter((check) => check.status === "passed").length;
  const apiProperties = getApiProperties(componentName);

  return (
    <aside
      className="inspector"
      aria-label="Component inspector"
      aria-hidden={blocked ? "true" : undefined}
      inert={blocked ? true : undefined}
    >
      <p className="inspector__scope">Review summary</p>
      <div className="inspector__tabs" role="tablist" aria-label="Inspector views">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`inspector-tab-${item.id}`}
            aria-controls="inspector-panel"
            className={tab === item.id ? "is-active" : ""}
            aria-selected={tab === item.id}
            tabIndex={tab === item.id ? 0 : -1}
            onKeyDown={handleHorizontalTabKeyDown}
            onClick={() => onTabChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div
        id="inspector-panel"
        className="inspector__content"
        role="tabpanel"
        aria-labelledby={`inspector-tab-${tab}`}
        tabIndex={0}
      >
        {tab === "tokens" ? (
          <section className="inspector-section token-changes" aria-labelledby="token-heading">
            <div className="inspector-section__heading">
              <h2 id="token-heading">Semantic token changes</h2>
              <span>
                {review.sourceTheme.charAt(0).toUpperCase()}{review.sourceTheme.slice(1)} · {review.validation.changeCount}
              </span>
            </div>
            <div className="token-changes__labels" aria-hidden="true">
              <span />
              <span>Before</span>
              <span>After</span>
            </div>
            <div className="token-changes__list">
              {review.changes.map((change, index) => (
                <button type="button" key={change.id} onClick={onOpenDiff}>
                  <span className={`token-dot token-dot--${index + 1}`} aria-hidden="true" />
                  <strong>{change.token}</strong>
                  <CaretRight aria-hidden="true" />
                  <span className="token-change__values">
                    <span>
                      <TokenSwatch alias={change.before} theme={review.sourceTheme} />
                      <code>{change.before}</code>
                    </span>
                    <span aria-hidden="true">→</span>
                    <span>
                      <TokenSwatch alias={change.after} theme={review.sourceTheme} />
                      <code>{change.after}</code>
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <QualitySummary evidence={qualityEvidence} onViewVisualTests={onViewVisualTests} />
          </section>
        ) : null}

        {tab === "api" ? (
          <section className="inspector-section api-inspector" aria-labelledby="api-inspector-heading">
            <div className="inspector-section__heading">
              <h2 id="api-inspector-heading">{componentName} API</h2>
              <span>{apiProperties.length} props</span>
            </div>
            <dl>
              {apiProperties.map((property) => (
                <div key={property.name}>
                  <dt>{property.name}</dt>
                  <dd>
                    <code>{property.type}</code>
                    <span>{property.required ? "Required" : property.defaultValue}</span>
                  </dd>
                </div>
              ))}
            </dl>
            <EvidenceBlock
              evidence={apiEvidence}
              label="@aster-ui/react API check"
            />
          </section>
        ) : null}

        {tab === "quality" ? (
          <section className="inspector-section inspector-quality" aria-labelledby="inspector-quality-heading">
            <div className="inspector-section__heading">
              <h2 id="inspector-quality-heading">Quality evidence</h2>
              <span>{passedCount}/{qualityEvidence.checks.length}</span>
            </div>
            <EvidenceProvenance evidence={qualityEvidence} compact />
            <EvidenceList evidence={qualityEvidence} onViewVisualTests={onViewVisualTests} />
            <EvidenceBlock evidence={apiEvidence} />
          </section>
        ) : null}
      </div>
    </aside>
  );
}

interface QualitySummaryProps {
  readonly evidence: QualityEvidence;
  readonly onViewVisualTests: () => void;
}

function QualitySummary({ evidence, onViewVisualTests }: QualitySummaryProps) {
  return (
    <div className="quality-summary">
      <h3>Quality evidence</h3>
      <EvidenceProvenance evidence={evidence} compact />
      <EvidenceList evidence={evidence} onViewVisualTests={onViewVisualTests} />
      <EvidenceBlock evidence={evidence.checks.find((check) => check.id === "api")} />
    </div>
  );
}

function EvidenceList({ evidence, onViewVisualTests }: QualitySummaryProps) {
  return (
    <ul>
      {evidence.checks.map((check) => (
        <li key={check.id} data-status={check.status}>
          {check.status === "passed"
            ? <CheckCircle size={20} weight="fill" aria-hidden="true" />
            : <WarningCircle size={20} weight="fill" aria-hidden="true" />}
          <div>
            <strong>{check.label}</strong>
            <span>{check.detail}</span>
          </div>
          {check.id === "visual" ? (
            <button type="button" className="text-action" onClick={onViewVisualTests}>View details</button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

interface EvidenceBlockProps {
  readonly evidence: QualityEvidence["checks"][number] | undefined;
  readonly label?: string;
}

function EvidenceBlock({ evidence, label = "Package API compatibility" }: EvidenceBlockProps) {
  const passed = evidence?.status === "passed";
  return (
    <div className="compatibility-block" data-status={passed ? "passed" : "attention"}>
      <span>{label}</span>
      <strong>{passed ? "Compatible" : "Review needed"}</strong>
      <p>{evidence?.detail ?? "Compatibility evidence is unavailable."}</p>
    </div>
  );
}
