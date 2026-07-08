import { Raycaster, Vector2, Camera, Mesh } from "three";
import type { UUID } from "../core/types";

const raycaster = new Raycaster();

export function pickPanel(ndc: Vector2, camera: Camera, meshes: Mesh[]): UUID | null {
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(meshes, false);
  if (!hits.length) return null;
  return (hits[0].object.userData.panelId as UUID) ?? null;
}
