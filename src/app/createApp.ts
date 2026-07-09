import { findCollisions } from "../core/collision";
import { createScene } from "../render/scene";
import { createGapDimensionsLayer } from "../render/gapDimensions";
import { cloneProject, exportProject, importProject, addPanel, updatePanel, removePanel, duplicatePanel, rotate90, positionForNewPanel } from "../core/project";
import { saveProjectLocal, loadProjectLocal, clearProjectLocal } from "../core/projectStorage";
import { createProjectHistory } from "../core/history";
import {
  createPanelGroup, ungroup, duplicateGroup, removeGroup, rotateGroup90,
  renameGroup, setGroupOrigin, setGroupVisibility, nextGroupName, panelsInGroup,
  translatePanels, groupBBoxCenter, groupBBox,
} from "../core/groups";
import { reorderTopLevel, treeOrderAfterAddPanel } from "../core/treeOrder";
import { snapDragDelta } from "../core/snap";
import { setupSelectionDrag } from "../render/selectionDrag";
import { setupMobileMoveToggle } from "../ui/mobileMoveToggle";
import { buildWhatsappOrder } from "../core/order";
import { createPanelTree } from "../ui/tree";
import { createPropertiesPanel } from "../ui/properties";
import { createGroupPropertiesPanel } from "../ui/groupProperties";
import { createMultiSelectPanel } from "../ui/multiSelectPanel";
import { createPiecesPanel } from "../ui/piecesPanel";
import { createProblemsPanel } from "../ui/problemsPanel";
import { createToolbar } from "../ui/toolbar";
import { setupOnboarding } from "../ui/onboarding";
import { setupMobileZoomLock } from "../ui/preventDoubleTapZoom";
import { setupMobileSplit } from "../ui/mobileSplit";
import { bindPressFeedback } from "../ui/touchFeedback";
import { setupProjectNameEdit } from "../ui/projectName";
import {
  createEditorState, clickSelect, setSelection, clearSelection,
  toggleGroupPickMode, toggleSnapEnabled,
} from "../editorState";
import type { Panel, Project, UUID } from "../core/types";
import type { Group } from "three";

import { newProject } from "./newProject";
import { loadSnapEnabled, saveSnapEnabled } from "./snapPreference";
import { activeGroupId, canCreateGroup, expandedSelection } from "./selectionQuery";
import { createSceneSync } from "./sceneSync";
import { createMobilePropsSheet, isMobileViewport } from "./mobileProps";
import { setupCanvasInput } from "./canvasInput";

