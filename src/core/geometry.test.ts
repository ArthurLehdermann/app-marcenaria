import { describe, it, expect } from "vitest";
import { panelBox, boxSize } from "./geometry";
import { collides, findCollisions, COLLISION_TOLERANCE } from "./collision";
import type { Panel, UpAxis } from "./types";

function makePanel(over: Partial<Panel> = {}): Panel {
  return {
    id: over.id ?? "p1",
    type: "",
    name: over.name ?? "painel",
    width: over.width ?? 720,
    height: over.height ?? 560,
    thickness: over.thickness ?? 18,
    position: over.position ?? { x: 0, y: 0, z: 0 },
    upAxis: over.upAxis ?? "y",
    edges: over.edges ?? { top: false, bottom: false, left: false, right: false },
    color: "#ccc",
    visible: true,
  };
}

describe("panelBox nos tres upAxis", () => {
  const dims = { width: 720, height: 560, thickness: 18 };

  it("y: em pe, dimensoes locais direto", () => {
    const b = panelBox(makePanel({ ...dims, upAxis: "y" }));
    expect(boxSize(b)).toEqual({ x: 720, y: 560, z: 18 });
  });

  it("x: troca X e Y, espessura fica em Z", () => {
    const b = panelBox(makePanel({ ...dims, upAxis: "x" }));
    expect(boxSize(b)).toEqual({ x: 560, y: 720, z: 18 });
  });

  it("z: deitado, espessura vira altura em Y", () => {
    const b = panelBox(makePanel({ ...dims, upAxis: "z" }));
    expect(boxSize(b)).toEqual({ x: 720, y: 18, z: 560 });
  });

  it("respeita position como canto min", () => {
    const b = panelBox(makePanel({ ...dims, position: { x: 100, y: 200, z: 300 } }));
    expect(b.min).toEqual({ x: 100, y: 200, z: 300 });
    expect(b.max).toEqual({ x: 820, y: 760, z: 318 });
  });
});

describe("collides com tolerancia", () => {
  it("encosto perfeito nao colide", () => {
    // duas laterais 18mm, base encostada exatamente na face
    const a = makePanel({ id: "a", width: 18, height: 720, thickness: 560, position: { x: 0, y: 0, z: 0 } });
    const b = makePanel({ id: "b", width: 18, height: 720, thickness: 560, position: { x: 18, y: 0, z: 0 } });
    // a ocupa x[0,18], b ocupa x[18,36]. overlap x = 0.
    expect(collides(a, b)).toBe(false);
  });

  it("sobreposicao abaixo da tolerancia nao colide", () => {
    const a = makePanel({ id: "a", width: 100, height: 100, thickness: 100, position: { x: 0, y: 0, z: 0 } });
    const b = makePanel({ id: "b", width: 100, height: 100, thickness: 100, position: { x: 100 - COLLISION_TOLERANCE, y: 0, z: 0 } });
    // overlap x = 0.5, nao passa do > tolerancia
    expect(collides(a, b)).toBe(false);
  });

  it("sobreposicao real colide", () => {
    const a = makePanel({ id: "a", width: 100, height: 100, thickness: 100, position: { x: 0, y: 0, z: 0 } });
    const b = makePanel({ id: "b", width: 100, height: 100, thickness: 100, position: { x: 50, y: 50, z: 50 } });
    expect(collides(a, b)).toBe(true);
  });

  it("sobreposicao em dois eixos so nao colide", () => {
    const a = makePanel({ id: "a", width: 100, height: 100, thickness: 100, position: { x: 0, y: 0, z: 0 } });
    // sobrepoe em X e Y mas separado em Z
    const b = makePanel({ id: "b", width: 100, height: 100, thickness: 100, position: { x: 50, y: 50, z: 200 } });
    expect(collides(a, b)).toBe(false);
  });
});

describe("findCollisions", () => {
  it("encontra so pares reais, sem duplicar", () => {
    const a = makePanel({ id: "a", width: 100, height: 100, thickness: 100, position: { x: 0, y: 0, z: 0 } });
    const b = makePanel({ id: "b", width: 100, height: 100, thickness: 100, position: { x: 50, y: 50, z: 50 } });
    const c = makePanel({ id: "c", width: 100, height: 100, thickness: 100, position: { x: 1000, y: 0, z: 0 } });
    const found = findCollisions([a, b, c]);
    expect(found).toHaveLength(1);
    expect(found[0]).toEqual({ a: "a", b: "b" });
  });
});
