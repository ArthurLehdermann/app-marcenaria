// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { createToolbar } from "./toolbar";

describe("createToolbar", () => {
  it("renderiza botoes de novo, abrir, salvar e exportar", () => {
    const el = document.createElement("div");
    createToolbar(el, { onNew: vi.fn(), onOpen: vi.fn(), onSave: vi.fn(), onExport: vi.fn() });
    expect(el.querySelector("[data-action='new']")).not.toBeNull();
    expect(el.querySelector("[data-action='open']")).not.toBeNull();
    expect(el.querySelector("[data-action='save']")).not.toBeNull();
    expect(el.querySelector("[data-action='export']")).not.toBeNull();
  });

  it("clicar em novo chama onNew", () => {
    const onNew = vi.fn();
    const el = document.createElement("div");
    createToolbar(el, { onNew, onOpen: vi.fn(), onSave: vi.fn(), onExport: vi.fn() });
    (el.querySelector("[data-action='new']") as HTMLElement).click();
    expect(onNew).toHaveBeenCalledOnce();
  });

  it("clicar em salvar chama onSave", () => {
    const onSave = vi.fn();
    const el = document.createElement("div");
    createToolbar(el, { onNew: vi.fn(), onOpen: vi.fn(), onSave, onExport: vi.fn() });
    (el.querySelector("[data-action='save']") as HTMLElement).click();
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("clicar em exportar chama onExport", () => {
    const onExport = vi.fn();
    const el = document.createElement("div");
    createToolbar(el, { onNew: vi.fn(), onOpen: vi.fn(), onSave: vi.fn(), onExport });
    (el.querySelector("[data-action='export']") as HTMLElement).click();
    expect(onExport).toHaveBeenCalledOnce();
  });
});
