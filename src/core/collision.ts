import type { Panel, UUID } from "./types";
import { panelBox } from "./geometry";

export const COLLISION_TOLERANCE = 0.5; // mm

function overlap1D(aMin: number, aMax: number, bMin: number, bMax: number): number {
  return Math.min(aMax, bMax) - Math.max(aMin, bMin);
}

export function collides(a: Panel, b: Panel): boolean {
  const ba = panelBox(a);
  const bb = panelBox(b);

  const ox = overlap1D(ba.min.x, ba.max.x, bb.min.x, bb.max.x);
  const oy = overlap1D(ba.min.y, ba.max.y, bb.min.y, bb.max.y);
  const oz = overlap1D(ba.min.z, ba.max.z, bb.min.z, bb.max.z);

  return ox > COLLISION_TOLERANCE
      && oy > COLLISION_TOLERANCE
      && oz > COLLISION_TOLERANCE;
}

export type Collision = { a: UUID; b: UUID };

export function findCollisions(panels: Panel[]): Collision[] {
  const visible = panels.filter(p => p.visible);
  const out: Collision[] = [];
  for (let i = 0; i < visible.length; i++) {
    for (let j = i + 1; j < visible.length; j++) {
      if (collides(visible[i], visible[j])) {
        out.push({ a: visible[i].id, b: visible[j].id });
      }
    }
  }
  return out;
}
