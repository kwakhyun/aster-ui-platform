// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import { ClinicReviewQueue } from "./ClinicReviewQueue";

afterEach(cleanup);

describe("ClinicReviewQueue design-system consumer", () => {
  it("renders shared feedback, form, status, and action contracts", () => {
    render(<ClinicReviewQueue />);

    expect(screen.getByRole("heading", { name: "클리닉 검수" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("검수 기준이 업데이트됐습니다.");
    expect(screen.getByRole("textbox", { name: "클리닉 검색" })).toBeEnabled();
    expect(screen.getByText("Review required")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "필터 적용" })).toBeEnabled();
  });

  it("has no WCAG-tagged axe violations", async () => {
    const { container } = render(<ClinicReviewQueue />);
    const result = await axe.run(container, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
      rules: { "color-contrast": { enabled: false } },
    });
    expect(result.violations).toEqual([]);
  });
});
