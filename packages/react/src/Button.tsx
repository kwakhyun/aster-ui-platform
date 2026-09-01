import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export type ButtonTone = "primary" | "secondary" | "quiet";
export type ButtonSize = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly tone?: ButtonTone;
  readonly size?: ButtonSize;
  readonly leadingIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    tone = "primary",
    size = "md",
    leadingIcon,
    className = "",
    children,
    type = "button",
    ...props
  },
  ref,
) {
  return (
    <button
      {...props}
      ref={ref}
      className={["aster-button", `aster-button--${tone}`, `aster-button--${size}`, className]
        .filter(Boolean)
        .join(" ")}
      type={type}
    >
      {leadingIcon ? <span className="aster-button__icon" aria-hidden="true">{leadingIcon}</span> : null}
      <span>{children}</span>
    </button>
  );
});
