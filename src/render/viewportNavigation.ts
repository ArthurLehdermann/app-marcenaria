import { MOUSE, TOUCH } from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable === true;
}

/** Espaço + arrastar = pan; mobile: 1 dedo orbita, 2 dedos move/zoom. */
export function setupViewportNavigation(
  canvas: HTMLCanvasElement,
  controls: OrbitControls,
): { isSpacePanActive: () => boolean; dispose: () => void } {
  const defaultMouseLeft = controls.mouseButtons.LEFT;
  let spacePan = false;
  let pointerPan = false;

  controls.enablePan = true;
  controls.screenSpacePanning = true;
  controls.mouseButtons.MIDDLE = MOUSE.DOLLY;
  controls.mouseButtons.RIGHT = MOUSE.PAN;
  controls.touches.ONE = TOUCH.ROTATE;
  controls.touches.TWO = TOUCH.DOLLY_PAN;

  function setSpacePan(active: boolean) {
    if (spacePan === active) return;
    spacePan = active;
    controls.mouseButtons.LEFT = active ? MOUSE.PAN : defaultMouseLeft;
    canvas.classList.toggle("viewport-pan-mode", active);
    if (!active && !pointerPan) canvas.style.cursor = "";
    else if (active) canvas.style.cursor = pointerPan ? "grabbing" : "grab";
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.code !== "Space" || e.repeat) return;
    if (isTypingTarget(e.target)) return;
    e.preventDefault();
    setSpacePan(true);
  }

  function onKeyUp(e: KeyboardEvent) {
    if (e.code !== "Space") return;
    setSpacePan(false);
  }

  function onWindowBlur() {
    setSpacePan(false);
    pointerPan = false;
  }

  function onPointerDown(e: PointerEvent) {
    if (!spacePan || e.button !== 0) return;
    pointerPan = true;
    canvas.style.cursor = "grabbing";
  }

  function onPointerUp() {
    pointerPan = false;
    if (spacePan) canvas.style.cursor = "grab";
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onWindowBlur);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);

  return {
    isSpacePanActive: () => spacePan,
    dispose: () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onWindowBlur);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      setSpacePan(false);
    },
  };
}
