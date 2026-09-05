import coralTokens from "@aster-ui/tokens/json/coral";
import oceanTokens from "@aster-ui/tokens/json/ocean";
import type { ThemeName } from "@aster-ui/tokens";

const themes = { coral: coralTokens, ocean: oceanTokens };

/** Read resolved build artifacts, never infer a color from the row position. */
export function resolveTokenColor(alias: string, theme: ThemeName): string | null {
  if (!/^\{(?:semantic\.)?color(?:\.[a-zA-Z0-9]+)+\}$/.test(alias)) return null;
  let value: unknown = themes[theme];
  for (const key of alias.slice(1, -1).split(".")) {
    if (!value || typeof value !== "object" || !Object.hasOwn(value, key)) return null;
    value = (value as Record<string, unknown>)[key];
  }
  return typeof value === "string" && /^#[a-f\d]{6}$/i.test(value) ? value : null;
}
