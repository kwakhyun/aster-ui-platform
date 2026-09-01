import { afterEach, describe, expect, it, vi } from "vitest";
import { copyText } from "./clipboard";

afterEach(() => vi.restoreAllMocks());

describe("copyText", () => {
  it("writes through the Clipboard API", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    await copyText("@aster-ui/react");
    expect(writeText).toHaveBeenCalledWith("@aster-ui/react");
  });

  it("rejects when the Clipboard API is unavailable", async () => {
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });

    await expect(copyText("value")).rejects.toThrow("Clipboard API is unavailable");
  });
});
