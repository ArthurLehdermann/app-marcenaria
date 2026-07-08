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
      dims.textContent = ` × ${g.width} × ${g.height} × ${g.thickness} mm`;
      row.appendChild(dims);

      container.appendChild(row);
    }
  }

  return { update };
}
