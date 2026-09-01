import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

export type AlertTone = "info" | "success" | "warning" | "danger";

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  readonly tone?: AlertTone;
  readonly title: ReactNode;
  readonly action?: ReactNode;
  readonly dismissLabel?: string;
  readonly onDismiss?: () => void;
}

export const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
  {
    tone = "info",
    title,
    action,
    dismissLabel = "알림 닫기",
    onDismiss,
    className = "",
    children,
    role,
    ...props
  },
  ref,
) {
  const liveRole = role ?? (tone === "danger" || tone === "warning" ? "alert" : "status");

  return (
    <div
      {...props}
      ref={ref}
      role={liveRole}
      className={["aster-alert", `aster-alert--${tone}`, className].filter(Boolean).join(" ")}
    >
      <div className="aster-alert__content">
        <strong>{title}</strong>
        {children ? <div className="aster-alert__description">{children}</div> : null}
      </div>
      {action ? <div className="aster-alert__action">{action}</div> : null}
      {onDismiss ? (
        <button
          type="button"
          className="aster-alert__dismiss"
          aria-label={dismissLabel}
          onClick={onDismiss}
        >
          <span aria-hidden="true">×</span>
        </button>
      ) : null}
    </div>
  );
});
