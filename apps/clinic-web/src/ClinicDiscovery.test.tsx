// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import { ClinicDiscovery } from "./ClinicDiscovery";

afterEach(cleanup);

describe("ClinicDiscovery design-system consumer", () => {
  it("renders the shared discovery contract and switches tabs", async () => {
    render(<ClinicDiscovery />);

    expect(screen.getByRole("tab", { name: "추천" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("img", { name: "레이저 토닝 시술 예시" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "상담 신청" })).toBeEnabled();

    await userEvent.click(screen.getByRole("tab", { name: "저장" }));
    expect(screen.getByRole("tabpanel")).toHaveTextContent("저장한 시술이 없습니다.");
  });

  it("has no WCAG-tagged axe violations", async () => {
    const { container } = render(<ClinicDiscovery />);
    const result = await axe.run(container, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
      rules: { "color-contrast": { enabled: false } },
    });
    expect(result.violations).toEqual([]);
  });
});
