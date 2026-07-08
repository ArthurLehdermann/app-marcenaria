import type { Panel, UUID, EdgeSide } from "../core/types";
import { THICKNESS_OPTIONS } from "../core/types";

export type PropertiesCallbacks = {
  onChange(id: UUID, patch: Partial<Panel>): void;
  onDuplicate(id: UUID): void;
  onDelete(id: UUID): void;
  onRotate(id: UUID): void;
};

export function createPropertiesPanel(container: HTMLElement, cbs: PropertiesCallbacks) {
  function update(panel: Panel | null) {
    container.innerHTML = "";
    if (!panel) return;

    const form = document.createElement("div");
    form.dataset.panelForm = "";

    function field(label: string, name: string, value: string, type = "text") {
      const wrap = document.createElement("label");
      wrap.textContent = label + " ";
      const input = document.createElement("input");
      input.name = name;
      input.type = type;
      input.value = value;
      input.addEventListener("change", () => {
        const patch: Partial<Panel> = {};
        if (name === "name") patch.name = input.value;
        else if (name === "width") patch.width = Number(input.value);
        else if (name === "height") patch.height = Number(input.value);
        else if (name === "thickness") patch.thickness = Number(input.value);
        else if (name === "type") patch.type = input.value;
        else if (name === "color") patch.color = input.value;
        cbs.onChange(panel.id, patch);
      });
      wrap.appendChild(input);
      form.appendChild(wrap);
    }

    field("Nome", "name", panel.name);
    field("Tipo", "type", panel.type);
    field("Largura", "width", String(panel.width), "number");
    field("Altura", "height", String(panel.height), "number");
    field("Espessura", "thickness", String(panel.thickness), "number");
    field("Cor", "color", panel.color, "color");

    // fita
    const edgeSides: EdgeSide[] = ["top", "bottom", "left", "right"];
    const edgeLabels: Record<EdgeSide, string> = { top: "Sup", bottom: "Inf", left: "Esq", right: "Dir" };
    for (const side of edgeSides) {
      const label = document.createElement("label");
      label.textContent = `Fita ${edgeLabels[side]} `;
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.name = `edge_${side}`;
      cb.checked = panel.edges[side];
      cb.addEventListener("change", () => {
        cbs.onChange(panel.id, { edges: { ...panel.edges, [side]: cb.checked } });
      });
      label.appendChild(cb);
      form.appendChild(label);
    }

    // ações
    const actions: Array<[string, () => void]> = [
      ["duplicate", () => cbs.onDuplicate(panel.id)],
      ["rotate",    () => cbs.onRotate(panel.id)],
      ["delete",    () => cbs.onDelete(panel.id)],
    ];
    for (const [action, fn] of actions) {
      const btn = document.createElement("button");
      btn.dataset.action = action;
      btn.textContent = action;
      btn.addEventListener("click", fn);
      form.appendChild(btn);
    }

    container.appendChild(form);
  }

  return { update };
}
