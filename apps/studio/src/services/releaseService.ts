import { isThemeName, tokenVersion } from "@aster-ui/tokens";
import type { QualityEvidence } from "../types";
import type { ReviewReceipt } from "./reviewService";

export const releaseStorageKey = "aster-ui:release:v3";

export interface ReleaseContext {
  readonly review: ReviewReceipt;
  readonly evidence: Pick<
    QualityEvidence,
    "generatedAt" | "sourceRevision" | "gitCommit" | "runId" | "artifactDigest"
  >;
}

export interface ReleaseReceipt {
  readonly schemaVersion: 3;
  readonly mode: "local-rehearsal";
  readonly version: typeof tokenVersion;
  readonly rehearsedAt: string;
  readonly channel: "beta";
  readonly review: {
    readonly reviewerId: string;
    readonly reviewerLabel: string;
    readonly reviewedAt: string;
    readonly source: string;
    readonly sourceVersion: number;
    readonly sourceTheme: string;
    readonly changeFingerprint: string;
  };
  readonly evidence: {
    readonly generatedAt: string;
    readonly sourceRevision: string;
    readonly gitCommit: string | null;
    readonly runId: string;
    readonly artifactDigest: string;
  };
  readonly idempotencyKey: string;
  readonly reused: boolean;
}

export interface ReleaseRequest {
  readonly signal?: AbortSignal;
  readonly idempotencyKey: string;
  readonly context: ReleaseContext;
}

export interface ReleasePublisher {
  read(context: ReleaseContext): ReleaseReceipt | null;
  publish(request: ReleaseRequest): Promise<ReleaseReceipt>;
}

interface LocalPublisherOptions {
  readonly storage: Storage;
  readonly delayMs?: number;
  readonly now?: () => Date;
}

function isReleaseReceipt(value: unknown): value is ReleaseReceipt {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ReleaseReceipt>;
  return candidate.schemaVersion === 3
    && candidate.mode === "local-rehearsal"
    && candidate.version === tokenVersion
    && candidate.channel === "beta"
    && typeof candidate.rehearsedAt === "string"
    && Number.isFinite(Date.parse(candidate.rehearsedAt))
    && typeof candidate.review?.reviewerId === "string"
    && candidate.review.reviewerId.trim().length > 0
    && typeof candidate.review?.reviewerLabel === "string"
    && candidate.review.reviewerLabel.trim().length > 0
    && typeof candidate.review?.reviewedAt === "string"
    && Number.isFinite(Date.parse(candidate.review.reviewedAt))
    && typeof candidate.review?.source === "string"
    && candidate.review.source.trim().length > 0
    && Number.isInteger(candidate.review?.sourceVersion)
    && Number(candidate.review?.sourceVersion) > 0
    && typeof candidate.review?.sourceTheme === "string"
    && isThemeName(candidate.review.sourceTheme)
    && typeof candidate.review?.changeFingerprint === "string"
    && /^fnv1a64:[a-f0-9]{16}$/.test(candidate.review.changeFingerprint)
    && typeof candidate.evidence?.generatedAt === "string"
    && Number.isFinite(Date.parse(candidate.evidence.generatedAt))
    && typeof candidate.evidence?.sourceRevision === "string"
    && /^workspace:[a-f0-9]{20}$/.test(candidate.evidence.sourceRevision)
    && (candidate.evidence?.gitCommit === null
      || (typeof candidate.evidence?.gitCommit === "string"
        && /^[a-f0-9]{40}$/.test(candidate.evidence.gitCommit)))
    && typeof candidate.evidence?.runId === "string"
    && candidate.evidence.runId.trim().length > 0
    && typeof candidate.evidence?.artifactDigest === "string"
    && /^sha256:[a-f0-9]{64}$/.test(candidate.evidence.artifactDigest)
    && typeof candidate.idempotencyKey === "string"
    && candidate.idempotencyKey.trim().length > 0
    && typeof candidate.reused === "boolean";
}

