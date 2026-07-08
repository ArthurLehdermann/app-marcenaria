export type ToolbarMobileMenu = {
  wrap: HTMLElement;
  toggle: HTMLElement;
  overlay: HTMLElement;
};

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

export function createToolbar(
  container: HTMLElement,
  cbs: ToolbarCallbacks,
  mobile?: ToolbarMobileMenu,
): ToolbarHandle {
  let closeMenu: (() => void) | undefined;

  if (mobile) {
    const { wrap, toggle, overlay } = mobile;
    closeMenu = () => {
      wrap.classList.remove("open");
      overlay.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    };
    toggle.addEventListener("click", () => {
      const open = wrap.classList.toggle("open");
      overlay.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
    });
    overlay.addEventListener("click", closeMenu);
  }

  const run = (fn: () => void) => () => {
    fn();
    closeMenu?.();
  };

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
    btn.addEventListener("click", run(fn));
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
  pickBtn.addEventListener("click", run(cbs.onToggleGroupPick));
  container.appendChild(pickBtn);

  const groupBtn = document.createElement("button");
  groupBtn.dataset.action = "group";
  groupBtn.textContent = "Agrupar";
  groupBtn.disabled = true;
  groupBtn.addEventListener("click", run(cbs.onGroupSelected));
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
