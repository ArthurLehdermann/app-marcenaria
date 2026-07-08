import type { Panel, EdgeSide, Vec3, Box } from "../core/types";
import { boxSize, panelBox } from "../core/geometry";

/** Cor da fita de borda no preview 3D (mesmo accent da UI). */
export const EDGE_BAND_COLOR = "#D4802A";

/** Raio do arredondamento nas faixas de fita (mm). */
export const EDGE_BAND_RADIUS_MM = 1;

/** Empurra a fita para fora do corpo para evitar z-fighting. */
export const EDGE_BAND_OUTSET_MM = 0.6;

/** Espessura visivel da fita na face do painel (mm). */
export function edgeBandFaceMm(thickness: number): number {
  return Math.max(2.5, Math.min(5, thickness * 0.2 + 2));
}

export type EdgeBandSpec = {
  size: Vec3;
  center: Vec3;
  radius: number;
};

function bandRadius(size: Vec3, face: number): number {
  return Math.min(EDGE_BAND_RADIUS_MM, size.x / 2, size.y / 2, size.z / 2, face / 2);
}

function groupHalfExtents(panel: Panel): { hx: number; hy: number; hz: number; sx: number; sy: number; sz: number } {
  const { x: sx, y: sy, z: sz } = boxSize(panelBox(panel));
  return { hx: sx / 2, hy: sy / 2, hz: sz / 2, sx, sy, sz };
}

/**
 * Fita colada na face externa do painel, levemente para fora do corpo.
 * top/bottom/left/right = lados da chapa (largura × altura), qualquer upAxis.
 */
export function edgeBandGroupLocal(panel: Panel, side: EdgeSide): EdgeBandSpec {
  const f = edgeBandFaceMm(panel.thickness);
  const { hx, hy, hz, sx, sy, sz } = groupHalfExtents(panel);
  const o = EDGE_BAND_OUTSET_MM;

  let center: Vec3;
  let size: Vec3;

  switch (panel.upAxis) {
    case "y":
      switch (side) {
        case "top":    size = { x: sx, y: f, z: sz }; center = { x: 0, y: hy + f / 2 + o, z: 0 }; break;
        case "bottom": size = { x: sx, y: f, z: sz }; center = { x: 0, y: -hy - f / 2 - o, z: 0 }; break;
        case "left":   size = { x: f, y: sy, z: sz }; center = { x: -hx - f / 2 - o, y: 0, z: 0 }; break;
        case "right":  size = { x: f, y: sy, z: sz }; center = { x: hx + f / 2 + o, y: 0, z: 0 }; break;
      }
      break;
    case "x":
      switch (side) {
        case "top":    size = { x: sx, y: f, z: sz }; center = { x: 0, y: hy + f / 2 + o, z: 0 }; break;
        case "bottom": size = { x: sx, y: f, z: sz }; center = { x: 0, y: -hy - f / 2 - o, z: 0 }; break;
        case "left":   size = { x: sx, y: sy, z: f }; center = { x: 0, y: 0, z: -hz - f / 2 - o }; break;
        case "right":  size = { x: sx, y: sy, z: f }; center = { x: 0, y: 0, z: hz + f / 2 + o }; break;
      }
      break;
    case "z":
      switch (side) {
        case "top":    size = { x: sx, y: sy, z: f }; center = { x: 0, y: 0, z: hz + f / 2 + o }; break;
        case "bottom": size = { x: sx, y: sy, z: f }; center = { x: 0, y: 0, z: -hz - f / 2 - o }; break;
        case "left":   size = { x: f, y: sy, z: sz }; center = { x: -hx - f / 2 - o, y: 0, z: 0 }; break;
        case "right":  size = { x: f, y: sy, z: sz }; center = { x: hx + f / 2 + o, y: 0, z: 0 }; break;
      }
      break;
  }

  return { size, center, radius: bandRadius(size, f) };
}

export function edgeBandWorld(panel: Panel, side: EdgeSide): EdgeBandSpec {
  const local = edgeBandGroupLocal(panel, side);
  const gc = boxCenter(panelBox(panel));
  return {
    size: local.size,
    center: {
      x: gc.x + local.center.x,
      y: gc.y + local.center.y,
      z: gc.z + local.center.z,
    },
    radius: local.radius,
  };
}

export function edgeStripWorldBox(panel: Panel, side: EdgeSide): Box {
  const { size, center } = edgeBandWorld(panel, side);
  return {
    min: {
      x: center.x - size.x / 2,
      y: center.y - size.y / 2,
      z: center.z - size.z / 2,
    },
    max: {
      x: center.x + size.x / 2,
      y: center.y + size.y / 2,
      z: center.z + size.z / 2,
    },
  };
}

export function boxCenter(b: Box): Vec3 {
  const size = boxSize(b);
  return {
    x: b.min.x + size.x / 2,
    y: b.min.y + size.y / 2,
    z: b.min.z + size.z / 2,
  };
}

/** Fita fica do lado de fora do corpo, sem invadir o volume do painel. */
export function edgeBandOutsideBody(panel: Panel, side: EdgeSide): boolean {
  const body = panelBox(panel);
  const band = edgeStripWorldBox(panel, side);
  const tol = 0.05;
  const local = edgeBandGroupLocal(panel, side);
  const axis = outwardAxis(panel, side);
  if (axis === "x") {
    if (local.center.x > 0) return band.min.x >= body.max.x - tol;
    return band.max.x <= body.min.x + tol;
  }
  if (axis === "y") {
    if (local.center.y > 0) return band.min.y >= body.max.y - tol;
    return band.max.y <= body.min.y + tol;
  }
  if (local.center.z > 0) return band.min.z >= body.max.z - tol;
  return band.max.z <= body.min.z + tol;
}

function outwardAxis(panel: Panel, side: EdgeSide): "x" | "y" | "z" {
  switch (panel.upAxis) {
    case "y":
      if (side === "left" || side === "right") return "x";
      return "y";
    case "x":
      if (side === "left" || side === "right") return "z";
      return "y";
    case "z":
      if (side === "top" || side === "bottom") return "z";
      return "x";
  }
}

/** @deprecated use edgeBandOutsideBody */
export function edgeBandOnPanelFace(panel: Panel, side: EdgeSide): boolean {
  return edgeBandOutsideBody(panel, side);
}
