import { tokenAliasPaths } from "./generated/token-contract.js";

export const tokenVersion = "3.1.0-beta.2" as const;

export const themeNames = ["coral", "ocean"] as const;
export type ThemeName = (typeof themeNames)[number];

export function isThemeName(value: string): value is ThemeName {
  return (themeNames as readonly string[]).includes(value);
}

export const tokenArtifactPlatforms = ["web", "ios", "android"] as const;
export type TokenArtifactPlatform = (typeof tokenArtifactPlatforms)[number];

export { tokenAliasPaths };

const tokenAliasPathSet = new Set<string>(tokenAliasPaths);

export function isTokenAliasPath(value: string): boolean {
  return tokenAliasPathSet.has(value);
}

export interface TokenChange {
  readonly id: string;
  readonly token: string;
  readonly before: string;
  readonly after: string;
  readonly impact: readonly TokenArtifactPlatform[];
}
