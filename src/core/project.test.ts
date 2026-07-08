import { describe, it, expect } from "vitest";
import {
  addPanel, updatePanel, removePanel,
  duplicatePanel, rotate90,
  exportProject, importProject,
} from "./project";
import { panelBox, boxSize } from "./geometry";
import type { Panel, Project } from "./types";

function makePanel(over: Partial<Panel> = {}): Panel {
  return {
    id: over.id ?? "p1",
    type: over.type ?? "",
    name: over.name ?? "painel",
    width: over.width ?? 720,
    height: over.height ?? 560,
    thickness: over.thickness ?? 18,
    position: over.position ?? { x: 0, y: 0, z: 0 },
    upAxis: over.upAxis ?? "y",
    edges: over.edges ?? { top: false, bottom: false, left: false, right: false },
    color: "#ccc",
    visible: over.visible ?? true,
    groupId: over.groupId,
  };
}

function makeProject(panels: Panel[] = []): Project {
  return {
    id: "proj1",
    name: "Teste",
    settings: { defaultMaterial: "MDF 18 mm", defaultThickness: 18 },
    panels,
    groups: [],
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    appVersion: "0.1.0",
    schemaVersion: 1,
  };
}

// ── addPanel ──────────────────────────────────────────────────────────────────

describe("addPanel", () => {
  it("adiciona painel ao projeto", () => {
    const p = makePanel({ id: "a" });
    const proj = addPanel(makeProject(), p);
    expect(proj.panels).toHaveLength(1);
    expect(proj.panels[0].id).toBe("a");
  });

  it("nao muta o projeto original", () => {
    const orig = makeProject();
    addPanel(orig, makePanel());
    expect(orig.panels).toHaveLength(0);
  });
});

// ── updatePanel ───────────────────────────────────────────────────────────────

describe("updatePanel", () => {
  it("aplica patch no painel correto", () => {
    const proj = makeProject([makePanel({ id: "a", name: "antes" })]);
    const updated = updatePanel(proj, "a", { name: "depois" });
    expect(updated.panels[0].name).toBe("depois");
  });

  it("nao altera outros paineis", () => {
    const proj = makeProject([
      makePanel({ id: "a" }),
      makePanel({ id: "b", name: "intocado" }),
    ]);
    const updated = updatePanel(proj, "a", { width: 999 });
    expect(updated.panels[1].name).toBe("intocado");
    expect(updated.panels[1].width).toBe(720);
  });

  it("id inexistente retorna projeto igual", () => {
    const proj = makeProject([makePanel({ id: "a" })]);
    const updated = updatePanel(proj, "nope", { width: 1 });
    expect(updated.panels[0].width).toBe(720);
  });

  it("peca em grupo ignora dimensoes, fita e posicao", () => {
    const grouped = makePanel({ id: "a", groupId: "g1", width: 720, visible: true });
    const proj = makeProject([grouped]);
    const updated = updatePanel(proj, "a", {
      width: 999,
      height: 888,
      thickness: 25,
      position: { x: 100, y: 0, z: 0 },
      edges: { top: true, bottom: true, left: true, right: true },
    });
    expect(updated.panels[0].width).toBe(720);
    expect(updated.panels[0].edges.top).toBe(false);
    expect(updated.panels[0].position.x).toBe(0);
  });

  it("peca em grupo permite alterar visibilidade", () => {
    const proj = makeProject([makePanel({ id: "a", groupId: "g1", visible: true })]);
    const updated = updatePanel(proj, "a", { visible: false });
    expect(updated.panels[0].visible).toBe(false);
  });
});

// ── removePanel ───────────────────────────────────────────────────────────────

describe("removePanel", () => {
  it("remove o painel pelo id", () => {
    const proj = makeProject([makePanel({ id: "a" }), makePanel({ id: "b" })]);
    const updated = removePanel(proj, "a");
    expect(updated.panels).toHaveLength(1);
    expect(updated.panels[0].id).toBe("b");
  });

  it("id inexistente nao muda nada", () => {
    const proj = makeProject([makePanel({ id: "a" })]);
    const updated = removePanel(proj, "nope");
    expect(updated.panels).toHaveLength(1);
  });
});

