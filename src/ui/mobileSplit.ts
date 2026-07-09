export const MOBILE_SPLIT_STORAGE_KEY = "marcenaria_mobile_split_v1";
export const MOBILE_PANEL_MIN_RATIO = 0.15;
export const MOBILE_PANEL_MAX_RATIO = 0.85;
export const MOBILE_PANEL_DEFAULT_RATIO = 0.30;
const DRAG_THRESHOLD_PX = 4;

export function clampMobilePanelRatio(ratio: number): number {
  return Math.min(MOBILE_PANEL_MAX_RATIO, Math.max(MOBILE_PANEL_MIN_RATIO, ratio));
}

export function loadMobilePanelRatio(): number {
  try {
    const raw = localStorage.getItem(MOBILE_SPLIT_STORAGE_KEY);
    if (!raw) return MOBILE_PANEL_DEFAULT_RATIO;
    const n = Number(raw);
    if (!Number.isFinite(n)) return MOBILE_PANEL_DEFAULT_RATIO;
    return clampMobilePanelRatio(n);
  } catch {
    return MOBILE_PANEL_DEFAULT_RATIO;
  }
}

export function saveMobilePanelRatio(ratio: number): void {
  try {
    localStorage.setItem(MOBILE_SPLIT_STORAGE_KEY, String(clampMobilePanelRatio(ratio)));
  } catch {
    /* quota / private mode */
  }
}

export type MobileSplitOptions = {
  app: HTMLElement;
  topbar: HTMLElement;
  handle: HTMLElement;
  bottom: HTMLElement;
  isMobile: () => boolean;
  onLayoutChange: () => void;
};

export function setupMobileSplit(opts: MobileSplitOptions) {
  const { app, topbar, handle, bottom, isMobile, onLayoutChange } = opts;
  let ratio = loadMobilePanelRatio();
  let dragging = false;
  let startY = 0;
  let startBottomH = 0;

  function contentHeight() {
    const appH = app.getBoundingClientRect().height;
    const topH = topbar.getBoundingClientRect().height;
    return Math.max(0, appH - topH);
  }

  function applyRatio(nextRatio: number, persist = false) {
    ratio = clampMobilePanelRatio(nextRatio);
    if (persist) saveMobilePanelRatio(ratio);

    if (!isMobile()) {
      app.style.removeProperty("--mobile-bottom-h");
      return;
    }

    const available = contentHeight();
    if (!available) return;

    const bottomH = Math.round(available * ratio);
    app.style.setProperty("--mobile-bottom-h", `${bottomH}px`);
    const previewPct = Math.round(((available - bottomH) / available) * 100);
    handle.setAttribute("aria-valuenow", String(previewPct));
    onLayoutChange();
  }

  function sync() {
    applyRatio(ratio);
  }

  function onDragMove(clientY: number) {
    if (!dragging) return;
    const available = contentHeight();
    if (!available) return;
    const delta = clientY - startY;
    const nextBottomH = startBottomH - delta;
    applyRatio(nextBottomH / available);
  }

  function detachDragListeners() {
    window.removeEventListener("pointermove", onWindowPointerMove);
    window.removeEventListener("pointerup", onWindowPointerUp);
    window.removeEventListener("pointercancel", onWindowPointerUp);
    window.removeEventListener("touchmove", onWindowTouchMove);
    window.removeEventListener("touchend", onWindowTouchEnd);
    window.removeEventListener("touchcancel", onWindowTouchEnd);
  }

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove("dragging");
    saveMobilePanelRatio(ratio);
    detachDragListeners();
  }

  function startDrag(clientY: number) {
    if (dragging) return;
    dragging = true;
    startY = clientY;
    startBottomH = bottom.getBoundingClientRect().height;
    handle.classList.add("dragging");
  }

  function onWindowPointerMove(e: PointerEvent) {
    if (!dragging) {
      if (Math.abs(e.clientY - startY) < DRAG_THRESHOLD_PX) return;
      startDrag(startY);
    }
    onDragMove(e.clientY);
  }

  function onWindowPointerUp() {
    endDrag();
  }

  function onWindowTouchMove(e: TouchEvent) {
    if (e.touches.length !== 1) return;
    const y = e.touches[0]!.clientY;
    if (!dragging) {
      if (Math.abs(y - startY) < DRAG_THRESHOLD_PX) return;
      startDrag(startY);
    }
    e.preventDefault();
    onDragMove(y);
  }

  function onWindowTouchEnd() {
    endDrag();
  }

  function armPointerDrag(clientY: number) {
    if (!isMobile()) return;
    startY = clientY;
    startBottomH = bottom.getBoundingClientRect().height;
    window.addEventListener("pointermove", onWindowPointerMove);
    window.addEventListener("pointerup", onWindowPointerUp);
    window.addEventListener("pointercancel", onWindowPointerUp);
  }

  function armTouchDrag(clientY: number) {
    if (!isMobile()) return;
    startY = clientY;
    startBottomH = bottom.getBoundingClientRect().height;
    window.addEventListener("touchmove", onWindowTouchMove, { passive: false });
    window.addEventListener("touchend", onWindowTouchEnd);
    window.addEventListener("touchcancel", onWindowTouchEnd);
  }

  function onPointerDown(e: PointerEvent) {
    if (!isMobile() || e.pointerType === "touch") return;
    if (e.button !== 0) return;
    startDrag(e.clientY);
    armPointerDrag(e.clientY);
  }

  function onTouchStart(e: TouchEvent) {
    if (!isMobile() || e.touches.length !== 1) return;
    armTouchDrag(e.touches[0]!.clientY);
  }

  function setEnabled(active: boolean) {
    if (!active) endDrag();
    handle.toggleAttribute("hidden", !active);
  }

  handle.toggleAttribute("hidden", true);

  handle.addEventListener("pointerdown", onPointerDown);
  handle.addEventListener("touchstart", onTouchStart, { passive: true });

  window.visualViewport?.addEventListener("resize", sync);

  return {
    sync,
    setEnabled,
    getRatio: () => ratio,
    dispose: () => {
      endDrag();
      handle.removeEventListener("pointerdown", onPointerDown);
      handle.removeEventListener("touchstart", onTouchStart);
      window.visualViewport?.removeEventListener("resize", sync);
    },
  };
}
