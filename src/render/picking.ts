import { Raycaster, Vector2, Camera, Object3D } from "three";
import type { UUID } from "../core/types";

const raycaster = new Raycaster();

function panelIdFromObject(obj: Object3D): UUID | null {
  let cur: Object3D | null = obj;
  while (cur) {
    if (cur.userData.panelId) return cur.userData.panelId as UUID;
    cur = cur.parent;
  }
  return null;
}

export function pickPanel(ndc: Vector2, camera: Camera, roots: Object3D[]): UUID | null {
  for (const root of roots) root.updateMatrixWorld(true);
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(roots, true);
  if (!hits.length) return null;
  return panelIdFromObject(hits[0].object);
}
