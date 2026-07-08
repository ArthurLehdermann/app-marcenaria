import { describe, it, expect } from "vitest";
import { groupPieces, areaByThicknessM2 } from "./pieces";
import type { Panel } from "./types";

function makePanel(over: Partial<Panel> = {}): Panel {
  return {
    id: over.id ?? "p1",
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

const noEdge = { top: false, bottom: false, left: false, right: false };
const topEdge = { top: true, bottom: false, left: false, right: false };

describe("groupPieces", () => {
  it("pecas identicas geram qty > 1 e acumulam nomes", () => {
    const panels = [
      makePanel({ id: "a", name: "Lateral esq", width: 720, height: 560, thickness: 18, edges: noEdge }),
      makePanel({ id: "b", name: "Lateral dir", width: 720, height: 560, thickness: 18, edges: noEdge }),
    ];
    const groups = groupPieces(panels);
    expect(groups).toHaveLength(1);
    expect(groups[0].qty).toBe(2);
    expect(groups[0].names).toEqual(["Lateral esq", "Lateral dir"]);
  });

  it("dimensoes invertidas nao normalizam: 720x560 e 560x720 sao grupos diferentes", () => {
    const panels = [
      makePanel({ id: "a", width: 720, height: 560, thickness: 18, edges: noEdge }),
      makePanel({ id: "b", width: 560, height: 720, thickness: 18, edges: noEdge }),
    ];
    const groups = groupPieces(panels);
    expect(groups).toHaveLength(2);
  });

  it("mesmas dimensoes mas fita diferente geram grupos separados", () => {
    const panels = [
      makePanel({ id: "a", width: 720, height: 560, thickness: 18, edges: noEdge }),
      makePanel({ id: "b", width: 720, height: 560, thickness: 18, edges: topEdge }),
    ];
    const groups = groupPieces(panels);
    expect(groups).toHaveLength(2);
  });

  it("espessuras diferentes geram grupos separados", () => {
    const panels = [
      makePanel({ id: "a", width: 720, height: 560, thickness: 18, edges: noEdge }),
      makePanel({ id: "b", width: 720, height: 560, thickness: 6, edges: noEdge }),
    ];
    const groups = groupPieces(panels);
    expect(groups).toHaveLength(2);
    const t = groups.map(g => g.thickness).sort((a, b) => a - b);
    expect(t).toEqual([6, 18]);
  });

  it("tres pecas com duas identicas: dois grupos, qty correto", () => {
    const panels = [
      makePanel({ id: "a", name: "Prateleira 1", width: 600, height: 400, thickness: 15, edges: noEdge }),
      makePanel({ id: "b", name: "Base",         width: 720, height: 560, thickness: 18, edges: noEdge }),
      makePanel({ id: "c", name: "Prateleira 2", width: 600, height: 400, thickness: 15, edges: noEdge }),
    ];
    const groups = groupPieces(panels);
    expect(groups).toHaveLength(2);
    const prat = groups.find(g => g.width === 600)!;
    expect(prat.qty).toBe(2);
    expect(prat.names).toContain("Prateleira 1");
    expect(prat.names).toContain("Prateleira 2");
  });

  it("peca oculta entra no agrupamento normalmente", () => {
    const panels = [
      makePanel({ id: "a", width: 720, height: 560, thickness: 18, edges: noEdge }),
      makePanel({ id: "b", width: 720, height: 560, thickness: 18, edges: noEdge, visible: false }),
    ];
    const groups = groupPieces(panels);
    expect(groups).toHaveLength(1);
    expect(groups[0].qty).toBe(2);
  });
});

describe("areaByThicknessM2", () => {
  it("area de uma peca em m2", () => {
    const panels = [makePanel({ width: 1000, height: 1000, thickness: 18 })];
    const area = areaByThicknessM2(panels);
    expect(area.get(18)).toBeCloseTo(1.0);
  });

  it("acumula area por espessura separadamente", () => {
    const panels = [
      makePanel({ id: "a", width: 1000, height: 1000, thickness: 18 }),
      makePanel({ id: "b", width: 1000, height: 500, thickness: 18 }),
      makePanel({ id: "c", width: 1000, height: 1000, thickness: 6 }),
    ];
    const area = areaByThicknessM2(panels);
    expect(area.get(18)).toBeCloseTo(1.5);
    expect(area.get(6)).toBeCloseTo(1.0);
    expect(area.size).toBe(2);
  });
});
