import {
  CaretDown,
  CheckSquare,
  CopySimple,
  Cube,
  Folder,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { componentTree } from "../data/catalog";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useModalFocus } from "../hooks/useModalFocus";

interface SidebarProps {
  readonly open: boolean;
  readonly selectedComponent: string;
  readonly onRequestOpen: () => void;
  readonly onClose: () => void;
  readonly onCopyPackage: () => void;
  readonly onSelectComponent: (name: string) => void;
}

export function Sidebar({
  open,
  selectedComponent,
  onRequestOpen,
  onClose,
  onCopyPackage,
  onSelectComponent,
}: SidebarProps) {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const overlayNavigation = useMediaQuery("(max-width: 1060px)");
  const sidebarRef = useModalFocus<HTMLElement>(open && overlayNavigation, onClose);
  const normalizedQuery = query.trim().toLocaleLowerCase();

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault();
        onRequestOpen();
        window.requestAnimationFrame(() => searchRef.current?.focus());
      }

      if (event.key === "Escape" && open) {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, [onClose, onRequestOpen, open]);

  const groups = useMemo(
    () =>
      componentTree
        .map((group) => ({
          ...group,
          items: group.items.filter((item) =>
            item.toLocaleLowerCase().includes(normalizedQuery),
          ),
        }))
        .filter((group) => group.items.length > 0),
    [normalizedQuery],
  );

  return (
    <>
      {open ? (
        <button
          type="button"
          className="sidebar-scrim"
          aria-label="컴포넌트 탐색 닫기"
          onClick={onClose}
        />
      ) : null}
      <aside
        ref={sidebarRef}
        className={`sidebar${open ? " is-open" : ""}`}
        aria-label="컴포넌트 탐색"
        aria-hidden={overlayNavigation && !open ? "true" : undefined}
        inert={overlayNavigation && !open ? true : undefined}
      >
        <label className="sidebar__search">
          <MagnifyingGlass aria-hidden="true" />
          <span className="sr-only">컴포넌트 검색</span>
          <input
            ref={searchRef}
            type="search"
            aria-label="컴포넌트 검색"
            value={query}
            placeholder="Search components"
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
          <kbd>⌘ K</kbd>
        </label>

        <div className="sidebar__label">Components</div>
        <div className="sidebar__tree">
          {groups.map((group) => (
            <section key={group.label} aria-labelledby={`group-${group.label}`}>
              <h2 id={`group-${group.label}`}>
                <CaretDown size={13} aria-hidden="true" />
                <Folder size={17} aria-hidden="true" />
                {group.label}
              </h2>
              <ul>
                {group.items.map((item) => {
                  const selected = item === selectedComponent;
                  return (
                    <li key={item}>
                      <button
                        type="button"
                        className={selected ? "is-selected" : ""}
                        aria-current={selected ? "true" : undefined}
                        onClick={() => {
                          onSelectComponent(item);
                          onClose();
                        }}
                      >
                        {group.label === "Form" ? (
                          <CheckSquare size={15} aria-hidden="true" />
                        ) : (
                          <Cube size={15} aria-hidden="true" />
                        )}
                        {item}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          {groups.length === 0 ? (
            <p className="sidebar__empty">일치하는 컴포넌트가 없습니다.</p>
          ) : null}
        </div>

        <div className="sidebar__package">
          <span>Package</span>
          <p>
            @aster-ui/react
            <button type="button" aria-label="패키지 이름 복사" onClick={onCopyPackage}>
              <CopySimple size={17} />
            </button>
          </p>
          <hr />
          <span>Component target</span>
          <p className="sidebar__compatibility">
            Web · evergreen browsers
            <i aria-hidden="true" />
          </p>
          <small>Token outputs: Swift · Compose</small>
        </div>
      </aside>
    </>
  );
}