// ── duplicatePanel ────────────────────────────────────────────────────────────

describe("duplicatePanel", () => {
  it("copia nasce com novo id", () => {
    const proj = makeProject([makePanel({ id: "a" })]);
    const updated = duplicatePanel(proj, "a");
    expect(updated.panels).toHaveLength(2);
    expect(updated.panels[1].id).not.toBe("a");
  });

  it("nome da copia e '<nome> (copia)'", () => {
    const proj = makeProject([makePanel({ id: "a", name: "Lateral" })]);
    const updated = duplicatePanel(proj, "a");
    expect(updated.panels[1].name).toBe("Lateral (copia)");
  });

  it("segunda copia e '<nome> (copia 2)'", () => {
    const p0 = makeProject([makePanel({ id: "a", name: "Lateral" })]);
    const p1 = duplicatePanel(p0, "a");
    const copiaId = p1.panels[1].id;
    const p2 = duplicatePanel(p1, copiaId);
    expect(p2.panels[2].name).toBe("Lateral (copia 2)");
  });

  it("copia posicionada a direita sem colidir (gap 32 mm)", () => {
    const src = makePanel({ id: "a", width: 720, height: 560, thickness: 18, position: { x: 0, y: 0, z: 0 } });
    const proj = makeProject([src]);
    const updated = duplicatePanel(proj, "a");
    const copy = updated.panels[1];
    // a ocupa x[0,720], copia deve comecar em 720+32=752
    expect(copy.position.x).toBe(752);
  });

  it("copia herda dimensoes e fita do original", () => {
    const edges = { top: true, bottom: false, left: true, right: false };
    const src = makePanel({ id: "a", width: 600, height: 400, thickness: 15, edges });
    const proj = makeProject([src]);
    const copy = duplicatePanel(proj, "a").panels[1];
    expect(copy.width).toBe(600);
    expect(copy.height).toBe(400);
    expect(copy.thickness).toBe(15);
    expect(copy.edges).toEqual(edges);
    // edges deve ser copia, nao referencia
    expect(copy.edges).not.toBe(src.edges);
  });

  it("id inexistente retorna projeto igual", () => {
    const proj = makeProject([makePanel({ id: "a" })]);
    const updated = duplicatePanel(proj, "nope");
    expect(updated.panels).toHaveLength(1);
  });

  it("nao duplica peca em grupo", () => {
    const proj = makeProject([makePanel({ id: "a", groupId: "g1" })]);
    const updated = duplicatePanel(proj, "a");
    expect(updated.panels).toHaveLength(1);
  });
});

// ── rotate90 ──────────────────────────────────────────────────────────────────

describe("rotate90", () => {
  it("cicla upAxis: y -> x -> z -> y", () => {
    const panel = makePanel({ id: "a", upAxis: "y" });
    const p0 = makeProject([panel]);
    const p1 = rotate90(p0, "a");
    expect(p1.panels[0].upAxis).toBe("x");
    const p2 = rotate90(p1, "a");
    expect(p2.panels[0].upAxis).toBe("z");
    const p3 = rotate90(p2, "a");
    expect(p3.panels[0].upAxis).toBe("y");
  });

  it("preserva o centro geometrico apos rotacao", () => {
    // painel em pe 720x560x18 em position {0,0,0}
    // centro antes: {360, 280, 9}
    const panel = makePanel({ id: "a", width: 720, height: 560, thickness: 18, position: { x: 0, y: 0, z: 0 }, upAxis: "y" });
    const proj = makeProject([panel]);
    const updated = rotate90(proj, "a");
    const rotated = updated.panels[0];

    const boxBefore = panelBox(panel);
    const centerBefore = {
      x: (boxBefore.min.x + boxBefore.max.x) / 2,
      y: (boxBefore.min.y + boxBefore.max.y) / 2,
      z: (boxBefore.min.z + boxBefore.max.z) / 2,
    };
    const boxAfter = panelBox(rotated);
    const centerAfter = {
      x: (boxAfter.min.x + boxAfter.max.x) / 2,
      y: (boxAfter.min.y + boxAfter.max.y) / 2,
      z: (boxAfter.min.z + boxAfter.max.z) / 2,
    };

    expect(centerAfter.x).toBeCloseTo(centerBefore.x);
    expect(centerAfter.y).toBeCloseTo(centerBefore.y);
    expect(centerAfter.z).toBeCloseTo(centerBefore.z);
  });

  it("nao altera outros paineis", () => {
    const proj = makeProject([
      makePanel({ id: "a", upAxis: "y" }),
      makePanel({ id: "b", upAxis: "y" }),
    ]);
    const updated = rotate90(proj, "a");
    expect(updated.panels[1].upAxis).toBe("y");
  });

  it("id inexistente retorna projeto igual", () => {
    const proj = makeProject([makePanel({ id: "a", upAxis: "y" })]);
    const updated = rotate90(proj, "nope");
    expect(updated.panels[0].upAxis).toBe("y");
  });

  it("nao gira peca em grupo", () => {
    const proj = makeProject([makePanel({ id: "a", upAxis: "y", groupId: "g1" })]);
    const updated = rotate90(proj, "a");
    expect(updated.panels[0].upAxis).toBe("y");
  });
});

