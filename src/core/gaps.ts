import type { Box, Panel, Project, UUID, Vec3 } from "./types";
import { panelBox, panelsUnionBox } from "./geometry";
import { panelsInGroup, expandSelectionToGroups } from "./groups";
import { COLLISION_TOLERANCE, collides } from "./collision";

export const MAX_GAP_DISPLAY_MM = 500;
export const MIN_OVERLAP_FOR_GAP_MM = 1;

const AXES = ["x", "y", "z"] as const;
type Axis = (typeof AXES)[number];
type DirectionKey = `${Axis}+` | `${Axis}-`;

export type GapEntityKind = "panel" | "group";

export type GapEntity = {
  id: UUID;
  kind: GapEntityKind;
  panels: Panel[];
  box: Box;
};

function axisOverlap(aMin: number, aMax: number, bMin: number, bMax: number): number {
  return Math.min(aMax, bMax) - Math.max(aMin, bMin);
}

function dist3(a: Vec3, b: Vec3): number {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
}

/** Pontos nas faces externas (extremidades), não no centro. */
export function snapPointToOuterFace(box: Box, point: Vec3, toward: Vec3): Vec3 {
  const out = { ...point };
  const dx = toward.x - point.x;
  const dy = toward.y - point.y;
  const dz = toward.z - point.z;

  if (dx > COLLISION_TOLERANCE) out.x = box.max.x;
  else if (dx < -COLLISION_TOLERANCE) out.x = box.min.x;

  if (dy > COLLISION_TOLERANCE) out.y = box.max.y;
  else if (dy < -COLLISION_TOLERANCE) out.y = box.min.y;

  if (dz > COLLISION_TOLERANCE) out.z = box.max.z;
  else if (dz < -COLLISION_TOLERANCE) out.z = box.min.z;

  return out;
}

export function closestPointsBetweenBoxes(ba: Box, bb: Box): { a: Vec3; b: Vec3; distance: number } {
  const a: Vec3 = { x: 0, y: 0, z: 0 };
  const b: Vec3 = { x: 0, y: 0, z: 0 };

  for (const axis of AXES) {
    const aMin = ba.min[axis];
    const aMax = ba.max[axis];
    const bMin = bb.min[axis];
    const bMax = bb.max[axis];

    if (aMax <= bMin) {
      a[axis] = aMax;
      b[axis] = bMin;
    } else if (bMax <= aMin) {
      a[axis] = aMin;
      b[axis] = bMax;
    } else {
      const lo = Math.max(aMin, bMin);
      const hi = Math.min(aMax, bMax);
      const mid = (lo + hi) / 2;
      a[axis] = mid;
      b[axis] = mid;
    }
  }

  const from = snapPointToOuterFace(ba, a, b);
  const to = snapPointToOuterFace(bb, b, a);
  return { a: from, b: to, distance: dist3(from, to) };
}

export type PanelGap = {
  fromId: UUID;
  toId: UUID;
  from: Vec3;
  to: Vec3;
  distance: number;
  direction: DirectionKey;
};

function boxesAlignedForGap(ba: Box, bb: Box): boolean {
  for (const axis of AXES) {
    if (axisOverlap(ba.min[axis], ba.max[axis], bb.min[axis], bb.max[axis]) >= MIN_OVERLAP_FOR_GAP_MM) {
      return true;
    }
  }
  return false;
}

function gapDirection(from: Vec3, to: Vec3): DirectionKey | null {
  let axis: Axis = "x";
  let maxAbs = 0;
  for (const a of AXES) {
    const abs = Math.abs(to[a] - from[a]);
    if (abs > maxAbs) {
      maxAbs = abs;
      axis = a;
    }
  }
  if (maxAbs <= COLLISION_TOLERANCE) return null;
  const sign = to[axis] - from[axis] >= 0 ? "+" : "-";
  return `${axis}${sign}` as DirectionKey;
}

function panelsAdjacentOrColliding(a: Panel, b: Panel): boolean {
  if (collides(a, b)) return true;
  const { distance } = closestPointsBetweenBoxes(panelBox(a), panelBox(b));
  return distance <= COLLISION_TOLERANCE;
}

function entitiesOverlap(a: GapEntity, b: GapEntity): boolean {
  for (const pa of a.panels) {
    for (const pb of b.panels) {
      if (panelsAdjacentOrColliding(pa, pb)) return true;
    }
  }
  return false;
}

function entitiesAdjacentOrColliding(a: GapEntity, b: GapEntity): boolean {
  return entitiesOverlap(a, b);
}

