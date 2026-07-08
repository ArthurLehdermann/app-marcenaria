import type { Panel, Project, UUID, UpAxis, Box, Vec3 } from "./types";
import { panelBox, boxSize } from "./geometry";
import { afterPanelRemoved } from "./groups";
import { treeOrderAfterRemovePanel, treeOrderAfterAddPanel } from "./treeOrder";

// ── mutações puras ────────────────────────────────────────────────────────────

export function addPanel(project: Project, panel: Panel): Project {
  return { ...project, panels: [...project.panels, panel] };
}

/** Peças em grupo: só visibilidade individual; dimensões/fita/posição pelo bloco. */
export function allowedPanelPatchInGroup(patch: Partial<Panel>): Partial<Panel> {
  const out: Partial<Panel> = {};
  if ("visible" in patch) out.visible = patch.visible;
  return out;
}

export function updatePanel(project: Project, id: UUID, patch: Partial<Panel>): Project {
  const panel = project.panels.find(p => p.id === id);
  if (!panel) return project;
  const effective = panel.groupId ? allowedPanelPatchInGroup(patch) : patch;
  if (!Object.keys(effective).length) return project;
  return {
    ...project,
    panels: project.panels.map(p => p.id === id ? { ...p, ...effective } : p),
  };
}

export function removePanel(project: Project, id: UUID): Project {
  const next = treeOrderAfterRemovePanel(
    { ...project, panels: project.panels.filter(p => p.id !== id) },
    id,
  );
  return afterPanelRemoved(next, id);
}

// ── duplicatePanel ────────────────────────────────────────────────────────────

const DUP_GAP = 32;

export function nextCopyName(name: string): string {
  const m = name.match(/^(.*?) \(copia(?: (\d+))?\)$/);
  if (!m) return `${name} (copia)`;
  const n = m[2] ? parseInt(m[2], 10) + 1 : 2;
  return `${m[1]} (copia ${n})`;
}

export function duplicatePanel(project: Project, id: UUID): Project {
  const src = project.panels.find(p => p.id === id);
  if (!src || src.groupId) return project;
  const box = panelBox(src);
  const extentX = box.max.x - box.min.x;
  const copy: Panel = {
    ...src,
    id: crypto.randomUUID(),
    name: nextCopyName(src.name),
    edges: { ...src.edges },
    position: { ...src.position, x: src.position.x + extentX + DUP_GAP },
  };
  return treeOrderAfterAddPanel(
    { ...project, panels: [...project.panels, copy] },
    copy.id,
  );
}

// ── rotate90 ──────────────────────────────────────────────────────────────────

const UP_CYCLE: Record<UpAxis, UpAxis> = { y: "x", x: "z", z: "y" };

export function rotate90(project: Project, id: UUID): Project {
  const src = project.panels.find(p => p.id === id);
  if (!src || src.groupId) return project;

  const before = boxSize(panelBox(src));
  const center: Vec3 = {
    x: src.position.x + before.x / 2,
    y: src.position.y + before.y / 2,
    z: src.position.z + before.z / 2,
  };

  const rotated: Panel = { ...src, upAxis: UP_CYCLE[src.upAxis] };
  const after = boxSize(panelBox(rotated));
  rotated.position = {
    x: center.x - after.x / 2,
    y: center.y - after.y / 2,
    z: center.z - after.z / 2,
  };

  return { ...project, panels: project.panels.map(p => p.id === id ? rotated : p) };
}

// ── persistência ──────────────────────────────────────────────────────────────

export function exportProject(project: Project): Blob {
  const json = JSON.stringify({ ...project, updatedAt: new Date().toISOString() }, null, 2);
  return new Blob([json], { type: "application/json" });
}

export function importProject(text: string): Project {
  const raw = JSON.parse(text);
  if (raw.schemaVersion !== 1) throw new Error("Versao de schema incompativel");
  if (!Array.isArray(raw.panels)) throw new Error("Projeto invalido");
  for (const p of raw.panels) {
    if (typeof p.thickness !== "number" || p.thickness <= 0)
      throw new Error(`Espessura invalida em ${p.name ?? p.id}`);
    if (typeof p.width !== "number" || p.width <= 0)
      throw new Error(`Largura invalida em ${p.name ?? p.id}`);
    if (typeof p.height !== "number" || p.height <= 0)
      throw new Error(`Altura invalida em ${p.name ?? p.id}`);
    p.visible ??= true;
    delete p.type;
  }
  raw.appVersion ??= "0.1.0";
  raw.groups ??= [];
  raw.treeOrder ??= [];
  return raw as Project;
}
