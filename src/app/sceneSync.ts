import { findCollisions } from "../core/collision";
import { panelBox } from "../core/geometry";
import type { Project, UUID } from "../core/types";
import { applyHighlight } from "../render/highlight";
import type { createGapDimensionsLayer } from "../render/gapDimensions";
import { createPanelMesh, getPanelBody, updatePanelMesh } from "../render/panelMesh";
import type { Group, PerspectiveCamera, Scene } from "three";

type OrbitControlsLike = {
  target: { set(x: number, y: number, z: number): void };
  update(): void;
};

export function createSceneSync(deps: {
  scene: Scene;
  gapDimensions: ReturnType<typeof createGapDimensionsLayer>;
  invalidate: () => void;
  meshMap: Map<UUID, Group>;
  getProject: () => Project;
  getSelectedIds: () => UUID[];
  camera: PerspectiveCamera;
  controls: OrbitControlsLike;
}) {
  const { scene, gapDimensions, invalidate, meshMap, getProject, getSelectedIds, camera, controls } = deps;

  function fitToContent() {
    const project = getProject();
    if (!project.panels.length) return;
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (const p of project.panels) {
      const b = panelBox(p);
      minX = Math.min(minX, b.min.x); maxX = Math.max(maxX, b.max.x);
      minY = Math.min(minY, b.min.y); maxY = Math.max(maxY, b.max.y);
      minZ = Math.min(minZ, b.min.z); maxZ = Math.max(maxZ, b.max.z);
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const cz = (minZ + maxZ) / 2;
    const size = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 200);
    controls.target.set(cx, cy, cz);
    camera.position.set(cx, cy + size * 0.4, cz + size * 1.8);
    camera.updateProjectionMatrix();
    controls.update();
    invalidate();
  }

  function syncMeshes() {
    const project = getProject();
    const ids = new Set(project.panels.map(p => p.id));
    for (const [id, mesh] of meshMap) {
      if (!ids.has(id)) { scene.remove(mesh); meshMap.delete(id); }
    }
    const collisions = findCollisions(project.panels);
    const collisionIds = new Set(collisions.flatMap(c => [c.a, c.b]));
    const selected = new Set(getSelectedIds());

    for (const panel of project.panels) {
      let group = meshMap.get(panel.id);
      if (!group) {
        group = createPanelMesh(panel);
        meshMap.set(panel.id, group);
        scene.add(group);
      } else {
        updatePanelMesh(group, panel);
      }
      const state = collisionIds.has(panel.id) ? "collision"
        : selected.has(panel.id) ? "selected"
        : "normal";
      applyHighlight(getPanelBody(group), state, panel.color);
      group.visible = panel.visible;
      group.traverse(obj => {
        obj.visible = panel.visible;
      });
    }
    gapDimensions.update(project, getSelectedIds());
    invalidate();
  }

  return { syncMeshes, fitToContent };
}
