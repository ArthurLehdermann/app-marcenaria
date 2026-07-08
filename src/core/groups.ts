import type { Panel, PanelGroup, Project, UUID, Vec3 } from "./types";
import { panelBox, boxSize } from "./geometry";
import { rotate90, nextCopyName } from "./project";
import {
  treeOrderAfterCreateGroup,
  treeOrderAfterDuplicateGroup,
  treeOrderAfterUngroup,
} from "./treeOrder";

const DUP_GAP = 32;

export function panelsInGroup(project: Project, groupId: UUID): Panel[] {
  return project.panels.filter(p => p.groupId === groupId);
}

export function groupOfPanel(project: Project, panelId: UUID): PanelGroup | undefined {
  const panel = project.panels.find(p => p.id === panelId);
  if (!panel?.groupId) return undefined;
  return project.groups.find(g => g.id === panel.groupId);
}

/** Expande ids para incluir todos os membros dos grupos tocados. */
export function expandSelectionToGroups(project: Project, ids: UUID[]): UUID[] {
  const out = new Set<UUID>();
  for (const id of ids) {
    const panel = project.panels.find(p => p.id === id);
    if (!panel) continue;
    if (panel.groupId) {
      for (const m of panelsInGroup(project, panel.groupId)) out.add(m.id);
    } else {
      out.add(id);
    }
  }
  return [...out];
}

export function groupBBoxCenter(panels: Panel[]): Vec3 {
  if (!panels.length) return { x: 0, y: 0, z: 0 };
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (const p of panels) {
    const b = panelBox(p);
    minX = Math.min(minX, b.min.x); maxX = Math.max(maxX, b.max.x);
    minY = Math.min(minY, b.min.y); maxY = Math.max(maxY, b.max.y);
    minZ = Math.min(minZ, b.min.z); maxZ = Math.max(maxZ, b.max.z);
  }
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2, z: (minZ + maxZ) / 2 };
}

export function nextGroupName(project: Project): string {
  const used = new Set(project.groups.map(g => g.name));
  let n = 1;
  while (used.has(`Grupo ${n}`)) n++;
  return `Grupo ${n}`;
}

function pruneEmptyGroups(project: Project): Project {
  const valid = project.groups.filter(g => panelsInGroup(project, g.id).length >= 2);
  const validIds = new Set(valid.map(g => g.id));
  return {
    ...project,
    groups: valid,
    panels: project.panels.map(p =>
      p.groupId && !validIds.has(p.groupId) ? { ...p, groupId: undefined } : p,
    ),
  };
}

export function createPanelGroup(project: Project, panelIds: UUID[], name: string): Project {
  const unique = [...new Set(panelIds)];
  if (unique.length < 2) return project;

  const gid = crypto.randomUUID();
  const group: PanelGroup = { id: gid, name: name.trim() || nextGroupName(project) };

  let panels = project.panels.map(p => {
    if (!unique.includes(p.id)) return p;
    return { ...p, groupId: gid };
  });

  let groups = [...project.groups, group];
  let next: Project = { ...project, panels, groups };
  next = pruneEmptyGroups(next);
  return treeOrderAfterCreateGroup(next, unique, gid);
}

export function ungroup(project: Project, groupId: UUID): Project {
  const next = pruneEmptyGroups({
    ...project,
    groups: project.groups.filter(g => g.id !== groupId),
    panels: project.panels.map(p => p.groupId === groupId ? { ...p, groupId: undefined } : p),
  });
  return treeOrderAfterUngroup(next, groupId);
}

export function translatePanels(project: Project, panelIds: UUID[], delta: Vec3): Project {
  const ids = new Set(panelIds);
  return {
    ...project,
    panels: project.panels.map(p => {
      if (!ids.has(p.id)) return p;
      return {
        ...p,
        position: {
          x: p.position.x + delta.x,
          y: p.position.y + delta.y,
          z: p.position.z + delta.z,
        },
      };
    }),
  };
}

export function setGroupCenter(project: Project, groupId: UUID, target: Vec3): Project {
  const members = panelsInGroup(project, groupId);
  if (!members.length) return project;
  const current = groupBBoxCenter(members);
  return translatePanels(project, members.map(p => p.id), {
    x: target.x - current.x,
    y: target.y - current.y,
    z: target.z - current.z,
  });
}

export function duplicateGroup(project: Project, groupId: UUID): Project {
  const group = project.groups.find(g => g.id === groupId);
  const members = panelsInGroup(project, groupId);
  if (!group || members.length < 2) return project;

  const maxX = Math.max(...members.map(p => panelBox(p).max.x));
  const minX = Math.min(...members.map(p => panelBox(p).min.x));
  const offsetX = maxX + DUP_GAP - minX;

  const newGid = crypto.randomUUID();
  const newGroup: PanelGroup = { id: newGid, name: nextCopyName(group.name) };

  const copies: Panel[] = members.map(src => ({
    ...src,
    id: crypto.randomUUID(),
    name: nextCopyName(src.name),
    groupId: newGid,
    edges: { ...src.edges },
    position: { ...src.position, x: src.position.x + offsetX },
  }));

  const idMap = new Map(members.map((src, i) => [src.id, copies[i].id]));

  return treeOrderAfterDuplicateGroup(pruneEmptyGroups({
    ...project,
    groups: [...project.groups, newGroup],
    panels: [...project.panels, ...copies],
  }), groupId, newGid, idMap);
}

export function removeGroup(project: Project, groupId: UUID): Project {
  const ids = new Set(panelsInGroup(project, groupId).map(p => p.id));
  return pruneEmptyGroups({
    ...project,
    groups: project.groups.filter(g => g.id !== groupId),
    panels: project.panels.filter(p => !ids.has(p.id)),
  });
}

/** Gira posicoes do grupo 90° em torno do eixo Y + gira orientacao de cada painel. */
export function rotateGroup90(project: Project, groupId: UUID): Project {
  const members = panelsInGroup(project, groupId);
  if (members.length < 2) return project;

  const center = groupBBoxCenter(members);

  let next: Project = {
    ...project,
    panels: project.panels.map(p => {
      if (p.groupId !== groupId) return p;
      const b = panelBox(p);
      const pc = {
        x: (b.min.x + b.max.x) / 2,
        y: (b.min.y + b.max.y) / 2,
        z: (b.min.z + b.max.z) / 2,
      };
      const dx = pc.x - center.x;
      const dz = pc.z - center.z;
      const newPc = { x: center.x + dz, y: pc.y, z: center.z - dx };
      const size = boxSize(b);
      return {
        ...p,
        position: {
          x: newPc.x - size.x / 2,
          y: newPc.y - size.y / 2,
          z: newPc.z - size.z / 2,
        },
      };
    }),
  };

  for (const p of members) {
    next = rotate90(next, p.id);
  }

  return next;
}

export function renameGroup(project: Project, groupId: UUID, name: string): Project {
  return {
    ...project,
    groups: project.groups.map(g => g.id === groupId ? { ...g, name } : g),
  };
}

export function setGroupVisibility(project: Project, groupId: UUID, visible: boolean): Project {
  return {
    ...project,
    panels: project.panels.map(p => p.groupId === groupId ? { ...p, visible } : p),
  };
}

export function afterPanelRemoved(project: Project, removedId: UUID): Project {
  return pruneEmptyGroups(project);
}
