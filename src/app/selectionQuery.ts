import { expandSelectionToGroups, panelsInGroup } from "../core/groups";
import type { Panel, Project, UUID } from "../core/types";

export function expandedSelection(project: Project, selectedIds: UUID[]): UUID[] {
  return expandSelectionToGroups(project, selectedIds);
}

export function activeGroupId(project: Project, selectedIds: UUID[]): UUID | null {
  if (!selectedIds.length) return null;

  const panels = selectedIds
    .map(id => project.panels.find(p => p.id === id))
    .filter((p): p is Panel => Boolean(p));
  if (!panels.length) return null;

  const gids = new Set(panels.map(p => p.groupId).filter(Boolean) as UUID[]);
  if (gids.size !== 1) return null;

  const gid = [...gids][0]!;
  const members = panelsInGroup(project, gid);
  if (members.length < 2) return null;

  const allMembersSelected = members.every(m => selectedIds.includes(m.id));
  const onlyThoseMembers = panels.every(p => p.groupId === gid) && selectedIds.length === members.length;
  return allMembersSelected && onlyThoseMembers ? gid : null;
}

export function canCreateGroup(project: Project, selectedIds: UUID[]): boolean {
  if (selectedIds.length < 2) return false;
  const inGroup = selectedIds.filter(id => project.panels.find(p => p.id === id)?.groupId);
  return inGroup.length === 0;
}
