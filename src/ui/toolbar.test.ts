// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { createToolbar } from "./toolbar";

function mockCbs(over: Partial<Parameters<typeof createToolbar>[1]> = {}) {
  return {
    onNew: vi.fn(),
    onOpen: vi.fn(),
    onSave: vi.fn(),
    onExport: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onToggleGroupPick: vi.fn(),
    onToggleSnap: vi.fn(),
    onGroupSelected: vi.fn(),
    ...over,
  };
}

describe("createToolbar", () => {
  it("renderiza botoes de novo, abrir, salvar e exportar", () => {
    const el = document.createElement("div");
    createToolbar(el, mockCbs());
    expect(el.querySelector("[data-action='new']")).not.toBeNull();
    expect(el.querySelector("[data-action='open']")).not.toBeNull();
    expect(el.querySelector("[data-action='save']")).not.toBeNull();
    expect(el.querySelector("[data-action='export']")).not.toBeNull();
    expect(el.querySelector("[data-action='group-pick']")).not.toBeNull();
    expect(el.querySelector("[data-action='snap']")).not.toBeNull();
    expect(el.querySelector("[data-action='group']")).not.toBeNull();
  });

  it("clicar em novo chama onNew", () => {
    const onNew = vi.fn();
    const el = document.createElement("div");
    const toolbar = createToolbar(el, mockCbs({ onNew }));
    toolbar.setCanNew(true);
    (el.querySelector("[data-action='new']") as HTMLElement).click();
    expect(onNew).toHaveBeenCalledOnce();
  });

  it("novo fica desabilitado sem conteudo no projeto", () => {
    const el = document.createElement("div");
    createToolbar(el, mockCbs());
    const newBtn = el.querySelector("[data-action='new']") as HTMLButtonElement;
    expect(newBtn.disabled).toBe(true);
  });

  it("novo habilita quando ha conteudo", () => {
    const el = document.createElement("div");
    const toolbar = createToolbar(el, mockCbs());
    toolbar.setCanNew(true);
    const newBtn = el.querySelector("[data-action='new']") as HTMLButtonElement;
    expect(newBtn.disabled).toBe(false);
  });

  it("clicar em salvar chama onSave", () => {
    const onSave = vi.fn();
    const el = document.createElement("div");
    createToolbar(el, mockCbs({ onSave }));
    (el.querySelector("[data-action='save']") as HTMLElement).click();
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("clicar em exportar chama onExport", () => {
    const onExport = vi.fn();
    const el = document.createElement("div");
    createToolbar(el, mockCbs({ onExport }));
    (el.querySelector("[data-action='export']") as HTMLElement).click();
    expect(onExport).toHaveBeenCalledOnce();
  });

  it("menu mobile abre e fecha com toggle e overlay", () => {
    const toolbarEl = document.createElement("div");
    const wrap = document.createElement("div");
    wrap.appendChild(toolbarEl);
    const toggle = document.createElement("button");
    const overlay = document.createElement("div");
    createToolbar(toolbarEl, mockCbs(), { wrap, toggle, overlay });

    toggle.click();
    expect(wrap.classList.contains("open")).toBe(true);
    expect(overlay.classList.contains("open")).toBe(true);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");

    overlay.click();
    expect(wrap.classList.contains("open")).toBe(false);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });

  it("menu mobile fecha ao clicar em acao", () => {
    const toolbarEl = document.createElement("div");
    const wrap = document.createElement("div");
    wrap.appendChild(toolbarEl);
    const toggle = document.createElement("button");
    const overlay = document.createElement("div");
    createToolbar(toolbarEl, mockCbs(), { wrap, toggle, overlay });

    toggle.click();
    (toolbarEl.querySelector("[data-action='save']") as HTMLElement).click();
    expect(wrap.classList.contains("open")).toBe(false);
  });

  it("renderiza desfazer e refazer", () => {
    const el = document.createElement("div");
    createToolbar(el, mockCbs());
    expect(el.querySelector("[data-action='undo']")).not.toBeNull();
    expect(el.querySelector("[data-action='redo']")).not.toBeNull();
  });

  it("clicar em desfazer chama onUndo", () => {
    const onUndo = vi.fn();
    const el = document.createElement("div");
    const toolbar = createToolbar(el, mockCbs({ onUndo }));
    toolbar.setCanUndo(true);
    (el.querySelector("[data-action='undo']") as HTMLElement).click();
    expect(onUndo).toHaveBeenCalledOnce();
  });
});
