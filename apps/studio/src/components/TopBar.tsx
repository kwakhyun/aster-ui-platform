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
  readonly version: string;
  readonly onToggleSidebar: () => void;
  readonly onNavigate: (tab: WorkspaceTab) => void;
  readonly onHelp: () => void;
  readonly onPublish: () => void;
}

const navigation: readonly { label: string; tab: WorkspaceTab }[] = [
  { label: "Component lab", tab: "preview" },
  { label: "Foundations", tab: "tokens" },
  { label: "Components", tab: "api" },
  { label: "Patterns", tab: "quality" },
] as const;

export function TopBar({
  activeTab,
  sidebarOpen,
  running,
  rehearsed,
  version,
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
          aria-label={sidebarOpen ? "컴포넌트 탐색 닫기" : "컴포넌트 탐색 열기"}
          aria-expanded={sidebarOpen}
          onClick={onToggleSidebar}
        >
          <List size={21} />
        </button>
        <Asterisk size={29} weight="bold" aria-hidden="true" />
        <span>Aster UI</span>
      </div>

      <nav className="topbar__nav" aria-label="주요 섹션">
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
        <button type="button" className="topbar__help" aria-label="도움말" onClick={onHelp}>
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
              ? `Rehearsed ${version}`
              : `Rehearse ${version}`}
        </Button>
      </div>
    </header>
  );
}
