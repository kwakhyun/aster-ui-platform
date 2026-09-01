import type { FigmaVariableChange, FigmaVariablesPayload } from "./index.js";

export type FigmaResolvedType = "BOOLEAN" | "FLOAT" | "STRING" | "COLOR";
export type FigmaVariableValue = boolean | number | string | FigmaColor | FigmaVariableAlias;

export interface FigmaColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

export interface FigmaVariableAlias {
  readonly type: "VARIABLE_ALIAS";
  readonly id: string;
}

export interface FigmaLocalVariable {
  readonly id: string;
  readonly name: string;
  readonly key: string;
  readonly variableCollectionId: string;
  readonly resolvedType: FigmaResolvedType;
  readonly valuesByMode: Readonly<Record<string, FigmaVariableValue>>;
  readonly remote: boolean;
  readonly description: string;
  readonly hiddenFromPublishing: boolean;
  readonly scopes: readonly string[];
  readonly codeSyntax: Readonly<Record<string, string>>;
}

export interface FigmaVariableCollection {
  readonly id: string;
  readonly name: string;
  readonly key: string;
  readonly modes: readonly { readonly modeId: string; readonly name: string }[];
  readonly defaultModeId: string;
  readonly remote: boolean;
  readonly hiddenFromPublishing: boolean;
  readonly variableIds: readonly string[];
}

export interface FigmaLocalVariablesResponse {
  readonly status?: number;
  readonly error?: boolean;
  readonly meta: {
    readonly variables: Readonly<Record<string, FigmaLocalVariable>>;
    readonly variableCollections: Readonly<Record<string, FigmaVariableCollection>>;
  };
}

export interface FigmaAuthentication {
  readonly kind: "figma-token" | "oauth";
  readonly token: string;
}

export interface FigmaSnapshotOptions {
  readonly collectionName: string;
  readonly modeName: string;
  readonly trackedPrefix?: string;
}

export interface FigmaPayloadOptions extends FigmaSnapshotOptions {
  readonly sourceVersion: number;
  readonly sourceTheme: string;
  readonly scopes: readonly FigmaVariableChange["scopes"][number][];
}

export class FigmaRestError extends Error {
  override readonly name = "FigmaRestError";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertLocalVariablesResponse(value: unknown): asserts value is FigmaLocalVariablesResponse {
  if (!isRecord(value) || value.error === true || !isRecord(value.meta)) {
    throw new FigmaRestError("Figma Variables API returned an invalid response envelope.");
  }
  if (!isRecord(value.meta.variables) || !isRecord(value.meta.variableCollections)) {
    throw new FigmaRestError("Figma Variables API response is missing variable maps.");
  }
}

export async function fetchFigmaLocalVariables(
  fileKey: string,
  authentication: FigmaAuthentication,
  fetchImplementation: typeof fetch = fetch,
): Promise<FigmaLocalVariablesResponse> {
  if (fileKey.trim().length === 0) throw new FigmaRestError("Figma file key must not be empty.");
  if (authentication.token.trim().length === 0) throw new FigmaRestError("Figma access token must not be empty.");

  const headers = new Headers({ Accept: "application/json" });
  if (authentication.kind === "oauth") {
    headers.set("Authorization", `Bearer ${authentication.token}`);
  } else {
    headers.set("X-Figma-Token", authentication.token);
  }
  const response = await fetchImplementation(
    `https://api.figma.com/v1/files/${encodeURIComponent(fileKey.trim())}/variables/local`,
    { method: "GET", headers },
  );
  if (!response.ok) {
    throw new FigmaRestError(`Figma Variables API request failed (${response.status}).`);
  }
  const payload: unknown = await response.json();
  assertLocalVariablesResponse(payload);
  return payload;
}

function isAlias(value: unknown): value is FigmaVariableAlias {
  return isRecord(value) && value.type === "VARIABLE_ALIAS" && typeof value.id === "string";
}

function toTokenPath(name: string) {
  return name.replace(/^semantic\//, "").replaceAll("/", ".");
}

export function extractFigmaAliasSnapshot(
  response: FigmaLocalVariablesResponse,
  { collectionName, modeName, trackedPrefix = "semantic/" }: FigmaSnapshotOptions,
): Readonly<Record<string, string>> {
  assertLocalVariablesResponse(response);
  const collection = Object.values(response.meta.variableCollections)
    .find((candidate) => candidate.name === collectionName);
  if (!collection) throw new FigmaRestError(`Figma collection not found: ${collectionName}`);
  const mode = collection.modes.find((candidate) => candidate.name === modeName);
  if (!mode) throw new FigmaRestError(`Figma mode not found in ${collectionName}: ${modeName}`);

  const variables = response.meta.variables;
  const snapshot: Record<string, string> = {};
  for (const variableId of collection.variableIds) {
    const variable = variables[variableId];
    if (!variable || !variable.name.startsWith(trackedPrefix)) continue;
    const value = variable.valuesByMode[mode.modeId];
    if (!isAlias(value)) {
      throw new FigmaRestError(`Tracked Figma variable must resolve through an alias: ${variable.name}`);
    }
    const aliasTarget = variables[value.id];
    if (!aliasTarget) throw new FigmaRestError(`Figma alias target is missing: ${value.id}`);
    snapshot[toTokenPath(variable.name)] = toTokenPath(aliasTarget.name);
  }
  if (Object.keys(snapshot).length === 0) {
    throw new FigmaRestError(`No tracked variables found with prefix: ${trackedPrefix}`);
  }
  return snapshot;
}

export function createFigmaVariablesPayload(
  before: FigmaLocalVariablesResponse,
  after: FigmaLocalVariablesResponse,
  options: FigmaPayloadOptions,
): FigmaVariablesPayload {
  const previousSnapshot = extractFigmaAliasSnapshot(before, options);
  const nextSnapshot = extractFigmaAliasSnapshot(after, options);
  const changes = Object.entries(nextSnapshot).flatMap(([name, nextAlias]) => {
    const previousAlias = previousSnapshot[name];
    if (!previousAlias || previousAlias === nextAlias) return [];
    return [{
      id: name.replaceAll(".", "-"),
      name,
      previousAlias,
      nextAlias,
      scopes: options.scopes,
    } satisfies FigmaVariableChange];
  });
  return {
    source: `Figma REST / ${options.collectionName}`,
    sourceVersion: options.sourceVersion,
    sourceTheme: options.sourceTheme,
    changes,
  };
}
