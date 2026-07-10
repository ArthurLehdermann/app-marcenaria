import type { Panel, PanelGroup, Project, UUID } from "../core/types";
import { panelsInGroup } from "../core/groups";
import {
  orderedGroupMembers,
  resolveTopLevelOrder,
  type DropPlace,
} from "../core/treeOrder";
import { createEdgeIndicator } from "./edgeIndicator";
import { attachTreePointerReorder } from "./treeReorder";

export type TreeCallbacks = {
  onSelect(id: UUID, additive: boolean, focusMember?: boolean): void;
  onSelectGroup(groupId: UUID): void;
  onVisibilityToggle(id: UUID, visible: boolean): void;
  onGroupVisibilityToggle(groupId: UUID, visible: boolean): void;
  onReorderTopLevel(activeId: UUID, overId: UUID, place: DropPlace): void;
  onOpenProps?: (id: UUID) => void;
};

const GRIP_ICON = `<svg class="tree-drag-icon" width="10" height="14" viewBox="0 0 10 14" fill="none" aria-hidden="true">
  <circle cx="2.5" cy="2.5" r="1.15" fill="currentColor"/>
  <circle cx="7.5" cy="2.5" r="1.15" fill="currentColor"/>
  <circle cx="2.5" cy="7" r="1.15" fill="currentColor"/>
  <circle cx="7.5" cy="7" r="1.15" fill="currentColor"/>
  <circle cx="2.5" cy="11.5" r="1.15" fill="currentColor"/>
  <circle cx="7.5" cy="11.5" r="1.15" fill="currentColor"/>
</svg>`;

function visibilityIcon(visible: boolean): string {
  if (visible) {
    return `<svg class="visibility-icon" width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M1.5 8s2.6-4.5 6.5-4.5S14.5 8 14.5 8s-2.6 4.5-6.5 4.5S1.5 8 1.5 8Z" stroke="currentColor" stroke-width="1.25"/>
      <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.25"/>
    </svg>`;
  }
  return `<svg class="visibility-icon" width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M1.5 8s2.6-4.5 6.5-4.5S14.5 8 14.5 8s-2.6 4.5-6.5 4.5S1.5 8 1.5 8Z" stroke="currentColor" stroke-width="1.25"/>
    <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.25"/>
    <path d="M2.5 2.5 13.5 13.5" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>
  </svg>`;
}

function propsIcon(): string {
  return `<svg class="props-icon" width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="8" cy="8" r="2.25" stroke="currentColor" stroke-width="1.25"/>
    <path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>
  </svg>`;
}

function createPropsButton(id: UUID, label: string, onOpen: (id: UUID) => void): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "props-btn";
  btn.setAttribute("aria-label", `Propriedades de ${label}`);
  btn.innerHTML = propsIcon();
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    onOpen(id);
  });
  return btn;
}

function formatPanelDims(p: Panel): string {
  return `${p.width} × ${p.height} × ${p.thickness}`;
}

function createDragHandle(id: UUID): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "tree-drag-handle";
  btn.dataset.dragScope = "top";
  btn.dataset.dragId = id;
  btn.setAttribute("aria-label", "Arrastar para reordenar");
  btn.innerHTML = GRIP_ICON;
  btn.addEventListener("click", e => e.stopPropagation());
  return btn;
}

function appendPanelRow(
  container: HTMLElement,
  p: Panel,
  selectedIds: Set<UUID>,
  collisionIds: Set<UUID> | undefined,
  cbs: TreeCallbacks,
  inGroup: boolean,
) {
  const item = document.createElement("div");
  item.dataset.panelId = p.id;
  item.className = inGroup ? "tree-panel group-member" : "tree-panel";
  item.setAttribute("aria-selected", String(selectedIds.has(p.id)));
  if (!p.visible) item.classList.add("hidden");
  if (collisionIds?.has(p.id)) item.classList.add("collision");
  if (!inGroup) item.dataset.dropTopId = p.id;

  if (!inGroup) item.appendChild(createDragHandle(p.id));

  item.appendChild(createEdgeIndicator(p));

  const label = document.createElement("span");
  label.className = "panel-label";
  const name = document.createElement("span");
  name.className = "panel-name";
  name.textContent = p.name;
  const dims = document.createElement("span");
  dims.className = "panel-dims";
  dims.textContent = formatPanelDims(p);
  label.appendChild(name);
  label.appendChild(dims);
  item.appendChild(label);

  if (cbs.onOpenProps) {
    item.appendChild(createPropsButton(p.id, p.name, cbs.onOpenProps));
  }

  const eye = document.createElement("button");
  eye.type = "button";
  eye.className = "visibility-btn";
  eye.setAttribute("aria-label", p.visible ? "Ocultar" : "Mostrar");
  eye.innerHTML = visibilityIcon(p.visible);
  eye.addEventListener("click", (e) => {
    e.stopPropagation();
    cbs.onVisibilityToggle(p.id, !p.visible);
  });
  item.appendChild(eye);

  item.addEventListener("click", (e) => {
    if (!p.visible) return;
    if ((e.target as HTMLElement).closest(".tree-drag-handle, .props-btn, .visibility-btn")) return;
    cbs.onSelect(p.id, e.shiftKey, inGroup);
  });

  if (cbs.onOpenProps) {
    item.addEventListener("dblclick", (e) => {
      if ((e.target as HTMLElement).closest(".tree-drag-handle, .props-btn, .visibility-btn")) return;
      e.preventDefault();
      cbs.onOpenProps!(p.id);
    });
  }
  container.appendChild(item);
}

