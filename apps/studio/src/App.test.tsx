import axe from "axe-core";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import qualityEvidenceJson from "./generated/quality-evidence.json";
import { releaseStorageKey } from "./services/releaseService";
import type { QualityEvidence } from "./types";

const qualityEvidence = qualityEvidenceJson as QualityEvidence;
const passingEvidence: QualityEvidence = {
  ...qualityEvidence,
  checks: qualityEvidence.checks.map((check) => ({ ...check, status: "passed" })),
};

async function expectNoWcagAxeViolations(container: Element) {
  const results = await axe.run(container, {
    runOnly: {
      type: "tag",
      values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
    },
    rules: {
      // JSDOM has no layout/paint engine. Real contrast is covered by the Playwright axe gate.
      "color-contrast": { enabled: false },
    },
  });
  expect(results.violations).toEqual([]);
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("Aster UI component review flow", () => {
  it("switches state, platform, workspace, and inspector views", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole("heading", { name: "TreatmentCard" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Disabled 상태 미리보기" }));
    expect(screen.getByRole("button", { name: "Disabled 상태 미리보기" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(screen.getByRole("tab", { name: "iOS" }));
    expect(screen.getByRole("heading", { name: "iOS Swift token contract" })).toBeInTheDocument();
    expect(screen.getByText(/does not imply a SwiftUI or Compose component/)).toBeInTheDocument();

    await user.selectOptions(screen.getByRole("combobox", { name: "미리보기 테마" }), "ocean");
    expect(document.querySelector(".app-shell")).toHaveAttribute("data-theme", "ocean");

    await user.click(screen.getAllByRole("tab", { name: "API" })[0]!);
    expect(screen.getByRole("heading", { name: "TreatmentCardProps" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "iOS" })).not.toBeInTheDocument();
    await user.click(screen.getAllByRole("tab", { name: "Quality" }).at(-1)!);
    expect(screen.getByRole("heading", { name: "Quality evidence" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Foundations" }));
    expect(screen.getByRole("heading", { name: "Resolved token map" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Patterns" }));
    expect(screen.getByRole("heading", { name: "Release quality gates" })).toBeInTheDocument();
  });

  it("supports search shortcuts, clipboard actions, help, and card interactions", async () => {
    const user = userEvent.setup();
    const clipboardSpy = vi.spyOn(window.navigator.clipboard, "writeText").mockResolvedValue();
    render(<App />);

    fireEvent.keyDown(document, { key: "k", metaKey: true });
    const search = screen.getByRole("searchbox", { name: "컴포넌트 검색" });
    await waitFor(() => expect(search).toHaveFocus());
    await user.type(search, "missing-component");
    expect(screen.getByText("일치하는 컴포넌트가 없습니다.")).toBeInTheDocument();
    await user.clear(search);

    await user.click(screen.getByRole("button", { name: "패키지 이름 복사" }));
    expect(clipboardSpy).toHaveBeenCalledWith("@aster-ui/react");

    await user.click(screen.getByRole("button", { name: "도움말" }));
    expect(screen.getByRole("status")).toHaveTextContent("Ctrl+K");
    await user.click(screen.getByRole("button", { name: "알림 닫기" }));

    await user.click(screen.getByRole("button", { name: "Laser toning 저장" }));
    expect(screen.getByRole("button", { name: "Laser toning 저장 취소" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.click(screen.getByRole("button", { name: "Laser toning 상세 보기" }));
    expect(screen.getByRole("status")).toHaveTextContent("selection event emitted");

    await user.click(screen.getByRole("button", { name: "Components" }));
    await user.click(screen.getByRole("button", { name: "API 사용 예시 복사" }));
    expect(clipboardSpy).toHaveBeenLastCalledWith(expect.stringContaining("<TreatmentCard"));
  });

  it("traps focus in the Figma review and restores it on Escape", async () => {
    const user = userEvent.setup();
    render(<App />);

    const trigger = screen.getByRole("button", { name: "Review diff" });
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Treatment Card / v12" });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "닫기" })).toHaveFocus();

    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(screen.getByRole("button", { name: "Mark review complete" })).toHaveFocus();
    await user.keyboard("{Tab}");
    expect(screen.getByRole("button", { name: "닫기" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(dialog).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("shows a copy failure without losing the active workspace", async () => {
    const user = userEvent.setup();
    vi.spyOn(window.navigator.clipboard, "writeText").mockRejectedValueOnce(
      new Error("permission denied"),
    );
    render(<App />);

    await user.click(screen.getByRole("button", { name: "패키지 이름 복사" }));
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("could not be copied");
    });
    expect(screen.getByRole("heading", { name: "TreatmentCard" })).toBeInTheDocument();
  });

  it("requires a human review before rehearsing and stores the receipt", async () => {
    const user = userEvent.setup();
    const app = (
      <App evidence={passingEvidence} buildSourceRevision={passingEvidence.sourceRevision} />
    );
    const { unmount } = render(app);

    await user.click(screen.getByRole("button", { name: "Rehearse 3.1.0-beta.2" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Human review is required");
    await user.click(screen.getByRole("button", { name: "Review changes" }));
    expect(screen.getByRole("dialog", { name: "Treatment Card / v12" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Mark review complete" }));
    expect(screen.getByRole("status")).toHaveTextContent("reviewed by");

    await user.click(screen.getByRole("button", { name: "Rehearse 3.1.0-beta.2" }));
    const confirmation = screen.getByRole("checkbox");
    expect(confirmation).toBeEnabled();
    await user.click(confirmation);
    await user.click(screen.getByRole("button", { name: "Run rehearsal" }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("local release rehearsal recorded");
    });
    expect(window.localStorage.getItem(releaseStorageKey)).toContain("local-rehearsal");

    unmount();
    render(app);
    expect(screen.getByText(/Human review complete/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rehearsed 3.1.0-beta.2" })).toBeInTheDocument();
  });

  it("blocks a reviewed rehearsal when quality evidence is stale", async () => {
    const user = userEvent.setup();
    render(<App buildSourceRevision={`${qualityEvidence.sourceRevision}:newer`} />);
    await user.click(screen.getByRole("button", { name: "Review diff" }));
    await user.click(screen.getByRole("button", { name: "Mark review complete" }));
    await user.click(screen.getByRole("button", { name: "Rehearse 3.1.0-beta.2" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Current quality evidence is required");
    expect(screen.getByRole("checkbox")).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Open quality" }));
    expect(screen.getByRole("heading", { name: "Release quality gates" })).toBeInTheDocument();
    expect(screen.getAllByText(/does not match the source revision/)).not.toHaveLength(0);
  });

  it("has no WCAG-tagged axe violations across initial, diff, and release states", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await expectNoWcagAxeViolations(container);

    await user.click(screen.getByRole("button", { name: "Review diff" }));
    await expectNoWcagAxeViolations(container);
    await user.click(screen.getByRole("button", { name: "닫기" }));

    await user.click(screen.getByRole("button", { name: "Rehearse 3.1.0-beta.2" }));
    await expectNoWcagAxeViolations(container);
  });
});
