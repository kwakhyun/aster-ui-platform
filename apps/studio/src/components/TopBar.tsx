import {
  Asterisk,
  CloudArrowUp,
  List,
  Question,
} from "@phosphor-icons/react";
import { Button } from "@aster-ui/react";
import type { WorkspaceTab } from "../types";

interface TopBarProps {
  readonly activeTab: WorkspaceTab;
  readonly sidebarOpen: boolean;
  readonly navigationModalOpen: boolean;
  readonly running: boolean;
  readonly rehearsed: boolean;
  readonly evidenceGeneratedAt: string;
  readonly onToggleSidebar: () => void;
  readonly onNavigate: (tab: WorkspaceTab) => void;
  readonly onHelp: () => void;
  readonly onPublish: () => void;
}

const navigation: readonly { label: string; tab: WorkspaceTab }[] = [
  { label: "Component Lab", tab: "preview" },
  { label: "Foundations", tab: "tokens" },
  { label: "Components", tab: "api" },
  { label: "Quality", tab: "quality" },
] as const;

const evidenceDateFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Asia/Seoul",
});

export function TopBar({
  activeTab,
  sidebarOpen,
  navigationModalOpen,
  running,
  rehearsed,
  evidenceGeneratedAt,
  onToggleSidebar,
  onNavigate,
  onHelp,
  onPublish,
}: TopBarProps) {
  const evidenceDate = new Date(evidenceGeneratedAt);
  const evidenceDateAvailable = Number.isFinite(evidenceDate.getTime());
  const formattedEvidenceDate = evidenceDateAvailable
    ? evidenceDateFormatter.formatToParts(evidenceDate)
      .filter((part) => part.type === "year" || part.type === "month" || part.type === "day")
      .map((part) => part.value)
      .join(".")
    : "unavailable";

  return (
    <header className="topbar">
      <div
        className="topbar__brand"
        aria-hidden={navigationModalOpen ? "true" : undefined}
        inert={navigationModalOpen ? true : undefined}
      >
        <button
          type="button"
          className="topbar__menu"
          aria-label={sidebarOpen ? "Close component browser" : "Open component browser"}
          aria-expanded={sidebarOpen}
          aria-controls="component-browser"
          onClick={onToggleSidebar}
        >
          <List size={21} />
        </button>
        <Asterisk size={29} weight="bold" aria-hidden="true" />
        <span>Aster UI</span>
      </div>

      <nav
        className="topbar__nav"
        aria-label="Primary sections"
        aria-hidden={navigationModalOpen ? "true" : undefined}
        inert={navigationModalOpen ? true : undefined}
      >
        {navigation.map((item) => (
          <button
            key={item.tab}
            type="button"
            className={activeTab === item.tab ? "is-active" : ""}
            aria-current={activeTab === item.tab ? "page" : undefined}
            onClick={() => onNavigate(item.tab)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div
        className="topbar__actions"
        aria-hidden={navigationModalOpen ? "true" : undefined}
        inert={navigationModalOpen ? true : undefined}
      >
        <time dateTime={evidenceDateAvailable ? evidenceDate.toISOString() : undefined}>
          Evidence · {formattedEvidenceDate}
        </time>
        <button type="button" className="topbar__help" aria-label="Help" onClick={onHelp}>
          <Question size={20} />
        </button>
        <Button
          className="topbar__publish"
          leadingIcon={<CloudArrowUp size={19} weight="bold" />}
          disabled={running}
          onClick={onPublish}
        >
          {running
            ? "Running rehearsal…"
            : rehearsed
              ? "Rehearsal complete"
              : "Run rehearsal"}
        </Button>
      </div>
    </header>
  );
}
