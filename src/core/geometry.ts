import type { Panel, Box, Vec3, Millimeters } from "./types";

export function panelBox(p: Panel): Box {
  const dx = p.width;
  const dy = p.height;
  const dz = p.thickness;

  let sx: Millimeters, sy: Millimeters, sz: Millimeters;
  switch (p.upAxis) {
    case "y": sx = dx; sy = dy; sz = dz; break; // em pe
    case "x": sx = dy; sy = dx; sz = dz; break; // girado no plano XY
    case "z": sx = dx; sy = dz; sz = dy; break; // deitado
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
