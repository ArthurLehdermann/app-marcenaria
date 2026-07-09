const SNAP_PREF_KEY = "marcenaria_snap_v1";

export function loadSnapEnabled(): boolean {
  try {
    return localStorage.getItem(SNAP_PREF_KEY) !== "0";
  } catch {
    return true;
  }
}

export function saveSnapEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SNAP_PREF_KEY, enabled ? "1" : "0");
  } catch {
    /* quota / private mode */
  }
}
