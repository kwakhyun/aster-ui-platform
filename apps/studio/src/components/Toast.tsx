import { CheckCircle, Info, X } from "@phosphor-icons/react";

interface ToastProps {
  readonly message: string | null;
  readonly tone?: "success" | "info";
  readonly onDismiss: () => void;
}

export function Toast({ message, tone = "info", onDismiss }: ToastProps) {
  if (!message) return null;
  return (
    <div className={`toast toast--${tone}`} role="status" aria-live="polite">
      {tone === "success" ? (
        <CheckCircle weight="fill" aria-hidden="true" />
      ) : (
        <Info weight="fill" aria-hidden="true" />
      )}
      <span>{message}</span>
      <button type="button" aria-label="알림 닫기" onClick={onDismiss}>
        <X aria-hidden="true" />
      </button>
    </div>
  );
}