function isReleaseContext(context: ReleaseContext): boolean {
  return context.review.schemaVersion === 1
    && context.review.mode === "local-human-review"
    && context.review.source.trim().length > 0
    && Number.isInteger(context.review.sourceVersion)
    && context.review.sourceVersion > 0
    && isThemeName(context.review.sourceTheme)
    && /^fnv1a64:[a-f0-9]{16}$/.test(context.review.changeFingerprint)
    && Number.isFinite(Date.parse(context.review.reviewedAt))
    && context.review.reviewer.id.trim().length > 0
    && context.review.reviewer.label.trim().length > 0
    && Number.isFinite(Date.parse(context.evidence.generatedAt))
    && /^workspace:[a-f0-9]{20}$/.test(context.evidence.sourceRevision)
    && (context.evidence.gitCommit === null || /^[a-f0-9]{40}$/.test(context.evidence.gitCommit))
    && context.evidence.runId.trim().length > 0
    && /^sha256:[a-f0-9]{64}$/.test(context.evidence.artifactDigest);
}

function matchesContext(receipt: ReleaseReceipt, context: ReleaseContext): boolean {
  return receipt.review.source === context.review.source
    && receipt.review.sourceVersion === context.review.sourceVersion
    && receipt.review.sourceTheme === context.review.sourceTheme
    && receipt.review.changeFingerprint === context.review.changeFingerprint
    && receipt.evidence.sourceRevision === context.evidence.sourceRevision
    && receipt.evidence.gitCommit === context.evidence.gitCommit
    && receipt.evidence.artifactDigest === context.evidence.artifactDigest;
}

function readStoredReceipt(storage: Storage): ReleaseReceipt | null {
  try {
    const value = storage.getItem(releaseStorageKey);
    if (!value) return null;
    const parsed: unknown = JSON.parse(value);
    return isReleaseReceipt(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export class LocalReleaseRehearsalPublisher implements ReleasePublisher {
  readonly #storage: Storage;
  readonly #delayMs: number;
  readonly #now: () => Date;

  constructor({ storage, delayMs = 650, now = () => new Date() }: LocalPublisherOptions) {
    this.#storage = storage;
    this.#delayMs = delayMs;
    this.#now = now;
  }

  read(context: ReleaseContext): ReleaseReceipt | null {
    const receipt = readStoredReceipt(this.#storage);
    return receipt && matchesContext(receipt, context) ? receipt : null;
  }

  async publish({ signal, idempotencyKey, context }: ReleaseRequest): Promise<ReleaseReceipt> {
    if (!isReleaseContext(context) || idempotencyKey.trim().length === 0) {
      throw new Error("The release rehearsal is missing valid review or quality evidence.");
    }
    const existing = this.read(context);
    if (existing?.idempotencyKey === idempotencyKey) {
      return { ...existing, reused: true };
    }

    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(resolve, this.#delayMs);
      signal?.addEventListener(
        "abort",
        () => {
          window.clearTimeout(timer);
          reject(new DOMException("Release rehearsal was stopped", "AbortError"));
        },
        { once: true },
      );
    });

    const receipt: ReleaseReceipt = {
      schemaVersion: 3,
      mode: "local-rehearsal",
      version: tokenVersion,
      rehearsedAt: this.#now().toISOString(),
      channel: "beta",
      review: {
        reviewerId: context.review.reviewer.id,
        reviewerLabel: context.review.reviewer.label,
        reviewedAt: context.review.reviewedAt,
        source: context.review.source,
        sourceVersion: context.review.sourceVersion,
        sourceTheme: context.review.sourceTheme,
        changeFingerprint: context.review.changeFingerprint,
      },
      evidence: { ...context.evidence },
      idempotencyKey,
      reused: false,
    };

    try {
      this.#storage.setItem(releaseStorageKey, JSON.stringify(receipt));
    } catch (error) {
      throw new Error("The local rehearsal record could not be saved.", { cause: error });
    }
    return receipt;
  }
}

export function createLocalReleasePublisher(): ReleasePublisher {
  return new LocalReleaseRehearsalPublisher({ storage: window.localStorage });
}
