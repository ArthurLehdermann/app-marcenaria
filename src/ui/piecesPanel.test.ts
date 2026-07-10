// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { createPiecesPanel } from "./piecesPanel";
import type { Panel } from "../core/types";

function makePanel(over: Partial<Panel> = {}): Panel {
  return {
    id: over.id ?? "p1", name: over.name ?? "p",
    width: over.width ?? 720, height: over.height ?? 560, thickness: over.thickness ?? 18,
    position: { x: 0, y: 0, z: 0 }, upAxis: "y",
    edges: { top: false, bottom: false, left: false, right: false },
    color: "#ccc", visible: true,
  };
}

describe("createPiecesPanel", () => {
  it("renderiza uma linha por grupo", () => {
    const el = document.createElement("div");
    const pp = createPiecesPanel(el);
    pp.update([
      makePanel({ id: "a", width: 720, height: 560, thickness: 18 }),
      makePanel({ id: "b", width: 300, height: 200, thickness: 15 }),
    ]);
    expect(el.querySelectorAll("[data-piece-row]")).toHaveLength(2);
  });

  it("agrupa pecas identicas numa so linha com qty certa", () => {
    const el = document.createElement("div");
    const pp = createPiecesPanel(el);
    pp.update([
      makePanel({ id: "a", width: 720, height: 560, thickness: 18 }),
      makePanel({ id: "b", width: 720, height: 560, thickness: 18 }),
    ]);
    const rows = el.querySelectorAll("[data-piece-row]");
    expect(rows).toHaveLength(1);
    expect(rows[0].querySelector("[data-qty]")?.textContent).toBe("2");
  });

  it("exibe dimensoes e espessura", () => {
    const el = document.createElement("div");
    const pp = createPiecesPanel(el);
    pp.update([makePanel({ width: 800, height: 400, thickness: 15 })]);
    const row = el.querySelector("[data-piece-row]")!;
    expect(row.textContent).toContain("800");
    expect(row.textContent).toContain("400");
    expect(row.textContent).toContain("15");
  });

  it("exibe nomes discretos ao lado das dimensoes", () => {
    const el = document.createElement("div");
    const pp = createPiecesPanel(el);
    pp.update([
      makePanel({ id: "a", name: "Lateral esq", width: 720, height: 560, thickness: 18 }),
      makePanel({ id: "b", name: "Lateral dir", width: 720, height: 560, thickness: 18 }),
    ]);
    const names = el.querySelector(".piece-names")!;
    expect(names.textContent).toBe("Lateral esq · Lateral dir");
    expect(names.className).toBe("piece-names");
  });

  it("update substitui conteudo anterior", () => {
    const el = document.createElement("div");
    const pp = createPiecesPanel(el);
    pp.update([makePanel({ id: "a" }), makePanel({ id: "b" })]);
    pp.update([makePanel({ id: "c" })]);
    expect(el.querySelectorAll("[data-piece-row]")).toHaveLength(1);
  });
});
