import { describe, it, expect } from "vitest";
import {
  edgeStripWorldBox,
  edgeBandGroupLocal,
  edgeBandFaceMm,
  edgeBandOutsideBody,
  boxCenter,
} from "./panelEdges";
import { boxSize, panelBox } from "../core/geometry";
import type { Panel } from "../core/types";

function makePanel(over: Partial<Panel> = {}): Panel {
  return {
    id: "p1", type: "", name: "p",
    width: over.width ?? 720,
    height: over.height ?? 560,
    thickness: over.thickness ?? 18,
    position: over.position ?? { x: 0, y: 0, z: 0 },
    upAxis: over.upAxis ?? "y",
    edges: { top: false, bottom: false, left: false, right: false },
    color: "#ccc", visible: true,
  };
}

describe("edgeBandOutsideBody", () => {
  it("em pe: fita sup fica acima do corpo", () => {
    const panel = makePanel({ upAxis: "y" });
    expect(edgeBandOutsideBody(panel, "top")).toBe(true);
    const body = panelBox(panel);
    const band = edgeStripWorldBox(panel, "top");
    expect(band.min.y).toBeGreaterThanOrEqual(body.max.y - 0.1);
  });

  it("lateral: fita dir fica alem do max Z", () => {
    const panel = makePanel({ width: 600, height: 760, thickness: 18, upAxis: "x" });
    expect(edgeBandOutsideBody(panel, "right")).toBe(true);
    const body = panelBox(panel);
    const band = edgeStripWorldBox(panel, "right");
    expect(band.min.z).toBeGreaterThanOrEqual(body.max.z - 0.1);
  });

  it("deitado: fita inf fica abaixo do corpo", () => {
    const panel = makePanel({ upAxis: "z" });
    const body = panelBox(panel);
    const band = edgeStripWorldBox(panel, "bottom");
    expect(band.max.z).toBeLessThanOrEqual(body.min.z + 0.1);
  });
});

describe("edgeBandGroupLocal", () => {
  it("lateral: fita dir no max Z do grupo", () => {
    const panel = makePanel({ width: 600, height: 760, thickness: 18, upAxis: "x" });
    const hz = boxSize(panelBox(panel)).z / 2;
    const f = edgeBandFaceMm(18);
    const band = edgeBandGroupLocal(panel, "right");
    expect(band.center.z).toBeGreaterThan(hz);
    expect(band.center.z).toBeCloseTo(hz + f / 2 + 0.6, 0);
  });

  it("em pe: fita esq no min X do grupo", () => {
    const panel = makePanel({ upAxis: "y" });
    const hx = boxSize(panelBox(panel)).x / 2;
    const band = edgeBandGroupLocal(panel, "left");
    expect(band.center.x).toBeLessThan(-hx);
  });
});

describe("boxCenter", () => {
  it("retorna centro da caixa", () => {
    const c = boxCenter({ min: { x: 0, y: 0, z: 0 }, max: { x: 100, y: 200, z: 20 } });
    expect(c).toEqual({ x: 50, y: 100, z: 10 });
  });
});

describe("edgeBandFaceMm", () => {
  it("fica entre 2.5 e 5 mm", () => {
    expect(edgeBandFaceMm(18)).toBeGreaterThanOrEqual(2.5);
    expect(edgeBandFaceMm(18)).toBeLessThanOrEqual(5);
  });
});
