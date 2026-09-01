// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TreatmentCard } from "./TreatmentCard";

const props = {
  title: "Laser toning",
  category: "Brightening · Pigmentation",
  imageUrl: "/portrait-800.webp",
  imageAlt: "시술 카드 모델",
  price: 79_000,
  downtime: "Minimal",
  sessions: "3–5",
} as const;

afterEach(cleanup);

describe("TreatmentCard", () => {
  it("forwards article attributes and emits standard mouse events", () => {
    const ref = createRef<HTMLElement>();
    const onSavedChange = vi.fn();
    const onSelect = vi.fn();
    const { rerender } = render(
      <TreatmentCard
        {...props}
        ref={ref}
        className="consumer-card"
        data-analytics-id="treatment-card"
        onSavedChange={onSavedChange}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Laser toning 저장" }));
    fireEvent.click(screen.getByRole("button", { name: "Laser toning 상세 보기" }));

    expect(onSavedChange).toHaveBeenCalledWith(true, expect.any(Object));
    expect(onSelect).toHaveBeenCalledWith(expect.any(Object));
    expect(ref.current).toBe(screen.getByRole("article"));
    expect(ref.current).toHaveClass("consumer-card");
    expect(ref.current).toHaveAttribute("data-analytics-id", "treatment-card");
    expect(screen.getByText("₩79,000")).toBeInTheDocument();

    rerender(
      <TreatmentCard
        {...props}
        saved
        onSavedChange={onSavedChange}
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Laser toning 저장 취소" }));
    expect(onSavedChange).toHaveBeenLastCalledWith(false, expect.any(Object));
  });

  it("uses natural English accessible labels for English locales", () => {
    const onSavedChange = vi.fn();
    const onSelect = vi.fn();
    const { rerender } = render(
      <TreatmentCard
        {...props}
        locale="en-US"
        currency="USD"
        results="Brighter-looking skin"
        onSavedChange={onSavedChange}
        onSelect={onSelect}
      />,
    );

    expect(screen.getByLabelText("Treatment details")).toBeInTheDocument();
    expect(screen.getByText("Results")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save Laser toning" }));
    fireEvent.click(screen.getByRole("button", { name: "View details for Laser toning" }));

    rerender(
      <TreatmentCard
        {...props}
        locale="en-US"
        currency="USD"
        saved
        onSavedChange={onSavedChange}
        onSelect={onSelect}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Remove Laser toning from saved treatments" }),
    );

    expect(onSavedChange).toHaveBeenNthCalledWith(1, true, expect.any(Object));
    expect(onSavedChange).toHaveBeenNthCalledWith(2, false, expect.any(Object));
    expect(onSelect).toHaveBeenCalledWith(expect.any(Object));
  });

  it("honors currency and responsive image attributes without eager-loading by default", () => {
    render(
      <TreatmentCard
        {...props}
        currency="USD"
        locale="en-US"
        imageProps={{
          srcSet: "/portrait-400.webp 400w, /portrait-800.webp 800w",
          sizes: "(max-width: 720px) 100vw, 204px",
          fetchPriority: "high",
          width: 800,
          height: 1000,
        }}
      />,
    );

    expect(screen.getByText("$79,000")).toBeInTheDocument();
    expect(screen.getByText("Downtime")).toBeInTheDocument();
    expect(screen.getByText("From")).toBeInTheDocument();
    const image = screen.getByRole("img");
    expect(image).toHaveAttribute("loading", "lazy");
    expect(image).toHaveAttribute("decoding", "async");
    expect(image).toHaveAttribute("fetchpriority", "high");
    expect(image).toHaveAttribute("srcset", expect.stringContaining("400w"));
    expect(image).toHaveAttribute("sizes", expect.stringContaining("204px"));
  });

  it("disables every card action through the public disabled contract", () => {
    render(
      <TreatmentCard
        {...props}
        variant="compact"
        disabled
        onSavedChange={vi.fn()}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByRole("article")).toHaveAttribute("aria-disabled", "true");
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
    for (const button of buttons) {
      expect(button).toBeDisabled();
    }
  });

  it("does not expose no-op actions and lets consumers preserve heading hierarchy", () => {
    render(<TreatmentCard {...props} headingLevel="h2" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: props.title })).toBeInTheDocument();
  });
});
