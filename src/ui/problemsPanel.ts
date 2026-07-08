import type { Panel } from "../core/types";
import type { Collision } from "../core/collision";

export function createProblemsPanel(container: HTMLElement) {
  function update(collisions: Collision[], panels: Panel[]) {
    container.innerHTML = "";
    const nameOf = (id: string) => panels.find(p => p.id === id)?.name ?? id;
    for (const c of collisions) {
      const item = document.createElement("div");
      item.dataset.collision = "";
      item.textContent = `${nameOf(c.a)} ↔ ${nameOf(c.b)}`;
      container.appendChild(item);
    }
  }

  return { update };
}
