import type { KeyboardEvent } from "react";

const navigationKeys = new Set(["ArrowLeft", "ArrowRight", "Home", "End"]);

export function handleHorizontalTabKeyDown(event: KeyboardEvent<HTMLElement>): void {
  if (!navigationKeys.has(event.key)) return;

  const list = event.currentTarget.closest('[role="tablist"]');
  const tabs = Array.from(list?.querySelectorAll<HTMLElement>('[role="tab"]') ?? []);
  const currentIndex = tabs.indexOf(event.currentTarget);
  if (currentIndex < 0 || tabs.length === 0) return;

  event.preventDefault();
  const nextIndex = event.key === "Home"
    ? 0
    : event.key === "End"
      ? tabs.length - 1
      : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;

  tabs[nextIndex]?.focus();
  tabs[nextIndex]?.click();
}
