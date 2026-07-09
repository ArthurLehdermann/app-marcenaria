import type { Project } from "../core/types";

export function newProject(): Project {
  return {
    id: crypto.randomUUID(),
    name: "Sem título",
    settings: { defaultMaterial: "MDF 18 mm", defaultThickness: 18 },
    panels: [],
    groups: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    appVersion: "0.1.0",
    schemaVersion: 2,
  };
}
