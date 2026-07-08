// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { createPanelTree } from "./tree";
import type { Panel } from "../core/types";

function makePanel(over: Partial<Panel> = {}): Panel {
  return {
    id: over.id ?? "p1", type: "", name: over.name ?? "Painel",
    width: 720, height: 560, thickness: 18,
    position: { x: 0, y: 0, z: 0 }, upAxis: "y",
    edges: { top: false, bottom: false, left: false, right: false },
    color: "#ccc", visible: over.visible ?? true,
  };
}

describe("createPanelTree", () => {
  it("renderiza um item por painel", () => {
    const el = document.createElement("div");
    const tree = createPanelTree(el, { onSelect: vi.fn(), onVisibilityToggle: vi.fn() });
    tree.update([makePanel({ id: "a" }), makePanel({ id: "b" })]);
    expect(el.querySelectorAll("[data-panel-id]")).toHaveLength(2);
  });

  it("exibe o nome do painel", () => {
    const el = document.createElement("div");
    const tree = createPanelTree(el, { onSelect: vi.fn(), onVisibilityToggle: vi.fn() });
    tree.update([makePanel({ name: "Lateral esq" })]);
    expect(el.textContent).toContain("Lateral esq");
  });

  it("marca o painel selecionado com aria-selected", () => {
    const el = document.createElement("div");
    const tree = createPanelTree(el, { onSelect: vi.fn(), onVisibilityToggle: vi.fn() });
    tree.update([makePanel({ id: "a" }), makePanel({ id: "b" })], "a");
    const selected = el.querySelector('[aria-selected="true"]');
    expect(selected).not.toBeNull();
    expect((selected as HTMLElement).dataset.panelId).toBe("a");
  });

  it("clicar num item chama onSelect com o id", () => {
    const el = document.createElement("div");
    const onSelect = vi.fn();
    const tree = createPanelTree(el, { onSelect, onVisibilityToggle: vi.fn() });
    tree.update([makePanel({ id: "clicavel" })]);
    (el.querySelector("[data-panel-id='clicavel']") as HTMLElement).click();
    expect(onSelect).toHaveBeenCalledWith("clicavel");
  });

  it("painel oculto tem classe 'hidden' no item", () => {
    const el = document.createElement("div");
    const tree = createPanelTree(el, { onSelect: vi.fn(), onVisibilityToggle: vi.fn() });
    tree.update([makePanel({ id: "a", visible: false })]);
    expect(el.querySelector("[data-panel-id='a']")?.classList.contains("hidden")).toBe(true);
  });

  it("update substitui o conteudo anterior", () => {
    const el = document.createElement("div");
    const tree = createPanelTree(el, { onSelect: vi.fn(), onVisibilityToggle: vi.fn() });
    tree.update([makePanel({ id: "a" }), makePanel({ id: "b" })]);
    tree.update([makePanel({ id: "c" })]);
    expect(el.querySelectorAll("[data-panel-id]")).toHaveLength(1);
  });
});
