import type { Project, UUID } from "../core/types";
import { pickPanel } from "../render/picking";
import type { setupSelectionDrag } from "../render/selectionDrag";
import { createDoubleTapHandler } from "../ui/doubleTap";
import { isMobileViewport } from "./mobileProps";
import type { Group, PerspectiveCamera } from "three";
import { Vector2 } from "three";

export function setupCanvasInput(deps: {
  canvas: HTMLCanvasElement;
  camera: PerspectiveCamera;
  meshMap: Map<UUID, Group>;
  getProject: () => Project;
  getSelectedIds: () => UUID[];
  isSpacePanActive: () => boolean;
  selectionDrag: ReturnType<typeof setupSelectionDrag>;
  onSelect: (id: UUID, additive: boolean) => void;
  onClearSelection: () => void;
  openMobileProps: () => void;
  closeMobileProps: () => void;
}) {
  const {
    canvas, camera, meshMap, getProject, getSelectedIds, isSpacePanActive,
    selectionDrag, onSelect, onClearSelection, openMobileProps, closeMobileProps,
  } = deps;

  const canvasDoubleTap = createDoubleTapHandler(() => openMobileProps());

  function pickPanelAt(clientX: number, clientY: number): UUID | null {
    const rect = canvas.getBoundingClientRect();
    const ndc = new Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    const id = pickPanel(ndc, camera, [...meshMap.values()]);
    if (!id) return null;
    return getProject().panels.find(p => p.id === id)?.visible ? id : null;
  }

  canvas.addEventListener("touchend", (e) => {
    if (!isMobileViewport() || isSpacePanActive()) return;
    if (e.changedTouches.length !== 1) return;
    const touch = e.changedTouches[0]!;
    const id = pickPanelAt(touch.clientX, touch.clientY);
    if (!id) return;
    if (canvasDoubleTap(id, touch.clientX, touch.clientY)) {
      e.preventDefault();
    }
  }, { passive: false });

  canvas.addEventListener("click", (e) => {
    if (isSpacePanActive() || selectionDrag.consumeClick()) return;
    const id = pickPanelAt(e.clientX, e.clientY);
    if (!id) {
      onClearSelection();
      closeMobileProps();
      return;
    }
    onSelect(id, e.shiftKey);
  });

  canvas.addEventListener("dblclick", (e) => {
    if (!isMobileViewport() || isSpacePanActive() || selectionDrag.consumeClick()) return;
    const id = pickPanelAt(e.clientX, e.clientY);
    if (!id || !getSelectedIds().includes(id)) return;
    e.preventDefault();
    openMobileProps();
  });
}
