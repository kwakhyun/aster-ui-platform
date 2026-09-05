import { Button } from "@aster-ui/react";
import type { FigmaSyncReview } from "@aster-ui/figma-bridge";
import type { CSSProperties } from "react";
import { resolveTokenColor } from "../lib/tokenColors";

export function TokenComparison({ review }: { readonly review: FigmaSyncReview }) {
  return (
    <section className="token-comparison" aria-labelledby="token-comparison-heading">
      <h3 id="token-comparison-heading">Pending change preview</h3>
      <p>
        {review.sourceTheme === "coral" ? "Coral" : "Ocean"} review: compare the button,
        focus ring, and accent text. These samples are visual references; changes have not been applied.
      </p>
      <div className="token-comparison__grid">
        {(["before", "after"] as const).map((phase) => {
          const colors = review.changes.map((change) => ({
            token: change.token,
            alias: change[phase],
            color: resolveTokenColor(change[phase], review.sourceTheme),
          }));
          const style = Object.fromEntries(colors.flatMap(({ token, color }) => color
            ? [[`--semantic-${token.replaceAll(".", "-")}`, color]]
            : [])) as CSSProperties;
          return (
            <div className="token-comparison__phase" key={phase} data-phase={phase}>
              <h4>{phase === "before" ? "Before" : "After"}</h4>
              {colors.every(({ color }) => color !== null) ? (
                <div className="token-comparison__sample" data-theme={review.sourceTheme} style={style} aria-hidden="true" inert>
                  <Button tabIndex={-1}>Review changes</Button>
                  <p>Accent text</p>
                </div>
              ) : <p>Preview unavailable: a color could not be resolved.</p>}
              <dl>
                {colors.map(({ token, alias, color }) => (
                  <div key={token}>
                    <dt>{token}</dt>
                    <dd><code>{alias}</code> <span>{color ?? "Unresolved"}</span></dd>
                  </div>
                ))}
              </dl>
            </div>
          );
        })}
      </div>
    </section>
  );
}
