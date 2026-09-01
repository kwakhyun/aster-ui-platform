import { forwardRef, type HTMLAttributes } from "react";

export type BadgeTone = "neutral" | "accent" | "success";
export type BadgeSize = "sm" | "md";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  readonly tone?: BadgeTone;
  readonly size?: BadgeSize;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  {
    tone = "neutral",
    size = "md",
    className = "",
    children,
    ...props
  },
  ref,
) {
  return (
    <span
      {...props}
      ref={ref}
      className={["aster-badge", `aster-badge--${tone}`, `aster-badge--${size}`, className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
});
