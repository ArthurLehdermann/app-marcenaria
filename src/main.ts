import { createScene } from "./render/scene";
import { createGapDimensionsLayer } from "./render/gapDimensions";
import { createPanelMesh, updatePanelMesh, getPanelBody } from "./render/panelMesh";
import { applyHighlight } from "./render/highlight";
import { pickPanel } from "./render/picking";
import { findCollisions } from "./core/collision";
import { panelBox } from "./core/geometry";
import {
  exportProject, importProject, addPanel, updatePanel, removePanel,
  duplicatePanel, rotate90, cloneProject,
} from "./core/project";
import { saveProjectLocal, loadProjectLocal, clearProjectLocal } from "./core/projectStorage";
import { createProjectHistory } from "./core/history";
import {
  expandSelectionToGroups, createPanelGroup, ungroup, duplicateGroup,
  removeGroup, rotateGroup90, renameGroup, setGroupCenter, setGroupVisibility,
  nextGroupName, panelsInGroup, translatePanels, groupBBoxCenter,
} from "./core/groups";
import { reorderTopLevel, treeOrderAfterAddPanel } from "./core/treeOrder";
import { snapDragDelta } from "./core/snap";
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
import { setupOnboarding } from "./ui/onboarding";
import { setupMobileZoomLock } from "./ui/preventDoubleTapZoom";
import { setupMobileSplit } from "./ui/mobileSplit";
import { bindPressFeedback } from "./ui/touchFeedback";
import { setupProjectNameEdit } from "./ui/projectName";
import {
  createEditorState, clickSelect, setSelection, clearSelection,
  toggleGroupPickMode, toggleSnapEnabled, primarySelectedId,
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
    schemaVersion: 2,
  };
}

let project: Project = loadProjectLocal() ?? newProject();
const history = createProjectHistory();
const SNAP_PREF_KEY = "marcenaria_snap_v1";

function loadSnapEnabled(): boolean {
  try {
    return localStorage.getItem(SNAP_PREF_KEY) !== "0";
  } catch {
    return true;
  }
}

function saveSnapEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SNAP_PREF_KEY, enabled ? "1" : "0");
  } catch {
    /* quota / private mode */
  }
}

history.init(project);
let dragUndoSnapshot: Project | null = null;
let edState = createEditorState(loadSnapEnabled());

const projectNameEl = document.getElementById("project-name") as HTMLButtonElement;
const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const appEl = document.getElementById("app")!;

setupMobileZoomLock({ root: appEl, canvas });

const { scene, camera, controls, invalidate, renderer, isSpacePanActive } = createScene(canvas);
const gapDimensions = createGapDimensionsLayer(scene);
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
    const snapped = snapDragDelta(project, ids, delta, edState.snapEnabled);
    project = translatePanels(project, ids, snapped);
    syncMeshes();
    refreshPositionFields();
    saveProjectLocal(project);
  },
  onDragStart: () => {
    dragUndoSnapshot = cloneProject(project);
  },
  onDragEnd: (moved) => {
    if (moved && dragUndoSnapshot) {
      history.record(dragUndoSnapshot);
    }
    dragUndoSnapshot = null;
    if (moved) {
      refreshUI();
      syncHistoryButtons();
    }
  },
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
    group.traverse(obj => {
      obj.visible = panel.visible;
    });
  }
  gapDimensions.update(project, edState.selectedPanelIds);
  invalidate();
}

const hint = document.getElementById("viewport-hint")!;

function handleSelect(id: UUID, additive: boolean) {
  const panel = project.panels.find(p => p.id === id);
  if (!panel?.visible) return;

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

let mobileSplit: ReturnType<typeof setupMobileSplit>;

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

  projectNameHandle.sync();

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
  toolbarHandle.setSnapActive(edState.snapEnabled);
  toolbarHandle.setCanGroup(canCreateGroup());
  toolbarHandle.setCanNew(project.panels.length > 0);
  syncHistoryButtons();

  piecesD.update(project.panels);
  piecesM.update(project.panels);
  problemsD.update(collisions, project.panels);
  problemsM.update(collisions, project.panels);
  hint.classList.toggle("hidden", project.panels.length > 0);
  selectionDrag.notifySelectionChange();
  mobileMoveToggle.sync();
  mobileSplit?.setEnabled(edState.selectedPanelIds.length > 0);
}

function syncHistoryButtons() {
  toolbarHandle.setCanUndo(history.canUndo());
  toolbarHandle.setCanRedo(history.canRedo());
}

