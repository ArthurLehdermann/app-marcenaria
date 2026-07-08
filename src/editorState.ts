import type { EditorState, UUID } from "./core/types";

export function createEditorState(): EditorState {
  return {
    selectedPanelIds: [],
    hoveredPanelId: undefined,
    showCollisions: true,
    groupPickMode: false,
    camera: {
      position: { x: 0, y: 800, z: 2000 },
      target: { x: 0, y: 0, z: 0 },
    },
  };
}

export function setSelection(state: EditorState, ids: UUID[]): EditorState {
  return { ...state, selectedPanelIds: ids };
}

export function clearSelection(state: EditorState): EditorState {
  return { ...state, selectedPanelIds: [] };
}

/** Clique normal: substitui. Shift ou modo agrupar: alterna. */
export function clickSelect(
  state: EditorState,
  id: UUID,
  additive: boolean,
): EditorState {
  if (additive) {
    const has = state.selectedPanelIds.includes(id);
    const next = has
      ? state.selectedPanelIds.filter(x => x !== id)
      : [...state.selectedPanelIds, id];
    return { ...state, selectedPanelIds: next };
  }
  return { ...state, selectedPanelIds: [id] };
}

export function hoverPanel(state: EditorState, id: UUID | undefined): EditorState {
  return { ...state, hoveredPanelId: id };
}

export function toggleCollisions(state: EditorState): EditorState {
  return { ...state, showCollisions: !state.showCollisions };
}

export function toggleGroupPickMode(state: EditorState): EditorState {
  return { ...state, groupPickMode: !state.groupPickMode };
}

/** @deprecated */
export function selectPanel(state: EditorState, id: UUID | undefined): EditorState {
  return id ? setSelection(state, [id]) : clearSelection(state);
}

export function primarySelectedId(state: EditorState): UUID | undefined {
  return state.selectedPanelIds[0];
}
