export function isMobileViewport(): boolean {
  return window.matchMedia("(max-width: 767px)").matches;
}

export function createMobilePropsSheet(deps: {
  sheet: HTMLElement;
  overlay: HTMLElement;
  getSelectedCount: () => number;
}) {
  const { sheet, overlay, getSelectedCount } = deps;

  function openMobileProps() {
    if (!isMobileViewport() || getSelectedCount() === 0) return;
    sheet.classList.add("open");
    overlay.classList.add("open");
  }

  function closeMobileProps() {
    sheet.classList.remove("open");
    overlay.classList.remove("open");
  }

  return { openMobileProps, closeMobileProps };
}
