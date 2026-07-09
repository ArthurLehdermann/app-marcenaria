import { describe, it, expect } from "vitest";
import { buildWhatsappOrder, buildCsv } from "./order";
import type { Panel, Project } from "./types";

function makePanel(over: Partial<Panel> = {}): Panel {
  return {
    id: over.id ?? "p1",
    name: over.name ?? "painel",
    width: over.width ?? 720,
    height: over.height ?? 560,
    thickness: over.thickness ?? 18,
    position: { x: 0, y: 0, z: 0 },
    upAxis: "y",
    edges: over.edges ?? { top: false, bottom: false, left: false, right: false },
    color: "#ccc",
    visible: true,
  };
}

function makeProject(panels: Panel[], material = "MDF Ultra 18 mm"): Project {
  return {
    id: "proj1",
    name: "Balcao",
    settings: { defaultMaterial: material, defaultThickness: 18 },
    panels,
    groups: [],
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    appVersion: "0.1.0",
    schemaVersion: 2,
  };
}

describe("buildWhatsappOrder", () => {
  it("comeca com cabecalho fixo", () => {
    const text = buildWhatsappOrder(makeProject([makePanel()]));
    expect(text).toMatch(/^Olá!/);
  });

  it("material e espessura numa linha, itens abaixo", () => {
    const text = buildWhatsappOrder(makeProject([makePanel()], "MDF Ultra 18 mm"));
    expect(text).toContain("MDF Ultra 18 mm\r\n1x 720x560 | -");
  });

  it("dimensoes compactas qtd x LARGxALT", () => {
    const text = buildWhatsappOrder(makeProject([makePanel({ width: 720, height: 560, thickness: 18 })]));
    expect(text).toContain("1x 720x560");
  });

  it("sem fita mostra traco", () => {
    const text = buildWhatsappOrder(makeProject([makePanel()]));
    expect(text).toContain("| -");
  });

  it("fita com lados usa abreviacoes", () => {
    const edges = { top: true, bottom: false, left: true, right: false };
    const text = buildWhatsappOrder(makeProject([makePanel({ edges })]));
    expect(text).toContain("| Sup Esq");
  });

  it("pecas iguais agrupadas numa linha", () => {
    const panels = [
      makePanel({ id: "a", width: 600, height: 742, thickness: 18, edges: { top: false, bottom: true, left: true, right: true } }),
      makePanel({ id: "b", width: 600, height: 742, thickness: 18, edges: { top: false, bottom: true, left: true, right: true } }),
    ];
    const text = buildWhatsappOrder(makeProject(panels));
    expect(text).toContain("2x 600x742 | Inf Esq Dir");
  });

  it("rodape com area e total de pecas", () => {
    const text = buildWhatsappOrder(makeProject([makePanel({ width: 1000, height: 1000, thickness: 18 })]));
    expect(text).toContain("1.00 m2, 0.00 m fita, 1 pecas");
  });

  it("espessuras diferentes geram blocos separados, ordenados", () => {
    const panels = [
      makePanel({ id: "a", thickness: 18 }),
      makePanel({ id: "b", thickness: 6 }),
    ];
    const text = buildWhatsappOrder(makeProject(panels));
    const idx6 = text.indexOf(" 6 mm");
    const idx18 = text.indexOf(" 18 mm");
    expect(idx6).toBeGreaterThan(-1);
    expect(idx18).toBeGreaterThan(-1);
    expect(idx6).toBeLessThan(idx18);
  });

  it("total de pecas no rodape", () => {
    const panels = [makePanel({ id: "a" }), makePanel({ id: "b" })];
    const text = buildWhatsappOrder(makeProject(panels));
    expect(text).toContain(", 2 pecas");
  });

  it("rodape inclui metragem total de fita", () => {
    const panels = [
      makePanel({
        id: "a",
        width: 600,
        height: 742,
        edges: { top: false, bottom: true, left: true, right: true },
      }),
      makePanel({
        id: "b",
        width: 600,
        height: 742,
        edges: { top: false, bottom: true, left: true, right: true },
      }),
    ];
    const text = buildWhatsappOrder(makeProject(panels));
    // 2x (600 + 742 + 742) mm = 4168 mm = 4.17 m
    expect(text).toContain("4.17 m fita");
  });
});

describe("buildCsv", () => {
  it("primeira linha e o cabecalho correto", () => {
    const csv = buildCsv(makeProject([makePanel()]));
    const [head] = csv.split("\n");
    expect(head).toBe("qtd,largura_mm,altura_mm,espessura_mm,fita_sup,fita_inf,fita_esq,fita_dir,nomes");
  });

  it("linha de dados com valores corretos", () => {
    const edges = { top: true, bottom: false, left: false, right: true };
    const csv = buildCsv(makeProject([makePanel({ name: "Base", width: 720, height: 560, thickness: 18, edges })]));
    const [, row] = csv.split("\n");
    expect(row).toBe('1,720,560,18,1,0,0,1,"Base"');
  });

  it("nomes com aspas duplas sao escapados", () => {
    const csv = buildCsv(makeProject([makePanel({ name: 'Lateral "frente"' })]));
    const [, row] = csv.split("\n");
    expect(row).toBe('1,720,560,18,0,0,0,0,"Lateral ""frente"""');
  });

  it("nomes com ponto e virgula quando agrupados", () => {
    const panels = [
      makePanel({ id: "a", name: "Lat esq", width: 720, height: 560, thickness: 18 }),
      makePanel({ id: "b", name: "Lat dir", width: 720, height: 560, thickness: 18 }),
    ];
    const csv = buildCsv(makeProject(panels));
    expect(csv).toContain('"Lat esq; Lat dir"');
  });

  it("ordenado por espessura crescente", () => {
    const panels = [
      makePanel({ id: "a", thickness: 18 }),
      makePanel({ id: "b", thickness: 6 }),
    ];
    const csv = buildCsv(makeProject(panels));
    const rows = csv.split("\n").slice(1);
    const thicknesses = rows.map(r => Number(r.split(",")[3]));
    expect(thicknesses).toEqual([6, 18]);
  });
});
