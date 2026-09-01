import { describe, expect, it } from "vitest";
import {
  FigmaContractError,
  mockFigmaPayload,
  normalizeFigmaChanges,
  type FigmaVariablesPayload,
} from "./index";

const timestamp = "2026-09-01T09:51:00+09:00";

function expectInvalid(payload: unknown, syncedAt: unknown = timestamp) {
  expect(() => normalizeFigmaChanges(
    payload as FigmaVariablesPayload,
    syncedAt as string,
  )).toThrow(FigmaContractError);
}

describe("Figma bridge", () => {
  it("normalizes aliases and platform scopes without bypassing review", () => {
    const result = normalizeFigmaChanges(mockFigmaPayload, timestamp);
    expect(result.sourceVersion).toBe(12);
    expect(result.sourceTheme).toBe("coral");
    expect(result.requiresHumanReview).toBe(true);
    expect(result.validation).toEqual({ aliasesResolved: true, changeCount: 3 });
    expect(result.changes[0]).toMatchObject({
      token: "color.action.primary",
      before: "{color.coral.500}",
      after: "{color.coral.700}",
      impact: ["web", "ios", "android"],
    });
  });

  it("rejects unresolved token aliases before a review can be created", () => {
    const invalidPayload = {
      ...mockFigmaPayload,
      changes: [
        {
          ...mockFigmaPayload.changes[0]!,
          nextAlias: "brand.missing.900",
        },
      ],
    };

    expect(() => normalizeFigmaChanges(invalidPayload, timestamp))
      .toThrow(FigmaContractError);
  });

  it("accepts every alias generated from the DTCG core contract", () => {
    const payload = {
      ...mockFigmaPayload,
      changes: [{
        ...mockFigmaPayload.changes[0]!,
        previousAlias: "color.neutral.100",
        nextAlias: "color.neutral.200",
      }],
    };
    expect(normalizeFigmaChanges(payload, timestamp).changes)
      .toHaveLength(1);
  });

  it("rejects malformed source metadata, duplicate ids, no-op aliases, and invalid scopes", () => {
    expect(() => normalizeFigmaChanges(
      { ...mockFigmaPayload, sourceTheme: "missing" },
      "2026-09-01T09:51:00+09:00",
    )).toThrow(FigmaContractError);
    expect(() => normalizeFigmaChanges(
      { ...mockFigmaPayload, changes: [mockFigmaPayload.changes[0]!, mockFigmaPayload.changes[0]!] },
      "2026-09-01T09:51:00+09:00",
    )).toThrow(FigmaContractError);
    expect(() => normalizeFigmaChanges(
      {
        ...mockFigmaPayload,
        changes: [{
          ...mockFigmaPayload.changes[0]!,
          nextAlias: mockFigmaPayload.changes[0]!.previousAlias,
        }],
      },
      "2026-09-01T09:51:00+09:00",
    )).toThrow(FigmaContractError);
    expect(() => normalizeFigmaChanges(
      { ...mockFigmaPayload, changes: [{ ...mockFigmaPayload.changes[0]!, scopes: [] }] },
      "2026-09-01T09:51:00+09:00",
    )).toThrow(FigmaContractError);
    expect(() => normalizeFigmaChanges(
      { ...mockFigmaPayload, changes: [] },
      "2026-09-01T09:51:00+09:00",
    )).toThrow(FigmaContractError);
    expect(() => normalizeFigmaChanges(
      {
        ...mockFigmaPayload,
        changes: [{
          ...mockFigmaPayload.changes[0]!,
          scopes: ["DESKTOP"],
        }],
      } as unknown as typeof mockFigmaPayload,
      "2026-09-01T09:51:00+09:00",
    )).toThrow(FigmaContractError);
    expect(() => normalizeFigmaChanges(
      { ...mockFigmaPayload, source: 42 } as unknown as typeof mockFigmaPayload,
      "2026-09-01T09:51:00+09:00",
    )).toThrow(FigmaContractError);
  });

  it("rejects malformed runtime payload shapes at the external boundary", () => {
    const first = mockFigmaPayload.changes[0]!;
    const withChange = (change: unknown) => ({ ...mockFigmaPayload, changes: [change] });
    const invalidPayloads: Array<{ payload: unknown; syncedAt?: unknown }> = [
      { payload: null },
      { payload: { ...mockFigmaPayload, source: "  " } },
      { payload: { ...mockFigmaPayload, sourceVersion: 0 } },
      { payload: { ...mockFigmaPayload, sourceVersion: 1.5 } },
      { payload: { ...mockFigmaPayload, sourceTheme: 42 } },
      { payload: mockFigmaPayload, syncedAt: "not-a-date" },
      { payload: mockFigmaPayload, syncedAt: 42 },
      { payload: { ...mockFigmaPayload, changes: "not-an-array" } },
      { payload: withChange(null) },
      { payload: withChange({ ...first, id: 42 }) },
      { payload: withChange({ ...first, id: "" }) },
      { payload: withChange({ ...first, name: "Not a token" }) },
      { payload: withChange({ ...first, previousAlias: 42 }) },
      { payload: withChange({ ...first, scopes: "WEB" }) },
      { payload: withChange({ ...first, scopes: ["WEB", "WEB"] }) },
      { payload: withChange({ ...first, scopes: [42] }) },
      { payload: withChange({ ...first, previousAlias: "brand.missing.900" }) },
    ];

    for (const fixture of invalidPayloads) {
      expectInvalid(fixture.payload, fixture.syncedAt);
    }
  });
});
