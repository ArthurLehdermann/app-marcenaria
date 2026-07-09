import type { Project } from "./types";
import { importProject } from "./project";

export const PROJECT_STORAGE_KEY = "marcenaria_project_v1";

export function saveProjectLocal(project: Project): void {
  try {
    const payload = { ...project, updatedAt: new Date().toISOString() };
    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function loadProjectLocal(): Project | null {
  try {
    const raw = localStorage.getItem(PROJECT_STORAGE_KEY);
    if (!raw) return null;
    return importProject(raw);
  } catch {
    return null;
  }
}

export function clearProjectLocal(): void {
  try {
    localStorage.removeItem(PROJECT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
