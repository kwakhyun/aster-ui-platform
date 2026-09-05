/** Storage access itself can throw when browser policy blocks persistence. */
export function getBrowserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
