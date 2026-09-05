import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TokenSwatch } from "../components/TokenSwatch";
import { resolveTokenColor } from "./tokenColors";

afterEach(cleanup);

describe("resolved token colors", () => {
  it("resolves the actual old and new aliases, including semantic theme values", () => {
    expect(resolveTokenColor("{color.coral.500}", "coral")).toBe("#ff6257");
    expect(resolveTokenColor("{color.coral.700}", "coral")).toBe("#be332d");
    expect(resolveTokenColor("{color.blue.500}", "coral")).toBe("#2563eb");
    expect(resolveTokenColor("{semantic.color.action.primary}", "coral")).toBe("#be332d");
    expect(resolveTokenColor("{semantic.color.action.primary}", "ocean")).toBe("#2563eb");
  });

  it("updates the swatch with its alias and labels unknown colors instead of guessing", () => {
    const { container, rerender } = render(<TokenSwatch alias="{color.coral.300}" theme="coral" />);
    expect(container.firstChild).toHaveStyle({ backgroundColor: "#ffaaa1" });
    rerender(<TokenSwatch alias="{color.blue.500}" theme="coral" />);
    expect(container.firstChild).toHaveStyle({ backgroundColor: "#2563eb" });
    rerender(<TokenSwatch alias="{color.unknown.500}" theme="coral" />);
    expect(screen.getByText("Color unavailable")).toBeInTheDocument();
    for (const alias of ["{space.1}", "{__proto__.color}", "color.coral.500", "{color.coral}"]) {
      expect(resolveTokenColor(alias, "coral")).toBeNull();
    }
  });
});
