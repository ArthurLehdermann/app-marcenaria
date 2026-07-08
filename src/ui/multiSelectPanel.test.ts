// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { createMultiSelectPanel } from "./multiSelectPanel";

describe("createMultiSelectPanel", () => {
  it("Enter no nome agrupa sem clicar no botao", () => {
    const onGroup = vi.fn();
    const el = document.createElement("div");
    const panel = createMultiSelectPanel(el, { onGroup, onClear: vi.fn() });
    panel.update(2);

    const input = el.querySelector("input") as HTMLInputElement;
    input.value = "Caixote";
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

    expect(onGroup).toHaveBeenCalledWith("Caixote");
  });
});
