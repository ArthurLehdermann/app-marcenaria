// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { openPasteProjectDialog } from "./pasteProjectDialog";

function mountPasteDialog() {
  document.body.innerHTML = `
    <div id="paste-project-overlay" aria-hidden="true">
      <div id="paste-project-dialog">
        <textarea id="paste-project-text"></textarea>
        <button id="btn-paste-project-cancel" type="button">Cancelar</button>
        <button id="btn-paste-project-import" type="button">Importar</button>
      </div>
    </div>
  `;
}

describe("openPasteProjectDialog", () => {
  beforeEach(() => mountPasteDialog());
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("retorna null ao cancelar", async () => {
    const p = openPasteProjectDialog();
    (document.getElementById("btn-paste-project-cancel") as HTMLButtonElement).click();
    await expect(p).resolves.toBeNull();
  });

  it("retorna texto trimado ao importar", async () => {
    const p = openPasteProjectDialog();
    const ta = document.getElementById("paste-project-text") as HTMLTextAreaElement;
    ta.value = '  {"x":1}  ';
    (document.getElementById("btn-paste-project-import") as HTMLButtonElement).click();
    await expect(p).resolves.toBe('{"x":1}');
  });

  it("nao resolve com texto vazio", async () => {
    let settled = false;
    const p = openPasteProjectDialog().then((v) => {
      settled = true;
      return v;
    });
    (document.getElementById("btn-paste-project-import") as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 20));
    expect(settled).toBe(false);
    const ta = document.getElementById("paste-project-text") as HTMLTextAreaElement;
    ta.value = "{}";
    (document.getElementById("btn-paste-project-import") as HTMLButtonElement).click();
    await expect(p).resolves.toBe("{}");
  });
});
