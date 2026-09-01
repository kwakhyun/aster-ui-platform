import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createLocalReleasePublisher,
  type ReleaseContext,
  type ReleasePublisher,
  type ReleaseReceipt,
} from "../services/releaseService";
import type { ReleaseStatus } from "../types";

function createIdempotencyKey(): string {
  return globalThis.crypto?.randomUUID?.() ?? `rehearsal-${Date.now()}`;
}

function getContextKey(context: ReleaseContext | null): string {
  if (!context) return "no-review";
  return [
    context.review.source,
    context.review.sourceVersion,
    context.review.sourceTheme,
    context.review.changeFingerprint,
    context.evidence.sourceRevision,
    context.evidence.artifactDigest,
  ].join("\u0000");
}

interface WorkflowState {
  readonly contextKey: string;
  readonly status: ReleaseStatus;
  readonly receipt: ReleaseReceipt | null;
  readonly errorMessage: string | null;
}

export function useReleaseWorkflow(
  context: ReleaseContext | null,
  publisher?: ReleasePublisher,
) {
  const [activePublisher] = useState(() => publisher ?? createLocalReleasePublisher());
  const contextKey = getContextKey(context);
  const storedReceipt = useMemo(
    () => context ? activePublisher.read(context) : null,
    [activePublisher, context],
  );
  const [workflow, setWorkflow] = useState<WorkflowState>(() => ({
    contextKey,
    receipt: storedReceipt,
    status: storedReceipt ? "rehearsed" : "idle",
    errorMessage: null,
  }));
  const controllerRef = useRef<AbortController | null>(null);
  const idempotencyRef = useRef({
    contextKey,
    value: storedReceipt?.idempotencyKey ?? null as string | null,
  });

  const current = useMemo<WorkflowState>(() => workflow.contextKey === contextKey
    ? workflow
    : {
        contextKey,
        receipt: storedReceipt,
        status: storedReceipt ? "rehearsed" : "idle",
        errorMessage: null,
      }, [contextKey, storedReceipt, workflow]);

  useEffect(() => () => controllerRef.current?.abort(), []);
  useEffect(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
  }, [contextKey]);

  const publish = useCallback(async () => {
    if (!context) {
      setWorkflow({
        contextKey,
        receipt: null,
        status: "failed",
        errorMessage: "A current human review receipt is required.",
      });
      return null;
    }
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    if (idempotencyRef.current.contextKey !== contextKey) {
      idempotencyRef.current = { contextKey, value: storedReceipt?.idempotencyKey ?? null };
    }
    idempotencyRef.current.value ??= createIdempotencyKey();
    setWorkflow({ ...current, contextKey, status: "running", errorMessage: null });

    try {
      const nextReceipt = await activePublisher.publish({
        signal: controller.signal,
        idempotencyKey: idempotencyRef.current.value,
        context,
      });
      setWorkflow({ contextKey, receipt: nextReceipt, status: "rehearsed", errorMessage: null });
      return nextReceipt;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setWorkflow({ ...current, contextKey, status: "idle", errorMessage: null });
        return null;
      }
      setWorkflow({
        ...current,
        contextKey,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Release rehearsal failed.",
      });
      return null;
    }
  }, [activePublisher, context, contextKey, current, storedReceipt]);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    setWorkflow({ ...current, contextKey, status: "idle", errorMessage: null });
  }, [contextKey, current]);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    idempotencyRef.current = { contextKey, value: null };
    setWorkflow({ contextKey, receipt: null, status: "idle", errorMessage: null });
  }, [contextKey]);

  return {
    status: current.status,
    receipt: current.receipt,
    errorMessage: current.errorMessage,
    publish,
    cancel,
    reset,
  } as const;
}
