import type { Panel, UUID, EdgeSide } from "../core/types";

export type PropertiesCallbacks = {
  onChange(id: UUID, patch: Partial<Panel>): void;
  onDuplicate(id: UUID): void;
  onDelete(id: UUID): void;
  onRotate(id: UUID): void;
};

export type PropertiesPanelOptions = {
  layout?: "stack" | "tabs";
};

type TabId = "general" | "position" | "edge";

function positiveMm(raw: string): number {
  return Math.max(1, Number(raw) || 1);
}

function finiteMm(raw: string, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function createPropertiesPanel(
  container: HTMLElement,
  cbs: PropertiesCallbacks,
  options: PropertiesPanelOptions = {},
) {
  const layout = options.layout ?? "stack";
  let activeTab: TabId = "general";

  function update(panel: Panel | null) {
    if (layout === "tabs") {
      const current = container.querySelector<HTMLElement>(".props-tabs")?.dataset.activeTab;
      if (current === "general" || current === "position" || current === "edge") {
        activeTab = current;
      }
    }
    container.innerHTML = "";
    if (!panel) return;
    const p = panel;
    const inGroup = Boolean(p.groupId);

    const form = document.createElement("div");
    form.dataset.panelForm = "";
    if (inGroup) form.dataset.groupLocked = "";
    if (layout === "tabs") form.dataset.layout = "tabs";

    if (inGroup && layout === "tabs") {
      activeTab = "edge";
    }

    function sectionLabel(target: HTMLElement, text: string) {
      const el = document.createElement("div");
      el.className = "props-section";
      el.textContent = text;
      target.appendChild(el);
    }

    function appendEdgeFields(target: HTMLElement) {
      if (layout === "stack") {
        sectionLabel(target, "Fita de borda");
      } else {
        const edgeHint = document.createElement("p");
        edgeHint.className = "props-tab-hint";
        edgeHint.textContent = "Marque os lados que recebem fita de borda.";
        target.appendChild(edgeHint);
      }

      const edgeRow = document.createElement("div");
      edgeRow.className = "edge-row";
      const edgeSides: EdgeSide[] = ["top", "bottom", "left", "right"];
      const edgeLabels: Record<EdgeSide, string> = {
        top: "Superior",
        bottom: "Inferior",
        left: "Esquerda",
        right: "Direita",
      };
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
      target.appendChild(edgeRow);
    }

    if (inGroup) {
      const note = document.createElement("div");
      note.className = "props-group-header";
      note.innerHTML = `
        <span class="props-group-icon" aria-hidden="true">▦</span>
        <div class="props-group-head-text">
          <span class="props-group-kicker">${p.name}</span>
          <span class="props-group-meta">Peça do bloco · dimensões e posição pelo bloco inteiro</span>
        </div>`;
      form.appendChild(note);

      if (layout === "tabs") {
        const tabs = document.createElement("div");
        tabs.className = "props-tabs";
        tabs.dataset.activeTab = "edge";

        const tabBar = document.createElement("div");
        tabBar.className = "props-tab-bar";
        tabBar.setAttribute("role", "tablist");

        const tabBody = document.createElement("div");
        tabBody.className = "props-tab-body";

        const edgePane = document.createElement("div");
        edgePane.className = "props-tab-pane";
        edgePane.dataset.tabPane = "edge";
        appendEdgeFields(edgePane);

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "props-tab-btn active";
        btn.dataset.tab = "edge";
        btn.setAttribute("role", "tab");
        btn.setAttribute("aria-selected", "true");
        btn.textContent = "Borda";
        tabBar.appendChild(btn);
        tabBody.appendChild(edgePane);
        tabs.append(tabBar, tabBody);
        form.appendChild(tabs);
      } else {
        appendEdgeFields(form);
      }

      container.appendChild(form);
      return;
    }

    const targets = layout === "tabs"
      ? {
          general: document.createElement("div"),
          position: document.createElement("div"),
          edge: document.createElement("div"),
        }
      : { form };

    function appendField(
      target: HTMLElement,
      label: string,
      name: string,
      value: string,
      type = "text",
    ) {
      const wrap = document.createElement("label");
      wrap.textContent = label + " ";
      const input = document.createElement("input");
      input.name = name;
      input.type = type;
      input.value = value;
      input.addEventListener("change", () => {
        const patch: Partial<Panel> = {};
        if (name === "name") {
          patch.name = input.value;
        } else if (name === "width") {
          const width = positiveMm(input.value);
          input.value = String(width);
          patch.width = width;
        } else if (name === "height") {
          const height = positiveMm(input.value);
          input.value = String(height);
          patch.height = height;
        } else if (name === "thickness") {
          const thickness = positiveMm(input.value);
          input.value = String(thickness);
          patch.thickness = thickness;
        } else if (name === "color") {
          patch.color = input.value;
        } else if (name === "pos_x") {
          const x = finiteMm(input.value, p.position.x);
          input.value = String(Math.round(x));
          patch.position = { ...p.position, x };
        } else if (name === "pos_y") {
          const y = finiteMm(input.value, p.position.y);
          input.value = String(Math.round(y));
          patch.position = { ...p.position, y };
        } else if (name === "pos_z") {
          const z = finiteMm(input.value, p.position.z);
          input.value = String(Math.round(z));
          patch.position = { ...p.position, z };
        }
        cbs.onChange(p.id, patch);
      });
      wrap.appendChild(input);
      target.appendChild(wrap);
    }

    const generalTarget = targets.general ?? form;
    const positionTarget = targets.position ?? form;
    const edgeTarget = targets.edge ?? form;

    if (layout === "tabs") {
      const metaGrid = document.createElement("div");
      metaGrid.className = "props-dim-grid";
      generalTarget.appendChild(metaGrid);
      appendField(metaGrid, "Nome", "name", p.name);
      appendField(metaGrid, "Cor", "color", p.color, "color");

      const sizeGrid = document.createElement("div");
      sizeGrid.className = "props-size-grid";
      generalTarget.appendChild(sizeGrid);
      appendField(sizeGrid, "Espessura", "thickness", String(p.thickness), "number");
      appendField(sizeGrid, "Largura", "width", String(p.width), "number");
      appendField(sizeGrid, "Altura", "height", String(p.height), "number");
    } else {
      appendField(generalTarget, "Nome", "name", p.name);
      appendField(generalTarget, "Cor", "color", p.color, "color");
      const sizeGrid = document.createElement("div");
      sizeGrid.className = "props-size-grid";
      generalTarget.appendChild(sizeGrid);
      appendField(sizeGrid, "Espessura", "thickness", String(p.thickness), "number");
      appendField(sizeGrid, "Largura", "width", String(p.width), "number");
      appendField(sizeGrid, "Altura", "height", String(p.height), "number");
    }

    if (layout === "stack") {
      sectionLabel(positionTarget, "Posição (mm)");
    }
    const posGrid = document.createElement("div");
    posGrid.className = "props-size-grid";
    positionTarget.appendChild(posGrid);
    appendField(posGrid, "X", "pos_x", String(Math.round(p.position.x)), "number");
    appendField(posGrid, "Y", "pos_y", String(Math.round(p.position.y)), "number");
    appendField(posGrid, "Z", "pos_z", String(Math.round(p.position.z)), "number");
    if (!inGroup) {
      const posHint = document.createElement("p");
      posHint.className = "props-tab-hint";
      posHint.textContent = "Canto inferior traseiro esquerdo da peça, em mm no projeto.";
      positionTarget.appendChild(posHint);
    }

    appendEdgeFields(edgeTarget);

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
    generalTarget.appendChild(actionsEl);

    if (layout === "tabs") {
      const tabs = document.createElement("div");
      tabs.className = "props-tabs";
      tabs.dataset.activeTab = activeTab;

      const tabBar = document.createElement("div");
      tabBar.className = "props-tab-bar";
      tabBar.setAttribute("role", "tablist");

      const tabBody = document.createElement("div");
      tabBody.className = "props-tab-body";

      const tabDefs: Array<[TabId, string]> = [
        ["general", "Geral"],
        ["position", "Posição"],
        ["edge", "Borda"],
      ];

      for (const [id, label] of tabDefs) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "props-tab-btn";
        btn.dataset.tab = id;
        btn.setAttribute("role", "tab");
        btn.setAttribute("aria-selected", id === activeTab ? "true" : "false");
        btn.textContent = label;
        if (id === activeTab) btn.classList.add("active");
        tabBar.appendChild(btn);

        const pane = targets[id]!;
        pane.className = "props-tab-pane";
        pane.dataset.tabPane = id;
        pane.hidden = id !== activeTab;
        tabBody.appendChild(pane);
      }

      tabBar.addEventListener("click", (e) => {
        const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(".props-tab-btn");
        if (!btn) return;
        const id = btn.dataset.tab as TabId;
        activeTab = id;
        tabs.dataset.activeTab = id;
        tabBar.querySelectorAll(".props-tab-btn").forEach(b => {
          b.classList.toggle("active", b === btn);
          b.setAttribute("aria-selected", String(b === btn));
        });
        tabBody.querySelectorAll<HTMLElement>(".props-tab-pane").forEach(pane => {
          const active = pane.dataset.tabPane === id;
          pane.hidden = !active;
        });
      });

      tabs.append(tabBar, tabBody);
      form.appendChild(tabs);
    }

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
