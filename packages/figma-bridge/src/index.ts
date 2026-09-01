import {
  isThemeName,
  isTokenAliasPath,
  type ThemeName,
  type TokenChange,
} from "@aster-ui/tokens";

export interface FigmaVariableChange {
  readonly id: string;
  readonly name: string;
  readonly previousAlias: string;
  readonly nextAlias: string;
  readonly scopes: readonly ("WEB" | "IOS" | "ANDROID")[];
}

export interface FigmaSyncReview {
  readonly source: string;
  readonly sourceVersion: number;
  readonly sourceTheme: ThemeName;
  readonly syncedAt: string;
  readonly changes: readonly TokenChange[];
  readonly requiresHumanReview: true;
  readonly validation: {
    readonly aliasesResolved: true;
    readonly changeCount: number;
  };
}

export interface FigmaVariablesPayload {
  readonly source: string;
  readonly sourceVersion: number;
  readonly sourceTheme: string;
  readonly changes: readonly FigmaVariableChange[];
}

export class FigmaContractError extends Error {
  override readonly name = "FigmaContractError";
}

const platformMap = {
  WEB: "web",
  IOS: "ios",
  ANDROID: "android",
} as const;

function isPlatformScope(value: unknown): value is keyof typeof platformMap {
  return typeof value === "string" && value in platformMap;
}

export function normalizeFigmaChanges(
  payload: FigmaVariablesPayload,
  syncedAt: string,
): FigmaSyncReview {
  if (!payload || typeof payload !== "object") {
    throw new FigmaContractError("Figma payload must be an object.");
  }
  if (typeof payload.source !== "string" || payload.source.trim().length === 0) {
    throw new FigmaContractError("Figma source must not be empty.");
  }
  if (!Number.isInteger(payload.sourceVersion) || payload.sourceVersion <= 0) {
    throw new FigmaContractError("Figma sourceVersion must be a positive integer.");
  }
  if (typeof payload.sourceTheme !== "string" || !isThemeName(payload.sourceTheme)) {
    throw new FigmaContractError(`Unsupported Figma source theme: ${payload.sourceTheme}`);
  }
  if (typeof syncedAt !== "string" || !Number.isFinite(Date.parse(syncedAt))) {
    throw new FigmaContractError("Figma syncedAt must be a valid timestamp.");
  }
  if (!Array.isArray(payload.changes) || payload.changes.length === 0) {
    throw new FigmaContractError("Figma changes must be a non-empty array.");
  }
  const changes = payload.changes as readonly FigmaVariableChange[];

  const changeIds = new Set<string>();
  for (const change of changes) {
    if (!change || typeof change !== "object") {
      throw new FigmaContractError("Every Figma change must be an object.");
    }
    if (typeof change.id !== "string" || change.id.trim().length === 0 || changeIds.has(change.id)) {
      throw new FigmaContractError(`Figma change id must be unique and non-empty: ${change.id}`);
    }
    changeIds.add(change.id);
    if (typeof change.name !== "string" || !/^[a-z][a-z0-9]*(?:\.[a-z0-9]+)+$/.test(change.name)) {
      throw new FigmaContractError(`Figma token name must be a valid dotted path: ${change.id}`);
    }
    if (typeof change.previousAlias !== "string" || typeof change.nextAlias !== "string") {
      throw new FigmaContractError(`Figma aliases must be strings: ${change.id}`);
    }
    if (change.previousAlias === change.nextAlias) {
      throw new FigmaContractError(`Figma change ${change.id} does not change its alias.`);
    }
    if (!Array.isArray(change.scopes)
      || change.scopes.length === 0
      || new Set(change.scopes).size !== change.scopes.length
      || change.scopes.some((scope: unknown) => !isPlatformScope(scope))) {
      throw new FigmaContractError(`Figma change ${change.id} must have unique platform scopes.`);
    }
    if (!isTokenAliasPath(change.previousAlias) || !isTokenAliasPath(change.nextAlias)) {
      throw new FigmaContractError(
        `Unresolved token alias in ${change.id}: ${change.previousAlias} -> ${change.nextAlias}`,
      );
    }
  }

  return {
    source: payload.source.trim(),
    sourceVersion: payload.sourceVersion,
    sourceTheme: payload.sourceTheme,
    syncedAt,
    requiresHumanReview: true,
    changes: changes.map((change) => ({
      id: change.id,
      token: change.name,
      before: `{${change.previousAlias}}`,
      after: `{${change.nextAlias}}`,
      impact: change.scopes.map((scope) => platformMap[scope as keyof typeof platformMap]),
    })),
    validation: {
      aliasesResolved: true,
      changeCount: changes.length,
    },
  };
}

export const mockFigmaPayload: FigmaVariablesPayload = {
  source: "Figma / Treatment Card",
  sourceVersion: 12,
  sourceTheme: "coral",
  changes: [
    {
      id: "action-primary",
      name: "color.action.primary",
      previousAlias: "color.coral.500",
      nextAlias: "color.coral.700",
      scopes: ["WEB", "IOS", "ANDROID"],
    },
    {
      id: "focus-ring",
      name: "color.focus.ring",
      previousAlias: "color.coral.300",
      nextAlias: "color.blue.500",
      scopes: ["WEB", "IOS", "ANDROID"],
    },
    {
      id: "text-accent",
      name: "color.text.accent",
      previousAlias: "color.coral.500",
      nextAlias: "color.coral.700",
      scopes: ["WEB", "IOS", "ANDROID"],
    },
  ],
};
