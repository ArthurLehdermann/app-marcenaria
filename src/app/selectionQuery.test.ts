import { describe, it, expect } from "vitest";
import type { Panel, Project } from "../core/types";
import { activeGroupId, canCreateGroup, expandedSelection } from "./selectionQuery";

function makePanel(over: Partial<Panel> = {}): Panel {
  return {
    id: over.id ?? "p1",
    name: over.name ?? "painel",
    width: over.width ?? 720,
    height: over.height ?? 560,
    thickness: over.thickness ?? 18,
    position: { x: 0, y: 0, z: 0 },
    upAxis: "y",
    edges: over.edges ?? { top: false, bottom: false, left: false, right: false },
    color: "#ccc",
    visible: true,
    groupId: over.groupId,
  };
}

function makeProject(panels: Panel[], groups: Project["groups"] = []): Project {
  return {
    id: "p", name: "t", settings: { defaultMaterial: "MDF", defaultThickness: 18 },
    panels, groups, createdAt: "", updatedAt: "", appVersion: "0.1.0", schemaVersion: 2,
  };
}

describe("selectionQuery", () => {
  it("expandedSelection inclui membros do grupo", () => {
    const project = makeProject(
      [makePanel({ id: "a", groupId: "g1" }), makePanel({ id: "b", groupId: "g1" })],
      [{ id: "g1", name: "Caixote" }],
    );
    expect(expandedSelection(project, ["a"]).sort()).toEqual(["a", "b"]);
  });

  it("activeGroupId so quando todos os membros estao selecionados", () => {
    const project = makeProject(
      [makePanel({ id: "a", groupId: "g1" }), makePanel({ id: "b", groupId: "g1" })],
      [{ id: "g1", name: "Caixote" }],
    );
    expect(activeGroupId(project, ["a"])).toBeNull();
    expect(activeGroupId(project, ["a", "b"])).toBe("g1");
  });

  it("canCreateGroup exige 2+ pecas soltas", () => {
    const solo = makeProject([makePanel({ id: "a" }), makePanel({ id: "b" })]);
    expect(canCreateGroup(solo, ["a"])).toBe(false);
    expect(canCreateGroup(solo, ["a", "b"])).toBe(true);

    const mixed = makeProject(
      [makePanel({ id: "a" }), makePanel({ id: "b", groupId: "g1" })],
      [{ id: "g1", name: "Caixote" }],
    );
    expect(canCreateGroup(mixed, ["a", "b"])).toBe(false);
  });
});
