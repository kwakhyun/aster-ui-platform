import {
  forwardRef,
  useId,
  useMemo,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";

export interface TabItem {
  readonly value: string;
  readonly label: ReactNode;
  readonly content: ReactNode;
  readonly disabled?: boolean;
}

export type TabsOrientation = "horizontal" | "vertical";

export interface TabsProps extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  readonly items: readonly TabItem[];
  readonly value?: string;
  readonly defaultValue?: string;
  readonly onValueChange?: (value: string) => void;
  readonly ariaLabel: string;
  readonly orientation?: TabsOrientation;
}

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(function Tabs(
  {
    items,
    value,
    defaultValue,
    onValueChange,
    ariaLabel,
    orientation = "horizontal",
    className = "",
    ...props
  },
  ref,
) {
  const enabledItems = useMemo(() => items.filter((item) => !item.disabled), [items]);
  const initialValue = defaultValue ?? enabledItems[0]?.value ?? "";
  const [uncontrolledValue, setUncontrolledValue] = useState(initialValue);
  const requestedValue = value ?? uncontrolledValue;
  const selectedValue = enabledItems.some((item) => item.value === requestedValue)
    ? requestedValue
    : enabledItems[0]?.value ?? "";
  const selectedIndex = items.findIndex((item) => item.value === selectedValue);
  const id = useId().replace(/:/g, "");

  const select = (nextValue: string) => {
    if (value === undefined) setUncontrolledValue(nextValue);
    onValueChange?.(nextValue);
  };

  const moveFocus = (event: KeyboardEvent<HTMLButtonElement>, currentValue: string) => {
    const previousKey = orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";
    const nextKey = orientation === "horizontal" ? "ArrowRight" : "ArrowDown";
    if (![previousKey, nextKey, "Home", "End"].includes(event.key)) return;

    event.preventDefault();
    const currentIndex = enabledItems.findIndex((item) => item.value === currentValue);
    let nextIndex = currentIndex;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = enabledItems.length - 1;
    if (event.key === previousKey) nextIndex = (currentIndex - 1 + enabledItems.length) % enabledItems.length;
    if (event.key === nextKey) nextIndex = (currentIndex + 1) % enabledItems.length;
    const nextItem = enabledItems[nextIndex];
    if (!nextItem) return;
    select(nextItem.value);
    const nextItemIndex = items.findIndex((item) => item.value === nextItem.value);
    document.getElementById(`${id}-tab-${nextItemIndex}`)?.focus();
  };

  return (
    <div
      {...props}
      ref={ref}
      className={["aster-tabs", `aster-tabs--${orientation}`, className].filter(Boolean).join(" ")}
    >
      <div className="aster-tabs__list" role="tablist" aria-label={ariaLabel} aria-orientation={orientation}>
        {items.map((item, itemIndex) => {
          const selected = item.value === selectedValue;
          return (
            <button
              key={item.value}
              id={`${id}-tab-${itemIndex}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${id}-panel-${itemIndex}`}
              disabled={item.disabled}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(item.value)}
              onKeyDown={(event) => moveFocus(event, item.value)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item, itemIndex) => {
        const selected = itemIndex === selectedIndex;
        return (
          <div
            key={item.value}
            id={`${id}-panel-${itemIndex}`}
            role="tabpanel"
            aria-labelledby={`${id}-tab-${itemIndex}`}
            className="aster-tabs__panel"
            tabIndex={selected ? 0 : -1}
            hidden={!selected}
          >
            {item.content}
          </div>
        );
      })}
    </div>
  );
});