function mutate(next: Project) {
  history.record(project);
  project = { ...next, updatedAt: new Date().toISOString() };
  saveProjectLocal(project);
  syncMeshes();
  refreshUI();
}

function applyHistoryState(next: Project) {
  project = next;
  saveProjectLocal(project);
  syncMeshes();
  refreshUI();
}

function undo() {
  const prev = history.undo(project);
  if (!prev) return;
  applyHistoryState(prev);
}

function redo() {
  const next = history.redo(project);
  if (!next) return;
  applyHistoryState(next);
}

const toolbarHandle = createToolbar(document.getElementById("toolbar")!, {
  onNew: () => {
    if (!confirm("Criar novo projeto? O projeto atual será perdido.")) return;
    edState = createEditorState(loadSnapEnabled());
    const fresh = newProject();
    clearProjectLocal();
    history.init(fresh);
    project = fresh;
    saveProjectLocal(project);
    syncMeshes();
    refreshUI();
  },
  onOpen: () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".json";
    input.addEventListener("change", async () => {
      const file = input.files?.[0]; if (!file) return;
      try {
        const loaded = importProject(await file.text());
        edState = createEditorState(loadSnapEnabled());
        history.init(loaded);
        project = loaded;
        saveProjectLocal(project);
        syncMeshes();
        refreshUI();
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
  onUndo: undo,
  onRedo: redo,
  onToggleGroupPick: () => {
    edState = toggleGroupPickMode(edState);
    refreshUI();
  },
  onToggleSnap: () => {
    edState = toggleSnapEnabled(edState);
    saveSnapEnabled(edState.snapEnabled);
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

const projectNameHandle = setupProjectNameEdit(
  projectNameEl,
  () => project.name,
  (name) => {
    history.record(project);
    project = { ...project, name, updatedAt: new Date().toISOString() };
    saveProjectLocal(project);
    syncHistoryButtons();
    projectNameHandle.sync();
  },
);

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
const fabEl = document.getElementById("fab");
fabEl?.addEventListener("click", addNewPanel);
if (fabEl) bindPressFeedback(fabEl);
document.getElementById("viewport-hint")?.addEventListener("click", addNewPanel);

bindPressFeedback(document.getElementById("mobile-split-handle")!);
document.querySelectorAll<HTMLButtonElement>(".mnav-btn").forEach(bindPressFeedback);

const canvasDoubleTap = createDoubleTapHandler(() => openMobileProps());

function pickPanelAt(clientX: number, clientY: number): UUID | null {
  const rect = canvas.getBoundingClientRect();
  const ndc = new Vector2(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1,
  );
  const id = pickPanel(ndc, camera, [...meshMap.values()]);
  if (!id) return null;
  return project.panels.find(p => p.id === id)?.visible ? id : null;
}

canvas.addEventListener("touchend", (e) => {
  if (!isMobileViewport() || isSpacePanActive()) return;
  if (e.changedTouches.length !== 1) return;
  const touch = e.changedTouches[0]!;
  const id = pickPanelAt(touch.clientX, touch.clientY);
  if (!id) return;
  if (canvasDoubleTap(id, touch.clientX, touch.clientY)) {
    e.preventDefault();
  }
}, { passive: false });

canvas.addEventListener("click", (e) => {
  if (isSpacePanActive() || selectionDrag.consumeClick()) return;
  const id = pickPanelAt(e.clientX, e.clientY);
  if (!id) {
    edState = clearSelection(edState);
    refreshUI(); syncMeshes();
    closeMobileProps();
    return;
  }
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

function isMobileViewport() {
  return window.matchMedia("(max-width: 767px)").matches;
}

function onResize() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (!w || !h) return;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  invalidate();
}

mobileSplit = setupMobileSplit({
  app: document.getElementById("app")!,
  topbar: document.getElementById("topbar")!,
  handle: document.getElementById("mobile-split-handle")!,
  bottom: document.getElementById("mobile-bottom")!,
  isMobile: isMobileViewport,
  onLayoutChange: onResize,
});

window.addEventListener("resize", () => {
  mobileSplit.sync();
  onResize();
});

window.addEventListener("keydown", (e) => {
  if (e.target && (e.target as HTMLElement).closest("input, textarea, select, [contenteditable]")) return;
  const mod = e.ctrlKey || e.metaKey;
  if (!mod) return;
  if (e.key === "z" && !e.shiftKey) {
    e.preventDefault();
    undo();
  } else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
    e.preventDefault();
    redo();
  }
});

requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    mobileSplit.sync();
    onResize();
    syncMeshes();
    refreshUI();
    setupOnboarding();
  });
});
