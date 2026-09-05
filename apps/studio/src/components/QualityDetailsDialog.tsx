import { X } from "@phosphor-icons/react";
import { useModalFocus } from "../hooks/useModalFocus";
import type { QualityEvidence } from "../types";
import { EvidenceProvenance } from "./EvidenceProvenance";

interface Props {
  readonly evidence: QualityEvidence;
  readonly onClose: () => void;
}

export function QualityDetailsDialog({ evidence, onClose }: Props) {
  const ref = useModalFocus(true, onClose);
  const report = evidence.browserReport;
  const visual = evidence.checks.find((check) => check.id === "visual");
  const current = visual?.status === "passed" && report?.sourceRevision === evidence.sourceRevision;
  const performance = report?.browserPerformance;
  return (
    <div className="overlay" role="presentation">
      <button className="overlay__scrim" tabIndex={-1} aria-label="Close quality details" onClick={onClose} />
      <section ref={ref} className="quality-details" role="dialog" aria-modal="true" aria-labelledby="quality-details-title" tabIndex={-1}>
        <header>
          <div><p>Repository verification</p><h2 id="quality-details-title">Quality details</h2></div>
          <button className="icon-action" aria-label="Close" onClick={onClose}><X aria-hidden="true" /></button>
        </header>
        <p>Inspect the recorded checks and download their evidence. Results describe this recorded run.</p>
        <EvidenceProvenance evidence={evidence} />
        <details className="quality-details__identifiers">
          <summary>Full evidence identifiers</summary>
          <dl><dt>Source revision</dt><dd>{evidence.sourceRevision}</dd><dt>Commit</dt><dd>{evidence.gitCommit ?? "Uncommitted"}</dd><dt>Run</dt><dd>{evidence.runId}</dd><dt>Digest</dt><dd>{evidence.artifactDigest}</dd></dl>
        </details>
        <h3>Recorded checks</h3>
        <ul className="quality-details__checks">
          {evidence.checks.map((check) => <li key={check.id}>
            <h4>{check.label} <span>{check.status === "passed" ? "Passed" : "Needs review"}</span></h4>
            <p>{check.detail}</p><code>{check.command}</code>
          </li>)}
        </ul>
        <h3>Browser scenarios</h3>
        {!current ? <p role="status">Current passing browser evidence is unavailable. Any report below is a previous or unsuccessful run.</p> : null}
        {report ? <>
          <p>{report.browser} · {report.snapshots} snapshots · {report.accessibilityChecks} accessibility checks</p>
          {report.scenarios?.length ? <ul className="quality-details__scenarios">{report.scenarios.map((scenario, index) =>
            <li key={`${scenario.title}-${index}`}><span>{scenario.title}</span><strong>{scenario.status}</strong></li>
          )}</ul> : <p>This report does not include individual scenario names.</p>}
          {performance ? <section aria-label="Browser rendering measurements">
            <h3>Rendering measurements</h3>
            <p>Lab medians from {performance.profile.samples} cold loads, {performance.profile.cpuSlowdown}× CPU slowdown and {performance.profile.latencyMs} ms network latency. These are not field metrics.</p>
            <dl className="quality-details__metrics"><div><dt>FCP</dt><dd>{Math.round(performance.actual.medianFcpMs)} ms</dd></div><div><dt>LCP</dt><dd>{Math.round(performance.actual.medianLcpMs)} ms</dd></div><div><dt>Maximum CLS</dt><dd>{performance.actual.maxCls.toFixed(5)}</dd></div></dl>
          </section> : null}
          <a className="text-action" download="aster-browser-evidence.json" href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(report, null, 2))}`}>Download browser report (JSON)</a>
        </> : <p>No browser report has been recorded.</p>}
        <footer><a className="text-action" download="aster-quality-evidence.json" href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(evidence, null, 2))}`}>Download all quality evidence (JSON)</a></footer>
      </section>
    </div>
  );
}
