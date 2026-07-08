import { describe, it, expect } from "vitest";
import { Mesh, MeshStandardMaterial, Color } from "three";
import { applyHighlight } from "./highlight";
import { createPanelMesh } from "./panelMesh";
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
    const mesh = createPanelMesh(panel);
    applyHighlight(mesh, "selected", panel.color);
    applyHighlight(mesh, "normal", panel.color);
    const mat = mesh.material as MeshStandardMaterial;
    expect(mat.color.getHexString()).toBe("8888aa");
    expect(mat.emissive.getHex()).toBe(0x000000);
  });

  it("selected: emissive nao e zero", () => {
    const panel = makePanel();
    const mesh = createPanelMesh(panel);
    applyHighlight(mesh, "selected", panel.color);
    const mat = mesh.material as MeshStandardMaterial;
    expect(mat.emissive.getHex()).not.toBe(0x000000);
  });

  it("collision: cor principal vira vermelho", () => {
    const panel = makePanel();
    const mesh = createPanelMesh(panel);
    applyHighlight(mesh, "collision", panel.color);
    const mat = mesh.material as MeshStandardMaterial;
    // vermelho: R alto, G e B baixos
    const r = mat.color.r;
    const g = mat.color.g;
    const b = mat.color.b;
    expect(r).toBeGreaterThan(0.5);
    expect(g).toBeLessThan(0.3);
    expect(b).toBeLessThan(0.3);
  });

  it("highlight nao muta o material compartilhado do cache", () => {
    const panel = makePanel("#ff0000");
    const meshA = createPanelMesh(panel);
    const meshB = createPanelMesh({ ...panel, id: "p2" });
    // ambos compartilham o mesmo material
    expect(meshA.material).toBe(meshB.material);

    applyHighlight(meshA, "selected", panel.color);

    // depois do highlight, meshA tem material proprio (clonado)
    expect(meshA.material).not.toBe(meshB.material);
    // meshB continua com o material original intocado
    const matB = meshB.material as MeshStandardMaterial;
    expect(matB.emissive.getHex()).toBe(0x000000);
  });

  it("restaurar normal devolve o material do cache (sem clone desnecessario)", () => {
    const panel = makePanel("#aabbcc");
    const meshA = createPanelMesh(panel);
    const meshB = createPanelMesh({ ...panel, id: "p2" });
    const sharedMat = meshA.material;

    applyHighlight(meshA, "selected", panel.color);
    applyHighlight(meshA, "normal", panel.color);

    // restaurado: volta a compartilhar o material do cache com meshB
    expect(meshA.material).toBe(sharedMat);
    expect(meshA.material).toBe(meshB.material);
  });
});
