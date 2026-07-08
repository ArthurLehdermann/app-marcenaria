import { createScene } from "./render/scene";
import { createPanelMesh, updatePanelMesh, getPanelBody } from "./render/panelMesh";
import { applyHighlight } from "./render/highlight";
import { pickPanel } from "./render/picking";
import { findCollisions } from "./core/collision";
import { panelBox } from "./core/geometry";
import {
  exportProject, importProject, addPanel, updatePanel, removePanel,
  duplicatePanel, rotate90,
} from "./core/project";
import {
  expandSelectionToGroups, createPanelGroup, ungroup, duplicateGroup,
  removeGroup, rotateGroup90, renameGroup, setGroupCenter, setGroupVisibility,
  nextGroupName, panelsInGroup, translatePanels, groupBBoxCenter,
} from "./core/groups";
import { reorderTopLevel, treeOrderAfterAddPanel } from "./core/treeOrder";
import { setupSelectionDrag } from "./render/selectionDrag";
import { setupMobileMoveToggle } from "./ui/mobileMoveToggle";
import { buildWhatsappOrder } from "./core/order";
import { createPanelTree } from "./ui/tree";
import { createPropertiesPanel } from "./ui/properties";
import { createGroupPropertiesPanel } from "./ui/groupProperties";
import { createMultiSelectPanel } from "./ui/multiSelectPanel";
import { createPiecesPanel } from "./ui/piecesPanel";
import { createProblemsPanel } from "./ui/problemsPanel";
import { createToolbar } from "./ui/toolbar";
import { createDoubleTapHandler } from "./ui/doubleTap";
import {
  createEditorState, clickSelect, setSelection, clearSelection,
  toggleGroupPickMode, primarySelectedId,
} from "./editorState";
import type { Project, Panel, UUID } from "./core/types";
import { Vector2 } from "three";
import type { Group } from "three";

function newProject(): Project {
  return {
    id: crypto.randomUUID(),
    name: "Sem título",
    settings: { defaultMaterial: "MDF 18 mm", defaultThickness: 18 },
    panels: [],
    groups: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    appVersion: "0.1.0",
    schemaVersion: 1,
  };
}

let project: Project = newProject();
let edState = createEditorState();

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const { scene, camera, controls, invalidate, renderer, isSpacePanActive } = createScene(canvas);
const meshMap = new Map<UUID, Group>();

const selectionDrag = setupSelectionDrag({
  canvas,
  camera,
  controls,
  isSpacePanActive,
  getSelectedPanelIds: () => expandedSelection(),
  getAnchorPoint: (ids) => {
    const panels = ids
      .map(id => project.panels.find(p => p.id === id))
      .filter((p): p is Panel => Boolean(p));
    return groupBBoxCenter(panels);
  },
  onTranslate: (ids, delta) => {
    project = translatePanels(project, ids, delta);
    syncMeshes();
    refreshPositionFields();
  },
  onDragEnd: () => refreshUI(),
});

const mobileMoveToggle = setupMobileMoveToggle(
  document.getElementById("btn-mobile-move") as HTMLButtonElement,
  {
    isActive: () => selectionDrag.isTouchMoveMode(),
    toggle: () => selectionDrag.toggleTouchMoveMode(),
    canUse: () => selectionDrag.canTouchMove(),
  },
);

function expandedSelection(): UUID[] {
  return expandSelectionToGroups(project, edState.selectedPanelIds);
}

function activeGroupId(): UUID | null {
  const ids = expandedSelection();
  if (!ids.length) return null;
  const gids = new Set(
    ids.map(id => project.panels.find(p => p.id === id)?.groupId).filter(Boolean) as UUID[],
  );
  if (gids.size === 1) return [...gids][0];
  return null;
}

function canCreateGroup(): boolean {
  if (edState.selectedPanelIds.length < 2) return false;
  const inGroup = edState.selectedPanelIds.filter(id => project.panels.find(p => p.id === id)?.groupId);
  return inGroup.length === 0;
}

