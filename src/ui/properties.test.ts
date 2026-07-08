// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { createPropertiesPanel } from "./properties";
import type { Panel } from "../core/types";

function makePanel(over: Partial<Panel> = {}): Panel {
  return {
    id: "p1", name: "Lateral esq",
    width: 720, height: 560, thickness: 18,
    position: { x: 0, y: 0, z: 0 }, upAxis: "y",
    edges: { top: true, bottom: false, left: false, right: false },
    color: "#aabbcc", visible: true, ...over,
  };
}

describe("createPropertiesPanel", () => {
  it("sem painel selecionado mostra estado vazio", () => {
    const el = document.createElement("div");
    const pp = createPropertiesPanel(el, { onChange: vi.fn(), onDuplicate: vi.fn(), onDelete: vi.fn(), onRotate: vi.fn() });
    pp.update(null);
    expect(el.querySelector("[data-panel-form]")).toBeNull();
  });

  it("exibe nome e dimensoes do painel", () => {
    const el = document.createElement("div");
    const pp = createPropertiesPanel(el, { onChange: vi.fn(), onDuplicate: vi.fn(), onDelete: vi.fn(), onRotate: vi.fn() });
    pp.update(makePanel());
    expect(el.querySelector<HTMLInputElement>("[name='name']")?.value).toBe("Lateral esq");
    expect(el.querySelector<HTMLInputElement>("[name='width']")?.value).toBe("720");
    expect(el.querySelector<HTMLInputElement>("[name='height']")?.value).toBe("560");
    expect(el.querySelector<HTMLInputElement>("[name='thickness']")?.value).toBe("18");
  });

  it("alterar nome chama onChange com patch correto", () => {
    const onChange = vi.fn();
    const el = document.createElement("div");
    const pp = createPropertiesPanel(el, { onChange, onDuplicate: vi.fn(), onDelete: vi.fn(), onRotate: vi.fn() });
    pp.update(makePanel({ id: "x" }));
    const input = el.querySelector<HTMLInputElement>("[name='name']")!;
    input.value = "Nova Lateral";
    input.dispatchEvent(new Event("change"));
    expect(onChange).toHaveBeenCalledWith("x", { name: "Nova Lateral" });
  });

  it("clicar em duplicar chama onDuplicate", () => {
    const onDuplicate = vi.fn();
    const el = document.createElement("div");
    const pp = createPropertiesPanel(el, { onChange: vi.fn(), onDuplicate, onDelete: vi.fn(), onRotate: vi.fn() });
    pp.update(makePanel({ id: "dup-id" }));
    (el.querySelector("[data-action='duplicate']") as HTMLElement).click();
    expect(onDuplicate).toHaveBeenCalledWith("dup-id");
  });

  it("clicar em deletar chama onDelete", () => {
    const onDelete = vi.fn();
    const el = document.createElement("div");
    const pp = createPropertiesPanel(el, { onChange: vi.fn(), onDuplicate: vi.fn(), onDelete, onRotate: vi.fn() });
    pp.update(makePanel({ id: "del-id" }));
    (el.querySelector("[data-action='delete']") as HTMLElement).click();
    expect(onDelete).toHaveBeenCalledWith("del-id");
  });

  it("clicar em girar chama onRotate", () => {
    const onRotate = vi.fn();
    const el = document.createElement("div");
    const pp = createPropertiesPanel(el, { onChange: vi.fn(), onDuplicate: vi.fn(), onDelete: vi.fn(), onRotate });
    pp.update(makePanel({ id: "rot-id" }));
    (el.querySelector("[data-action='rotate']") as HTMLElement).click();
    expect(onRotate).toHaveBeenCalledWith("rot-id");
  });

  it("peca em grupo mostra cabecalho de bloco e oculta campos editaveis", () => {
    const el = document.createElement("div");
    const pp = createPropertiesPanel(el, { onChange: vi.fn(), onDuplicate: vi.fn(), onDelete: vi.fn(), onRotate: vi.fn() });
    pp.update(makePanel({ groupId: "g1" }));
    expect(el.querySelector("[data-group-locked]")).not.toBeNull();
    expect(el.querySelector(".props-group-header")).not.toBeNull();
    expect(el.querySelector("[name='width']")).toBeNull();
    expect(el.querySelector("[name='edge_top']")).toBeNull();
  });

  it("syncPosition atualiza xyz sem reconstruir formulario", () => {
    const el = document.createElement("div");
    const pp = createPropertiesPanel(el, { onChange: vi.fn(), onDuplicate: vi.fn(), onDelete: vi.fn(), onRotate: vi.fn() });
    pp.update(makePanel({ position: { x: 10, y: 20, z: 30 } }));
    pp.syncPosition({ x: 100, y: 200, z: 300 });
    expect(el.querySelector<HTMLInputElement>("[name='pos_x']")?.value).toBe("100");
    expect(el.querySelector<HTMLInputElement>("[name='pos_y']")?.value).toBe("200");
    expect(el.querySelector<HTMLInputElement>("[name='pos_z']")?.value).toBe("300");
  });

  it("layout tabs agrupa campos em abas", () => {
    const el = document.createElement("div");
    const pp = createPropertiesPanel(
      el,
      { onChange: vi.fn(), onDuplicate: vi.fn(), onDelete: vi.fn(), onRotate: vi.fn() },
      { layout: "tabs" },
    );
    pp.update(makePanel());
    expect(el.querySelector(".props-tab-bar")).not.toBeNull();
    expect(el.querySelectorAll(".props-tab-btn")).toHaveLength(3);
    expect(el.querySelector("[data-tab-pane='general'] [name='name']")).not.toBeNull();
    expect(el.querySelector("[data-tab-pane='position'] [name='pos_x']")).not.toBeNull();
    expect(el.querySelector("[data-tab-pane='edge'] [name='edge_top']")).not.toBeNull();
    expect(el.querySelector<HTMLElement>("[data-tab-pane='position']")?.hidden).toBe(true);
  });

  it("layout tabs alterna paineis ao clicar na aba", () => {
    const el = document.createElement("div");
    const pp = createPropertiesPanel(
      el,
      { onChange: vi.fn(), onDuplicate: vi.fn(), onDelete: vi.fn(), onRotate: vi.fn() },
      { layout: "tabs" },
    );
    pp.update(makePanel());
    (el.querySelector("[data-tab='position']") as HTMLElement).click();
    expect(el.querySelector<HTMLElement>("[data-tab-pane='position']")?.hidden).toBe(false);
    expect(el.querySelector<HTMLElement>("[data-tab-pane='general']")?.hidden).toBe(true);
  });
});
