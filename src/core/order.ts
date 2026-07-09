import type { Project, EdgeSide } from "./types";
import { groupPieces, areaByThicknessM2 } from "./pieces";

const EDGE_SHORT: Record<EdgeSide, string> = {
  top: "Sup", bottom: "Inf", left: "Esq", right: "Dir",
};

function edgeShort(e: Record<EdgeSide, boolean>): string {
  const on = (Object.keys(EDGE_SHORT) as EdgeSide[]).filter(k => e[k]).map(k => EDGE_SHORT[k]);
  return on.length ? on.join(" ") : "-";
}

function formatItemLine(qty: number, width: number, height: number, edges: Record<EdgeSide, boolean>): string {
  return `${qty}x ${width}x${height} | ${edgeShort(edges)}`;
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
  const base = project.settings.defaultMaterial.replace(/\s*\d+\s*mm\s*$/i, "").trimEnd();
  const thicknesses = [...byThickness.keys()].sort((a, b) => a - b);

  const blocks: string[] = ["Olá! Corte e fita:"];

  for (const t of thicknesses) {
    const items = byThickness.get(t)!;
    const itemLines = items.map(g => formatItemLine(g.qty, g.width, g.height, g.edges));
    blocks.push(`${base} ${t} mm\n${itemLines.join("\n")}`);
  }

  const areaTotal = thicknesses.length === 1
    ? `${(area.get(thicknesses[0]) ?? 0).toFixed(2)} m2`
    : thicknesses.map(t => `${t}mm: ${(area.get(t) ?? 0).toFixed(2)} m2`).join(", ");
  blocks.push(`${areaTotal}, ${project.panels.length} pecas`);

  // CRLF: WhatsApp preserva quebras melhor que LF sozinho
  return blocks.join("\n\n").replace(/\n/g, "\r\n");
}

function csvQuotedNames(names: string[]): string {
  return `"${names.map(n => n.replace(/"/g, '""')).join("; ")}"`;
}

export function buildCsv(project: Project): string {
  const groups = groupPieces(project.panels).sort((a, b) => a.thickness - b.thickness);
  const head = "qtd,largura_mm,altura_mm,espessura_mm,fita_sup,fita_inf,fita_esq,fita_dir,nomes";
  const rows = groups.map(g =>
    [g.qty, g.width, g.height, g.thickness,
     +g.edges.top, +g.edges.bottom, +g.edges.left, +g.edges.right,
     csvQuotedNames(g.names)].join(",")
  );
  return [head, ...rows].join("\n");
}
