import { describe, it, expect } from "vitest";
import { PerspectiveCamera, Vector2 } from "three";
import { pickPanel } from "./picking";
import { createPanelMesh } from "./panelMesh";
import type { Panel } from "../core/types";

function makePanel(over: Partial<Panel> = {}): Panel {
  return {
    id: over.id ?? "p1", name: "p",
    width: 200, height: 200, thickness: 18,
    position: over.position ?? { x: -100, y: -100, z: -9 },
    upAxis: "y",
    edges: { top: false, bottom: false, left: false, right: false },
    color: "#ccc", visible: true,
  };
}

describe("pickPanel", () => {
  it("retorna null quando nenhum mesh e atingido", () => {
    const camera = new PerspectiveCamera(45, 1, 0.1, 100_000);
    camera.position.set(0, 0, 5000);
    camera.lookAt(0, 0, 0);
    const mesh = createPanelMesh(makePanel());
    // raio apontando para longe de qualquer painel
    const ndc = new Vector2(0.99, 0.99);
    expect(pickPanel(ndc, camera, [mesh])).toBeNull();
  });

  it("retorna panelId do mesh atingido pelo raio", () => {
    const camera = new PerspectiveCamera(45, 1, 0.1, 100_000);
    camera.position.set(0, 0, 5000);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    // painel centrado na origem (position = {-100,-100,-9} com 200x200x18 → centro em {0,0,0})
    const panel = makePanel({ id: "alvo", position: { x: -100, y: -100, z: -9 } });
    const mesh = createPanelMesh(panel);
    mesh.updateMatrixWorld(true);

    // raio no centro exato da tela
    const ndc = new Vector2(0, 0);
    expect(pickPanel(ndc, camera, [mesh])).toBe("alvo");
  });

  it("ignora mesh invisivel", () => {
    const camera = new PerspectiveCamera(45, 1, 0.1, 100_000);
    camera.position.set(0, 0, 5000);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    const mesh = createPanelMesh(makePanel({ id: "oculto" }));
    mesh.visible = false;
    mesh.updateMatrixWorld(true);

    expect(pickPanel(new Vector2(0, 0), camera, [mesh])).toBeNull();
  });

  it("retorna o painel mais proximo quando ha sobreposicao", () => {
    const camera = new PerspectiveCamera(45, 1, 0.1, 100_000);
    camera.position.set(0, 0, 5000);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    const front = makePanel({ id: "frente", position: { x: -100, y: -100, z: -9 } });
    const behind = makePanel({ id: "atras",  position: { x: -100, y: -100, z: -100 } });
    const meshFront = createPanelMesh(front);
    const meshBehind = createPanelMesh(behind);
    meshFront.updateMatrixWorld(true);
    meshBehind.updateMatrixWorld(true);

    const ndc = new Vector2(0, 0);
    expect(pickPanel(ndc, camera, [meshBehind, meshFront])).toBe("frente");
  });
});
