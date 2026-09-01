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
  it("renders every sidebar entry from the shipped manifest instead of placeholder catalog data", async () => {
    const user = userEvent.setup();
    render(<App />);

    for (const name of ["Alert", "Badge", "Button", "Tabs", "TextField", "TreatmentCard"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }

    await user.click(screen.getByRole("button", { name: "TextField" }));
    expect(screen.getByRole("heading", { name: "TextField" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Search clinics" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "TextField API" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Tabs" }));
    expect(screen.getByRole("tablist", { name: "Treatment information" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tabs API" })).toBeInTheDocument();
  });

  it("switches state, platform, workspace, and inspector views", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole("heading", { name: "TreatmentCard" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Preview disabled state" }));
    expect(screen.getByRole("button", { name: "Preview disabled state" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(screen.getByRole("tab", { name: "iOS" }));
    expect(screen.getByRole("heading", { name: "iOS Swift token contract" })).toBeInTheDocument();
    expect(screen.getByText(/does not represent a SwiftUI or Compose component/)).toBeInTheDocument();

    await user.selectOptions(screen.getByRole("combobox", { name: "Preview theme" }), "ocean");
    expect(document.querySelector(".app-shell")).toHaveAttribute("data-theme", "ocean");

    await user.click(screen.getAllByRole("tab", { name: "API" })[0]!);
    expect(screen.getByRole("heading", { name: "TreatmentCardProps" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "iOS" })).not.toBeInTheDocument();
    await user.click(screen.getAllByRole("tab", { name: "Quality" }).at(-1)!);
    expect(screen.getByRole("heading", { name: "Quality evidence" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Foundations" }));
    expect(screen.getByRole("heading", { name: "Resolved token map" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Quality" }));
    expect(screen.getByRole("heading", { name: "Release quality checks" })).toBeInTheDocument();
  });

  it("supports search shortcuts, clipboard actions, help, and card interactions", async () => {
    const user = userEvent.setup();
    const clipboardSpy = vi.spyOn(window.navigator.clipboard, "writeText").mockResolvedValue();
    render(<App />);

    fireEvent.keyDown(document, { key: "k", metaKey: true });
    const search = screen.getByRole("searchbox", { name: "Search components" });
    await waitFor(() => expect(search).toHaveFocus());
    await user.type(search, "missing-component");
    expect(screen.getByText("No matching components found.")).toBeInTheDocument();
    await user.clear(search);

    await user.click(screen.getByRole("button", { name: "Copy package name" }));
    expect(clipboardSpy).toHaveBeenCalledWith("@aster-ui/react");

    await user.click(screen.getByRole("button", { name: "Help" }));
    expect(screen.getByRole("status")).toHaveTextContent("Ctrl+K");
    await user.click(screen.getByRole("button", { name: "Dismiss notification" }));

    await user.click(screen.getByRole("button", { name: "Save Laser toning" }));
    expect(screen.getByRole("button", { name: "Remove Laser toning from saved treatments" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.click(screen.getByRole("button", { name: "View details for Laser toning" }));
    expect(screen.getByRole("status")).toHaveTextContent("emitted its selection event");

    await user.click(screen.getByRole("button", { name: "Components" }));
    await user.click(screen.getByRole("button", { name: "Copy usage example" }));
    expect(clipboardSpy).toHaveBeenLastCalledWith(expect.stringContaining("<TreatmentCard"));
  });

  it("traps focus in the Figma review and restores it on Escape", async () => {
    const user = userEvent.setup();
    render(<App />);

    const trigger = screen.getByRole("button", { name: "Review changes" });
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "TreatmentCard · v12" });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();

    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(screen.getByRole("button", { name: "Complete review" })).toHaveFocus();
    await user.keyboard("{Tab}");
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
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

    await user.click(screen.getByRole("button", { name: "Copy package name" }));
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

    await user.click(screen.getByRole("button", { name: "Run rehearsal" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Review required");
    await user.click(screen.getByRole("button", { name: "Review Figma changes" }));
    expect(screen.getByRole("dialog", { name: "TreatmentCard · v12" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Complete review" }));
    expect(screen.getByRole("status")).toHaveTextContent("Review completed by");

    await user.click(screen.getByRole("button", { name: "Run rehearsal" }));
    const confirmation = screen.getByRole("checkbox");
    expect(confirmation).toBeEnabled();
    await user.click(confirmation);
    await user.click(screen.getByRole("button", { name: "Start rehearsal" }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("release rehearsal saved locally");
    });
    expect(window.localStorage.getItem(releaseStorageKey)).toContain("local-rehearsal");

    unmount();
    render(app);
    expect(screen.getByText(/Review completed by/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rehearsal complete" })).toBeInTheDocument();
  });

  it("blocks a reviewed rehearsal when quality evidence is stale", async () => {
    const user = userEvent.setup();
    render(<App buildSourceRevision={`${qualityEvidence.sourceRevision}:newer`} />);
    await user.click(screen.getByRole("button", { name: "Review changes" }));
    await user.click(screen.getByRole("button", { name: "Complete review" }));
    await user.click(screen.getByRole("button", { name: "Run rehearsal" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Up-to-date quality evidence is required");
    expect(screen.getByRole("checkbox")).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "View quality checks" }));
    expect(screen.getByRole("heading", { name: "Release quality checks" })).toBeInTheDocument();
    expect(screen.getAllByText(/does not match this build's source revision/)).not.toHaveLength(0);
  });

  it("has no WCAG-tagged axe violations across initial, diff, and release states", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await expectNoWcagAxeViolations(container);

    await user.click(screen.getByRole("button", { name: "Review changes" }));
    await expectNoWcagAxeViolations(container);
    await user.click(screen.getByRole("button", { name: "Close" }));

    await user.click(screen.getByRole("button", { name: "Run rehearsal" }));
    await expectNoWcagAxeViolations(container);
  });
});
