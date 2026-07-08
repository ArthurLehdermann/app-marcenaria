// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { PerspectiveCamera, Vector3 } from "three";
import { isMoveModifier, screenPixelsToViewDelta } from "./screenDragDelta";

describe("isMoveModifier", () => {
  it("aceita Ctrl ou Command", () => {
    expect(isMoveModifier({ ctrlKey: true, metaKey: false })).toBe(true);
    expect(isMoveModifier({ ctrlKey: false, metaKey: true })).toBe(true);
    expect(isMoveModifier({ ctrlKey: false, metaKey: false })).toBe(false);
  });
});

describe("screenPixelsToViewDelta", () => {
  function canvas() {
    const el = document.createElement("canvas");
    el.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 400, height: 300, right: 400, bottom: 300, x: 0, y: 0, toJSON: () => ({}) } as DOMRect);
    return el;
  }

  it("de frente: arrasto vertical altera Y e nao Z", () => {
    const cam = new PerspectiveCamera(45, 4 / 3, 1, 100_000);
    cam.position.set(0, 400, 1200);
    cam.lookAt(0, 400, 0);
    cam.updateProjectionMatrix();

    const delta = screenPixelsToViewDelta(0, -40, cam, canvas(), { x: 0, y: 400, z: 0 });
    expect(Math.abs(delta.y)).toBeGreaterThan(1);
    expect(Math.abs(delta.z)).toBeLessThan(0.5);
  });

  it("de cima: arrasto vertical altera Z e nao Y", () => {
    const cam = new PerspectiveCamera(45, 4 / 3, 1, 100_000);
    cam.position.set(0, 1500, 0);
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();

    const delta = screenPixelsToViewDelta(0, -40, cam, canvas(), { x: 0, y: 0, z: 0 });
    expect(Math.abs(delta.z)).toBeGreaterThan(1);
    expect(Math.abs(delta.y)).toBeLessThan(0.5);
  });

  it("remove componente de profundidade", () => {
    const cam = new PerspectiveCamera(45, 4 / 3, 1, 100_000);
    cam.position.set(500, 800, 500);
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();

    const delta = screenPixelsToViewDelta(20, -15, cam, canvas(), { x: 0, y: 0, z: 0 });
    const forward = new Vector3();
    cam.getWorldDirection(forward);
    const depth = delta.x * forward.x + delta.y * forward.y + delta.z * forward.z;
    expect(Math.abs(depth)).toBeLessThan(0.01);
  });
});
