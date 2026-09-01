import { beforeEach, describe, expect, it } from "vitest";
import { figmaRestFixturePayload, normalizeFigmaChanges } from "@aster-ui/figma-bridge";
import {
  fingerprintReview,
  readStoredReviewReceipt,
  reviewStorageKey,
  storeReviewReceipt,
} from "./reviewService";

const review = normalizeFigmaChanges(figmaRestFixturePayload, "2026-09-01T00:00:00.000Z");

describe("reviewService", () => {
  beforeEach(() => window.localStorage.clear());

  it("stores and restores a receipt only for the exact Figma change set", () => {
    const receipt = storeReviewReceipt(
      window.localStorage,
      review,
      { id: "reviewer-1", label: "Reviewer One" },
      () => new Date("2026-09-01T01:00:00.000Z"),
    );
    expect(receipt.changeFingerprint).toBe(fingerprintReview(review));
    expect(readStoredReviewReceipt(window.localStorage, review)).toEqual(receipt);

    const changedReview = { ...review, sourceVersion: review.sourceVersion + 1 };
    expect(readStoredReviewReceipt(window.localStorage, changedReview)).toBeNull();
  });

  it("ignores corrupt and legacy review data", () => {
    window.localStorage.setItem(reviewStorageKey, "not-json");
    expect(readStoredReviewReceipt(window.localStorage, review)).toBeNull();
    window.localStorage.setItem(reviewStorageKey, JSON.stringify({ schemaVersion: 0 }));
    expect(readStoredReviewReceipt(window.localStorage, review)).toBeNull();
    window.localStorage.setItem(reviewStorageKey, JSON.stringify({
      ...storeReviewReceipt(window.localStorage, review),
      reviewedAt: "not-a-date",
    }));
    expect(readStoredReviewReceipt(window.localStorage, review)).toBeNull();
  });
});
