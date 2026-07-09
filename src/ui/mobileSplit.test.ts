// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  clampMobilePanelRatio,
  loadMobilePanelRatio,
  saveMobilePanelRatio,
  setupMobileSplit,
  MOBILE_SPLIT_STORAGE_KEY,
  MOBILE_PANEL_DEFAULT_RATIO,
} from "./mobileSplit";

describe("mobileSplit", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("limita ratio entre 15% e 85%", () => {
    expect(clampMobilePanelRatio(0.05)).toBe(0.15);
    expect(clampMobilePanelRatio(0.95)).toBe(0.85);
    expect(clampMobilePanelRatio(0.4)).toBe(0.4);
  });

  it("salva e carrega preferencia", () => {
    saveMobilePanelRatio(0.42);
    expect(loadMobilePanelRatio()).toBe(0.42);
    expect(localStorage.getItem(MOBILE_SPLIT_STORAGE_KEY)).toBe("0.42");
  });

  it("usa default quando nao ha valor salvo", () => {
    expect(loadMobilePanelRatio()).toBe(MOBILE_PANEL_DEFAULT_RATIO);
  });

  it("setEnabled oculta handle e comeca oculto", () => {
    document.body.innerHTML = `
      <div id="app"></div>
      <header id="topbar"></header>
      <div id="mobile-bottom"></div>
      <button id="mobile-split-handle" type="button"></button>
    `;
    const split = setupMobileSplit({
      app: document.getElementById("app")!,
      topbar: document.getElementById("topbar")!,
      handle: document.getElementById("mobile-split-handle")!,
      bottom: document.getElementById("mobile-bottom")!,
      isMobile: () => true,
      onLayoutChange: () => {},
    });
    const handle = document.getElementById("mobile-split-handle")!;
    expect(handle.hasAttribute("hidden")).toBe(true);
    split.setEnabled(true);
    expect(handle.hasAttribute("hidden")).toBe(false);
    split.setEnabled(false);
    expect(handle.hasAttribute("hidden")).toBe(true);
  });
});
