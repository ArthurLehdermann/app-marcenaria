import { describe, it, expect } from "vitest";
import { MeshStandardMaterial } from "three";
import { applyHighlight } from "./highlight";
import { createPanelMesh, getPanelBody } from "./panelMesh";
import type { Panel } from "../core/types";

function makePanel(color = "#8888aa"): Panel {
  return {
    id: "p1", type: "", name: "p", width: 300, height: 200, thickness: 18,
    position: { x: 0, y: 0, z: 0 }, upAxis: "y",
    edges: { top: false, bottom: false, left: false, right: false },
    color, visible: true,
  };
}

describe("applyHighlight", () => {
  it("normal: restaura a cor do painel e emissive zero", () => {
    const panel = makePanel("#8888aa");
    const body = getPanelBody(createPanelMesh(panel));
    applyHighlight(body, "selected", panel.color);
    applyHighlight(body, "normal", panel.color);
    const mat = body.material as MeshStandardMaterial;
    expect(mat.color.getHexString()).toBe("8888aa");
    expect(mat.emissive.getHex()).toBe(0x000000);
  });

  it("selected: emissive nao e zero", () => {
    const panel = makePanel();
    const body = getPanelBody(createPanelMesh(panel));
    applyHighlight(body, "selected", panel.color);
    const mat = body.material as MeshStandardMaterial;
    expect(mat.emissive.getHex()).not.toBe(0x000000);
  });

  it("collision: cor principal vira vermelho", () => {
    const panel = makePanel();
    const body = getPanelBody(createPanelMesh(panel));
    applyHighlight(body, "collision", panel.color);
    const mat = body.material as MeshStandardMaterial;
    expect(mat.color.r).toBeGreaterThan(0.5);
    expect(mat.color.g).toBeLessThan(0.3);
    expect(mat.color.b).toBeLessThan(0.3);
  });

  it("highlight nao muta o material compartilhado do cache", () => {
    const panel = makePanel("#ff0000");
    const bodyA = getPanelBody(createPanelMesh(panel));
    const bodyB = getPanelBody(createPanelMesh({ ...panel, id: "p2" }));
    expect(bodyA.material).toBe(bodyB.material);

    applyHighlight(bodyA, "selected", panel.color);

    expect(bodyA.material).not.toBe(bodyB.material);
    const matB = bodyB.material as MeshStandardMaterial;
    expect(matB.emissive.getHex()).toBe(0x000000);
  });

  it("restaurar normal devolve o material do cache (sem clone desnecessario)", () => {
    const panel = makePanel("#aabbcc");
    const bodyA = getPanelBody(createPanelMesh(panel));
    const bodyB = getPanelBody(createPanelMesh({ ...panel, id: "p2" }));
    const sharedMat = bodyA.material;

    applyHighlight(bodyA, "selected", panel.color);
    applyHighlight(bodyA, "normal", panel.color);

    expect(bodyA.material).toBe(sharedMat);
    expect(bodyA.material).toBe(bodyB.material);
  });
});
