import { describe, it, expect } from "vitest";
import {
  createEditorState, clickSelect, setSelection, toggleGroupPickMode, primarySelectedId,
} from "./editorState";

describe("clickSelect", () => {
  it("sem additive substitui selecao", () => {
    const s = setSelection(createEditorState(), ["a"]);
    expect(clickSelect(s, "b", false).selectedPanelIds).toEqual(["b"]);
  });

  it("additive alterna ids", () => {
    const s = clickSelect(createEditorState(), "a", true);
    expect(clickSelect(s, "b", true).selectedPanelIds).toEqual(["a", "b"]);
    expect(clickSelect(clickSelect(createEditorState(), "a", true), "a", true).selectedPanelIds).toEqual([]);
  });
});

describe("toggleGroupPickMode", () => {
  it("alterna modo", () => {
    expect(toggleGroupPickMode(createEditorState()).groupPickMode).toBe(true);
  });
});

describe("primarySelectedId", () => {
  it("retorna primeiro da lista", () => {
    const s = setSelection(createEditorState(), ["a", "b"]);
    expect(primarySelectedId(s)).toBe("a");
  });
});
