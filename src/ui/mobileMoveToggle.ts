const MOVE_ICON = `<svg class="mobile-move-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
  <path d="M10 3v14M10 3 7.5 5.5M10 3l2.5 2.5M10 17l-2.5-2.5M10 17l2.5-2.5M3 10h14M3 10l2.5-2.5M3 10l2.5 2.5M17 10l-2.5-2.5M17 10l-2.5 2.5" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export type MobileMoveToggleApi = {
  isActive: () => boolean;
  toggle: () => void;
  canUse: () => boolean;
};

export function setupMobileMoveToggle(
  button: HTMLButtonElement,
  api: MobileMoveToggleApi,
): { sync: () => void } {
  button.type = "button";
  button.id = button.id || "btn-mobile-move";
  button.setAttribute("aria-label", "Mover peça selecionada");
  button.innerHTML = MOVE_ICON;

  function sync() {
    const canUse = api.canUse();
    button.disabled = !canUse;
    button.setAttribute("aria-pressed", String(api.isActive()));
    button.classList.toggle("active", api.isActive());
    button.title = canUse
      ? (api.isActive() ? "Modo mover ativo · arraste no preview" : "Mover peça ou bloco")
      : "Selecione uma peça para mover";
  }

  button.addEventListener("click", () => {
    if (!api.canUse()) return;
    api.toggle();
    sync();
  });

  sync();
  return { sync };
}
