import { describe, it, expect } from "vitest";
import { createProjectHistory } from "./history";
import type { Project } from "./types";

function sample(name: string): Project {
  return {
    id: "p1",
    name,
    settings: { defaultMaterial: "MDF", defaultThickness: 18 },
    panels: [],
    groups: [],
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    appVersion: "0.1.0",
    schemaVersion: 2,
  };
}

describe("createProjectHistory", () => {
  it("desfazer restaura estado anterior", () => {
    const h = createProjectHistory();
    const a = sample("A");
    const b = sample("B");
    h.record(a);
    const undone = h.undo(b);
    expect(undone?.name).toBe("A");
    expect(h.canRedo()).toBe(true);
  });

  it("refazer reaplica estado", () => {
    const h = createProjectHistory();
    const a = sample("A");
    const b = sample("B");
    h.record(a);
    h.undo(b);
    const redone = h.redo(a);
    expect(redone?.name).toBe("B");
  });
});
