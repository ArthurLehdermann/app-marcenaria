export type ToolbarCallbacks = {
  onNew(): void;
  onOpen(): void;
  onSave(): void;
  onExport(): void;
};

export function createToolbar(container: HTMLElement, cbs: ToolbarCallbacks): void {
  const buttons: Array<[string, string, () => void]> = [
    ["new",    "Novo",     cbs.onNew],
    ["open",   "Abrir",    cbs.onOpen],
    ["save",   "Salvar",   cbs.onSave],
    ["export", "Exportar", cbs.onExport],
  ];
  for (const [action, label, fn] of buttons) {
    const btn = document.createElement("button");
    btn.dataset.action = action;
    btn.textContent = label;
    btn.addEventListener("click", fn);
    container.appendChild(btn);
  }
}
