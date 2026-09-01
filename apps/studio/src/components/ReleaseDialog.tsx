import {
  CheckCircle,
  CloudArrowUp,
  ShieldCheck,
  Warning,
  X,
} from "@phosphor-icons/react";
import { Button } from "@aster-ui/react";
import { useCallback, useState } from "react";
import { useModalFocus } from "../hooks/useModalFocus";
import type { ReleaseStatus } from "../types";
import { tokenVersion } from "@aster-ui/tokens";
import type { ReviewReceipt } from "../services/reviewService";

interface ReleaseDialogProps {
  readonly open: boolean;
  readonly reviewReceipt: ReviewReceipt | null;
  readonly qualityReady: boolean;
  readonly status: ReleaseStatus;
  readonly errorMessage: string | null;
  readonly onClose: () => void;
  readonly onCancel: () => void;
  readonly onReview: () => void;
  readonly onInspectQuality: () => void;
  readonly onPublish: () => Promise<void>;
}

export function ReleaseDialog({
  open,
  reviewReceipt,
  qualityReady,
  status,
  errorMessage,
  onClose,
  onCancel,
  onReview,
  onInspectQuality,
  onPublish,
}: ReleaseDialogProps) {
  const reviewed = reviewReceipt !== null;
  const [confirmed, setConfirmed] = useState(false);
  const running = status === "running";
  const requestClose = useCallback(() => {
    if (running) onCancel();
    onClose();
  }, [onCancel, onClose, running]);
  const ref = useModalFocus(open, requestClose);

  if (!open) return null;

  return (
    <div className="overlay overlay--centered" role="presentation">
      <button
        type="button"
        className="overlay__scrim"
        aria-label="Close release rehearsal"
        onClick={requestClose}
      />
      <div
        ref={ref}
        className="release-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="release-title"
        aria-describedby="release-description"
      >
        <header>
          <div className="release-dialog__icon">
            <CloudArrowUp weight="bold" aria-hidden="true" />
          </div>
          <button type="button" aria-label="Close" onClick={requestClose}>
            <X />
          </button>
        </header>
        <h2 id="release-title">Release rehearsal · {tokenVersion}</h2>
        <p id="release-description">
          Review the pending changes, verify the quality evidence, and save a local rehearsal record. This demo does not publish a package or modify Figma.
        </p>

        <dl className="release-dialog__summary">
          <div>
            <dt>Change type</dt>
            <dd>Backward-compatible prerelease</dd>
          </div>
          <div>
            <dt>Artifacts</dt>
            <dd>React component, CSS tokens, Swift tokens, and Compose tokens</dd>
          </div>
          <div>
            <dt>Automation</dt>
            <dd>release-please checks, changelog generation, and documentation updates</dd>
          </div>
        </dl>

        {!reviewed ? (
          <div className="release-dialog__warning" role="alert">
            <Warning weight="fill" aria-hidden="true" />
            <div>
              <strong>Review required</strong>
              <span>Review the Figma changes before running this rehearsal.</span>
            </div>
            <button type="button" onClick={onReview}>Review Figma changes</button>
          </div>
        ) : (
          <div className="release-dialog__reviewed">
            <CheckCircle weight="fill" aria-hidden="true" />
            <span>
              Figma changes reviewed by {reviewReceipt.reviewer.label}
              <small>
                {reviewReceipt.source} v{reviewReceipt.sourceVersion} · {reviewReceipt.sourceTheme} · {reviewReceipt.changeFingerprint}
              </small>
            </span>
          </div>
        )}

        {reviewed && !qualityReady ? (
          <div className="release-dialog__warning" role="alert">
            <Warning weight="fill" aria-hidden="true" />
            <div>
              <strong>Up-to-date quality evidence is required</strong>
              <span>Run the full verification suite for this source revision first.</span>
            </div>
            <button type="button" onClick={onInspectQuality}>View quality checks</button>
          </div>
        ) : null}

        <label className="release-dialog__confirm">
          <input
            type="checkbox"
            checked={confirmed}
            disabled={!reviewed || !qualityReady || running}
            onChange={(event) => setConfirmed(event.currentTarget.checked)}
          />
          <span>
            <ShieldCheck aria-hidden="true" />
            I reviewed the component API, quality evidence, and affected token artifacts.
          </span>
        </label>

        {status === "failed" ? (
          <p className="release-dialog__error" role="alert">
            {errorMessage ?? "The rehearsal failed."} Nothing was published.
          </p>
        ) : null}

        <footer>
          <Button tone="secondary" onClick={requestClose}>
            {running ? "Stop rehearsal" : "Cancel"}
          </Button>
          <Button
            leadingIcon={<CloudArrowUp weight="bold" />}
            disabled={!reviewed || !qualityReady || !confirmed || running}
            onClick={() => void onPublish()}
          >
            {running ? "Running…" : status === "failed" ? "Retry rehearsal" : "Start rehearsal"}
          </Button>
        </footer>
      </div>
    </div>
  );
}
