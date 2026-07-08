import type { Panel, UUID } from "../core/types";

export type TreeCallbacks = {
  onSelect(id: UUID): void;
  onVisibilityToggle(id: UUID, visible: boolean): void;
};

export function createPanelTree(container: HTMLElement, cbs: TreeCallbacks) {
  function update(panels: Panel[], selectedId?: UUID, collisionIds?: Set<UUID>) {
    container.innerHTML = "";
    for (const p of panels) {
      const item = document.createElement("div");
      item.dataset.panelId = p.id;
      item.setAttribute("aria-selected", String(p.id === selectedId));
      if (!p.visible) item.classList.add("hidden");
      if (collisionIds?.has(p.id)) item.classList.add("collision");

      const label = document.createElement("span");
      label.textContent = p.name;
      item.appendChild(label);

      const eye = document.createElement("button");
      eye.setAttribute("aria-label", p.visible ? "Ocultar" : "Mostrar");
      eye.addEventListener("click", (e) => {
        e.stopPropagation();
        cbs.onVisibilityToggle(p.id, !p.visible);
      });
      item.appendChild(eye);

      item.addEventListener("click", () => cbs.onSelect(p.id));
      container.appendChild(item);
    }
  }

  return { update };
}
