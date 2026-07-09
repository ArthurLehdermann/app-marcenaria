import { describe, it, expect } from "vitest";
import {
  defaultTopLevelOrder,
  reorderTopLevel,
  reorderGroupMember,
  treeOrderAfterCreateGroup,
  treeOrderAfterUngroup,
  resolveMemberOrder,
} from "./treeOrder";
import type { Panel, Project, UUID } from "./types";

function makePanel(over: Partial<Panel> = {}): Panel {
  return {
    id: over.id ?? "p1", name: over.name ?? "Painel",
    width: 720, height: 560, thickness: 18,
    position: { x: 0, y: 0, z: 0 }, upAxis: "y",
    edges: { top: false, bottom: false, left: false, right: false },
    color: "#ccc", visible: true,
    groupId: over.groupId,
  };
}

function makeProject(panels: Panel[], groups: Project["groups"] = [], treeOrder?: UUID[]): Project {
  return {
    id: "p", name: "t", settings: { defaultMaterial: "MDF", defaultThickness: 18 },
    panels, groups, treeOrder,
    createdAt: "", updatedAt: "", appVersion: "0.1.0", schemaVersion: 2,
  };
}

describe("treeOrder", () => {
  it("ordem padrao: grupos antes de pecas soltas", () => {
    const proj = makeProject(
      [makePanel({ id: "a" }), makePanel({ id: "b", groupId: "g1" }), makePanel({ id: "c", groupId: "g1" })],
      [{ id: "g1", name: "Bloco" }],
    );
    expect(defaultTopLevelOrder(proj)).toEqual(["g1", "a"]);
  });

  it("reorderTopLevel move bloco ou peca solta", () => {
    const proj = makeProject(
      [makePanel({ id: "a" }), makePanel({ id: "b" })],
      [],
      ["a", "b"],
    );
    const next = reorderTopLevel(proj, "b", "a", "before");
    expect(next.treeOrder).toEqual(["b", "a"]);
  });

  it("agrupar substitui pecas pelo id do grupo", () => {
    const proj = makeProject(
      [makePanel({ id: "a" }), makePanel({ id: "b" }), makePanel({ id: "c" })],
      [{ id: "g1", name: "Bloco" }],
      ["a", "b", "c"],
    );
    const next = treeOrderAfterCreateGroup(proj, ["b", "c"], "g1");
    expect(next.treeOrder).toEqual(["a", "g1"]);
    expect(next.groups[0].memberOrder).toEqual(["b", "c"]);
  });

  it("desagrupar expande grupo em pecas", () => {
    const proj = makeProject(
      [makePanel({ id: "a", groupId: "g1" }), makePanel({ id: "b", groupId: "g1" })],
      [{ id: "g1", name: "Bloco", memberOrder: ["b", "a"] }],
      ["g1"],
    );
    const next = treeOrderAfterUngroup(proj, "g1");
    expect(next.treeOrder).toEqual(["b", "a"]);
  });

  it("reorderGroupMember reordena dentro do bloco", () => {
    const proj = makeProject(
      [makePanel({ id: "a", groupId: "g1" }), makePanel({ id: "b", groupId: "g1" })],
      [{ id: "g1", name: "Bloco", memberOrder: ["a", "b"] }],
    );
    const next = reorderGroupMember(proj, "g1", "b", "a", "before");
    expect(resolveMemberOrder(next, "g1")).toEqual(["b", "a"]);
  });
});