export function createApp() {
  let project: Project = loadProjectLocal() ?? newProject();
  const history = createProjectHistory();
  history.init(project);
  let dragUndoSnapshot: Project | null = null;
  let edState = createEditorState(loadSnapEnabled());

  const projectNameEl = document.getElementById("project-name") as HTMLButtonElement;
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  const appEl = document.getElementById("app")!;
  const hint = document.getElementById("viewport-hint")!;
  const mPropsSheet = document.getElementById("m-props-sheet")!;
  const mPropsOverlay = document.getElementById("m-props-overlay")!;

  setupMobileZoomLock({ root: appEl, canvas });

  const { scene, camera, controls, invalidate, renderer, isSpacePanActive } = createScene(canvas);
  const gapDimensions = createGapDimensionsLayer(scene);
  const meshMap = new Map<UUID, Group>();

  const { syncMeshes, fitToContent } = createSceneSync({
    scene,
    gapDimensions,
    invalidate,
    meshMap,
    getProject: () => project,
    getSelectedIds: () => edState.selectedPanelIds,
    camera,
    controls,
  });

  const { openMobileProps, closeMobileProps } = createMobilePropsSheet({
    sheet: mPropsSheet,
    overlay: mPropsOverlay,
    getSelectedCount: () => edState.selectedPanelIds.length,
  });

  let mobileSplit: ReturnType<typeof setupMobileSplit>;

  function refreshPositionFields() {
    const gid = activeGroupId(project, edState.selectedPanelIds);
    if (gid) {
      const box = groupBBox(panelsInGroup(project, gid));
      if (box) {
        groupPropsD.syncPosition(box.min);
        groupPropsM.syncPosition(box.min);
      }
      return;
    }
    if (edState.selectedPanelIds.length !== 1) return;
    const p = project.panels.find(x => x.id === edState.selectedPanelIds[0]);
    if (!p || p.groupId) return;
    propsD.syncPosition(p.position);
    propsM.syncPosition(p.position);
  }

  function syncHistoryButtons() {
    toolbarHandle.setCanUndo(history.canUndo());
    toolbarHandle.setCanRedo(history.canRedo());
  }

  function refreshUI() {
    const collisions = findCollisions(project.panels);
    const collisionIds = new Set(collisions.flatMap(c => [c.a, c.b]));
    const gid = activeGroupId(project, edState.selectedPanelIds);

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
      propsD.update(p);
      propsM.update(p);
    } else if (edState.selectedPanelIds.length >= 2) {
      multiD.update(edState.selectedPanelIds.length);
      multiM.update(edState.selectedPanelIds.length);
    }

    toolbarHandle.setGroupPickActive(edState.groupPickMode);
    toolbarHandle.setSnapActive(edState.snapEnabled);
    toolbarHandle.setCanGroup(canCreateGroup(project, edState.selectedPanelIds));
    toolbarHandle.setCanNew(project.panels.length > 0);
    syncHistoryButtons();

    piecesD.update(project.panels);
    piecesM.update(project.panels);
    problemsD.update(collisions, project.panels);
    problemsM.update(collisions, project.panels);
    hint.classList.toggle("hidden", project.panels.length > 0);
    selectionDrag.notifySelectionChange();
    mobileMoveToggle.sync();
    mobileSplit?.setEnabled(project.panels.length > 0);
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

  function handleSelect(id: UUID, additive: boolean, focusMember = false) {
    const panel = project.panels.find(p => p.id === id);
    if (!panel?.visible) return;

    const useAdditive = additive || edState.groupPickMode;
    if (useAdditive) {
      edState = clickSelect(edState, id, true);
    } else if (focusMember) {
      edState = setSelection(edState, [id]);
    } else {
      const p = project.panels.find(x => x.id === id);
      if (p?.groupId) {
        const members = panelsInGroup(project, p.groupId).map(x => x.id);
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

  function openPanelProps(id: UUID) {
    const group = project.groups.find(g => g.id === id);
    if (group) {
      handleSelectGroup(id);
    } else {
      const panel = project.panels.find(p => p.id === id);
      if (!panel?.visible) return;
      handleSelect(id, false, Boolean(panel.groupId));
    }
    openMobileProps();
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
    onOpenProps: openPanelProps,
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
      mutate(setGroupOrigin(project, gid, { x, y, z })),
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
  const treeM = createPanelTree(document.getElementById("m-panel-tree")!, panelCallbacks);
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

  const selectionDrag = setupSelectionDrag({
    canvas,
    camera,
    controls,
    isSpacePanActive,
    getSelectedPanelIds: () => expandedSelection(project, edState.selectedPanelIds),
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
    panel.position = positionForNewPanel(project, panel);
    mutate(treeOrderAfterAddPanel(addPanel(project, panel), panel.id));
    fitToContent();
  }

  document.getElementById("btn-add-panel")?.addEventListener("click", addNewPanel);
  const fabEl = document.getElementById("fab");
  fabEl?.addEventListener("click", addNewPanel);
  if (fabEl) bindPressFeedback(fabEl);
  hint.addEventListener("click", addNewPanel);

  bindPressFeedback(document.getElementById("mobile-split-handle")!);
  document.querySelectorAll<HTMLButtonElement>(".mnav-btn").forEach(bindPressFeedback);

  setupCanvasInput({
    canvas,
    camera,
    meshMap,
    getProject: () => project,
    getSelectedIds: () => edState.selectedPanelIds,
    isSpacePanActive,
    selectionDrag,
    onSelect: (id, additive) => handleSelect(id, additive),
    onClearSelection: () => {
      edState = clearSelection(edState);
      refreshUI();
      syncMeshes();
    },
    openMobileProps,
    closeMobileProps,
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

  mobileSplit = setupMobileSplit({
    app: appEl,
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
}
