import type { Project, UUID } from "./types";
import { panelsInGroup } from "./groups";

export type DropPlace = "before" | "after";

function isRenderedGroup(project: Project, groupId: UUID): boolean {
  return panelsInGroup(project, groupId).length >= 2;
}

function panelsInRenderedGroups(project: Project): Set<UUID> {
  const out = new Set<UUID>();
  for (const g of project.groups) {
    if (!isRenderedGroup(project, g.id)) continue;
    for (const p of panelsInGroup(project, g.id)) out.add(p.id);
  }
  return out;
}

/** Ordem padrão: grupos válidos, depois peças soltas. */
export function defaultTopLevelOrder(project: Project): UUID[] {
  const ids: UUID[] = [];
  for (const g of project.groups) {
    if (isRenderedGroup(project, g.id)) ids.push(g.id);
  }
  const grouped = panelsInRenderedGroups(project);
  for (const p of project.panels) {
    if (!grouped.has(p.id)) ids.push(p.id);
  }
  return ids;
}

export function resolveTopLevelOrder(project: Project): UUID[] {
  const valid = new Set(defaultTopLevelOrder(project));
  const order: UUID[] = [];
  for (const id of project.treeOrder ?? []) {
    if (valid.has(id) && !order.includes(id)) order.push(id);
  }
  for (const id of valid) {
    if (!order.includes(id)) order.push(id);
  }
  return order;
}

export function resolveMemberOrder(project: Project, groupId: UUID): UUID[] {
  const members = panelsInGroup(project, groupId);
  const valid = new Set(members.map(m => m.id));
  const group = project.groups.find(g => g.id === groupId);
  const order: UUID[] = [];
  for (const id of group?.memberOrder ?? []) {
    if (valid.has(id) && !order.includes(id)) order.push(id);
  }
  for (const m of members) {
    if (!order.includes(m.id)) order.push(m.id);
  }
  return order;
}

export function orderedGroupMembers(project: Project, groupId: UUID) {
  const byId = new Map(panelsInGroup(project, groupId).map(p => [p.id, p]));
  return resolveMemberOrder(project, groupId)
    .map(id => byId.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
}

function moveId(order: UUID[], activeId: UUID, overId: UUID, place: DropPlace): UUID[] {
  const from = order.indexOf(activeId);
  const over = order.indexOf(overId);
  if (from === -1 || over === -1 || activeId === overId) return order;

  let to = place === "after" ? over + 1 : over;
  const next = order.filter(id => id !== activeId);
  if (from < to) to--;
  next.splice(to, 0, activeId);
  return next;
}

export function reorderTopLevel(
  project: Project,
  activeId: UUID,
  overId: UUID,
  place: DropPlace,
): Project {
  const order = moveId(resolveTopLevelOrder(project), activeId, overId, place);
  return { ...project, treeOrder: order };
}

export function reorderGroupMember(
  project: Project,
  groupId: UUID,
  activeId: UUID,
  overId: UUID,
  place: DropPlace,
): Project {
  const order = moveId(resolveMemberOrder(project, groupId), activeId, overId, place);
  return {
    ...project,
    groups: project.groups.map(g =>
      g.id === groupId ? { ...g, memberOrder: order } : g,
    ),
  };
}

/** Após adicionar peça solta. */
export function treeOrderAfterAddPanel(project: Project, panelId: UUID): Project {
  const order = resolveTopLevelOrder(project);
  if (order.includes(panelId)) return project;
  return { ...project, treeOrder: [...order, panelId] };
}

/** Remove id de treeOrder e memberOrder. */
export function treeOrderAfterRemovePanel(project: Project, panelId: UUID): Project {
  const panel = project.panels.find(p => p.id === panelId);
  let next: Project = {
    ...project,
    treeOrder: (project.treeOrder ?? []).filter(id => id !== panelId),
    groups: project.groups.map(g => ({
      ...g,
      memberOrder: g.memberOrder?.filter(id => id !== panelId),
    })),
  };
  if (panel?.groupId) {
    const order = resolveMemberOrder(next, panel.groupId).filter(id => id !== panelId);
    next = {
      ...next,
      groups: next.groups.map(g =>
        g.id === panel.groupId ? { ...g, memberOrder: order } : g,
      ),
    };
  }
  return next;
}

/** Agrupa: substitui ids das peças por id do grupo na ordem do primeiro encontrado. */
export function treeOrderAfterCreateGroup(
  project: Project,
  panelIds: UUID[],
  groupId: UUID,
): Project {
  const order = resolveTopLevelOrder(project);
  const idSet = new Set(panelIds);
  const firstIdx = order.findIndex(id => idSet.has(id));
  const filtered = order.filter(id => !idSet.has(id));
  if (firstIdx === -1) return { ...project, treeOrder: [...filtered, groupId] };
  const insertAt = order.slice(0, firstIdx).filter(id => !idSet.has(id)).length;
  filtered.splice(insertAt, 0, groupId);
  const memberOrder = panelIds.filter(id => project.panels.some(p => p.id === id));
  return {
    ...project,
    treeOrder: filtered,
    groups: project.groups.map(g =>
      g.id === groupId ? { ...g, memberOrder } : g,
    ),
  };
}

/** Desagrupa: substitui id do grupo pelas peças na ordem interna. */
export function treeOrderAfterUngroup(project: Project, groupId: UUID): Project {
  const memberIds = resolveMemberOrder(project, groupId);
  const order = resolveTopLevelOrder(project);
  const idx = order.indexOf(groupId);
  if (idx === -1) return project;
  const next = [...order];
  next.splice(idx, 1, ...memberIds);
  return { ...project, treeOrder: next };
}

/** Duplica grupo: insere novo grupo após o original. */
export function treeOrderAfterDuplicateGroup(
  project: Project,
  sourceGroupId: UUID,
  newGroupId: UUID,
  idMap: Map<UUID, UUID>,
): Project {
  const order = resolveTopLevelOrder(project);
  const idx = order.indexOf(sourceGroupId);
  const memberOrder = resolveMemberOrder(project, sourceGroupId)
    .map(id => idMap.get(id))
    .filter((id): id is UUID => Boolean(id));

  let nextGroups = project.groups.map(g =>
    g.id === newGroupId ? { ...g, memberOrder } : g,
  );

  if (idx === -1) {
    return { ...project, treeOrder: [...order, newGroupId], groups: nextGroups };
  }
  const nextOrder = [...order];
  nextOrder.splice(idx + 1, 0, newGroupId);
  return { ...project, treeOrder: nextOrder, groups: nextGroups };
}

export function syncTreeOrder(project: Project): Project {
  const top = resolveTopLevelOrder(project);
  const groups = project.groups.map(g => {
    if (!isRenderedGroup(project, g.id)) {
      const { memberOrder: _, ...rest } = g;
      return rest;
    }
    return { ...g, memberOrder: resolveMemberOrder(project, g.id) };
  });
  return { ...project, treeOrder: top, groups };
}
