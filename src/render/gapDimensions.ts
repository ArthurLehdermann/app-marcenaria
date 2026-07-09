import {
  BufferGeometry,
  CanvasTexture,
  Group,
  Line,
  LineBasicMaterial,
  Scene,
  Sprite,
  SpriteMaterial,
  Vector3,
} from "three";
import type { Project, UUID, Vec3 } from "../core/types";
import { gapsForDisplay } from "../core/gaps";

const LINE_COLOR = 0xf0983a;
const TICK_MM = 10;

function vec(v: Vec3): Vector3 {
  return new Vector3(v.x, v.y, v.z);
}

function makeLabelSprite(text: string): Sprite {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const fontSize = 26;
  const pad = 10;
  ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
  canvas.width = Math.ceil(ctx.measureText(text).width + pad * 2);
  canvas.height = fontSize + pad * 2;
  ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
  ctx.fillStyle = "rgba(23, 21, 18, 0.92)";
  ctx.strokeStyle = "rgba(240, 152, 58, 0.55)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(0, 0, canvas.width, canvas.height, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#F0983A";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new CanvasTexture(canvas);
  const material = new SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new Sprite(material);
  sprite.renderOrder = 20;
  sprite.scale.set(canvas.width * 0.42, canvas.height * 0.42, 1);
  return sprite;
}

function perpendicular(dir: Vector3): Vector3 {
  const up = Math.abs(dir.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
  return new Vector3().crossVectors(dir, up).normalize();
}

function lineSegment(from: Vector3, to: Vector3, material: LineBasicMaterial): Line {
  const geo = new BufferGeometry().setFromPoints([from, to]);
  return new Line(geo, material);
}

function createDimension(from: Vec3, to: Vec3, distanceMm: number): Group {
  const g = new Group();
  const material = new LineBasicMaterial({ color: LINE_COLOR, depthTest: true });
  const p0 = vec(from);
  const p1 = vec(to);
  const dir = new Vector3().subVectors(p1, p0);
  const len = dir.length();
  if (len < 0.01) return g;
  dir.normalize();

  g.add(lineSegment(p0, p1, material));

  const tick = perpendicular(dir).multiplyScalar(TICK_MM);
  g.add(lineSegment(p0.clone().add(tick), p0.clone().sub(tick), material));
  g.add(lineSegment(p1.clone().add(tick), p1.clone().sub(tick), material));

  const label = makeLabelSprite(String(Math.round(distanceMm)));
  label.position.copy(p0.clone().add(p1).multiplyScalar(0.5));
  g.add(label);

  return g;
}

export function createGapDimensionsLayer(scene: Scene) {
  const root = new Group();
  root.name = "gap-dimensions";
  scene.add(root);

  function clear() {
    while (root.children.length) {
      const child = root.children[0]!;
      root.remove(child);
      if (child instanceof Line) {
        child.geometry.dispose();
        (child.material as LineBasicMaterial).dispose();
      } else if (child instanceof Group) {
        child.traverse(obj => {
          if (obj instanceof Line) {
            obj.geometry.dispose();
            (obj.material as LineBasicMaterial).dispose();
          }
          if (obj instanceof Sprite) {
            (obj.material as SpriteMaterial).map?.dispose();
            (obj.material as SpriteMaterial).dispose();
          }
        });
      }
    }
  }

  function update(project: Project, selectedPanelIds: UUID[]) {
    clear();
    for (const gap of gapsForDisplay(project, selectedPanelIds)) {
      root.add(createDimension(gap.from, gap.to, gap.distance));
    }
  }

  function dispose() {
    clear();
    scene.remove(root);
  }

  return { update, dispose };
}
