// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { setupOnboarding } from "./onboarding";

describe("setupOnboarding", () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = `
      <div id="onboarding-overlay" aria-hidden="true">
        <div id="onboarding-dialog">
          <ul id="onboarding-tips"></ul>
          <button id="btn-onboarding-close">Começar</button>
        </div>
      </div>`;
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("abre na primeira visita", () => {
    const { shown } = setupOnboarding();
    expect(shown).toBe(true);
    expect(document.getElementById("onboarding-overlay")?.classList.contains("open")).toBe(true);
    expect(document.getElementById("onboarding-tips")!.children.length).toBeGreaterThan(0);
  });

  it("nao abre depois de dispensado", () => {
    setupOnboarding().dismiss();
    const { shown } = setupOnboarding();
    expect(shown).toBe(false);
    expect(document.getElementById("onboarding-overlay")?.classList.contains("open")).toBe(false);
  });
});
