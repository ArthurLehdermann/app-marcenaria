import type { Panel, PanelGroup, Project, UUID } from "../core/types";
import { panelsInGroup } from "../core/groups";
import {
  orderedGroupMembers,
  resolveTopLevelOrder,
  type DropPlace,
} from "../core/treeOrder";
import { createEdgeIndicator } from "./edgeIndicator";
import { createDoubleTapHandler } from "./doubleTap";

export type TreeCallbacks = {
  onSelect(id: UUID, additive: boolean): void;
  onSelectGroup(groupId: UUID): void;
  onVisibilityToggle(id: UUID, visible: boolean): void;
  onGroupVisibilityToggle(groupId: UUID, visible: boolean): void;
  onReorderTopLevel(activeId: UUID, overId: UUID, place: DropPlace): void;
  onOpenProps?: () => void;
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

function createDragHandle(id: UUID): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "tree-drag-handle";
  btn.draggable = true;
  btn.dataset.dragScope = "top";
  btn.dataset.dragId = id;
  btn.setAttribute("aria-label", "Arrastar para reordenar");
  btn.innerHTML = GRIP_ICON;
  btn.addEventListener("click", e => e.stopPropagation());
  btn.addEventListener("mousedown", e => e.stopPropagation());
  return btn;
}

function appendPanelRow(
  container: HTMLElement,
  p: Panel,
  selectedIds: Set<UUID>,
  collisionIds: Set<UUID> | undefined,
  cbs: TreeCallbacks,
  inGroup: boolean,
  registerDoubleTap: ((key: string, x: number, y: number) => boolean) | null,
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
  label.className = "panel-name";
  label.textContent = p.name;
  item.appendChild(label);

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
    if ((e.target as HTMLElement).closest(".tree-drag-handle")) return;
    if (registerDoubleTap?.(p.id, e.clientX, e.clientY)) return;
    cbs.onSelect(p.id, e.shiftKey);
  });
  container.appendChild(item);
}

function appendGroupBlock(
  container: HTMLElement,
  group: PanelGroup,
  members: Panel[],
  selectedIds: Set<UUID>,
  cbs: TreeCallbacks,
  registerDoubleTap: ((key: string, x: number, y: number) => boolean) | null,
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
    if ((e.target as HTMLElement).closest(".tree-drag-handle")) return;
    if (registerDoubleTap?.(group.id, e.clientX, e.clientY)) return;
    cbs.onSelectGroup(group.id);
  });
  block.appendChild(header);

  const membersEl = document.createElement("div");
  membersEl.className = "tree-group-members";
  for (const p of members) {
    appendPanelRow(membersEl, p, selectedIds, undefined, cbs, true, registerDoubleTap);
  }
  block.appendChild(membersEl);

  container.appendChild(block);
}

type DragPayload = { id: UUID };

function dropPlaceAt(event: DragEvent, el: HTMLElement): DropPlace {
  const rect = el.getBoundingClientRect();
  return event.clientY < rect.top + rect.height / 2 ? "before" : "after";
}

function clearDropMarkers(root: HTMLElement) {
  root.querySelectorAll(".tree-drop-before, .tree-drop-after, .tree-dragging")
    .forEach(n => n.classList.remove("tree-drop-before", "tree-drop-after", "tree-dragging"));
}

function attachTreeDnD(container: HTMLElement, cbs: TreeCallbacks) {
  let payload: DragPayload | null = null;

  container.addEventListener("dragstart", (e) => {
    const handle = (e.target as HTMLElement).closest<HTMLElement>(".tree-drag-handle");
    if (!handle) return;
    const id = handle.dataset.dragId;
    if (!id) return;

    payload = { id };
    e.dataTransfer!.effectAllowed = "move";
    e.dataTransfer!.setData("text/plain", id);

    const row = handle.closest(".tree-block, .tree-panel");
    row?.classList.add("tree-dragging");
  });

  container.addEventListener("dragend", () => {
    payload = null;
    clearDropMarkers(container);
  });

  container.addEventListener("dragover", (e) => {
    if (!payload) return;
    e.preventDefault();
    e.dataTransfer!.dropEffect = "move";
    clearDropMarkers(container);

    const target = (e.target as HTMLElement).closest<HTMLElement>("[data-drop-top-id]");
    if (!target) return;

    const targetId = target.dataset.dropTopId;
    if (!targetId || targetId === payload.id) return;

    target.classList.add(dropPlaceAt(e, target) === "before" ? "tree-drop-before" : "tree-drop-after");
  });

  container.addEventListener("dragleave", (e) => {
    if (!(e.target as HTMLElement).closest("#panel-tree, #m-panel-tree, [data-panel-id], .tree-block")) {
      clearDropMarkers(container);
    }
  });

  container.addEventListener("drop", (e) => {
    e.preventDefault();
    if (!payload) return;

    const target = (e.target as HTMLElement).closest<HTMLElement>("[data-drop-top-id]");
    if (!target) return;

    const overId = target.dataset.dropTopId;
    if (!overId || overId === payload.id) return;

    cbs.onReorderTopLevel(payload.id, overId, dropPlaceAt(e, target));

    payload = null;
    clearDropMarkers(container);
  });
}

export function createPanelTree(container: HTMLElement, cbs: TreeCallbacks) {
  attachTreeDnD(container, cbs);
  const registerDoubleTap = cbs.onOpenProps
    ? createDoubleTapHandler(() => cbs.onOpenProps!())
    : null;

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
          registerDoubleTap,
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
      appendPanelRow(block, panel, sel, collisionIds, cbs, false, registerDoubleTap);
      container.appendChild(block);
    }
  }

  return { update };
}
