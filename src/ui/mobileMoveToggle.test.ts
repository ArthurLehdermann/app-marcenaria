// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { setupMobileMoveToggle } from "./mobileMoveToggle";

describe("setupMobileMoveToggle", () => {
  it("alterna modo mover quando ha selecao", () => {
    let active = false;
    const toggle = vi.fn(() => { active = !active; });
    const btn = document.createElement("button");
    const ui = setupMobileMoveToggle(btn, {
      isActive: () => active,
      toggle,
      canUse: () => true,
    });

    btn.click();
    expect(toggle).toHaveBeenCalledOnce();
    expect(btn.classList.contains("active")).toBe(true);
    expect(btn.getAttribute("aria-pressed")).toBe("true");

    ui.sync();
    expect(btn.disabled).toBe(false);
  });

  it("desabilita sem selecao", () => {
    const btn = document.createElement("button");
    setupMobileMoveToggle(btn, {
      isActive: () => false,
      toggle: vi.fn(),
      canUse: () => false,
    });
    expect(btn.disabled).toBe(true);
  });
});
