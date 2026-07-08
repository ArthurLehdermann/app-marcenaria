import { describe, it, expect } from "vitest";
import { Group, Mesh } from "three";
import { createPanelMesh, updatePanelMesh, getPanelBody } from "./panelMesh";
import { panelBox, boxSize } from "../core/geometry";
import type { Panel } from "../core/types";

function makePanel(over: Partial<Panel> = {}): Panel {
  return {
    id: over.id ?? "p1",
    name: "painel",
    width: over.width ?? 720,
    height: over.height ?? 560,
    thickness: over.thickness ?? 18,
    position: over.position ?? { x: 0, y: 0, z: 0 },
    upAxis: over.upAxis ?? "y",
    edges: over.edges ?? { top: false, bottom: false, left: false, right: false },
    color: over.color ?? "#aabbcc",
    visible: true,
  };
}

describe("createPanelMesh", () => {
  it("retorna um Group com corpo e panelId", () => {
    const group = createPanelMesh(makePanel());
    expect(group).toBeInstanceOf(Group);
    expect(group.userData.panelId).toBe("p1");
    expect(getPanelBody(group)).toBeInstanceOf(Mesh);
  });

  it("geometria do corpo tem dimensoes do bounding box (upAxis y)", () => {
    const panel = makePanel({ width: 720, height: 560, thickness: 18, upAxis: "y" });
    const size = boxSize(panelBox(panel));
    const body = getPanelBody(createPanelMesh(panel));
    const geo = body.geometry as any;
    expect(geo.parameters.width).toBe(size.x);
    expect(geo.parameters.height).toBe(size.y);
    expect(geo.parameters.depth).toBe(size.z);
  });

  it("geometria do corpo tem dimensoes do bounding box (upAxis x, girado)", () => {
    const panel = makePanel({ width: 720, height: 560, thickness: 18, upAxis: "x" });
    const size = boxSize(panelBox(panel));
    const body = getPanelBody(createPanelMesh(panel));
    const geo = body.geometry as any;
    expect(geo.parameters.width).toBe(size.x);
    expect(geo.parameters.height).toBe(size.y);
    expect(geo.parameters.depth).toBe(size.z);
  });

  it("posicao do grupo e o centro do bounding box", () => {
    const panel = makePanel({ position: { x: 100, y: 200, z: 300 } });
    const box = panelBox(panel);
    const group = createPanelMesh(panel);
    expect(group.position.x).toBeCloseTo((box.min.x + box.max.x) / 2);
    expect(group.position.y).toBeCloseTo((box.min.y + box.max.y) / 2);
    expect(group.position.z).toBeCloseTo((box.min.z + box.max.z) / 2);
    expect(getPanelBody(group).position.x).toBeCloseTo(0);
  });

  it("mesma cor reutiliza o mesmo material (cache)", () => {
    const a = getPanelBody(createPanelMesh(makePanel({ id: "a", color: "#ff0000" })));
    const b = getPanelBody(createPanelMesh(makePanel({ id: "b", color: "#ff0000" })));
    expect(a.material).toBe(b.material);
  });

  it("cores diferentes geram materiais diferentes", () => {
    const a = getPanelBody(createPanelMesh(makePanel({ id: "a", color: "#ff0000" })));
    const b = getPanelBody(createPanelMesh(makePanel({ id: "b", color: "#00ff00" })));
    expect(a.material).not.toBe(b.material);
  });

  it("cria faixa de fita so nos lados marcados", () => {
    const group = createPanelMesh(makePanel({
      edges: { top: true, bottom: false, left: true, right: false },
    }));
    expect(group.getObjectByName("edge-top")).toBeTruthy();
    expect(group.getObjectByName("edge-left")).toBeTruthy();
    expect(group.getObjectByName("edge-bottom")).toBeFalsy();
    expect(group.getObjectByName("edge-right")).toBeFalsy();
  });
});

describe("updatePanelMesh", () => {
  it("atualiza posicao sem recriar o grupo", () => {
    const panel = makePanel({ position: { x: 0, y: 0, z: 0 } });
    const group = createPanelMesh(panel);
    const ref = group;

    const moved = { ...panel, position: { x: 500, y: 0, z: 0 } };
    updatePanelMesh(group, moved);

    expect(group).toBe(ref);
    const box = panelBox(moved);
    expect(group.position.x).toBeCloseTo((box.min.x + box.max.x) / 2);
  });

  it("troca geometria quando dimensoes mudam", () => {
    const panel = makePanel({ width: 720, height: 560, thickness: 18 });
    const group = createPanelMesh(panel);
    const geoBefore = getPanelBody(group).geometry;

    updatePanelMesh(group, { ...panel, width: 900 });

    const body = getPanelBody(group);
    expect(body.geometry).not.toBe(geoBefore);
    expect((body.geometry as any).parameters.width).toBe(900);
  });

  it("adiciona e remove faixas quando edges mudam", () => {
    const panel = makePanel({ edges: { top: false, bottom: false, left: false, right: false } });
    const group = createPanelMesh(panel);
    expect(group.getObjectByName("edge-top")).toBeFalsy();

    updatePanelMesh(group, { ...panel, edges: { top: true, bottom: false, left: false, right: false } });
    expect(group.getObjectByName("edge-top")).toBeTruthy();

    updatePanelMesh(group, { ...panel, edges: { top: false, bottom: false, left: false, right: false } });
    expect(group.getObjectByName("edge-top")).toBeFalsy();
  });
});
