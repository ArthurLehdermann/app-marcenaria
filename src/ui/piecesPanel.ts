import type { Panel } from "../core/types";
import { groupPieces } from "../core/pieces";

export function createPiecesPanel(container: HTMLElement) {
  function update(panels: Panel[]) {
    container.innerHTML = "";
    const groups = groupPieces(panels);
    for (const g of groups) {
      const row = document.createElement("div");
      row.dataset.pieceRow = "";

      const qty = document.createElement("span");
      qty.dataset.qty = "";
      qty.textContent = String(g.qty);
      row.appendChild(qty);

      const dims = document.createElement("span");
      dims.className = "piece-dims";
      dims.textContent = `× ${g.width} × ${g.height} × ${g.thickness} mm`;
      row.appendChild(dims);

      const names = document.createElement("span");
      names.className = "piece-names";
      names.textContent = g.names.join(" · ");
      names.title = g.names.join("; ");
      row.appendChild(names);

      container.appendChild(row);
    }
  }

  return { update };
}
