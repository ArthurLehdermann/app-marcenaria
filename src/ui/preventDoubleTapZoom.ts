const DOUBLE_TAP_MS = 320;
const DOUBLE_TAP_MAX_DIST_PX = 32;

export function isDoubleTapZoomGesture(
  dtMs: number,
  distPx: number,
): boolean {
  return dtMs <= DOUBLE_TAP_MS && distPx <= DOUBLE_TAP_MAX_DIST_PX;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

function touchesInsideRect(e: TouchEvent, rect: DOMRect): boolean {
  for (let i = 0; i < e.touches.length; i++) {
    const t = e.touches[i]!;
    if (t.clientX < rect.left || t.clientX > rect.right || t.clientY < rect.top || t.clientY > rect.bottom) {
      return false;
    }
  }
  return true;
}

export type MobileZoomLockOptions = {
  /** Área interativa do app (ex.: #app). */
  root: HTMLElement;
  /** Canvas 3D — pinch com 2 dedos continua funcionando aqui. */
  canvas: HTMLElement;
};

/**
 * Bloqueia zoom do navegador no mobile:
 * - duplo toque no mesmo ponto (Safari iOS)
 * - pinch fora do canvas
 * - gesture events (Safari legado)
 *
 * Dois toques em locais diferentes (ex.: canvas → botão +) não são bloqueados.
 */
export function setupMobileZoomLock({ root, canvas }: MobileZoomLockOptions): () => void {
  let lastEnd = 0;
  let lastX = 0;
  let lastY = 0;

  const onTouchEnd = (e: TouchEvent) => {
    if (isEditableTarget(e.target)) return;
    const touch = e.changedTouches[0];
    if (!touch) return;

    const now = Date.now();
    const dt = now - lastEnd;
    const dist = Math.hypot(touch.clientX - lastX, touch.clientY - lastY);

    if (isDoubleTapZoomGesture(dt, dist)) {
      e.preventDefault();
    }

    lastEnd = now;
    lastX = touch.clientX;
    lastY = touch.clientY;
  };

  const onTouchMove = (e: TouchEvent) => {
    if (e.touches.length < 2) return;
    const rect = canvas.getBoundingClientRect();
    if (touchesInsideRect(e, rect)) return;
    e.preventDefault();
  };

  const onGesture = (e: Event) => {
    e.preventDefault();
  };

  root.addEventListener("touchend", onTouchEnd, { passive: false });
  root.addEventListener("touchmove", onTouchMove, { passive: false });

  const gestureTypes = ["gesturestart", "gesturechange", "gestureend"] as const;
  for (const type of gestureTypes) {
    document.addEventListener(type, onGesture, { passive: false });
  }

  return () => {
    root.removeEventListener("touchend", onTouchEnd);
    root.removeEventListener("touchmove", onTouchMove);
    for (const type of gestureTypes) {
      document.removeEventListener(type, onGesture);
    }
  };
}

/** @deprecated Use setupMobileZoomLock */
export function preventDoubleTapZoom(canvas: HTMLElement) {
  const root = canvas.closest<HTMLElement>("#app") ?? canvas;
  return setupMobileZoomLock({ root, canvas });
}
