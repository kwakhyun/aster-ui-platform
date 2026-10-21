import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  createFigmaVariablesPayload,
  extractFigmaAliasSnapshot,
  fetchFigmaLocalVariables,
  FigmaRestError,
  type FigmaLocalVariablesResponse,
} from "./figma-rest";
import { figmaRestFixturePayload, normalizeFigmaChanges } from "./index";

function readFixture(name: string): FigmaLocalVariablesResponse {
  return JSON.parse(
    readFileSync(new URL(`../fixtures/${name}`, import.meta.url), "utf8"),
  ) as FigmaLocalVariablesResponse;
}

const before = readFixture("local-variables.before.json");
const after = readFixture("local-variables.after.json");
const options = {
  collectionName: "Aster semantic tokens",
  modeName: "Coral",
  sourceVersion: 12,
  sourceTheme: "coral",
  scopes: ["WEB", "IOS", "ANDROID"] as const,
};

describe("Figma Variables REST adapter", () => {
  it("derives the checked-in review payload from official response-shaped fixtures", () => {
    const snapshot = extractFigmaAliasSnapshot(before, options);
    expect(snapshot["color.action.primary"]).toBe("color.coral.500");

    const payload = createFigmaVariablesPayload(before, after, options);
    expect(payload).toEqual(figmaRestFixturePayload);
    expect(normalizeFigmaChanges(payload, "2026-09-01T09:51:00+09:00").validation.changeCount)
      .toBe(3);
  });

  it.each([
    "color.action.primaryHover",
    "color.action.primarySubtle",
    "color.status.successSurface",
  ])("preserves the existing camelCase token path %s through review creation", (tokenPath) => {
    const renameTrackedVariable = (response: FigmaLocalVariablesResponse): FigmaLocalVariablesResponse => ({
      ...response,
      meta: {
        ...response.meta,
        variables: {
          ...response.meta.variables,
          "VariableID:action-primary": {
            ...response.meta.variables["VariableID:action-primary"]!,
            name: `semantic/${tokenPath.replaceAll(".", "/")}`,
          },
        },
      },
    });
    const payload = createFigmaVariablesPayload(
      renameTrackedVariable(before),
      renameTrackedVariable(after),
      options,
    );

    expect(normalizeFigmaChanges(payload, "2026-09-01T09:51:00+09:00").changes)
      .toContainEqual({
        id: tokenPath.replaceAll(".", "-"),
        token: tokenPath,
        before: "{color.coral.500}",
        after: "{color.coral.700}",
        impact: ["web", "ios", "android"],
      });
  });

  it.each([
    {
      operation: "addition",
      added: "color.focus.surface",
      removed: "none",
    },
    {
      operation: "deletion",
      added: "none",
      removed: "color.focus.ring",
    },
    {
      operation: "rename",
      added: "color.focus.surface",
      removed: "color.focus.ring",
    },
  ])("rejects a tracked variable $operation even alongside valid alias changes", ({ operation, added, removed }) => {
    const variableId = "VariableID:focus-ring";
    const collectionId = "VariableCollectionId:1:1";
    const variables = { ...after.meta.variables };
    const collection = after.meta.variableCollections[collectionId]!;
    const variableIds = [...collection.variableIds];
    if (operation === "addition") {
      const addedId = "VariableID:focus-surface";
      variables[addedId] = {
        ...variables[variableId]!,
        id: addedId,
        key: "semantic-color-focus-surface",
        name: "semantic/color/focus/surface",
      };
      variableIds.push(addedId);
    } else if (operation === "deletion") {
      delete variables[variableId];
      variableIds.splice(variableIds.indexOf(variableId), 1);
    } else {
      variables[variableId] = {
        ...variables[variableId]!,
        name: "semantic/color/focus/surface",
      };
    }
    const structuralChange: FigmaLocalVariablesResponse = {
      ...after,
      meta: {
        variables,
        variableCollections: {
          ...after.meta.variableCollections,
          [collectionId]: { ...collection, variableIds },
        },
      },
    };

    expect(() => createFigmaVariablesPayload(before, structuralChange, options))
      .toThrow(new FigmaRestError(
        "Tracked Figma variables changed; only alias updates are supported. "
        + `Added: ${added}; removed: ${removed}.`,
      ));
  });

  it("uses X-Figma-Token authentication without exposing it in the request URL", async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(after), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await expect(fetchFigmaLocalVariables(
      "file/key",
      { kind: "figma-token", token: "secret-token" },
      fetchImplementation,
    )).resolves.toEqual(after);

    const [url, init] = fetchImplementation.mock.calls[0]!;
    expect(String(url)).toBe("https://api.figma.com/v1/files/file%2Fkey/variables/local");
    expect(String(url)).not.toContain("secret-token");
    expect(new Headers(init?.headers).get("X-Figma-Token")).toBe("secret-token");
  });

  it("supports OAuth bearer authentication and sanitizes failed responses", async () => {
    const oauthFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(after), { status: 200 }),
    );
    await fetchFigmaLocalVariables(
      "file-key",
      { kind: "oauth", token: "oauth-secret" },
      oauthFetch,
    );
    expect(new Headers(oauthFetch.mock.calls[0]![1]?.headers).get("Authorization"))
      .toBe("Bearer oauth-secret");

    const failedFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ message: "Invalid scope: never-log-this" }), { status: 403 }),
    );
    await expect(fetchFigmaLocalVariables(
      "file-key",
      { kind: "figma-token", token: "never-log-this" },
      failedFetch,
    )).rejects.toThrow("Figma Variables API request failed (403).");
    await expect(fetchFigmaLocalVariables(
      "file-key",
      { kind: "figma-token", token: "never-log-this" },
      failedFetch,
    )).rejects.not.toThrow("never-log-this");
  });

  it("rejects missing collection, mode, alias targets and malformed envelopes", async () => {
    expect(() => extractFigmaAliasSnapshot(before, { ...options, collectionName: "Missing" }))
      .toThrow(FigmaRestError);
    expect(() => extractFigmaAliasSnapshot(before, { ...options, modeName: "Missing" }))
      .toThrow(FigmaRestError);
    expect(() => extractFigmaAliasSnapshot(before, { ...options, trackedPrefix: "unknown/" }))
      .toThrow(FigmaRestError);

    const brokenAlias = structuredClone(before);
    const variable = brokenAlias.meta.variables["VariableID:action-primary"];
    if (!variable) throw new Error("Fixture setup failed.");
    (variable.valuesByMode as Record<string, unknown>)["1:0"] = {
      type: "VARIABLE_ALIAS",
      id: "VariableID:missing",
    };
    expect(() => extractFigmaAliasSnapshot(brokenAlias, options)).toThrow("alias target is missing");

    const malformedFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ error: false, meta: {} }), { status: 200 }),
    );
    await expect(fetchFigmaLocalVariables(
      "file-key",
      { kind: "figma-token", token: "token" },
      malformedFetch,
    )).rejects.toThrow("missing variable maps");
    await expect(fetchFigmaLocalVariables(" ", { kind: "figma-token", token: "token" }))
      .rejects.toThrow("file key");
    await expect(fetchFigmaLocalVariables("file-key", { kind: "figma-token", token: " " }))
      .rejects.toThrow("access token");
  });
});
