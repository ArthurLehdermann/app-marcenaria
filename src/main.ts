import { createScene } from "./render/scene";
import { createPanelMesh, updateMeshTransform } from "./render/panelMesh";
import { applyHighlight } from "./render/highlight";
import { pickPanel } from "./render/picking";
import { findCollisions } from "./core/collision";
import { exportProject, importProject, addPanel, updatePanel, removePanel, duplicatePanel, rotate90 } from "./core/project";
import { buildWhatsappOrder, buildCsv } from "./core/order";
import { createPanelTree } from "./ui/tree";
import { createPropertiesPanel } from "./ui/properties";
import { createPiecesPanel } from "./ui/piecesPanel";
import { createProblemsPanel } from "./ui/problemsPanel";
import { createToolbar } from "./ui/toolbar";
import { createEditorState, selectPanel, hoverPanel } from "./editorState";
import type { Project, Panel, UUID } from "./core/types";
import { Vector2 } from "three";
import type { Mesh } from "three";

// ── estado ────────────────────────────────────────────────────────────────────

function newProject(): Project {
  return {
    id: crypto.randomUUID(),
    name: "Sem título",
    settings: { defaultMaterial: "MDF 18 mm", defaultThickness: 18 },
    panels: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    appVersion: "0.1.0",
    schemaVersion: 1,
  };
}

let project: Project = newProject();
let edState = createEditorState();

// ── render ────────────────────────────────────────────────────────────────────

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const { scene, camera, invalidate, renderer } = createScene(canvas);

const meshMap = new Map<UUID, Mesh>();

function syncMeshes() {
  const ids = new Set(project.panels.map(p => p.id));

  // remove meshes de paineis deletados
  for (const [id, mesh] of meshMap) {
    if (!ids.has(id)) {
      scene.remove(mesh);
      meshMap.delete(id);
    }
  }

  const collisions = findCollisions(project.panels);
  const collisionIds = new Set(collisions.flatMap(c => [c.a, c.b]));

  for (const panel of project.panels) {
    let mesh = meshMap.get(panel.id);
    if (!mesh) {
      mesh = createPanelMesh(panel);
      meshMap.set(panel.id, mesh);
      scene.add(mesh);
    } else {
      updateMeshTransform(mesh, panel);
    }

    const state = collisionIds.has(panel.id) ? "collision"
      : panel.id === edState.selectedPanelId ? "selected"
      : "normal";
    applyHighlight(mesh, state, panel.color);
    mesh.visible = panel.visible;
  }

  invalidate();
}

// ── ui ────────────────────────────────────────────────────────────────────────

const treeEl        = document.getElementById("panel-tree")!;
const propsEl       = document.getElementById("properties")!;
const piecesEl      = document.getElementById("pieces-panel")!;
const problemsEl    = document.getElementById("problems-panel")!;
const toolbarEl     = document.getElementById("toolbar")!;

function refreshUI() {
  const collisions = findCollisions(project.panels);
  const collisionIds = new Set(collisions.flatMap(c => [c.a, c.b]));

  tree.update(project.panels, edState.selectedPanelId, collisionIds);
  props.update(project.panels.find(p => p.id === edState.selectedPanelId) ?? null);
  pieces.update(project.panels);
  problems.update(collisions, project.panels);
}

function mutate(next: Project) {
  project = next;
  syncMeshes();
  refreshUI();
}

const tree = createPanelTree(treeEl, {
  onSelect: (id) => {
    edState = selectPanel(edState, id);
    refreshUI();
    syncMeshes();
  },
  onVisibilityToggle: (id, visible) => mutate(updatePanel(project, id, { visible })),
});

const props = createPropertiesPanel(propsEl, {
  onChange: (id, patch) => mutate(updatePanel(project, id, patch)),
  onDuplicate: (id) => mutate(duplicatePanel(project, id)),
  onDelete: (id) => {
    edState = selectPanel(edState, undefined);
    mutate(removePanel(project, id));
  },
  onRotate: (id) => mutate(rotate90(project, id)),
});

const pieces = createPiecesPanel(piecesEl);
const problems = createProblemsPanel(problemsEl);

createToolbar(toolbarEl, {
  onNew: () => {
    if (!confirm("Criar novo projeto? O projeto atual será perdido.")) return;
    edState = createEditorState();
    mutate(newProject());
  },
  onOpen: () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        edState = createEditorState();
        mutate(importProject(text));
      } catch (e) {
        alert(`Erro ao abrir: ${(e as Error).message}`);
      }
    });
    input.click();
  },
  onSave: () => {
    const blob = exportProject(project);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },
  onExport: () => {
    const text = buildWhatsappOrder(project);
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  },
});

// ── picking por clique ────────────────────────────────────────────────────────

canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const ndc = new Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1,
  );
  const meshes = [...meshMap.values()];
  const id = pickPanel(ndc, camera, meshes);
  edState = selectPanel(edState, id ?? undefined);
  refreshUI();
  syncMeshes();
});

// ── botao adicionar painel ────────────────────────────────────────────────────

document.getElementById("btn-add-panel")?.addEventListener("click", () => {
  const panel: Panel = {
    id: crypto.randomUUID(),
    type: "",
    name: "Painel",
    width: 400,
    height: 600,
    thickness: project.settings.defaultThickness,
    position: { x: 0, y: 0, z: 0 },
    upAxis: "y",
    edges: { top: false, bottom: false, left: false, right: false },
    color: "#" + Math.floor(Math.random() * 0xaaaaaa + 0x333333).toString(16).padStart(6, "0"),
    visible: true,
  };
  mutate(addPanel(project, panel));
});

// ── resize ────────────────────────────────────────────────────────────────────

window.addEventListener("resize", () => {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  invalidate();
});

// ── init ──────────────────────────────────────────────────────────────────────

syncMeshes();
refreshUI();
