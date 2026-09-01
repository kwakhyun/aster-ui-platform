import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonTone = "primary" | "secondary" | "quiet";
export type ButtonSize = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly tone?: ButtonTone;
  readonly size?: ButtonSize;
  readonly leadingIcon?: ReactNode;
}

export function Button({
  tone = "primary",
  size = "md",
  leadingIcon,
  className = "",
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={["aster-button", `aster-button--${tone}`, `aster-button--${size}`, className]
        .filter(Boolean)
        .join(" ")}
      type={type}
      {...props}
    >
      {leadingIcon ? <span className="aster-button__icon">{leadingIcon}</span> : null}
      <span>{children}</span>
    </button>
  );
}

