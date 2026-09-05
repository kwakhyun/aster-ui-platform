import { CheckCircle, Info, X } from "@phosphor-icons/react";

interface ToastProps {
  readonly blocked?: boolean;
  readonly message: string | null;
  readonly tone?: "success" | "info";
  readonly onDismiss: () => void;
}

export function Toast({ blocked = false, message, tone = "info", onDismiss }: ToastProps) {
  if (!message) return null;
  return (
    <div className={`toast toast--${tone}`} role="status" aria-live="polite">
      {tone === "success" ? (
        <CheckCircle weight="fill" aria-hidden="true" />
      ) : (
        <Info weight="fill" aria-hidden="true" />
      )}
      <span>{message}</span>
      <button type="button" inert={blocked || undefined} aria-hidden={blocked || undefined} aria-label="Dismiss notification" onClick={onDismiss}>
        <X aria-hidden="true" />
      </button>
    </div>
  );
}
