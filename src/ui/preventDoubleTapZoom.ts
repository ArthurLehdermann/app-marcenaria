/** Bloqueia zoom por duplo toque (iOS Safari) sem afetar inputs. */
export function preventDoubleTapZoom(root: Document | HTMLElement = document) {
  let lastEnd = 0;

  root.addEventListener("touchend", (e) => {
    const t = e.target;
    if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) {
      return;
    }
    const now = Date.now();
    if (now - lastEnd <= 320) {
      e.preventDefault();
    }
    lastEnd = now;
  }, { passive: false });
}
