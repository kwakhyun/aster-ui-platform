import type { QualityEvidence } from "../types";

interface EvidenceProvenanceProps {
  readonly evidence: QualityEvidence;
  readonly compact?: boolean;
}

const evidenceTimeFormatters = {
  compact: new Intl.DateTimeFormat("en-US", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }),
  full: new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }),
} as const;

function shorten(value: string, visible = 18): string {
  return value.length <= visible ? value : `${value.slice(0, visible)}…`;
}

export function EvidenceProvenance({ evidence, compact = false }: EvidenceProvenanceProps) {
  const generatedAt = new Date(evidence.generatedAt);
  const formattedTime = Number.isNaN(generatedAt.getTime())
    ? "Timestamp unavailable"
    : evidenceTimeFormatters[compact ? "compact" : "full"].format(generatedAt);

  return (
    <dl className={`evidence-provenance${compact ? " evidence-provenance--compact" : ""}`}>
      <div>
        <dt>Generated</dt>
        <dd><time dateTime={evidence.generatedAt}>{formattedTime}</time></dd>
      </div>
      <div>
        <dt>Source</dt>
        <dd><code title={evidence.sourceRevision}>{shorten(evidence.sourceRevision)}</code></dd>
      </div>
      <div>
        <dt>Source commit</dt>
        <dd><code title={evidence.gitCommit ?? "No Git commit"}>{shorten(evidence.gitCommit ?? "uncommitted")}</code></dd>
      </div>
      <div>
        <dt>Run</dt>
        <dd><code title={evidence.runId}>{shorten(evidence.runId)}</code></dd>
      </div>
      <div>
        <dt>Digest</dt>
        <dd><code title={evidence.artifactDigest}>{shorten(evidence.artifactDigest)}</code></dd>
      </div>
    </dl>
  );
}
