import { useCallback, useSyncExternalStore } from "react";

function getMatches(query: string): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(query).matches
    : false;
}

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback((onStoreChange: () => void) => {
    if (typeof window.matchMedia !== "function") return () => undefined;
    const mediaQuery = window.matchMedia(query);
    mediaQuery.addEventListener("change", onStoreChange);
    return () => mediaQuery.removeEventListener("change", onStoreChange);
  }, [query]);

  const getSnapshot = useCallback(() => getMatches(query), [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
