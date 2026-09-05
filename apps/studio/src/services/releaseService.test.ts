import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LocalReleaseRehearsalPublisher,
  type ReleaseContext,
  releaseStorageKey,
  createLocalReleasePublisher,
} from "./releaseService";

const context: ReleaseContext = {
  review: {
    schemaVersion: 1,
    mode: "local-human-review",
    source: "Figma / Treatment Card",
    sourceVersion: 12,
    sourceTheme: "coral",
    changeFingerprint: "fnv1a64:1111111111111111",
    reviewedAt: "2026-09-01T00:30:00.000Z",
    reviewer: { id: "reviewer-1", label: "Reviewer One" },
  },
  evidence: {
    generatedAt: "2026-09-01T00:45:00.000Z",
    sourceRevision: "workspace:11111111111111111111",
    gitCommit: null,
    runId: "local:test",
    artifactDigest: `sha256:${"2".repeat(64)}`,
  },
};

describe("LocalReleaseRehearsalPublisher", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  it("rejects an already cancelled request, including an idempotent replay", async () => {
    const publisher = new LocalReleaseRehearsalPublisher({ storage: window.localStorage, delayMs: 0 });
    await publisher.publish({ idempotencyKey: "existing", context });
    const stored = window.localStorage.getItem(releaseStorageKey);
    const controller = new AbortController();
    controller.abort();
    for (const idempotencyKey of ["new", "existing"]) {
      await expect(publisher.publish({ context, idempotencyKey, signal: controller.signal }))
        .rejects.toMatchObject({ name: "AbortError" });
    }
    expect(window.localStorage.getItem(releaseStorageKey)).toBe(stored);
  });

  it("checks cancellation after the delay and removes the abort listener", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, "removeEventListener");
    const publisher = new LocalReleaseRehearsalPublisher({ storage: window.localStorage, delayMs: 10 });
    const pending = publisher.publish({ context, idempotencyKey: "late-abort", signal: controller.signal });
    const rejection = expect(pending).rejects.toMatchObject({ name: "AbortError" });
    vi.advanceTimersByTime(10);
    controller.abort();
    await rejection;
    expect(window.localStorage.getItem(releaseStorageKey)).toBeNull();
    expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
  });

  it("handles storage policy denial without failing publisher initialization", async () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new DOMException("Access denied", "SecurityError");
    });
    const publisher = createLocalReleasePublisher();
    expect(publisher.read(context)).toBeNull();
    await expect(publisher.publish({ context, idempotencyKey: "no-storage" }))
      .rejects.toThrow("could not be saved");
  });

  it("stores a versioned, explicitly local receipt", async () => {
    const publisher = new LocalReleaseRehearsalPublisher({
      storage: window.localStorage,
      delayMs: 0,
      now: () => new Date("2026-09-01T01:00:00.000Z"),
    });
    const receipt = await publisher.publish({ idempotencyKey: "release-1", context });

    expect(receipt).toMatchObject({
      schemaVersion: 3,
      mode: "local-rehearsal",
      version: "3.1.0-beta.2",
      rehearsedAt: "2026-09-01T01:00:00.000Z",
      reused: false,
      review: { reviewerId: "reviewer-1", changeFingerprint: "fnv1a64:1111111111111111" },
      evidence: { artifactDigest: `sha256:${"2".repeat(64)}` },
    });
    expect(window.localStorage.getItem(releaseStorageKey)).toContain("local-rehearsal");
  });

  it("reuses a matching idempotency receipt and ignores malformed storage", async () => {
    const publisher = new LocalReleaseRehearsalPublisher({
      storage: window.localStorage,
      delayMs: 0,
    });
    window.localStorage.setItem(releaseStorageKey, "not-json");
    await publisher.publish({ idempotencyKey: "release-2", context });
    const replay = await publisher.publish({ idempotencyKey: "release-2", context });
    expect(replay.reused).toBe(true);
    expect(publisher.read(context)).toMatchObject({ idempotencyKey: "release-2" });
  });

  it("aborts without storing a receipt", async () => {
    const publisher = new LocalReleaseRehearsalPublisher({
      storage: window.localStorage,
      delayMs: 100,
    });
    const controller = new AbortController();
    const pending = publisher.publish({
      signal: controller.signal,
      idempotencyKey: "release-3",
      context,
    });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(window.localStorage.getItem(releaseStorageKey)).toBeNull();
  });

  it("rejects invalid context before writing storage", async () => {
    const publisher = new LocalReleaseRehearsalPublisher({
      storage: window.localStorage,
      delayMs: 0,
    });
    await expect(publisher.publish({
      idempotencyKey: "release-invalid",
      context: {
        ...context,
        evidence: { ...context.evidence, sourceRevision: "stale" },
      },
    })).rejects.toThrow("missing valid review or quality evidence");
    expect(window.localStorage.getItem(releaseStorageKey)).toBeNull();
  });
});
