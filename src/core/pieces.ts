import type { Panel, Millimeters, Thickness, EdgeSide } from "./types";

export type CutPiece = {
  width: Millimeters;
  height: Millimeters;
  thickness: Thickness;
  edges: Record<EdgeSide, boolean>;
};

export type GroupedPiece = CutPiece & { qty: number; names: string[] };

function edgeKey(e: Record<EdgeSide, boolean>): string {
  return `${+e.top}${+e.bottom}${+e.left}${+e.right}`;
}

export function groupPieces(panels: Panel[]): GroupedPiece[] {
  const map = new Map<string, GroupedPiece>();
  for (const p of panels) {
    const key = `${p.width}x${p.height}x${p.thickness}-${edgeKey(p.edges)}`;
    const found = map.get(key);
    if (found) {
      found.qty += 1;
      found.names.push(p.name);
    } else {
      map.set(key, {
        width: p.width,
        height: p.height,
        thickness: p.thickness,
        edges: { ...p.edges },
        qty: 1,
        names: [p.name],
      });
    }
  }
  return [...map.values()];
}

export function areaByThicknessM2(panels: Panel[]): Map<Thickness, number> {
  const out = new Map<Thickness, number>();
  for (const p of panels) {
    const prev = out.get(p.thickness) ?? 0;
    out.set(p.thickness, prev + (p.width * p.height) / 1_000_000);
  }
  return out;
}
