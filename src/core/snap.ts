import type { Box, Panel, Project, UUID, Vec3 } from "./types";
import { panelBox, panelsUnionBox } from "./geometry";
import { buildGapEntities, closestPointsBetweenBoxes, type GapEntity } from "./gaps";
import { COLLISION_TOLERANCE } from "./collision";
import { expandSelectionToGroups } from "./groups";

export const SNAP_THRESHOLD_MM = 30;
const MIN_FACE_OVERLAP_MM = 1;

const AXES = ["x", "y", "z"] as const;

function axisOverlap(aMin: number, aMax: number, bMin: number, bMax: number): number {
  return Math.min(aMax, bMax) - Math.max(aMin, bMin);
}

function addVec3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function applyDeltaToPanel(p: Panel, delta: Vec3): Panel {
  return {
    ...p,
    position: {
      x: p.position.x + delta.x,
      y: p.position.y + delta.y,
      z: p.position.z + delta.z,
    },
  };
}

/** Exige sobreposicao em pelo menos dois eixos (encaixe face a face, nao so aresta). */
export function facesCanSnap(ba: Box, bb: Box): boolean {
  let overlapAxes = 0;
  for (const axis of AXES) {
    if (axisOverlap(ba.min[axis], ba.max[axis], bb.min[axis], bb.max[axis]) >= MIN_FACE_OVERLAP_MM) {
      overlapAxes++;
    }
  }
  return overlapAxes >= 2;
}

function dominantAxisCorrection(c: Vec3): Vec3 {
  const ax = Math.abs(c.x);
  const ay = Math.abs(c.y);
  const az = Math.abs(c.z);
  if (ax >= ay && ax >= az) return { x: c.x, y: 0, z: 0 };
  if (ay >= ax && ay >= az) return { x: 0, y: c.y, z: 0 };
  return { x: 0, y: 0, z: c.z };
}

function panelsWithDelta(panels: Panel[], delta: Vec3): Panel[] {
  return panels.map(p => applyDeltaToPanel(p, delta));
}

function boxWithDelta(entity: GapEntity, delta: Vec3): Box {
  return panelsUnionBox(panelsWithDelta(entity.panels, delta))!;
}

export function resolveMovingSnapEntity(project: Project, movingIds: UUID[]): GapEntity | null {
  const expanded = expandSelectionToGroups(project, movingIds);
  const movingPanels = expanded
    .map(id => project.panels.find(p => p.id === id))
    .filter((p): p is Panel => Boolean(p && p.visible));
  if (!movingPanels.length) return null;

  const box = panelsUnionBox(movingPanels);
  if (!box) return null;

  const groupIds = new Set(movingPanels.map(p => p.groupId).filter(Boolean) as UUID[]);
  if (groupIds.size === 1 && movingPanels.every(p => p.groupId === [...groupIds][0])) {
    return {
      id: [...groupIds][0]!,
      kind: "group",
      panels: movingPanels,
      box,
    };
  }

  return {
    id: movingPanels.map(p => p.id).join("+"),
    kind: "panel",
    panels: movingPanels,
    box,
  };
}

/** Ajusta o delta do arraste para colar face a face com peças/blocos vizinhos. */
export function snapDragDelta(
  project: Project,
  movingIds: UUID[],
  delta: Vec3,
  enabled: boolean,
): Vec3 {
  if (!enabled) return delta;
  if (delta.x === 0 && delta.y === 0 && delta.z === 0) return delta;

  const moving = resolveMovingSnapEntity(project, movingIds);
  if (!moving) return delta;

  const movingSet = new Set(expandSelectionToGroups(project, movingIds));
  const targets = buildGapEntities(project).filter(entity =>
    !entity.panels.some(p => movingSet.has(p.id)),
  );

  const proposedBox = boxWithDelta(moving, delta);

  let bestCorrection: Vec3 | null = null;
  let bestDistance = SNAP_THRESHOLD_MM + 1;

  for (const target of targets) {
    const { a, b, distance } = closestPointsBetweenBoxes(proposedBox, target.box);
    if (distance > SNAP_THRESHOLD_MM || distance <= COLLISION_TOLERANCE) continue;
    if (!facesCanSnap(proposedBox, target.box)) continue;

    const correction = dominantAxisCorrection({
      x: b.x - a.x,
      y: b.y - a.y,
      z: b.z - a.z,
    });

    if (distance < bestDistance) {
      bestDistance = distance;
      bestCorrection = correction;
    }
  }

  if (!bestCorrection) return delta;
  return addVec3(delta, bestCorrection);
}
