// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { setupProjectNameEdit } from "./projectName";

describe("setupProjectNameEdit", () => {
  it("clicar abre input e blur salva nome", () => {
    let name = "Sem título";
    const btn = document.createElement("button");
    btn.id = "project-name";
    document.body.appendChild(btn);

    setupProjectNameEdit(btn, () => name, (n) => { name = n; });
    btn.click();

    const input = btn.querySelector("input") as HTMLInputElement;
    expect(input).not.toBeNull();
    input.value = "Armário cozinha";
    input.dispatchEvent(new Event("blur"));

    expect(name).toBe("Armário cozinha");
    expect(btn.textContent).toBe("Armário cozinha");
  });

  it("sync atualiza rotulo", () => {
    let name = "A";
    const btn = document.createElement("button");
    const handle = setupProjectNameEdit(btn, () => name, vi.fn());
    name = "B";
    handle.sync();
    expect(btn.textContent).toBe("B");
  });
});
