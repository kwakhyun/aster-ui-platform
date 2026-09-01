import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useReleaseWorkflow } from "./useReleaseWorkflow";
import type {
  ReleaseContext,
  ReleasePublisher,
  ReleaseReceipt,
} from "../services/releaseService";

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

const receipt: ReleaseReceipt = {
  schemaVersion: 3,
  mode: "local-rehearsal",
  version: "3.1.0-beta.2",
  rehearsedAt: "2026-09-01T01:00:00.000Z",
  channel: "beta",
  review: {
    reviewerId: "reviewer-1",
    reviewerLabel: "Reviewer One",
    reviewedAt: context.review.reviewedAt,
    source: context.review.source,
    sourceVersion: context.review.sourceVersion,
    sourceTheme: context.review.sourceTheme,
    changeFingerprint: context.review.changeFingerprint,
  },
  evidence: { ...context.evidence },
  idempotencyKey: "test-key",
  reused: false,
};

describe("useReleaseWorkflow", () => {
  it("surfaces failure, retries with the same idempotency key, and resets", async () => {
    const publish = vi.fn<ReleasePublisher["publish"]>()
      .mockRejectedValueOnce(new Error("registry adapter unavailable"))
      .mockResolvedValueOnce(receipt);
    const publisher: ReleasePublisher = { read: () => null, publish };
    const { result } = renderHook(() => useReleaseWorkflow(context, publisher));

    await act(async () => { await result.current.publish(); });
    expect(result.current.status).toBe("failed");
    expect(result.current.errorMessage).toBe("registry adapter unavailable");

    await act(async () => { await result.current.publish(); });
    expect(result.current.status).toBe("rehearsed");
    expect(publish.mock.calls[0]?.[0].idempotencyKey)
      .toBe(publish.mock.calls[1]?.[0].idempotencyKey);

    act(() => result.current.reset());
    expect(result.current.status).toBe("idle");
    expect(result.current.receipt).toBeNull();
  });

  it("aborts an in-flight rehearsal and returns to idle", async () => {
    const publisher: ReleasePublisher = {
      read: () => null,
      publish: ({ signal }) => new Promise((_, reject) => {
        signal?.addEventListener("abort", () => {
          reject(new DOMException("cancelled", "AbortError"));
        }, { once: true });
      }),
    };
    const { result } = renderHook(() => useReleaseWorkflow(context, publisher));

    act(() => { void result.current.publish(); });
    await waitFor(() => expect(result.current.status).toBe("running"));
    act(() => result.current.cancel());
    await waitFor(() => expect(result.current.status).toBe("idle"));
  });

  it("hydrates a matching persisted receipt on mount", () => {
    const publisher: ReleasePublisher = {
      read: () => receipt,
      publish: vi.fn(),
    };
    const { result } = renderHook(() => useReleaseWorkflow(context, publisher));
    expect(result.current.status).toBe("rehearsed");
    expect(result.current.receipt).toEqual(receipt);
  });

  it("does not expose a receipt after the review or evidence context changes", () => {
    const publisher: ReleasePublisher = {
      read: (candidate) => candidate.review.sourceVersion === 12 ? receipt : null,
      publish: vi.fn(),
    };
    const { result, rerender } = renderHook(
      ({ activeContext }) => useReleaseWorkflow(activeContext, publisher),
      { initialProps: { activeContext: context } },
    );
    expect(result.current.status).toBe("rehearsed");

    const changedContext: ReleaseContext = {
      ...context,
      review: { ...context.review, sourceVersion: 13 },
    };
    rerender({ activeContext: changedContext });
    expect(result.current.status).toBe("idle");
    expect(result.current.receipt).toBeNull();
  });
});
