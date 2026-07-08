import { describe, it, expect } from "vitest";
import {
  createPanelGroup, ungroup, expandSelectionToGroups, duplicateGroup,
  panelsInGroup, setGroupCenter, groupBBoxCenter,
} from "./groups";
import type { Panel, Project } from "./types";

function makePanel(over: Partial<Panel> = {}): Panel {
  return {
    id: over.id ?? crypto.randomUUID(),
    type: "", name: over.name ?? "p",
    width: 400, height: 600, thickness: 18,
    position: over.position ?? { x: 0, y: 0, z: 0 },
    upAxis: "y",
    edges: { top: false, bottom: false, left: false, right: false },
    color: "#fff", visible: true,
    groupId: over.groupId,
  };
}

function makeProject(panels: Panel[], groups: Project["groups"] = []): Project {
  return {
    id: "proj", name: "t", settings: { defaultMaterial: "MDF", defaultThickness: 18 },
    panels, groups, createdAt: "", updatedAt: "", appVersion: "0.1.0", schemaVersion: 1,
  };
}

describe("createPanelGroup", () => {
  it("agrupa 2+ paineis com nome", () => {
    const a = makePanel({ id: "a" });
    const b = makePanel({ id: "b", position: { x: 500, y: 0, z: 0 } });
    const next = createPanelGroup(makeProject([a, b]), ["a", "b"], "Caixote");
    expect(next.groups).toHaveLength(1);
    expect(next.groups[0].name).toBe("Caixote");
    expect(panelsInGroup(next, next.groups[0].id)).toHaveLength(2);
  });

  it("nao agrupa com menos de 2", () => {
    const a = makePanel({ id: "a" });
    const next = createPanelGroup(makeProject([a]), ["a"], "X");
    expect(next.groups).toHaveLength(0);
  });
});

describe("expandSelectionToGroups", () => {
  it("clicar num membro expande para o grupo inteiro", () => {
    const a = makePanel({ id: "a", groupId: "g1" });
    const b = makePanel({ id: "b", groupId: "g1" });
    const p = makeProject([a, b], [{ id: "g1", name: "G" }]);
    expect(expandSelectionToGroups(p, ["a"])).toEqual(["a", "b"]);
  });
});

describe("setGroupCenter", () => {
  it("move todas as pecas mantendo offset relativo", () => {
    const a = makePanel({ id: "a", groupId: "g1", position: { x: 0, y: 0, z: 0 } });
    const b = makePanel({ id: "b", groupId: "g1", position: { x: 500, y: 0, z: 0 } });
    const p = makeProject([a, b], [{ id: "g1", name: "G" }]);
    const before = groupBBoxCenter(panelsInGroup(p, "g1"));
    const next = setGroupCenter(p, "g1", { x: before.x + 100, y: before.y, z: before.z });
    const after = groupBBoxCenter(panelsInGroup(next, "g1"));
    expect(after.x - before.x).toBeCloseTo(100);
    const da = next.panels.find(x => x.id === "a")!.position.x;
    expect(da).toBeCloseTo(100);
  });
});

describe("ungroup", () => {
  it("remove groupId das pecas", () => {
    const a = makePanel({ id: "a", groupId: "g1" });
    const b = makePanel({ id: "b", groupId: "g1" });
    const p = makeProject([a, b], [{ id: "g1", name: "G" }]);
    const next = ungroup(p, "g1");
    expect(next.groups).toHaveLength(0);
    expect(next.panels.every(x => !x.groupId)).toBe(true);
  });
});

describe("duplicateGroup", () => {
  it("duplica todas as pecas com novo grupo", () => {
    const a = makePanel({ id: "a", groupId: "g1" });
    const b = makePanel({ id: "b", groupId: "g1", position: { x: 500, y: 0, z: 0 } });
    const p = makeProject([a, b], [{ id: "g1", name: "G" }]);
    const next = duplicateGroup(p, "g1");
    expect(next.panels).toHaveLength(4);
    expect(next.groups).toHaveLength(2);
  });
});
