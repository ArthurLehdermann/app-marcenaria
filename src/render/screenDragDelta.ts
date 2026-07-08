import { Vector3, type PerspectiveCamera } from "three";
import type { Vec3 } from "../core/types";

const _right = new Vector3();
const _up = new Vector3();
const _forward = new Vector3();
const _anchor = new Vector3();

/**
 * Arrasto 2D na tela: segue câmera right/up e remove profundidade (eixo de visão).
 * De frente → X/Y (Z travado). De cima/baixo → X/Z (Y travado).
 */
export function screenPixelsToViewDelta(
  dx: number,
  dy: number,
  camera: PerspectiveCamera,
  canvas: HTMLCanvasElement,
  anchor: Vec3,
): Vec3 {
  const rect = canvas.getBoundingClientRect();
  if (!rect.height) return { x: 0, y: 0, z: 0 };

  camera.updateMatrixWorld();

  _right.setFromMatrixColumn(camera.matrixWorld, 0);
  _up.setFromMatrixColumn(camera.matrixWorld, 1);
  camera.getWorldDirection(_forward);

  _anchor.set(anchor.x, anchor.y, anchor.z);
  const distance = camera.position.distanceTo(_anchor);
  const fovRad = (camera.fov * Math.PI) / 180;
  const scale = (2 * distance * Math.tan(fovRad / 2)) / rect.height;

  const sx = dx * scale;
  const sy = -dy * scale;

  const wx = _right.x * sx + _up.x * sy;
  const wy = _right.y * sx + _up.y * sy;
  const wz = _right.z * sx + _up.z * sy;

  const depth = wx * _forward.x + wy * _forward.y + wz * _forward.z;

  return {
    x: wx - depth * _forward.x,
    y: wy - depth * _forward.y,
    z: wz - depth * _forward.z,
  };
}

export function isMoveModifier(e: { ctrlKey: boolean; metaKey: boolean }): boolean {
  return e.ctrlKey || e.metaKey;
}
