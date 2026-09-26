import type { Project, EdgeSide } from "./types";
import { groupPieces, areaByThicknessM2, totalEdgeBandingM, type GroupedPiece } from "./pieces";

const EDGE_MM_LABEL: Record<EdgeSide, string> = {
  top: "sup",
  bottom: "inf",
  left: "esq",
  right: "dir",
};

/** Comprimento de fita por lado marcado (mm), no plano de corte largura × altura. */
export function edgeBandingDetailMm(
  width: number,
  height: number,
  edges: Record<EdgeSide, boolean>,
): string {
  const parts: string[] = [];
  if (edges.top) parts.push(`${EDGE_MM_LABEL.top} ${width} mm`);
  if (edges.bottom) parts.push(`${EDGE_MM_LABEL.bottom} ${width} mm`);
  if (edges.left) parts.push(`${EDGE_MM_LABEL.left} ${height} mm`);
  if (edges.right) parts.push(`${EDGE_MM_LABEL.right} ${height} mm`);
  return parts.length ? parts.join(", ") : "sem fita";
}

function formatNames(names: string[]): string {
  const uniq = [...new Set(names.map(n => n.trim()).filter(Boolean))];
  return uniq.join("; ");
}

function formatItemBlock(g: GroupedPiece): string {
  const dim = `${g.qty}x ${g.width}x${g.height} mm`;
  const names = formatNames(g.names);
  const fita = edgeBandingDetailMm(g.width, g.height, g.edges);
  const head = names ? `${dim} - ${names}` : dim;
  return `${head}\n  Fita: ${fita}`;
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

  const blocks: string[] = ["Olá! Corte e fita:", ""];

  for (const t of thicknesses) {
    const items = byThickness.get(t)!;
    const itemLines = items.map(g => formatItemBlock(g));
    blocks.push(`${base} ${t} mm`, itemLines.join("\n\n"));
  }

  const areaTotal = thicknesses.length === 1
    ? `${(area.get(thicknesses[0]) ?? 0).toFixed(2)} m2`
    : thicknesses.map(t => `${t}mm: ${(area.get(t) ?? 0).toFixed(2)} m2`).join(", ");
  const edgeTotal = `${totalEdgeBandingM(project.panels).toFixed(2)} m fita`;
  blocks.push("", `${areaTotal}, ${edgeTotal}, ${project.panels.length} pecas`);

  // CRLF: WhatsApp preserva quebras melhor que LF sozinho
  return blocks.join("\n").replace(/\n/g, "\r\n");
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
