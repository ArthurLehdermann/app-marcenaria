import type { Project, UUID } from "../core/types";
import { groupBBoxCenter, panelsInGroup } from "../core/groups";

export type GroupPropertiesCallbacks = {
  onRename(groupId: UUID, name: string): void;
  onMoveCenter(groupId: UUID, x: number, y: number, z: number): void;
  onDuplicate(groupId: UUID): void;
  onRotate(groupId: UUID): void;
  onUngroup(groupId: UUID): void;
  onDelete(groupId: UUID): void;
  onToggleVisibility(groupId: UUID, visible: boolean): void;
};

export function createGroupPropertiesPanel(container: HTMLElement, cbs: GroupPropertiesCallbacks) {
  function update(project: Project, groupId: UUID | null) {
    container.innerHTML = "";
    if (!groupId) return;
    const group = project.groups.find(g => g.id === groupId);
    const members = panelsInGroup(project, groupId);
    if (!group || members.length < 2) return;

    const center = groupBBoxCenter(members);
    const allVisible = members.every(p => p.visible);

    const form = document.createElement("div");
    form.dataset.groupForm = "";

    const header = document.createElement("div");
    header.className = "props-group-header";
    header.innerHTML = `
      <span class="props-group-icon" aria-hidden="true">▦</span>
      <div class="props-group-head-text">
        <span class="props-group-kicker">Bloco</span>
        <span class="props-group-meta">${members.length} peças · dimensões e fita bloqueadas</span>
      </div>`;
    form.appendChild(header);

    function field(label: string, name: string, value: string, type: string, onChange: (v: string) => void) {
      const wrap = document.createElement("label");
      wrap.textContent = label + " ";
      const input = document.createElement("input");
      input.name = name;
      input.type = type;
      input.value = value;
      const apply = () => onChange(input.value);
      input.addEventListener("change", apply);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          apply();
          input.blur();
        }
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

    field("Nome", "name", group.name, "text", v => cbs.onRename(groupId, v));

    sectionLabel("Centro do bloco (mm)");
    field("X", "pos_x", String(Math.round(center.x)), "number", v =>
      cbs.onMoveCenter(groupId, Number(v), center.y, center.z));
    field("Y", "pos_y", String(Math.round(center.y)), "number", v =>
      cbs.onMoveCenter(groupId, center.x, Number(v), center.z));
    field("Z", "pos_z", String(Math.round(center.z)), "number", v =>
      cbs.onMoveCenter(groupId, center.x, center.y, Number(v)));

    const visLabel = document.createElement("label");
    visLabel.className = "props-check";
    visLabel.textContent = "Visível ";
    const visCb = document.createElement("input");
    visCb.type = "checkbox";
    visCb.checked = allVisible;
    visCb.addEventListener("change", () => cbs.onToggleVisibility(groupId, visCb.checked));
    visLabel.appendChild(visCb);
    form.appendChild(visLabel);

    const actions = document.createElement("div");
    actions.className = "actions";
    const actionDefs: Array<[string, string, () => void]> = [
      ["duplicate", "Duplicar", () => cbs.onDuplicate(groupId)],
      ["rotate", "Girar 90°", () => cbs.onRotate(groupId)],
      ["ungroup", "Desagrupar", () => cbs.onUngroup(groupId)],
      ["delete", "Excluir bloco", () => cbs.onDelete(groupId)],
    ];
    for (const [action, label, fn] of actionDefs) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.action = action;
      btn.textContent = label;
      btn.addEventListener("click", fn);
      actions.appendChild(btn);
    }
    form.appendChild(actions);

    container.appendChild(form);
  }

  function syncPosition(pos: { x: number; y: number; z: number }) {
    if (!container.querySelector("[data-group-form]")) return;
    for (const [name, v] of [["pos_x", pos.x], ["pos_y", pos.y], ["pos_z", pos.z]] as const) {
      const input = container.querySelector<HTMLInputElement>(`[name='${name}']`);
      if (input && document.activeElement !== input) {
        input.value = String(Math.round(v));
      }
    }
  }

  return { update, syncPosition };
}
