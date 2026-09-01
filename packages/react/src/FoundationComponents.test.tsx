// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Alert } from "./Alert";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { Tabs } from "./Tabs";
import { TextField } from "./TextField";

afterEach(cleanup);

describe("foundation components", () => {
  it("forwards button and badge refs while preserving native attributes", () => {
    const buttonRef = createRef<HTMLButtonElement>();
    const badgeRef = createRef<HTMLSpanElement>();
    render(
      <>
        <Button ref={buttonRef} tone="secondary" size="sm" leadingIcon={<span>+</span>} disabled>
          Add
        </Button>
        <Badge ref={badgeRef} tone="success" size="sm" data-state="ready">Ready</Badge>
      </>,
    );

    expect(buttonRef.current).toBe(screen.getByRole("button", { name: "Add" }));
    expect(buttonRef.current).toBeDisabled();
    expect(badgeRef.current).toHaveAttribute("data-state", "ready");
    expect(badgeRef.current).toHaveClass("aster-badge--success", "aster-badge--sm");
  });

  it("uses assertive roles only for urgent alerts and exposes dismissal", async () => {
    const onDismiss = vi.fn();
    const { rerender } = render(
      <Alert title="동기화 완료" tone="success" onDismiss={onDismiss}>
        세 개의 토큰이 검증됐습니다.
      </Alert>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("세 개의 토큰");
    await userEvent.click(screen.getByRole("button", { name: "알림 닫기" }));
    expect(onDismiss).toHaveBeenCalledOnce();

    rerender(<Alert title="계약 충돌" tone="danger" action={<Button size="sm">Review</Button>} />);
    expect(screen.getByRole("alert")).toHaveTextContent("계약 충돌");
    expect(screen.getByRole("button", { name: "Review" })).toBeInTheDocument();
  });

  it("connects labels, hints and errors without discarding consumer descriptions", () => {
    const ref = createRef<HTMLInputElement>();
    render(
      <>
        <p id="consumer-context">계정 정보</p>
        <TextField
          ref={ref}
          label="이메일"
          hint="업무용 주소를 입력하세요."
          error="올바른 이메일이 아닙니다."
          aria-describedby="consumer-context"
          defaultValue="invalid"
        />
      </>,
    );

    const input = screen.getByRole("textbox", { name: "이메일" });
    expect(ref.current).toBe(input);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.getAttribute("aria-describedby")).toContain("consumer-context");
    expect(input.getAttribute("aria-describedby")).toContain("-error");
    expect(input.getAttribute("aria-describedby")).toContain("-hint");
  });

  it("supports controlled selection and skips disabled tabs during keyboard navigation", () => {
    const onValueChange = vi.fn();
    render(
      <Tabs
        ariaLabel="시술 정보"
        defaultValue="overview"
        onValueChange={onValueChange}
        items={[
          { value: "overview", label: "개요", content: "시술 개요" },
          { value: "disabled", label: "비활성", content: "숨김", disabled: true },
          { value: "aftercare", label: "사후 관리", content: "사후 관리 안내" },
        ]}
      />,
    );

    const overview = screen.getByRole("tab", { name: "개요" });
    fireEvent.keyDown(overview, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "사후 관리" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("사후 관리 안내");
    expect(onValueChange).toHaveBeenCalledWith("aftercare");

    fireEvent.keyDown(screen.getByRole("tab", { name: "사후 관리" }), { key: "Home" });
    expect(screen.getByRole("tab", { name: "개요" })).toHaveAttribute("aria-selected", "true");
  });

  it("falls back to the first enabled tab when a controlled value is unavailable", () => {
    render(
      <Tabs
        ariaLabel="fallback"
        value="missing"
        orientation="vertical"
        items={[
          { value: "blocked", label: "차단", content: "차단", disabled: true },
          { value: "ready", label: "준비", content: "준비됨" },
        ]}
      />,
    );

    expect(screen.getByRole("tab", { name: "준비" })).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(screen.getByRole("tab", { name: "준비" }), { key: "ArrowDown" });
    expect(screen.getByRole("tabpanel")).toHaveTextContent("준비됨");
  });

  it("keeps every tab-to-panel relationship valid for consumer-defined values", () => {
    render(
      <Tabs
        ariaLabel="공백이 포함된 값"
        items={[
          { value: "before care", label: "시술 전", content: "시술 전 안내" },
          { value: "after/care", label: "시술 후", content: "시술 후 안내" },
        ]}
      />,
    );

    const tabs = screen.getAllByRole("tab");
    for (const tab of tabs) {
      const panelId = tab.getAttribute("aria-controls");
      expect(panelId).toBeTruthy();
      expect(document.getElementById(panelId as string)).toHaveAttribute("role", "tabpanel");
      expect(tab.id).not.toMatch(/\s|\//);
    }
    expect(screen.getAllByRole("tabpanel", { hidden: true })).toHaveLength(2);
  });
});
