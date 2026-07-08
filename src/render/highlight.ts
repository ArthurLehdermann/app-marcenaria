import { Mesh, MeshStandardMaterial, Color } from "three";
import { getSharedMaterial } from "./panelMesh";

export type HighlightState = "normal" | "selected" | "collision";

const SELECTED_EMISSIVE = new Color(0x334466);
const COLLISION_COLOR = new Color(0xcc2200);

function ownMaterial(mesh: Mesh): MeshStandardMaterial {
  if (mesh.userData.clonedMat) return mesh.material as MeshStandardMaterial;
  const clone = (mesh.material as MeshStandardMaterial).clone();
  mesh.material = clone;
  mesh.userData.clonedMat = true;
  return clone;
}

export function applyHighlight(mesh: Mesh, state: HighlightState, panelColor: string): void {
  if (state === "normal") {
    if (mesh.userData.clonedMat) {
      (mesh.material as MeshStandardMaterial).dispose();
      mesh.material = getSharedMaterial(panelColor);
      mesh.userData.clonedMat = false;
    }
    return;
  }

  const mat = ownMaterial(mesh);
  if (state === "selected") {
    mat.color.set(panelColor);
    mat.emissive.copy(SELECTED_EMISSIVE);
  } else {
    mat.color.copy(COLLISION_COLOR);
    mat.emissive.set(0x000000);
  }
}
