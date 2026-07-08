import type { Panel, UUID, EdgeSide } from "../core/types";

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
    const p = panel;
    const inGroup = Boolean(p.groupId);

    const form = document.createElement("div");
    form.dataset.panelForm = "";
    if (inGroup) form.dataset.groupLocked = "";

    if (inGroup) {
      const note = document.createElement("div");
      note.className = "props-group-header";
      note.innerHTML = `
        <span class="props-group-icon" aria-hidden="true">▦</span>
        <div class="props-group-head-text">
          <span class="props-group-kicker">Peça em bloco</span>
          <span class="props-group-meta">Selecione o bloco na árvore para mover ou ocultar</span>
        </div>`;
      form.appendChild(note);
      container.appendChild(form);
      return;
    }

    function field(label: string, name: string, value: string, type = "text") {
      const wrap = document.createElement("label");
      wrap.textContent = label + " ";
      const input = document.createElement("input");
      input.name = name;
      input.type = type;
      input.value = value;
      input.addEventListener("change", () => {
        const patch: Partial<Panel> = {};
        if      (name === "name")      patch.name = input.value;
        else if (name === "width")     patch.width = Number(input.value);
        else if (name === "height")    patch.height = Number(input.value);
        else if (name === "thickness") patch.thickness = Number(input.value);
        else if (name === "type")      patch.type = input.value;
        else if (name === "color")     patch.color = input.value;
        else if (name === "pos_x")     patch.position = { ...p.position, x: Number(input.value) };
        else if (name === "pos_y")     patch.position = { ...p.position, y: Number(input.value) };
        else if (name === "pos_z")     patch.position = { ...p.position, z: Number(input.value) };
        cbs.onChange(p.id, patch);
      });
      wrap.appendChild(input);
      form.appendChild(wrap);
    }

    function sectionLabel(text: string) {
      const el = document.createElement("div");
      el.className = "props-section";
      el.textContent = text;
      form.appendChild(el);
    }

    field("Nome", "name", p.name);
    field("Tipo", "type", p.type);
    field("Largura", "width", String(p.width), "number");
    field("Altura", "height", String(p.height), "number");
    field("Espessura", "thickness", String(p.thickness), "number");
    field("Cor", "color", p.color, "color");

    sectionLabel("Posição (mm)");
    field("X", "pos_x", String(Math.round(p.position.x)), "number");
    field("Y", "pos_y", String(Math.round(p.position.y)), "number");
    field("Z", "pos_z", String(Math.round(p.position.z)), "number");

    // fita
    sectionLabel("Fita de borda");
    const edgeRow = document.createElement("div");
    edgeRow.className = "edge-row";
    const edgeSides: EdgeSide[] = ["top", "bottom", "left", "right"];
    const edgeLabels: Record<EdgeSide, string> = { top: "Sup", bottom: "Inf", left: "Esq", right: "Dir" };
    for (const side of edgeSides) {
      const label = document.createElement("label");
      label.textContent = edgeLabels[side];
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.name = `edge_${side}`;
      cb.checked = p.edges[side];
      cb.addEventListener("change", () => {
        cbs.onChange(p.id, { edges: { ...p.edges, [side]: cb.checked } });
      });
      label.appendChild(cb);
      edgeRow.appendChild(label);
    }
    form.appendChild(edgeRow);

    // ações
    const actionsEl = document.createElement("div");
    actionsEl.className = "actions";
    const axisLabel: Record<string, string> = { y: "em pé →Z", x: "lateral →X", z: "deitado →Y" };
    const actionDefs: Array<[string, string, () => void]> = [
      ["duplicate", "Duplicar",                              () => cbs.onDuplicate(p.id)],
      ["rotate",    `Girar (${axisLabel[p.upAxis] ?? p.upAxis})`, () => cbs.onRotate(p.id)],
      ["delete",    "Excluir",                               () => cbs.onDelete(p.id)],
    ];
    for (const [action, label, fn] of actionDefs) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.action = action;
      btn.textContent = label;
      btn.addEventListener("click", fn);
      actionsEl.appendChild(btn);
    }
    form.appendChild(actionsEl);

    container.appendChild(form);
  }

  function syncPosition(pos: { x: number; y: number; z: number }) {
    if (!container.querySelector("[data-panel-form]")) return;
    for (const [name, v] of [["pos_x", pos.x], ["pos_y", pos.y], ["pos_z", pos.z]] as const) {
      const input = container.querySelector<HTMLInputElement>(`[name='${name}']`);
      if (input && document.activeElement !== input) {
        input.value = String(Math.round(v));
      }
    }
  }

  return { update, syncPosition };
}
