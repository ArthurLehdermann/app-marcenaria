import { describe, it, expect } from "vitest";
import { facesCanSnap, snapDragDelta, SNAP_THRESHOLD_MM } from "./snap";
import { panelBox } from "./geometry";
import type { Panel, Project } from "./types";

function panel(over: Partial<Panel> & { id: string }): Panel {
  return {
    name: over.name ?? "P",
    width: over.width ?? 400,
    height: over.height ?? 600,
    thickness: over.thickness ?? 18,
    position: over.position ?? { x: 0, y: 0, z: 0 },
    upAxis: over.upAxis ?? "y",
    edges: over.edges ?? { top: false, bottom: false, left: false, right: false },
    color: "#fff",
    visible: over.visible ?? true,
    ...over,
  };
}

function project(panels: Panel[]): Project {
  return {
    id: "proj",
    name: "T",
    settings: { defaultMaterial: "MDF", defaultThickness: 18 },
    panels,
    groups: [],
    createdAt: "",
    updatedAt: "",
    appVersion: "1",
    schemaVersion: 2,
  };
}

describe("facesCanSnap", () => {
  it("aceita pecas lado a lado com sobreposicao em Y e Z", () => {
    const a = panelBox(panel({ id: "a", position: { x: 0, y: 0, z: 0 } }));
    const b = panelBox(panel({ id: "b", position: { x: 405, y: 0, z: 0 } }));
    expect(facesCanSnap(a, b)).toBe(true);
  });
});

describe("snapDragDelta", () => {
  it("nao altera delta quando desligado", () => {
    const p1 = panel({ id: "a", position: { x: 0, y: 0, z: 0 } });
    const p2 = panel({ id: "b", position: { x: 405, y: 0, z: 0 } });
    const delta = { x: -3, y: 0, z: 0 };
    expect(snapDragDelta(project([p1, p2]), ["b"], delta, false)).toEqual(delta);
  });

  it("cola face a face quando dentro do limiar", () => {
    const p1 = panel({ id: "a", position: { x: 0, y: 0, z: 0 } });
    const p2 = panel({ id: "b", position: { x: 405, y: 0, z: 0 } });
    const delta = { x: -3, y: 0, z: 0 };
    const snapped = snapDragDelta(project([p1, p2]), ["b"], delta, true);
    expect(snapped.x).toBeCloseTo(-5, 3);
    expect(snapped.y).toBe(0);
    expect(snapped.z).toBe(0);
  });

  it("nao magnetiza quando a distancia excede o limiar", () => {
    const p1 = panel({ id: "a", position: { x: 0, y: 0, z: 0 } });
    const p2 = panel({ id: "b", position: { x: 405 + SNAP_THRESHOLD_MM, y: 0, z: 0 } });
    const delta = { x: -1, y: 0, z: 0 };
    expect(snapDragDelta(project([p1, p2]), ["b"], delta, true)).toEqual(delta);
  });

  it("ignora pecas invisiveis como alvo", () => {
    const p1 = panel({ id: "a", position: { x: 0, y: 0, z: 0 } });
    const p2 = panel({ id: "b", position: { x: 405, y: 0, z: 0 }, visible: false });
    const p3 = panel({ id: "c", position: { x: 810, y: 0, z: 0 } });
    const delta = { x: -3, y: 0, z: 0 };
    expect(snapDragDelta(project([p1, p2, p3]), ["c"], delta, true)).toEqual(delta);
  });
});
