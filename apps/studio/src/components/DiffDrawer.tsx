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

const platformList = new Intl.ListFormat("en", {
  style: "long",
  type: "conjunction",
});

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
      <button type="button" className="overlay__scrim" aria-label="Close change review" onClick={onClose} />
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
              Figma change review
            </span>
            <h2 id="diff-drawer-title">TreatmentCard · v12</h2>
          </div>
          <button type="button" aria-label="Close" onClick={onClose}>
            <X />
          </button>
        </header>

        <div className="diff-drawer__meta">
          <span>{review.validation.changeCount} token changes</span>
          <span>{review.sourceTheme.charAt(0).toUpperCase()}{review.sourceTheme.slice(1)} theme</span>
          <span>CSS, Swift, and Compose</span>
          <span>Aliases validated</span>
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
              <p>
                Affected outputs: {platformList.format(change.impact.map((platform) =>
                  platform === "ios" ? "iOS" : platform.charAt(0).toUpperCase() + platform.slice(1)
                ))}.
              </p>
            </article>
          ))}
        </div>

        <div className="diff-drawer__evidence">
          <CheckCircle weight="fill" aria-hidden="true" />
          <div>
            <strong>Token aliases validated</strong>
            <span>Every old and new alias resolves to a token in the validated W3C DTCG source.</span>
          </div>
        </div>

        <footer>
          <Button tone="secondary" onClick={onClose}>Cancel</Button>
          <Button disabled={reviewed} onClick={onComplete}>
            {reviewed ? "Review completed" : "Complete review"}
          </Button>
        </footer>
      </div>
    </div>
  );
}
