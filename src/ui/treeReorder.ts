import type { UUID } from "../core/types";
import type { DropPlace } from "../core/treeOrder";

const DRAG_THRESHOLD_PX = 6;

export function dropPlaceAtY(clientY: number, el: HTMLElement): DropPlace {
  const rect = el.getBoundingClientRect();
  return clientY < rect.top + rect.height / 2 ? "before" : "after";
}

export function findDropTargetAt(
  clientX: number,
  clientY: number,
  dragId: UUID,
): { el: HTMLElement; place: DropPlace } | null {
  const target = document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>("[data-drop-top-id]");
  if (!target) return null;
  const overId = target.dataset.dropTopId;
  if (!overId || overId === dragId) return null;
  return { el: target, place: dropPlaceAtY(clientY, target) };
}

export type TreeReorderCallbacks = {
  onReorderTopLevel(activeId: UUID, overId: UUID, place: DropPlace): void;
};

export function attachTreePointerReorder(
  container: HTMLElement,
  cbs: TreeReorderCallbacks,
) {
  let dragId: UUID | null = null;
  let dragging = false;
  let startX = 0;
  let startY = 0;

  function clearDraggingRow() {
    container.querySelectorAll(".tree-dragging")
      .forEach(n => n.classList.remove("tree-dragging"));
  }

  function clearDropMarkers() {
    container.querySelectorAll(".tree-drop-before, .tree-drop-after, .tree-dragging")
      .forEach(n => n.classList.remove("tree-drop-before", "tree-drop-after", "tree-dragging"));
  }

  function markDraggingRow(id: UUID) {
    const handle = container.querySelector<HTMLElement>(`.tree-drag-handle[data-drag-id="${id}"]`);
    handle?.closest(".tree-block, .tree-panel")?.classList.add("tree-dragging");
  }

  function detachWindowListeners() {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragId) return;
    if (!dragging) {
      if (Math.hypot(e.clientX - startX, e.clientY - startY) < DRAG_THRESHOLD_PX) return;
      dragging = true;
      markDraggingRow(dragId);
    }
    e.preventDefault();
    clearDropMarkers();
    if (dragging) markDraggingRow(dragId);
    const hit = findDropTargetAt(e.clientX, e.clientY, dragId);
    if (!hit) return;
    hit.el.classList.add(hit.place === "before" ? "tree-drop-before" : "tree-drop-after");
  }

  function onPointerUp(e: PointerEvent) {
    if (dragId && dragging) {
      const hit = findDropTargetAt(e.clientX, e.clientY, dragId);
      if (hit) {
        const overId = hit.el.dataset.dropTopId!;
        cbs.onReorderTopLevel(dragId, overId, hit.place);
      }
    }
    dragId = null;
    dragging = false;
    clearDropMarkers();
    detachWindowListeners();
  }

  function onPointerDown(e: PointerEvent) {
    const handle = (e.target as HTMLElement).closest<HTMLElement>(".tree-drag-handle");
    if (!handle || e.button !== 0) return;
    const id = handle.dataset.dragId;
    if (!id) return;

    e.preventDefault();
    e.stopPropagation();
    dragId = id;
    dragging = false;
    startX = e.clientX;
    startY = e.clientY;
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  }

  container.addEventListener("pointerdown", onPointerDown);
}
