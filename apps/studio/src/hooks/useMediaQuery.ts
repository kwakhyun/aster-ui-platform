import { useCallback, useMemo, useSyncExternalStore } from "react";

const getServerSnapshot = () => false;

export function useMediaQuery(query: string): boolean {
  const mediaQuery = useMemo(
    () => typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(query)
      : null,
    [query],
  );
  const subscribe = useCallback((onStoreChange: () => void) => {
    if (!mediaQuery) return () => undefined;
    mediaQuery.addEventListener("change", onStoreChange);
    return () => mediaQuery.removeEventListener("change", onStoreChange);
  }, [mediaQuery]);

  const getSnapshot = useCallback(() => mediaQuery?.matches ?? false, [mediaQuery]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
