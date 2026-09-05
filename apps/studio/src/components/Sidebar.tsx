import {
  CaretDown,
  CheckSquare,
  CopySimple,
  Cube,
  Folder,
  MagnifyingGlass,
  X,
} from "@phosphor-icons/react";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { componentTree } from "../data/catalog";
import { useModalFocus } from "../hooks/useModalFocus";

interface SidebarProps {
  readonly open: boolean;
  readonly blocked: boolean;
  readonly overlayNavigation: boolean;
  readonly selectedComponent: string;
  readonly onRequestOpen: () => void;
  readonly onClose: () => void;
  readonly onCopyPackage: () => void;
  readonly onSelectComponent: (name: string) => void;
}

export function Sidebar({
  open,
  blocked,
  overlayNavigation,
  selectedComponent,
  onRequestOpen,
  onClose,
  onCopyPackage,
  onSelectComponent,
}: SidebarProps) {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const sidebarRef = useModalFocus<HTMLElement>(open && overlayNavigation, onClose);
  const normalizedQuery = query.trim().toLocaleLowerCase();

  const handleShortcut = useEffectEvent((event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "k") {
      event.preventDefault();
      if (blocked) return;
      onRequestOpen();
      window.requestAnimationFrame(() => {
        const search = searchRef.current;
        const modal = document.querySelector('[aria-modal="true"]');
        if (search && (!modal || modal.contains(search))) search.focus();
      });
    }

    if (event.key === "Escape" && open) {
      event.preventDefault();
      onClose();
    }
  });

  useEffect(() => {
    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, []);

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
          aria-hidden="true"
          tabIndex={-1}
          onClick={onClose}
        />
      ) : null}
      <aside
        id="component-browser"
        ref={sidebarRef}
        className={`sidebar${open ? " is-open" : ""}`}
        role={overlayNavigation && open ? "dialog" : undefined}
        aria-modal={overlayNavigation && open ? "true" : undefined}
        aria-label="Component browser"
        aria-hidden={blocked || (overlayNavigation && !open) ? "true" : undefined}
        inert={blocked || (overlayNavigation && !open) ? true : undefined}
      >
        <label className="sidebar__search">
          <MagnifyingGlass aria-hidden="true" />
          <span className="sr-only">Search components</span>
          <input
            ref={searchRef}
            type="search"
            aria-label="Search components"
            value={query}
            placeholder="Search components"
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
          <kbd>⌘ K</kbd>
        </label>

        <div className="sidebar__heading">
          <div className="sidebar__label">Components</div>
          {overlayNavigation && open ? (
            <button
              type="button"
              className="sidebar__close"
              aria-label="Close component browser"
              onClick={onClose}
            >
              <X size={18} aria-hidden="true" />
            </button>
          ) : null}
        </div>
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
            <p className="sidebar__empty">No matching components found.</p>
          ) : null}
        </div>

        <div className="sidebar__package">
          <span>Package</span>
          <p>
            @aster-ui/react
            <button type="button" aria-label="Copy package name" onClick={onCopyPackage}>
              <CopySimple size={17} />
            </button>
          </p>
          <hr />
          <span>Platform support</span>
          <p className="sidebar__compatibility">
            Web · verified in Chrome
            <i aria-hidden="true" />
          </p>
          <small>Native token outputs: Swift and Compose</small>
        </div>
      </aside>
    </>
  );
}