// ── exportProject / importProject ─────────────────────────────────────────────

describe("exportProject", () => {
  it("retorna Blob com JSON valido", async () => {
    const proj = makeProject([makePanel()]);
    const blob = exportProject(proj);
    expect(blob).toBeInstanceOf(Blob);
    const text = await blob.text();
    const parsed = JSON.parse(text);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.panels).toHaveLength(1);
  });

  it("atualiza updatedAt no export", async () => {
    const proj = makeProject();
    const before = new Date(proj.updatedAt).getTime();
    const blob = exportProject(proj);
    const parsed = JSON.parse(await blob.text());
    const after = new Date(parsed.updatedAt).getTime();
    expect(after).toBeGreaterThanOrEqual(before);
  });
});

describe("importProject", () => {
  it("importa projeto valido", () => {
    const proj = makeProject([makePanel()]);
    const json = JSON.stringify(proj);
    const imported = importProject(json);
    expect(imported.id).toBe("proj1");
    expect(imported.panels).toHaveLength(1);
  });

  it("lanca erro para schemaVersion diferente de 1", () => {
    const proj = { ...makeProject(), schemaVersion: 2 };
    expect(() => importProject(JSON.stringify(proj))).toThrow("schema");
  });

  it("lanca erro para espessura invalida", () => {
    const panel = makePanel({ thickness: -5 });
    const proj = makeProject([panel]);
    expect(() => importProject(JSON.stringify(proj))).toThrow("spessura");
  });

  it("lanca erro para largura invalida", () => {
    const panel = makePanel({ width: 0 });
    const proj = makeProject([panel]);
    expect(() => importProject(JSON.stringify(proj))).toThrow("argura");
  });

  it("lanca erro para altura invalida", () => {
    const panel = makePanel({ height: -1 });
    const proj = makeProject([panel]);
    expect(() => importProject(JSON.stringify(proj))).toThrow("ltura");
  });

  it("completa visible ausente como true", () => {
    const proj = makeProject([makePanel()]);
    const raw = JSON.parse(JSON.stringify(proj));
    delete raw.panels[0].visible;
    const imported = importProject(JSON.stringify(raw));
    expect(imported.panels[0].visible).toBe(true);
  });

  it("completa type ausente como string vazia", () => {
    const proj = makeProject([makePanel()]);
    const raw = JSON.parse(JSON.stringify(proj));
    delete raw.panels[0].type;
    const imported = importProject(JSON.stringify(raw));
    expect(imported.panels[0].type).toBe("");
  });

  it("completa appVersion ausente como 0.1.0", () => {
    const proj = makeProject();
    const raw = JSON.parse(JSON.stringify(proj));
    delete raw.appVersion;
    const imported = importProject(JSON.stringify(raw));
    expect(imported.appVersion).toBe("0.1.0");
  });
});
