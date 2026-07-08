export function setupProjectNameEdit(
  el: HTMLButtonElement,
  getName: () => string,
  setName: (name: string) => void,
) {
  function sync() {
    if (el.querySelector("input")) return;
    el.textContent = getName();
  }

  el.addEventListener("click", () => {
    if (el.querySelector("input")) return;

    const input = document.createElement("input");
    input.type = "text";
    input.className = "project-name-input";
    input.value = getName();
    input.setAttribute("aria-label", "Nome do projeto");
    el.textContent = "";
    el.appendChild(input);
    input.focus();
    input.select();

    const commit = () => {
      const next = input.value.trim() || "Sem título";
      setName(next);
      el.textContent = next;
    };

    input.addEventListener("blur", commit, { once: true });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        input.blur();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        input.value = getName();
        input.blur();
      }
    });
  });

  sync();
  return { sync };
}
