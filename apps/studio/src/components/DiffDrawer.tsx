import {
  CheckCircle,
  FigmaLogo,
  X,
} from "@phosphor-icons/react";
import { Button } from "@aster-ui/react";
import type { FigmaSyncReview } from "@aster-ui/figma-bridge";
import { useModalFocus } from "../hooks/useModalFocus";

interface DiffDrawerProps {
  readonly open: boolean;
  readonly reviewed: boolean;
  readonly review: FigmaSyncReview;
  readonly onClose: () => void;
  readonly onComplete: () => void;
}

export function DiffDrawer({
  open,
  reviewed,
  review,
  onClose,
  onComplete,
}: DiffDrawerProps) {
  const ref = useModalFocus(open, onClose);
  if (!open) return null;

  return (
    <div className="overlay" role="presentation">
      <button type="button" className="overlay__scrim" aria-label="변경 검토 닫기" onClick={onClose} />
      <div
        ref={ref}
        className="diff-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="diff-drawer-title"
      >
        <header>
          <div>
            <span>
              <FigmaLogo weight="fill" aria-hidden="true" />
              Figma sync review
            </span>
            <h2 id="diff-drawer-title">Treatment Card / v12</h2>
          </div>
          <button type="button" aria-label="닫기" onClick={onClose}>
            <X />
          </button>
        </header>

        <div className="diff-drawer__meta">
          <span>{review.validation.changeCount} token changes</span>
          <span>{review.sourceTheme.charAt(0).toUpperCase()}{review.sourceTheme.slice(1)} source theme</span>
          <span>CSS · Swift · Compose tokens</span>
          <span>Alias contract valid</span>
        </div>

        <div className="diff-drawer__changes">
          {review.changes.map((change, index) => (
            <article key={change.id}>
              <div>
                <span className={`token-dot token-dot--${index + 1}`} aria-hidden="true" />
                <h3>{change.token}</h3>
              </div>
              <dl>
                <div>
                  <dt>Before</dt>
                  <dd>
                    <span className={`token-swatch token-swatch--${index + 1}`} aria-hidden="true" />
                    <code>{change.before}</code>
                  </dd>
                </div>
                <div>
                  <dt>After</dt>
                  <dd>
                    <span className={`token-swatch token-swatch--${index + 1}`} aria-hidden="true" />
                    <code>{change.after}</code>
                  </dd>
                </div>
              </dl>
              <p>{change.impact.join(" · ")} artifacts will be regenerated.</p>
            </article>
          ))}
        </div>

        <div className="diff-drawer__evidence">
          <CheckCircle weight="fill" aria-hidden="true" />
          <div>
            <strong>Token alias validation passed</strong>
            <span>All before and after aliases resolve against the checked W3C DTCG source contract.</span>
          </div>
        </div>

        <footer>
          <Button tone="secondary" onClick={onClose}>Cancel</Button>
          <Button disabled={reviewed} onClick={onComplete}>
            {reviewed ? "Review complete" : "Mark review complete"}
          </Button>
        </footer>
      </div>
    </div>
  );
}
