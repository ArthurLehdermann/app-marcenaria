import type { Panel } from "../core/types";

const EDGE_PX = 3;
const MAX_CORE = 22;
const MIN_CORE = 5;

/** Tamanho do miolo do ícone, proporcional às dimensões de corte (largura × altura). */
export function edgeIndicatorCoreSize(width: number, height: number): { w: number; h: number } {
  if (width <= 0 || height <= 0) return { w: MAX_CORE, h: MAX_CORE };
  const ratio = width / height;
  if (ratio >= 1) {
    return { w: MAX_CORE, h: Math.max(MIN_CORE, Math.round(MAX_CORE / ratio)) };
  }
  return { w: Math.max(MIN_CORE, Math.round(MAX_CORE * ratio)), h: MAX_CORE };
}

export function createEdgeIndicator(panel: Pick<Panel, "edges" | "width" | "height">): HTMLElement {
  const { edges, width, height } = panel;
  const { w, h } = edgeIndicatorCoreSize(width, height);

  const el = document.createElement("div");
  el.className = "ei";
  el.style.gridTemplateColumns = `${EDGE_PX}px ${w}px ${EDGE_PX}px`;
  el.style.gridTemplateRows = `${EDGE_PX}px ${h}px ${EDGE_PX}px`;
  el.innerHTML = `
    <div class="ei-t ${edges.top    ? "on" : ""}"></div>
    <div class="ei-l ${edges.left   ? "on" : ""}"></div>
    <div class="ei-core"></div>
    <div class="ei-r ${edges.right  ? "on" : ""}"></div>
    <div class="ei-b ${edges.bottom ? "on" : ""}"></div>
  `;
  return el;
}
