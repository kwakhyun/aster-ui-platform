import type { ThemeName } from "@aster-ui/tokens";
import { resolveTokenColor } from "../lib/tokenColors";

export function TokenSwatch({ alias, theme }: { readonly alias: string; readonly theme: ThemeName }) {
  const color = resolveTokenColor(alias, theme);
  return color ? (
    <span className="token-swatch" style={{ backgroundColor: color }} aria-hidden="true" />
  ) : (
    <span className="token-unresolved">Color unavailable</span>
  );
}
