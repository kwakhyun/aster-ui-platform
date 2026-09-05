import { useCallback, useMemo, useSyncExternalStore } from "react";
import { components } from "../data/catalog";
import type { Platform, StudioTheme, WorkspaceTab } from "../types";

interface WorkspaceLocation {
  component: string;
  tab: WorkspaceTab;
  theme: StudioTheme;
  platform: Platform;
}
const changeEvent = "aster:workspace-location";
function subscribe(listener: () => void) {
  window.addEventListener("popstate", listener);
  window.addEventListener(changeEvent, listener);
  return () => {
    window.removeEventListener("popstate", listener);
    window.removeEventListener(changeEvent, listener);
  };
}
function readLocation(search: string): WorkspaceLocation {
  const params = new URLSearchParams(search);
  const component = params.get("component");
  const tab = params.get("tab");
  const platform = params.get("platform");
  return {
    component: components.some((entry) => entry.name === component) ? component! : "TreatmentCard",
    tab: tab === "api" || tab === "tokens" || tab === "quality" ? tab : "preview",
    theme: params.get("theme") === "ocean" ? "ocean" : "coral",
    platform: platform === "ios" || platform === "android" ? platform : "web",
  };
}
const getSnapshot = () => window.location.search;
const getServerSnapshot = () => "";

export function useWorkspaceLocation() {
  const search = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const location = useMemo(() => readLocation(search), [search]);
  const navigate = useCallback((patch: Partial<WorkspaceLocation>) => {
    const url = new URL(window.location.href);
    const next = { ...readLocation(url.search), ...patch };
    for (const [key, value] of Object.entries(next)) url.searchParams.set(key, value);
    if (url.href === window.location.href) return;
    window.history.pushState(null, "", url);
    window.dispatchEvent(new Event(changeEvent));
  }, []);
  return [location, navigate] as const;
}
