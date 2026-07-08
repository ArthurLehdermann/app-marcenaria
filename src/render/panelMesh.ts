import { Mesh, BoxGeometry, MeshStandardMaterial } from "three";
import type { Panel } from "../core/types";
import { panelBox, boxSize } from "../core/geometry";

const matCache = new Map<string, MeshStandardMaterial>();
const geoCache = new Map<string, BoxGeometry>();

function getMaterial(color: string): MeshStandardMaterial {
  let mat = matCache.get(color);
  if (!mat) {
    mat = new MeshStandardMaterial({ color });
    matCache.set(color, mat);
  }
  return mat;
}

function getGeometry(w: number, h: number, d: number): BoxGeometry {
  const key = `${w}x${h}x${d}`;
  let geo = geoCache.get(key);
  if (!geo) {
    geo = new BoxGeometry(w, h, d);
    geoCache.set(key, geo);
  }
  return geo;
}

export function getSharedMaterial(color: string): MeshStandardMaterial {
  return getMaterial(color);
}

export function createPanelMesh(panel: Panel): Mesh {
  const box = panelBox(panel);
  const size = boxSize(box);
  const mesh = new Mesh(
    getGeometry(size.x, size.y, size.z),
    getMaterial(panel.color),
  );
  mesh.position.set(
    box.min.x + size.x / 2,
    box.min.y + size.y / 2,
    box.min.z + size.z / 2,
  );
  mesh.userData.panelId = panel.id;
  return mesh;
}

export function updateMeshTransform(mesh: Mesh, panel: Panel): void {
  const box = panelBox(panel);
  const size = boxSize(box);
  const newGeo = getGeometry(size.x, size.y, size.z);
  if (mesh.geometry !== newGeo) mesh.geometry = newGeo;
  mesh.position.set(
    box.min.x + size.x / 2,
    box.min.y + size.y / 2,
    box.min.z + size.z / 2,
  );
}
