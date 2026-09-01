import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { handleHorizontalTabKeyDown } from "./tabs";

const labels = ["Preview", "API", "Tokens"] as const;

function TabFixture() {
  const [selected, setSelected] = useState<(typeof labels)[number]>("Preview");
  return (
    <div role="tablist" aria-label="Test tabs">
      {labels.map((label) => (
        <button
          key={label}
          type="button"
          role="tab"
          aria-selected={selected === label}
          tabIndex={selected === label ? 0 : -1}
          onKeyDown={handleHorizontalTabKeyDown}
          onClick={() => setSelected(label)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

describe("handleHorizontalTabKeyDown", () => {
  it("wraps with arrow keys and supports Home and End", async () => {
    const user = userEvent.setup();
    render(<TabFixture />);

    const preview = screen.getByRole("tab", { name: "Preview" });
    preview.focus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Tokens" })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(preview).toHaveFocus();
    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Tokens" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(preview).toHaveFocus();
  });

  it("ignores unrelated keys", async () => {
    const user = userEvent.setup();
    render(<TabFixture />);
    const preview = screen.getByRole("tab", { name: "Preview" });
    preview.focus();
    await user.keyboard("x");
    expect(preview).toHaveFocus();
    expect(preview).toHaveAttribute("aria-selected", "true");
  });
});
