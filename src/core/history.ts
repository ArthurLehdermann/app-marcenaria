import type { Project } from "./types";
import { cloneProject } from "./project";

export type ProjectHistory = {
  init(project: Project): void;
  record(before: Project): void;
  undo(current: Project): Project | null;
  redo(current: Project): Project | null;
  canUndo(): boolean;
  canRedo(): boolean;
};

export function createProjectHistory(maxEntries = 50): ProjectHistory {
  let past: Project[] = [];
  let future: Project[] = [];

  return {
    init() {
      past = [];
      future = [];
    },
    record(before) {
      past.push(cloneProject(before));
      if (past.length > maxEntries) past.shift();
      future = [];
    },
    undo(current) {
      if (!past.length) return null;
      future.unshift(cloneProject(current));
      return cloneProject(past.pop()!);
    },
    redo(current) {
      if (!future.length) return null;
      past.push(cloneProject(current));
      return cloneProject(future.shift()!);
    },
    canUndo() {
      return past.length > 0;
    },
    canRedo() {
      return future.length > 0;
    },
  };
}