function fitToContent() {
  if (!project.panels.length) return;
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (const p of project.panels) {
    const b = panelBox(p);
    minX = Math.min(minX, b.min.x); maxX = Math.max(maxX, b.max.x);
    minY = Math.min(minY, b.min.y); maxY = Math.max(maxY, b.max.y);
    minZ = Math.min(minZ, b.min.z); maxZ = Math.max(maxZ, b.max.z);
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const cz = (minZ + maxZ) / 2;
  const size = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 200);
  controls.target.set(cx, cy, cz);
  camera.position.set(cx, cy + size * 0.4, cz + size * 1.8);
  camera.updateProjectionMatrix();
  controls.update();
  invalidate();
}

function syncMeshes() {
  const ids = new Set(project.panels.map(p => p.id));
  for (const [id, mesh] of meshMap) {
    if (!ids.has(id)) { scene.remove(mesh); meshMap.delete(id); }
  }
  const collisions = findCollisions(project.panels);
  const collisionIds = new Set(collisions.flatMap(c => [c.a, c.b]));
  const selected = new Set(expandedSelection());

  for (const panel of project.panels) {
    let group = meshMap.get(panel.id);
    if (!group) {
      group = createPanelMesh(panel);
      meshMap.set(panel.id, group);
      scene.add(group);
    } else {
      updatePanelMesh(group, panel);
    }
    const state = collisionIds.has(panel.id) ? "collision"
      : selected.has(panel.id) ? "selected"
      : "normal";
    applyHighlight(getPanelBody(group), state, panel.color);
    group.visible = panel.visible;
  }
  invalidate();
}

const hint = document.getElementById("viewport-hint")!;

function handleSelect(id: UUID, additive: boolean) {
  const useAdditive = additive || edState.groupPickMode;
  if (useAdditive) {
    edState = clickSelect(edState, id, true);
  } else {
    const panel = project.panels.find(p => p.id === id);
    if (panel?.groupId) {
      const members = panelsInGroup(project, panel.groupId).map(p => p.id);
      edState = setSelection(edState, members);
    } else {
      edState = setSelection(edState, [id]);
    }
  }
  refreshUI();
  syncMeshes();
}

function handleSelectGroup(groupId: UUID) {
  const members = panelsInGroup(project, groupId).map(p => p.id);
  edState = setSelection(edState, members);
  refreshUI();
  syncMeshes();
}

function doGroup(name?: string) {
  const ids = edState.selectedPanelIds.filter(id => !project.panels.find(p => p.id === id)?.groupId);
  if (ids.length < 2) return;
  const groupName = name?.trim() || nextGroupName(project);
  const next = createPanelGroup(project, ids, groupName);
  const newGroup = next.groups.find(g => !project.groups.some(og => og.id === g.id));
  mutate(next);
  if (newGroup) {
    edState = setSelection(
      { ...edState, groupPickMode: false },
      panelsInGroup(project, newGroup.id).map(p => p.id),
    );
  } else {
    edState = { ...edState, groupPickMode: false };
  }
  toolbarHandle.setGroupPickActive(false);
}

const panelCallbacks = {
  onSelect: handleSelect,
  onSelectGroup: handleSelectGroup,
  onVisibilityToggle: (id: UUID, visible: boolean) => mutate(updatePanel(project, id, { visible })),
  onGroupVisibilityToggle: (gid: UUID, visible: boolean) => mutate(setGroupVisibility(project, gid, visible)),
  onReorderTopLevel: (activeId: UUID, overId: UUID, place: "before" | "after") =>
    mutate(reorderTopLevel(project, activeId, overId, place)),
};

const propsCallbacks = {
  onChange: (id: UUID, patch: Partial<Panel>) => mutate(updatePanel(project, id, patch)),
  onDuplicate: (id: UUID) => mutate(duplicatePanel(project, id)),
  onDelete: (id: UUID) => {
    edState = clearSelection(edState);
    closeMobileProps();
    mutate(removePanel(project, id));
  },
  onRotate: (id: UUID) => mutate(rotate90(project, id)),
};

const groupPropsCallbacks = {
  onRename: (gid: UUID, name: string) => mutate(renameGroup(project, gid, name)),
  onMoveCenter: (gid: UUID, x: number, y: number, z: number) =>
    mutate(setGroupCenter(project, gid, { x, y, z })),
  onDuplicate: (gid: UUID) => mutate(duplicateGroup(project, gid)),
  onRotate: (gid: UUID) => mutate(rotateGroup90(project, gid)),
  onUngroup: (gid: UUID) => {
    mutate(ungroup(project, gid));
    edState = clearSelection(edState);
  },
  onDelete: (gid: UUID) => {
    if (!confirm("Excluir todas as peças deste grupo?")) return;
    edState = clearSelection(edState);
    closeMobileProps();
    mutate(removeGroup(project, gid));
  },
  onToggleVisibility: (gid: UUID, visible: boolean) =>
    mutate(setGroupVisibility(project, gid, visible)),
};

