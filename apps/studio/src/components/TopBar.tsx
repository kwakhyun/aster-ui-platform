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
  readonly running: boolean;
  readonly rehearsed: boolean;
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

export function TopBar({
  activeTab,
  sidebarOpen,
  running,
  rehearsed,
  onToggleSidebar,
  onNavigate,
  onHelp,
  onPublish,
}: TopBarProps) {
  return (
    <header className="topbar">
      <div className="topbar__brand">
        <button
          type="button"
          className="topbar__menu"
          aria-label={sidebarOpen ? "Close component browser" : "Open component browser"}
          aria-expanded={sidebarOpen}
          onClick={onToggleSidebar}
        >
          <List size={21} />
        </button>
        <Asterisk size={29} weight="bold" aria-hidden="true" />
        <span>Aster UI</span>
      </div>

      <nav className="topbar__nav" aria-label="Primary sections">
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

      <div className="topbar__actions">
        <time dateTime="2026-09-01">2026.09.01</time>
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
