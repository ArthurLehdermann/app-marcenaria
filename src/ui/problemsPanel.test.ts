// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { createProblemsPanel } from "./problemsPanel";
import type { Panel } from "../core/types";
import type { Collision as Col } from "../core/collision";

function makePanel(id: string, name: string): Panel {
  return {
    id, type: "", name, width: 100, height: 100, thickness: 18,
    position: { x: 0, y: 0, z: 0 }, upAxis: "y",
    edges: { top: false, bottom: false, left: false, right: false },
    color: "#ccc", visible: true,
  };
}

describe("createProblemsPanel", () => {
  it("sem colisoes mostra estado limpo", () => {
    const el = document.createElement("div");
    const pp = createProblemsPanel(el);
    pp.update([], []);
    expect(el.querySelectorAll("[data-collision]")).toHaveLength(0);
  });

  it("renderiza um item por colisao", () => {
    const el = document.createElement("div");
    const pp = createProblemsPanel(el);
    const panels = [makePanel("a", "Lateral"), makePanel("b", "Base")];
    const collisions: Col[] = [{ a: "a", b: "b" }];
    pp.update(collisions, panels);
    expect(el.querySelectorAll("[data-collision]")).toHaveLength(1);
  });

  it("exibe os nomes dos paineis em colisao", () => {
    const el = document.createElement("div");
    const pp = createProblemsPanel(el);
    const panels = [makePanel("a", "Lateral esq"), makePanel("b", "Base")];
    pp.update([{ a: "a", b: "b" }], panels);
    expect(el.textContent).toContain("Lateral esq");
    expect(el.textContent).toContain("Base");
  });

  it("update substitui conteudo anterior", () => {
    const el = document.createElement("div");
    const pp = createProblemsPanel(el);
    const panels = [makePanel("a", "A"), makePanel("b", "B"), makePanel("c", "C")];
    pp.update([{ a: "a", b: "b" }, { a: "b", b: "c" }], panels);
    pp.update([], []);
    expect(el.querySelectorAll("[data-collision]")).toHaveLength(0);
  });
});
