import type { FigmaSyncReview } from "@aster-ui/figma-bridge";
import { isThemeName } from "@aster-ui/tokens";

export const reviewStorageKey = "aster-ui:figma-review:v1";

export interface ReviewIdentity {
  readonly id: string;
  readonly label: string;
}

export interface ReviewReceipt {
  readonly schemaVersion: 1;
  readonly mode: "local-human-review";
  readonly source: string;
  readonly sourceVersion: number;
  readonly sourceTheme: FigmaSyncReview["sourceTheme"];
  readonly changeFingerprint: string;
  readonly reviewedAt: string;
  readonly reviewer: ReviewIdentity;
}

export const localReviewIdentity: ReviewIdentity = {
  id: "local-portfolio-reviewer",
  label: "Local reviewer",
};

export function fingerprintReview(review: FigmaSyncReview): string {
  const value = JSON.stringify({
    source: review.source,
    sourceVersion: review.sourceVersion,
    sourceTheme: review.sourceTheme,
    changes: review.changes.map((change) => ({
      id: change.id,
      token: change.token,
      before: change.before,
      after: change.after,
      impact: [...change.impact],
    })),
  });
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(value)) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return `fnv1a64:${hash.toString(16).padStart(16, "0")}`;
}

function isReviewReceipt(value: unknown): value is ReviewReceipt {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ReviewReceipt>;
  return candidate.schemaVersion === 1
    && candidate.mode === "local-human-review"
    && typeof candidate.source === "string"
    && candidate.source.trim().length > 0
    && Number.isInteger(candidate.sourceVersion)
    && Number(candidate.sourceVersion) > 0
    && typeof candidate.sourceTheme === "string"
    && isThemeName(candidate.sourceTheme)
    && typeof candidate.changeFingerprint === "string"
    && /^fnv1a64:[a-f0-9]{16}$/.test(candidate.changeFingerprint)
    && typeof candidate.reviewedAt === "string"
    && Number.isFinite(Date.parse(candidate.reviewedAt))
    && typeof candidate.reviewer?.id === "string"
    && candidate.reviewer.id.trim().length > 0
    && typeof candidate.reviewer?.label === "string"
    && candidate.reviewer.label.trim().length > 0;
}

export function readStoredReviewReceipt(
  storage: Storage,
  review: FigmaSyncReview,
): ReviewReceipt | null {
  try {
    const stored = storage.getItem(reviewStorageKey);
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    if (!isReviewReceipt(parsed)) return null;
    return parsed.source === review.source
      && parsed.sourceVersion === review.sourceVersion
      && parsed.sourceTheme === review.sourceTheme
      && parsed.changeFingerprint === fingerprintReview(review)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export function storeReviewReceipt(
  storage: Storage,
  review: FigmaSyncReview,
  reviewer: ReviewIdentity = localReviewIdentity,
  now: () => Date = () => new Date(),
): ReviewReceipt {
  const receipt: ReviewReceipt = {
    schemaVersion: 1,
    mode: "local-human-review",
    source: review.source,
    sourceVersion: review.sourceVersion,
    sourceTheme: review.sourceTheme,
    changeFingerprint: fingerprintReview(review),
    reviewedAt: now().toISOString(),
    reviewer,
  };
  try {
    storage.setItem(reviewStorageKey, JSON.stringify(receipt));
  } catch (error) {
    throw new Error("The local review record could not be saved.", { cause: error });
  }
  return receipt;
}
