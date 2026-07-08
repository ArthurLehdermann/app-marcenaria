import { Group, Mesh, BoxGeometry, MeshStandardMaterial } from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { Panel, EdgeSide, UUID } from "../core/types";
import { panelBox, boxSize } from "../core/geometry";
import { edgeBandGroupLocal } from "./panelEdges";

const matCache = new Map<string, MeshStandardMaterial>();
const geoCache = new Map<string, BoxGeometry>();
const roundedGeoCache = new Map<string, RoundedBoxGeometry>();

let edgeMaterial: MeshStandardMaterial | null = null;

function getMaterial(color: string): MeshStandardMaterial {
  let mat = matCache.get(color);
  if (!mat) {
    mat = new MeshStandardMaterial({ color });
    matCache.set(color, mat);
  }
  return mat;
}

function getEdgeMaterial(): MeshStandardMaterial {
  if (!edgeMaterial) {
    edgeMaterial = new MeshStandardMaterial({
      color: "#D4802A",
      roughness: 0.42,
      metalness: 0.04,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
  }
  return edgeMaterial;
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

function getRoundedGeometry(w: number, h: number, d: number, radius: number): RoundedBoxGeometry {
  const r = Math.min(radius, w / 2, h / 2, d / 2);
  const key = `r:${w}x${h}x${d}@${r}`;
  let geo = roundedGeoCache.get(key);
  if (!geo) {
    geo = new RoundedBoxGeometry(w, h, d, 2, r);
    roundedGeoCache.set(key, geo);
  }
  return geo;
}

export function getSharedMaterial(color: string): MeshStandardMaterial {
  return getMaterial(color);
}

export type PanelMeshGroup = Group & { userData: { panelId: UUID } };

const EDGE_SIDES: EdgeSide[] = ["top", "bottom", "left", "right"];

function groupCenter(panel: Panel): { x: number; y: number; z: number } {
  const box = panelBox(panel);
  const size = boxSize(box);
  return {
    x: box.min.x + size.x / 2,
    y: box.min.y + size.y / 2,
    z: box.min.z + size.z / 2,
  };
}

function createBodyMesh(panel: Panel): Mesh {
  const size = boxSize(panelBox(panel));
  const mesh = new Mesh(getGeometry(size.x, size.y, size.z), getMaterial(panel.color));
  mesh.userData.isPanelBody = true;
  mesh.userData.panelId = panel.id;
  return mesh;
}

function updateBodyMesh(body: Mesh, panel: Panel): void {
  const size = boxSize(panelBox(panel));
  const newGeo = getGeometry(size.x, size.y, size.z);
  if (body.geometry !== newGeo) body.geometry = newGeo;

  const mat = getMaterial(panel.color);
  if (!body.userData.clonedMat && body.material !== mat) {
    body.material = mat;
  }
}

function syncEdgeStrips(group: Group, panel: Panel): void {
  for (const side of EDGE_SIDES) {
    const name = `edge-${side}`;
    let strip = group.getObjectByName(name) as Mesh | undefined;

    if (!panel.edges[side]) {
      if (strip) group.remove(strip);
      continue;
    }

    const band = edgeBandGroupLocal(panel, side);
    const { x: w, y: h, z: d } = band.size;

    if (!strip) {
      strip = new Mesh(getRoundedGeometry(w, h, d, band.radius), getEdgeMaterial());
      strip.name = name;
      strip.userData.isEdgeStrip = true;
      strip.userData.panelId = panel.id;
      strip.renderOrder = 1;
      group.add(strip);
    } else {
      const newGeo = getRoundedGeometry(w, h, d, band.radius);
      if (strip.geometry !== newGeo) strip.geometry = newGeo;
      strip.renderOrder = 1;
    }

    strip.position.set(band.center.x, band.center.y, band.center.z);
  }
}

function applyGroupTransform(group: Group, panel: Panel): void {
  const gc = groupCenter(panel);
  group.position.set(gc.x, gc.y, gc.z);
}

export function getPanelBody(group: Group): Mesh {
  return group.children.find(c => c.userData.isPanelBody) as Mesh;
}

export function createPanelMesh(panel: Panel): PanelMeshGroup {
  const group = new Group() as PanelMeshGroup;
  group.userData.panelId = panel.id;
  group.add(createBodyMesh(panel));
  applyGroupTransform(group, panel);
  syncEdgeStrips(group, panel);
  return group;
}

export function updatePanelMesh(group: Group, panel: Panel): void {
  updateBodyMesh(getPanelBody(group), panel);
  applyGroupTransform(group, panel);
  syncEdgeStrips(group, panel);
}

/** @deprecated use updatePanelMesh */
export function updateMeshTransform(mesh: Mesh | Group, panel: Panel): void {
  if (mesh instanceof Group) {
    updatePanelMesh(mesh, panel);
    return;
  }
  updateBodyMesh(mesh, panel);
}
