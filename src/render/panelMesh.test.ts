import { describe, it, expect } from "vitest";
import { Mesh } from "three";
import { createPanelMesh, updateMeshTransform } from "./panelMesh";
import { panelBox, boxSize } from "../core/geometry";
import type { Panel } from "../core/types";

function makePanel(over: Partial<Panel> = {}): Panel {
  return {
    id: over.id ?? "p1",
    type: "",
    name: "painel",
    width: over.width ?? 720,
    height: over.height ?? 560,
    thickness: over.thickness ?? 18,
    position: over.position ?? { x: 0, y: 0, z: 0 },
    upAxis: over.upAxis ?? "y",
    edges: { top: false, bottom: false, left: false, right: false },
    color: over.color ?? "#aabbcc",
    visible: true,
  };
}

describe("createPanelMesh", () => {
  it("retorna um Mesh", () => {
    const mesh = createPanelMesh(makePanel());
    expect(mesh).toBeInstanceOf(Mesh);
  });

  it("geometria tem dimensoes do bounding box (upAxis y)", () => {
    const panel = makePanel({ width: 720, height: 560, thickness: 18, upAxis: "y" });
    const size = boxSize(panelBox(panel));
    const mesh = createPanelMesh(panel);
    const geo = mesh.geometry as any;
    expect(geo.parameters.width).toBe(size.x);   // 720
    expect(geo.parameters.height).toBe(size.y);  // 560
    expect(geo.parameters.depth).toBe(size.z);   // 18
  });

  it("geometria tem dimensoes do bounding box (upAxis x, girado)", () => {
    const panel = makePanel({ width: 720, height: 560, thickness: 18, upAxis: "x" });
    const size = boxSize(panelBox(panel));
    const mesh = createPanelMesh(panel);
    const geo = mesh.geometry as any;
    expect(geo.parameters.width).toBe(size.x);   // 560
    expect(geo.parameters.height).toBe(size.y);  // 720
    expect(geo.parameters.depth).toBe(size.z);   // 18
  });

  it("posicao do mesh e o centro do bounding box", () => {
    const panel = makePanel({ position: { x: 100, y: 200, z: 300 } });
    const box = panelBox(panel);
    const mesh = createPanelMesh(panel);
    expect(mesh.position.x).toBeCloseTo((box.min.x + box.max.x) / 2);
    expect(mesh.position.y).toBeCloseTo((box.min.y + box.max.y) / 2);
    expect(mesh.position.z).toBeCloseTo((box.min.z + box.max.z) / 2);
  });

  it("userData.panelId guarda o id do painel", () => {
    const mesh = createPanelMesh(makePanel({ id: "abc-123" }));
    expect(mesh.userData.panelId).toBe("abc-123");
  });

  it("mesma cor reutiliza o mesmo material (cache)", () => {
    const a = createPanelMesh(makePanel({ id: "a", color: "#ff0000" }));
    const b = createPanelMesh(makePanel({ id: "b", color: "#ff0000" }));
    expect(a.material).toBe(b.material);
  });

  it("cores diferentes geram materiais diferentes", () => {
    const a = createPanelMesh(makePanel({ id: "a", color: "#ff0000" }));
    const b = createPanelMesh(makePanel({ id: "b", color: "#00ff00" }));
    expect(a.material).not.toBe(b.material);
  });

  it("mesmas dimensoes reutilizam a mesma geometria (cache)", () => {
    const a = createPanelMesh(makePanel({ id: "a", width: 600, height: 400, thickness: 15, upAxis: "y" }));
    const b = createPanelMesh(makePanel({ id: "b", width: 600, height: 400, thickness: 15, upAxis: "y" }));
    expect(a.geometry).toBe(b.geometry);
  });
});

describe("updateMeshTransform", () => {
  it("atualiza posicao sem recriar o mesh", () => {
    const panel = makePanel({ position: { x: 0, y: 0, z: 0 } });
    const mesh = createPanelMesh(panel);
    const ref = mesh;

    const moved = { ...panel, position: { x: 500, y: 0, z: 0 } };
    updateMeshTransform(mesh, moved);

    expect(mesh).toBe(ref); // mesmo objeto
    const box = panelBox(moved);
    expect(mesh.position.x).toBeCloseTo((box.min.x + box.max.x) / 2);
  });

  it("troca geometria quando dimensoes mudam", () => {
    const panel = makePanel({ width: 720, height: 560, thickness: 18 });
    const mesh = createPanelMesh(panel);
    const geoBefore = mesh.geometry;

    const resized = { ...panel, width: 900 };
    updateMeshTransform(mesh, resized);

    expect(mesh.geometry).not.toBe(geoBefore);
    expect((mesh.geometry as any).parameters.width).toBe(900);
  });

  it("mantem geometria quando dimensoes nao mudam", () => {
    const panel = makePanel();
    const mesh = createPanelMesh(panel);
    const geoBefore = mesh.geometry;
    updateMeshTransform(mesh, { ...panel, position: { x: 10, y: 0, z: 0 } });
    expect(mesh.geometry).toBe(geoBefore);
  });
});
