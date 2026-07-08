export type ToolbarCallbacks = {
  onNew(): void;
  onOpen(): void;
  onSave(): void;
  onExport(): void;
  onToggleGroupPick(): void;
  onGroupSelected(): void;
};

export type ToolbarHandle = {
  setGroupPickActive(active: boolean): void;
  setCanGroup(can: boolean): void;
  setCanNew(can: boolean): void;
};

export function createToolbar(container: HTMLElement, cbs: ToolbarCallbacks): ToolbarHandle {
  const buttons: Array<[string, string, () => void]> = [
    ["new",    "Novo",     cbs.onNew],
    ["open",   "Abrir",    cbs.onOpen],
    ["save",   "Salvar",   cbs.onSave],
    ["export", "Exportar", cbs.onExport],
  ];
  const actionButtons = new Map<string, HTMLButtonElement>();
  for (const [action, label, fn] of buttons) {
    const btn = document.createElement("button");
    btn.dataset.action = action;
    btn.textContent = label;
    btn.addEventListener("click", fn);
    container.appendChild(btn);
    actionButtons.set(action, btn);
  }
  const newBtn = actionButtons.get("new")!;
  newBtn.disabled = true;

  const sep = document.createElement("span");
  sep.className = "toolbar-sep";
  container.appendChild(sep);

  const pickBtn = document.createElement("button");
  pickBtn.dataset.action = "group-pick";
  pickBtn.textContent = "Selecionar";
  pickBtn.title = "Marcar peças para agrupar (Shift+clique também funciona)";
  pickBtn.addEventListener("click", cbs.onToggleGroupPick);
  container.appendChild(pickBtn);

  const groupBtn = document.createElement("button");
  groupBtn.dataset.action = "group";
  groupBtn.textContent = "Agrupar";
  groupBtn.disabled = true;
  groupBtn.addEventListener("click", cbs.onGroupSelected);
  container.appendChild(groupBtn);

  return {
    setGroupPickActive(active: boolean) {
      pickBtn.classList.toggle("active", active);
    },
    setCanGroup(can: boolean) {
      groupBtn.disabled = !can;
    },
    setCanNew(can: boolean) {
      newBtn.disabled = !can;
    },
  };
}
