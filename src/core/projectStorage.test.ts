// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { saveProjectLocal, loadProjectLocal, clearProjectLocal, PROJECT_STORAGE_KEY } from "./projectStorage";
import type { Project } from "./types";

const project: Project = {
  id: "x",
  name: "Teste",
  settings: { defaultMaterial: "MDF 18 mm", defaultThickness: 18 },
  panels: [],
  groups: [],
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  appVersion: "0.1.0",
  schemaVersion: 2,
};

describe("projectStorage", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("salva e carrega projeto", () => {
    saveProjectLocal(project);
    const loaded = loadProjectLocal();
    expect(loaded?.name).toBe("Teste");
    expect(localStorage.getItem(PROJECT_STORAGE_KEY)).not.toBeNull();
  });

  it("clear remove projeto", () => {
    saveProjectLocal(project);
    clearProjectLocal();
    expect(loadProjectLocal()).toBeNull();
  });
});
