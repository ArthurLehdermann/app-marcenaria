import type { Panel, Box, Vec3, Millimeters } from "./types";

export function panelBox(p: Panel): Box {
  const dx = p.width;
  const dy = p.height;
  const dz = p.thickness;

  let sx: Millimeters, sy: Millimeters, sz: Millimeters;
  switch (p.upAxis) {
    case "y": sx = dx; sy = dy; sz = dz; break; // em pe, face para Z (frente/fundo)
    case "x": sx = dz; sy = dy; sz = dx; break; // lateral, face para X (esquerda/direita)
    case "z": sx = dx; sy = dz; sz = dy; break; // deitado, face para Y (base/topo/prateleira)
  }

  return {
    min: { x: p.position.x, y: p.position.y, z: p.position.z },
    max: { x: p.position.x + sx, y: p.position.y + sy, z: p.position.z + sz },
  };
}

export function boxSize(b: Box): Vec3 {
  return {
    x: b.max.x - b.min.x,
    y: b.max.y - b.min.y,
    z: b.max.z - b.min.z,
  };
}

export function panelsUnionBox(panels: Panel[]): Box | null {
  if (!panels.length) return null;
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (const p of panels) {
    const b = panelBox(p);
    minX = Math.min(minX, b.min.x); maxX = Math.max(maxX, b.max.x);
    minY = Math.min(minY, b.min.y); maxY = Math.max(maxY, b.max.y);
    minZ = Math.min(minZ, b.min.z); maxZ = Math.max(maxZ, b.max.z);
  }
  return { min: { x: minX, y: minY, z: minZ }, max: { x: maxX, y: maxY, z: maxZ } };
}

/** Ponto no espaco local do painel (largura=X, altura=Y, espessura=Z) → mundo. */
export function panelLocalPointToWorld(p: Panel, lx: Millimeters, ly: Millimeters, lz: Millimeters): Vec3 {
  const { x, y, z } = p.position;
  switch (p.upAxis) {
    case "y": return { x: x + lx, y: y + ly, z: z + lz };
    case "x": return { x: x + lz, y: y + ly, z: z + lx };
    case "z": return { x: x + lx, y: y + lz, z: z + ly };
  }
}

/** Tamanho local do painel → eixos do mundo (mesma permutacao de panelBox). */
export function panelLocalSizeToWorld(p: Panel, lw: Millimeters, lh: Millimeters, ld: Millimeters): Vec3 {
  switch (p.upAxis) {
    case "y": return { x: lw, y: lh, z: ld };
    case "x": return { x: ld, y: lh, z: lw };
    case "z": return { x: lw, y: ld, z: lh };
  }
}

/** Ponto local → coordenadas do grupo 3D (origem no centro do bounding box). */
export function panelLocalPointToGroup(p: Panel, lx: Millimeters, ly: Millimeters, lz: Millimeters): Vec3 {
  const W = p.width, H = p.height, T = p.thickness;
  switch (p.upAxis) {
    case "y": return { x: lx - W / 2, y: ly - H / 2, z: lz - T / 2 };
    case "x": return { x: lz - T / 2, y: ly - H / 2, z: lx - W / 2 };
    case "z": return { x: lx - W / 2, y: lz - T / 2, z: ly - H / 2 };
  }
}

/** Tamanho local → eixos do grupo 3D. */
export function panelLocalSizeToGroup(p: Panel, lw: Millimeters, lh: Millimeters, ld: Millimeters): Vec3 {
  switch (p.upAxis) {
    case "y": return { x: lw, y: lh, z: ld };
    case "x": return { x: ld, y: lh, z: lw };
    case "z": return { x: lw, y: ld, z: lh };
  }
}