function appendGroupBlock(
  container: HTMLElement,
  group: PanelGroup,
  members: Panel[],
  selectedIds: Set<UUID>,
  cbs: TreeCallbacks,
) {
  const block = document.createElement("div");
  block.className = "tree-block";
  block.dataset.dropTopId = group.id;

  const allSelected = members.every(m => selectedIds.has(m.id));
  const header = document.createElement("div");
  header.dataset.groupId = group.id;
  header.className = "tree-group";
  header.setAttribute("aria-selected", String(allSelected));

  header.appendChild(createDragHandle(group.id));

  const icon = document.createElement("span");
  icon.className = "group-icon";
  icon.textContent = "▦";
  header.appendChild(icon);

  const label = document.createElement("span");
  label.className = "group-name";
  label.textContent = group.name;
  header.appendChild(label);

  const count = document.createElement("span");
  count.className = "group-count";
  count.textContent = String(members.length);
  header.appendChild(count);

  if (cbs.onOpenProps) {
    header.appendChild(createPropsButton(group.id, group.name, cbs.onOpenProps));
  }

  const allVisible = members.every(m => m.visible);
  const eye = document.createElement("button");
  eye.type = "button";
  eye.className = "visibility-btn";
  eye.setAttribute("aria-label", allVisible ? "Ocultar grupo" : "Mostrar grupo");
  eye.innerHTML = visibilityIcon(allVisible);
  eye.addEventListener("click", (e) => {
    e.stopPropagation();
    cbs.onGroupVisibilityToggle(group.id, !allVisible);
  });
  header.appendChild(eye);

  header.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest(".tree-drag-handle, .props-btn, .visibility-btn")) return;
    cbs.onSelectGroup(group.id);
  });

  if (cbs.onOpenProps) {
    header.addEventListener("dblclick", (e) => {
      if ((e.target as HTMLElement).closest(".tree-drag-handle, .props-btn, .visibility-btn")) return;
      e.preventDefault();
      cbs.onOpenProps!(group.id);
    });
  }

  block.appendChild(header);

  const membersEl = document.createElement("div");
  membersEl.className = "tree-group-members";
  for (const p of members) {
    appendPanelRow(membersEl, p, selectedIds, undefined, cbs, true);
  }
  block.appendChild(membersEl);

  container.appendChild(block);
}

export function createPanelTree(container: HTMLElement, cbs: TreeCallbacks) {
  attachTreePointerReorder(container, cbs);

  function update(
    project: Project,
    selectedIds: UUID[],
    collisionIds?: Set<UUID>,
    groupPickMode = false,
  ) {
    container.innerHTML = "";
    if (groupPickMode) {
      const hint = document.createElement("div");
      hint.className = "tree-pick-hint";
      hint.textContent = "Shift+clique ou clique para marcar peças · Agrupar na barra";
      container.appendChild(hint);
    }

    const sel = new Set(selectedIds);
    const groupById = new Map(project.groups.map(g => [g.id, g]));
    const topOrder = resolveTopLevelOrder(project);

    for (const id of topOrder) {
      const group = groupById.get(id);
      if (group && panelsInGroup(project, group.id).length >= 2) {
        appendGroupBlock(
          container,
          group,
          orderedGroupMembers(project, group.id),
          sel,
          cbs,
        );
        continue;
      }

      const panel = project.panels.find(p => p.id === id);
      if (!panel) continue;
      const inRenderedGroup = panel.groupId
        && panelsInGroup(project, panel.groupId).length >= 2;
      if (inRenderedGroup) continue;

      const block = document.createElement("div");
      block.className = "tree-block tree-block--solo";
      block.dataset.dropTopId = panel.id;
      appendPanelRow(block, panel, sel, collisionIds, cbs, false);
      container.appendChild(block);
    }
  }

  return { update };
}
