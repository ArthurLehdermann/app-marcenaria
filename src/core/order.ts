import type { Project, EdgeSide } from "./types";
import { groupPieces, areaByThicknessM2 } from "./pieces";

function edgeLabels(e: Record<EdgeSide, boolean>): string {
  const map: Record<EdgeSide, string> = {
    top: "Superior", bottom: "Inferior", left: "Esquerda", right: "Direita",
  };
  const on = (Object.keys(map) as EdgeSide[]).filter(k => e[k]).map(k => map[k]);
  return on.length ? on.join(", ") : "sem fita";
}

export function buildWhatsappOrder(project: Project): string {
  const groups = groupPieces(project.panels);
  const byThickness = new Map<number, typeof groups>();
  for (const g of groups) {
    const arr = byThickness.get(g.thickness) ?? [];
    arr.push(g);
    byThickness.set(g.thickness, arr);
  }

  const area = areaByThicknessM2(project.panels);
  const lines: string[] = [];
  lines.push("Bom dia. Orcamento para corte e fita:");
  lines.push("");

  const base = project.settings.defaultMaterial.replace(/\s*\d+\s*mm\s*$/i, "").trimEnd();
  const thicknesses = [...byThickness.keys()].sort((a, b) => a - b);

  for (const t of thicknesses) {
    lines.push(`${base} ${t} mm`);
    for (const g of byThickness.get(t)!) {
      lines.push(`${g.qty}x ${g.width} x ${g.height} mm`);
      lines.push(`Fita: ${edgeLabels(g.edges)}`);
      lines.push(`(${g.names.join("; ")})`);
    }
    lines.push(`Area ${t} mm: ${(area.get(t) ?? 0).toFixed(2)} m2`);
    lines.push("");
  }

  lines.push(`Total: ${project.panels.length} pecas`);
  return lines.join("\n");
}

export function buildCsv(project: Project): string {
  const groups = groupPieces(project.panels).sort((a, b) => a.thickness - b.thickness);
  const head = "qtd,largura_mm,altura_mm,espessura_mm,fita_sup,fita_inf,fita_esq,fita_dir,nomes";
  const rows = groups.map(g =>
    [g.qty, g.width, g.height, g.thickness,
     +g.edges.top, +g.edges.bottom, +g.edges.left, +g.edges.right,
     `"${g.names.join("; ")}"`].join(",")
  );
  return [head, ...rows].join("\n");
}