/** Agrupamentos (bloco) + peças avulsas — peças dentro de grupo nunca entram sozinhas. */
export function buildGapEntities(project: Project): GapEntity[] {
  const entities: GapEntity[] = [];
  const inGroup = new Set<UUID>();

  for (const group of project.groups) {
    const members = panelsInGroup(project, group.id).filter(p => p.visible);
    if (members.length < 2) continue;
    for (const m of members) inGroup.add(m.id);
    const box = panelsUnionBox(members);
    if (!box) continue;
    entities.push({ id: group.id, kind: "group", panels: members, box });
  }

  for (const panel of project.panels) {
    if (!panel.visible || inGroup.has(panel.id)) continue;
    entities.push({
      id: panel.id,
      kind: "panel",
      panels: [panel],
      box: panelBox(panel),
    });
  }

  return entities;
}

export function resolveSelectedGapEntity(
  project: Project,
  selectedPanelIds: UUID[],
): GapEntity | null {
  if (!selectedPanelIds.length) return null;

  const entities = buildGapEntities(project);
  const expanded = expandSelectionToGroups(project, selectedPanelIds);
  const selectedPanels = expanded
    .map(id => project.panels.find(p => p.id === id))
    .filter((p): p is Panel => Boolean(p && p.visible));

  if (!selectedPanels.length) return null;

  const groupIds = new Set(selectedPanels.map(p => p.groupId).filter(Boolean) as UUID[]);

  if (groupIds.size === 1) {
    const gid = [...groupIds][0]!;
    return entities.find(e => e.kind === "group" && e.id === gid) ?? null;
  }

  if (groupIds.size === 0 && selectedPanels.length === 1) {
    return entities.find(e => e.kind === "panel" && e.id === selectedPanels[0]!.id) ?? null;
  }

  return null;
}

function entitiesCollide(a: GapEntity, b: GapEntity): boolean {
  for (const pa of a.panels) {
    for (const pb of b.panels) {
      if (collides(pa, pb)) return true;
    }
  }
  return false;
}

function gapBetweenEntities(from: GapEntity, to: GapEntity): PanelGap | null {
  if (from.id === to.id) return null;
  if (entitiesCollide(from, to)) return null;
  if (!boxesAlignedForGap(from.box, to.box)) return null;

  const { a, b, distance } = closestPointsBetweenBoxes(from.box, to.box);
  if (distance <= COLLISION_TOLERANCE || distance > MAX_GAP_DISPLAY_MM) return null;

  const direction = gapDirection(a, b);
  if (!direction) return null;

  return { fromId: from.id, toId: to.id, from: a, to: b, distance, direction };
}

/** Alvo fica atrás de outro bloco/peça encostada mais próximo da seleção. */
export function isGapTargetOccluded(
  selected: GapEntity,
  gap: PanelGap,
  entities: GapEntity[],
): boolean {
  const target = entities.find(e => e.id === gap.toId);
  if (!target) return true;

  for (const blocker of entities) {
    if (blocker.id === selected.id || blocker.id === target.id) continue;
    if (!entitiesAdjacentOrColliding(blocker, target)) continue;

    const { distance } = closestPointsBetweenBoxes(selected.box, blocker.box);
    if (distance + COLLISION_TOLERANCE < gap.distance) return true;
  }
  return false;
}

function nearestPerDirection(gaps: PanelGap[]): PanelGap[] {
  const best = new Map<DirectionKey, PanelGap>();
  for (const gap of gaps) {
    const prev = best.get(gap.direction);
    if (!prev || gap.distance < prev.distance) best.set(gap.direction, gap);
  }
  return [...best.values()].sort((a, b) => a.distance - b.distance);
}

export function findGapsForEntity(selected: GapEntity, entities: GapEntity[]): PanelGap[] {
  const candidates: PanelGap[] = [];

  for (const other of entities) {
    if (other.id === selected.id) continue;
    const gap = gapBetweenEntities(selected, other);
    if (gap) candidates.push(gap);
  }

  const visible = candidates.filter(g => !isGapTargetOccluded(selected, g, entities));
  return nearestPerDirection(visible);
}

export function gapsForDisplay(project: Project, selectedPanelIds: UUID[]): PanelGap[] {
  const selected = resolveSelectedGapEntity(project, selectedPanelIds);
  if (!selected) return [];
  const entities = buildGapEntities(project);
  return findGapsForEntity(selected, entities);
}
