import { describe, it, expect } from "vitest";
import {
  closestPointsBetweenBoxes,
  buildGapEntities,
  findGapsForEntity,
  gapsForDisplay,
  isGapTargetOccluded,
  resolveSelectedGapEntity,
} from "./gaps";
import { panelBox } from "./geometry";
import type { Panel, PanelGroup, Project } from "./types";

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

function project(panels: Panel[], groups: PanelGroup[] = []): Project {
  return {
    id: "proj",
    name: "T",
    settings: { defaultMaterial: "MDF", defaultThickness: 18 },
    panels,
    groups,
    createdAt: "",
    updatedAt: "",
    appVersion: "1",
    schemaVersion: 2,
  };
}

describe("closestPointsBetweenBoxes", () => {
  it("mede folga entre extremidades em X", () => {
    const a = panelBox(panel({ id: "a", position: { x: 0, y: 0, z: 0 } }));
    const b = panelBox(panel({ id: "b", position: { x: 405, y: 0, z: 0 } }));
    const { distance, a: pA, b: pB } = closestPointsBetweenBoxes(a, b);
    expect(distance).toBeCloseTo(5, 3);
    expect(pA.x).toBeCloseTo(400, 3);
    expect(pB.x).toBeCloseTo(405, 3);
  });
});

describe("gaps com peças avulsas", () => {
  const p1 = panel({ id: "p1", position: { x: 405, y: 0, z: 0 } });
  const p2 = panel({ id: "p2", position: { x: 810, y: 0, z: 0 } });
  const p3 = panel({ id: "p3", position: { x: 810 + 400, y: 0, z: 0 } });
  const p4 = panel({ id: "p4", position: { x: 0, y: 0, z: 0 } });
  const proj = project([p4, p1, p2, p3]);

  it("mostra vizinhos mais próximos nos dois lados da selecionada", () => {
    const gaps = gapsForDisplay(proj, ["p1"]);
    const ids = gaps.map(g => g.toId).sort();
    expect(ids).toEqual(["p2", "p4"]);
  });

  it("oculta peça encostada atrás do vizinho mais próximo", () => {
    const gaps = gapsForDisplay(proj, ["p1"]);
    expect(gaps.some(g => g.toId === "p3")).toBe(false);
  });
});

describe("gaps com grupos", () => {
  const g1 = "g1";
  const p1 = panel({ id: "p1", groupId: g1, position: { x: 405, y: 0, z: 0 } });
  const p2 = panel({ id: "p2", groupId: g1, position: { x: 810, y: 0, z: 0 } });
  const p4 = panel({ id: "p4", position: { x: 0, y: 0, z: 0 } });
  const proj = project(
    [p4, p1, p2],
    [{ id: g1, name: "Bloco", memberOrder: ["p1", "p2"] }],
  );

  it("selecionar peça do grupo usa o bloco inteiro", () => {
    const entity = resolveSelectedGapEntity(proj, ["p1"]);
    expect(entity?.kind).toBe("group");
    expect(entity?.id).toBe(g1);
  });

  it("cota do bloco até peça avulsa, sem cotas internas", () => {
    const entities = buildGapEntities(proj);
    expect(entities).toHaveLength(2); // bloco + p4

    const gaps = gapsForDisplay(proj, ["p2"]);
    expect(gaps).toHaveLength(1);
    expect(gaps[0]!.toId).toBe("p4");
    expect(gaps[0]!.distance).toBeCloseTo(5, 1);
  });

  it("não mede peça avulsa contra peça dentro de grupo", () => {
    const entities = buildGapEntities(proj);
    const loose = entities.find(e => e.id === "p4")!;
    const block = entities.find(e => e.id === g1)!;
    const gaps = findGapsForEntity(loose, entities);
    expect(gaps.some(g => g.toId === g1)).toBe(true);
    expect(gaps.some(g => g.toId === "p1" || g.toId === "p2")).toBe(false);
  });

  it("isGapTargetOccluded entre entidades", () => {
    const entities = buildGapEntities(project([p4, p1, p2, panel({ id: "p3", position: { x: 1210, y: 0, z: 0 } })]));
    const selected = entities.find(e => e.id === "p1")!;
    const gapToP3 = {
      fromId: "p1",
      toId: "p3",
      from: { x: 0, y: 0, z: 0 },
      to: { x: 0, y: 0, z: 0 },
      distance: 999,
      direction: "x+" as const,
    };
    expect(isGapTargetOccluded(selected, gapToP3, entities)).toBe(true);
  });
});
