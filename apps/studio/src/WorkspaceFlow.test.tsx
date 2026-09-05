import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";

afterEach(() => { cleanup(); window.history.replaceState(null, "", "/"); });

describe("workspace navigation and overlays", () => {
  it("restores a deep link, preserves unrelated URL values and reacts to history navigation", async () => {
    window.history.replaceState(null, "", "/?component=Button&tab=tokens&theme=ocean&platform=ios&source=portfolio#main-workspace");
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole("heading", { name: "Button" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Tokens" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("combobox", { name: "Preview theme" })).toHaveValue("ocean");
    await user.click(screen.getByRole("tab", { name: "Preview" }));
    expect(screen.getByRole("tab", { name: "iOS" })).toHaveAttribute("aria-selected", "true");
    expect(window.location.search).toContain("tab=preview");
    expect(window.location.search).toContain("source=portfolio");
    expect(window.location.hash).toBe("#main-workspace");
    window.history.back();
    await waitFor(() => expect(screen.getByRole("tab", { name: "Tokens" })).toHaveAttribute("aria-selected", "true"));
    window.history.forward();
    await waitFor(() => expect(screen.getByRole("tab", { name: "Preview" })).toHaveAttribute("aria-selected", "true"));
  });

  it("uses safe defaults for unknown URL values", () => {
    window.history.replaceState(null, "", "/?component=unknown&tab=invalid&theme=invalid&platform=invalid");
    render(<App />);
    expect(screen.getByRole("heading", { name: "TreatmentCard" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Preview" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Web" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("combobox", { name: "Preview theme" })).toHaveValue("coral");
  });

  it.each(["Review changes", "Run rehearsal", "View details"])("contains keyboard focus in the %s overlay", async (name) => {
    const user = userEvent.setup();
    render(<App />);
    const trigger = screen.getByRole("button", { name });
    await user.click(trigger);
    const dialog = screen.getByRole("dialog");
    const close = within(dialog).getByRole("button", { name: "Close" });
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(close).toHaveFocus();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("offers actual quality evidence as a downloadable report", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "View details" }));
    const dialog = screen.getByRole("dialog", { name: "Quality details" });
    expect(within(dialog).getByRole("heading", { name: "Recorded checks" })).toBeInTheDocument();
    const link = within(dialog).getByRole("link", { name: "Download all quality evidence (JSON)" });
    const contents = JSON.parse(decodeURIComponent(link.getAttribute("href")!.split(",")[1]!));
    expect(contents.checks.some((check: { id: string }) => check.id === "visual")).toBe(true);
    expect(contents.sourceRevision).toMatch(/^workspace:/);
  });
});
