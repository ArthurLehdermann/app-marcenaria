import type { EditorState, UUID, Vec3 } from "./core/types";

export function createEditorState(): EditorState {
  return {
    selectedPanelId: undefined,
    hoveredPanelId: undefined,
    showCollisions: true,
    camera: {
      position: { x: 0, y: 800, z: 2000 },
      target: { x: 0, y: 0, z: 0 },
    },
  };
}

export function selectPanel(state: EditorState, id: UUID | undefined): EditorState {
  return { ...state, selectedPanelId: id };
}

export function hoverPanel(state: EditorState, id: UUID | undefined): EditorState {
  return { ...state, hoveredPanelId: id };
}

export function toggleCollisions(state: EditorState): EditorState {
  return { ...state, showCollisions: !state.showCollisions };
}
