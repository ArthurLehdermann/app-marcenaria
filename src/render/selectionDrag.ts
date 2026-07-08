import type { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { PerspectiveCamera } from "three";
import type { UUID, Vec3 } from "../core/types";
import { isTypingTarget } from "./viewportNavigation";
import { isMoveModifier, screenPixelsToViewDelta } from "./screenDragDelta";

const DRAG_THRESHOLD_PX = 3;

export type SelectionDragOptions = {
  canvas: HTMLCanvasElement;
  camera: PerspectiveCamera;
  controls: OrbitControls;
  isSpacePanActive: () => boolean;
  getSelectedPanelIds: () => UUID[];
  getAnchorPoint: (panelIds: UUID[]) => Vec3;
  onTranslate: (panelIds: UUID[], delta: Vec3) => void;
  onDragEnd: () => void;
};

export function setupSelectionDrag(opts: SelectionDragOptions) {
  const {
    canvas, camera, controls, isSpacePanActive,
    getSelectedPanelIds, getAnchorPoint, onTranslate, onDragEnd,
  } = opts;

  let dragging = false;
  let panelIds: UUID[] = [];
  let anchor: Vec3 = { x: 0, y: 0, z: 0 };
  let lastClientX = 0;
  let lastClientY = 0;
  let pointerId: number | null = null;
  let startClientX = 0;
  let startClientY = 0;
  let moved = false;
  let suppressClick = false;
  let modifierHeld = false;
  let touchMoveMode = false;

  function hasSelection() {
    return getSelectedPanelIds().length > 0;
  }

  function wantsMove(e: PointerEvent): boolean {
    return isMoveModifier(e) || touchMoveMode;
  }

  function moveModeVisual(): boolean {
    return hasSelection() && !isSpacePanActive() && (modifierHeld || touchMoveMode);
  }

  function updateCursor() {
    const show = moveModeVisual();
    canvas.classList.toggle("viewport-move-mode", show);
    if (!dragging && show) canvas.style.cursor = "move";
    else if (!dragging && !show && !isSpacePanActive()) canvas.style.cursor = "";
  }

  function setTouchMoveMode(active: boolean) {
    touchMoveMode = active;
    if (!active) endDrag();
    updateCursor();
  }

  function onModifierDown(e: KeyboardEvent) {
    if (e.key !== "Control" && e.key !== "Meta") return;
    if (isTypingTarget(e.target)) return;
    modifierHeld = true;
    updateCursor();
  }

  function onModifierUp(e: KeyboardEvent) {
    if (e.key !== "Control" && e.key !== "Meta") return;
    modifierHeld = false;
    updateCursor();
  }

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    pointerId = null;
    controls.enabled = true;
    canvas.classList.remove("viewport-dragging");
    if (moved) {
      suppressClick = true;
      onDragEnd();
    }
    moved = false;
    updateCursor();
  }

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    if (!wantsMove(e) || isSpacePanActive()) return;
    if (isTypingTarget(e.target)) return;

    panelIds = getSelectedPanelIds();
    if (!panelIds.length) return;

    e.preventDefault();
    e.stopPropagation();

    dragging = true;
    moved = false;
    pointerId = e.pointerId;
    anchor = getAnchorPoint(panelIds);
    lastClientX = e.clientX;
    lastClientY = e.clientY;
    startClientX = e.clientX;
    startClientY = e.clientY;
    controls.enabled = false;
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add("viewport-dragging");
    canvas.style.cursor = "move";
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging || e.pointerId !== pointerId) return;

    const totalDx = e.clientX - startClientX;
    const totalDy = e.clientY - startClientY;
    if (!moved) {
      if (Math.hypot(totalDx, totalDy) < DRAG_THRESHOLD_PX) return;
      moved = true;
    }

    const dx = e.clientX - lastClientX;
    const dy = e.clientY - lastClientY;
    lastClientX = e.clientX;
    lastClientY = e.clientY;

    const delta = screenPixelsToViewDelta(dx, dy, camera, canvas, anchor);
    if (delta.x !== 0 || delta.y !== 0 || delta.z !== 0) onTranslate(panelIds, delta);
  }

  function onPointerUp(e: PointerEvent) {
    if (e.pointerId !== pointerId) return;
    if (canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
    endDrag();
  }

  function onBlur() {
    modifierHeld = false;
    if (dragging && pointerId !== null && canvas.hasPointerCapture(pointerId)) {
      canvas.releasePointerCapture(pointerId);
    }
    endDrag();
    updateCursor();
  }

  window.addEventListener("keydown", onModifierDown);
  window.addEventListener("keyup", onModifierUp);
  window.addEventListener("blur", onBlur);
  canvas.addEventListener("pointerdown", onPointerDown, { capture: true });
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);

  return {
    consumeClick: () => {
      if (!suppressClick) return false;
      suppressClick = false;
      return true;
    },
    isTouchMoveMode: () => touchMoveMode,
    setTouchMoveMode,
    toggleTouchMoveMode: () => setTouchMoveMode(!touchMoveMode),
    canTouchMove: () => hasSelection(),
    notifySelectionChange: () => {
      if (touchMoveMode && !hasSelection()) setTouchMoveMode(false);
      updateCursor();
    },
    dispose: () => {
      window.removeEventListener("keydown", onModifierDown);
      window.removeEventListener("keyup", onModifierUp);
      window.removeEventListener("blur", onBlur);
      canvas.removeEventListener("pointerdown", onPointerDown, { capture: true });
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      endDrag();
      touchMoveMode = false;
      canvas.classList.remove("viewport-move-mode", "viewport-dragging");
    },
  };
}
