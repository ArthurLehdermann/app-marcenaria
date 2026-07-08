import { describe, it, expect } from "vitest";
import { createEditorState, selectPanel, hoverPanel, toggleCollisions } from "./editorState";

describe("createEditorState", () => {
  it("estado inicial: sem selecao, showCollisions true", () => {
    const s = createEditorState();
    expect(s.selectedPanelId).toBeUndefined();
    expect(s.hoveredPanelId).toBeUndefined();
    expect(s.showCollisions).toBe(true);
  });
});

describe("selectPanel", () => {
  it("define selectedPanelId", () => {
    const s = selectPanel(createEditorState(), "abc");
    expect(s.selectedPanelId).toBe("abc");
  });

  it("deseleciona com undefined", () => {
    const s = selectPanel(createEditorState(), "abc");
    expect(selectPanel(s, undefined).selectedPanelId).toBeUndefined();
  });

  it("nao muta o estado original", () => {
    const orig = createEditorState();
    selectPanel(orig, "x");
    expect(orig.selectedPanelId).toBeUndefined();
  });
});

describe("hoverPanel", () => {
  it("define hoveredPanelId", () => {
    const s = hoverPanel(createEditorState(), "xyz");
    expect(s.hoveredPanelId).toBe("xyz");
  });

  it("nao altera selectedPanelId", () => {
    const s = selectPanel(createEditorState(), "sel");
    expect(hoverPanel(s, "hov").selectedPanelId).toBe("sel");
  });
});

describe("toggleCollisions", () => {
  it("alterna showCollisions", () => {
    const s = createEditorState();
    expect(s.showCollisions).toBe(true);
    expect(toggleCollisions(s).showCollisions).toBe(false);
    expect(toggleCollisions(toggleCollisions(s)).showCollisions).toBe(true);
  });
});
