import { useEffect, useRef } from "react";

const selector = [
  "button:not([disabled])",
  "a[href]",
  "summary",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function useModalFocus<T extends HTMLElement = HTMLDivElement>(
  open: boolean,
  onClose: () => void,
) {
  const containerRef = useRef<T>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const container = containerRef.current;
    const getItems = () => Array.from(container?.querySelectorAll<HTMLElement>(selector) ?? [])
      .filter((item) => !item.closest('[hidden], [inert], [aria-hidden="true"]')
        && getComputedStyle(item).display !== "none"
        && getComputedStyle(item).visibility !== "hidden");
    const focusFirst = () => (getItems()[0] ?? container)?.focus();
    focusFirst();
    const handleFocusIn = (event: FocusEvent) => {
      if (container && event.target instanceof Node && !container.contains(event.target)) focusFirst();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !container) return;
      const items = getItems();
      if (items.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }
      const first = items[0];
      const last = items.at(-1);
      if (!first || !last) return;

      if (!container.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocusIn);
    document.body.classList.add("has-modal");

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocusIn);
      document.body.classList.remove("has-modal");
      previousFocusRef.current?.focus();
    };
  }, [open]);

  return containerRef;
}