const treeD = createPanelTree(document.getElementById("panel-tree")!, panelCallbacks);
const treeM = createPanelTree(document.getElementById("m-panel-tree")!, {
  ...panelCallbacks,
  onOpenProps: () => openMobileProps(),
});
const propsD = createPropertiesPanel(document.getElementById("properties")!, propsCallbacks);
const propsM = createPropertiesPanel(document.getElementById("m-properties")!, propsCallbacks, { layout: "tabs" });
const groupPropsD = createGroupPropertiesPanel(document.getElementById("properties")!, groupPropsCallbacks);
const groupPropsM = createGroupPropertiesPanel(document.getElementById("m-properties")!, groupPropsCallbacks);
const multiD = createMultiSelectPanel(document.getElementById("properties")!, {
  onGroup: name => doGroup(name),
  onClear: () => { edState = clearSelection(edState); refreshUI(); syncMeshes(); },
});
const multiM = createMultiSelectPanel(document.getElementById("m-properties")!, {
  onGroup: name => doGroup(name),
  onClear: () => { edState = clearSelection(edState); refreshUI(); syncMeshes(); },
});
const piecesD = createPiecesPanel(document.getElementById("pieces-panel")!);
const piecesM = createPiecesPanel(document.getElementById("m-pieces-panel")!);
const problemsD = createProblemsPanel(document.getElementById("problems-panel")!);
const problemsM = createProblemsPanel(document.getElementById("m-problems-panel")!);

function refreshPositionFields() {
  const gid = activeGroupId();
  if (gid) {
    const center = groupBBoxCenter(panelsInGroup(project, gid));
    groupPropsD.syncPosition(center);
    groupPropsM.syncPosition(center);
    return;
  }
  if (edState.selectedPanelIds.length !== 1) return;
  const p = project.panels.find(x => x.id === edState.selectedPanelIds[0]);
  if (!p || p.groupId) return;
  propsD.syncPosition(p.position);
  propsM.syncPosition(p.position);
}

function refreshUI() {
  const collisions = findCollisions(project.panels);
  const collisionIds = new Set(collisions.flatMap(c => [c.a, c.b]));
  const gid = activeGroupId();

  treeD.update(project, edState.selectedPanelIds, collisionIds, edState.groupPickMode);
  treeM.update(project, edState.selectedPanelIds, collisionIds, edState.groupPickMode);

  propsD.update(null);
  propsM.update(null);
  groupPropsD.update(project, null);
  groupPropsM.update(project, null);
  multiD.update(0);
  multiM.update(0);

  if (gid) {
    groupPropsD.update(project, gid);
    groupPropsM.update(project, gid);
  } else if (edState.selectedPanelIds.length === 1) {
    const p = project.panels.find(x => x.id === edState.selectedPanelIds[0]) ?? null;
    if (p?.groupId) {
      groupPropsD.update(project, p.groupId);
      groupPropsM.update(project, p.groupId);
    } else {
      propsD.update(p);
      propsM.update(p);
    }
  } else if (edState.selectedPanelIds.length >= 2) {
    multiD.update(edState.selectedPanelIds.length);
    multiM.update(edState.selectedPanelIds.length);
  }

  toolbarHandle.setGroupPickActive(edState.groupPickMode);
  toolbarHandle.setCanGroup(canCreateGroup());
  toolbarHandle.setCanNew(project.panels.length > 0);

  piecesD.update(project.panels);
  piecesM.update(project.panels);
  problemsD.update(collisions, project.panels);
  problemsM.update(collisions, project.panels);
  hint.classList.toggle("hidden", project.panels.length > 0);
  selectionDrag.notifySelectionChange();
  mobileMoveToggle.sync();
}

function mutate(next: Project) {
  project = next;
  syncMeshes();
  refreshUI();
}

