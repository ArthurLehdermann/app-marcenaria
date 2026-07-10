// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { createPanelTree } from "./tree";
import type { Panel, Project } from "../core/types";

function makePanel(over: Partial<Panel> = {}): Panel {
  return {
    id: over.id ?? "p1", name: over.name ?? "Painel",
    width: 720, height: 560, thickness: 18,
    position: { x: 0, y: 0, z: 0 }, upAxis: "y",
    edges: { top: false, bottom: false, left: false, right: false },
    color: "#ccc", visible: over.visible ?? true,
    groupId: over.groupId,
  };
}

function makeProject(panels: Panel[], groups: Project["groups"] = []): Project {
  return {
    id: "p", name: "t", settings: { defaultMaterial: "MDF", defaultThickness: 18 },
    panels, groups, createdAt: "", updatedAt: "", appVersion: "0.1.0", schemaVersion: 2,
  };
}

const cbs = {
  onSelect: vi.fn(),
  onSelectGroup: vi.fn(),
  onVisibilityToggle: vi.fn(),
  onGroupVisibilityToggle: vi.fn(),
  onReorderTopLevel: vi.fn(),
};

describe("createPanelTree", () => {
  it("renderiza um item por painel solto", () => {
    const el = document.createElement("div");
    const tree = createPanelTree(el, cbs);
    tree.update(makeProject([makePanel({ id: "a" }), makePanel({ id: "b" })]), []);
    expect(el.querySelectorAll("[data-panel-id]")).toHaveLength(2);
  });

  it("mostra medidas discretas ao lado do nome", () => {
    const el = document.createElement("div");
    const tree = createPanelTree(el, cbs);
    tree.update(makeProject([makePanel({ id: "a", name: "Base", width: 720, height: 560, thickness: 18 })]), []);
    const row = el.querySelector("[data-panel-id='a']")!;
    expect(row.querySelector(".panel-name")?.textContent).toBe("Base");
    expect(row.querySelector(".panel-dims")?.textContent).toBe("720 × 560 × 18");
  });

  it("renderiza grupo com cabecalho e membros", () => {
    const el = document.createElement("div");
    const tree = createPanelTree(el, cbs);
    tree.update(makeProject(
      [makePanel({ id: "a", groupId: "g1" }), makePanel({ id: "b", groupId: "g1" })],
      [{ id: "g1", name: "Caixote" }],
    ), []);
    expect(el.querySelectorAll("[data-group-id]")).toHaveLength(1);
    expect(el.querySelectorAll(".group-member")).toHaveLength(2);
  });

  it("clique em membro de bloco foca a peca", () => {
    const el = document.createElement("div");
    const onSelect = vi.fn();
    const tree = createPanelTree(el, { ...cbs, onSelect });
    tree.update(makeProject(
      [makePanel({ id: "a", groupId: "g1" }), makePanel({ id: "b", groupId: "g1" })],
      [{ id: "g1", name: "Caixote" }],
    ), []);
    const row = el.querySelector("[data-panel-id='a']") as HTMLElement;
    row.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onSelect).toHaveBeenCalledWith("a", false, true);
  });

  it("shift+clique passa additive true", () => {
    const el = document.createElement("div");
    const onSelect = vi.fn();
    const tree = createPanelTree(el, { ...cbs, onSelect });
    tree.update(makeProject([makePanel({ id: "x" })]), []);
    const row = el.querySelector("[data-panel-id='x']") as HTMLElement;
    row.dispatchEvent(new MouseEvent("click", { shiftKey: true, bubbles: true }));
    expect(onSelect).toHaveBeenCalledWith("x", true, false);
  });

  it("peca solta tem alca; membro de bloco nao", () => {
    const el = document.createElement("div");
    const tree = createPanelTree(el, cbs);
    tree.update(makeProject([makePanel({ id: "a" })]), []);
    expect(el.querySelectorAll(".tree-drag-handle")).toHaveLength(1);

    el.innerHTML = "";
    tree.update(makeProject(
      [makePanel({ id: "a", groupId: "g1" }), makePanel({ id: "b", groupId: "g1" })],
      [{ id: "g1", name: "Caixote" }],
    ), []);
    expect(el.querySelectorAll(".tree-drag-handle")).toHaveLength(1);
    expect(el.querySelector(".group-member .tree-drag-handle")).toBeNull();
  });

  it("engrenagem abre propriedades do membro do grupo", () => {
    const el = document.createElement("div");
    const onOpenProps = vi.fn();
    const tree = createPanelTree(el, { ...cbs, onOpenProps });
    tree.update(makeProject(
      [makePanel({ id: "a", groupId: "g1" }), makePanel({ id: "b", groupId: "g1" })],
      [{ id: "g1", name: "Caixote" }],
    ), []);
    const gear = el.querySelector("[data-panel-id='a'] .props-btn") as HTMLButtonElement;
    gear.click();
    expect(onOpenProps).toHaveBeenCalledWith("a");
  });
});
