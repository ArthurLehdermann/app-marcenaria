// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { createToolbar } from "./toolbar";

function mockCbs(over: Partial<Parameters<typeof createToolbar>[1]> = {}) {
  return {
    onNew: vi.fn(),
    onOpen: vi.fn(),
    onSave: vi.fn(),
    onExport: vi.fn(),
    onToggleGroupPick: vi.fn(),
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
    expect(el.querySelector("[data-action='group']")).not.toBeNull();
  });

  it("clicar em novo chama onNew", () => {
    const onNew = vi.fn();
    const el = document.createElement("div");
    createToolbar(el, mockCbs({ onNew }));
    (el.querySelector("[data-action='new']") as HTMLElement).click();
    expect(onNew).toHaveBeenCalledOnce();
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
});