const toolbarHandle = createToolbar(document.getElementById("toolbar")!, {
  onNew: () => {
    if (!confirm("Criar novo projeto? O projeto atual será perdido.")) return;
    edState = createEditorState();
    mutate(newProject());
  },
  onOpen: () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".json";
    input.addEventListener("change", async () => {
      const file = input.files?.[0]; if (!file) return;
      try {
        edState = createEditorState();
        mutate(importProject(await file.text()));
        fitToContent();
      } catch (e) { alert(`Erro ao abrir: ${(e as Error).message}`); }
    });
    input.click();
  },
  onSave: () => {
    const blob = exportProject(project);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${project.name}.json`; a.click();
    URL.revokeObjectURL(url);
  },
  onExport: () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(buildWhatsappOrder(project))}`, "_blank");
  },
  onToggleGroupPick: () => {
    edState = toggleGroupPickMode(edState);
    refreshUI();
  },
  onGroupSelected: () => {
    const name = prompt("Nome do grupo:", nextGroupName(project));
    if (name === null) return;
    doGroup(name);
  },
}, {
  wrap: document.getElementById("toolbar-wrap")!,
  toggle: document.getElementById("btn-toolbar-menu")!,
  overlay: document.getElementById("toolbar-menu-overlay")!,
});

function addNewPanel() {
  const panel: Panel = {
    id: crypto.randomUUID(), name: "Painel",
    width: 400, height: 600,
    thickness: project.settings.defaultThickness,
    position: { x: 0, y: 0, z: 0 },
    upAxis: "y",
    edges: { top: false, bottom: false, left: false, right: false },
    color: "#ffffff",
    visible: true,
  };
  mutate(treeOrderAfterAddPanel(addPanel(project, panel), panel.id));
  fitToContent();
}

document.getElementById("btn-add-panel")?.addEventListener("click", addNewPanel);
document.getElementById("fab")?.addEventListener("click", addNewPanel);
document.getElementById("viewport-hint")?.addEventListener("click", addNewPanel);

const canvasDoubleTap = createDoubleTapHandler(() => openMobileProps());

function pickPanelAt(clientX: number, clientY: number): UUID | null {
  const rect = canvas.getBoundingClientRect();
  const ndc = new Vector2(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1,
  );
  return pickPanel(ndc, camera, [...meshMap.values()]);
}

canvas.addEventListener("click", (e) => {
  if (isSpacePanActive() || selectionDrag.consumeClick()) return;
  const id = pickPanelAt(e.clientX, e.clientY);
  if (!id) {
    edState = clearSelection(edState);
    refreshUI(); syncMeshes();
    closeMobileProps();
    return;
  }
  if (isMobileViewport() && canvasDoubleTap(id, e.clientX, e.clientY)) return;
  handleSelect(id, e.shiftKey);
});

canvas.addEventListener("dblclick", (e) => {
  if (!isMobileViewport() || isSpacePanActive() || selectionDrag.consumeClick()) return;
  const id = pickPanelAt(e.clientX, e.clientY);
  if (!id || !edState.selectedPanelIds.includes(id)) return;
  e.preventDefault();
  openMobileProps();
});

document.querySelectorAll<HTMLButtonElement>(".mnav-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const pane = btn.dataset.pane!;
    document.querySelectorAll(".mnav-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll<HTMLElement>(".mpane").forEach(p => p.classList.add("hidden"));
    document.getElementById(`m-pane-${pane}`)?.classList.remove("hidden");
  });
});

const mPropsSheet = document.getElementById("m-props-sheet")!;
const mPropsOverlay = document.getElementById("m-props-overlay")!;

function isMobileViewport() {
  return window.matchMedia("(max-width: 767px)").matches;
}

function openMobileProps() {
  if (!isMobileViewport() || edState.selectedPanelIds.length === 0) return;
  mPropsSheet.classList.add("open");
  mPropsOverlay.classList.add("open");
}
function closeMobileProps() {
  mPropsSheet.classList.remove("open");
  mPropsOverlay.classList.remove("open");
}

document.getElementById("btn-close-props")?.addEventListener("click", closeMobileProps);
mPropsOverlay.addEventListener("click", closeMobileProps);

function onResize() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (!w || !h) return;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  invalidate();
}

window.addEventListener("resize", onResize);

requestAnimationFrame(() => {
  onResize();
  syncMeshes();
  refreshUI();
});
