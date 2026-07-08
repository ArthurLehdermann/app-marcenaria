export type MultiSelectCallbacks = {
  onGroup(name: string): void;
  onClear(): void;
};

export function createMultiSelectPanel(container: HTMLElement, cbs: MultiSelectCallbacks) {
  function update(count: number) {
    container.innerHTML = "";
    if (count < 2) return;

    const form = document.createElement("div");
    form.dataset.multiForm = "";

    const header = document.createElement("div");
    header.className = "props-group-header props-group-header--select";
    header.innerHTML = `
      <span class="props-group-icon" aria-hidden="true">◫</span>
      <div class="props-group-head-text">
        <span class="props-group-kicker">Seleção múltipla</span>
        <span class="props-group-meta">${count} peças marcadas</span>
      </div>`;
    form.appendChild(header);

    const nameLabel = document.createElement("label");
    nameLabel.textContent = "Nome do bloco ";
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.placeholder = "Grupo 1";
    nameLabel.appendChild(nameInput);
    form.appendChild(nameLabel);

    const actions = document.createElement("div");
    actions.className = "actions";

    const groupBtn = document.createElement("button");
    groupBtn.type = "button";
    groupBtn.dataset.action = "group";
    groupBtn.textContent = "Agrupar";
    const submitGroup = () => cbs.onGroup(nameInput.value);
    groupBtn.addEventListener("click", submitGroup);
    nameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submitGroup();
      }
    });
    actions.appendChild(groupBtn);

    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.dataset.action = "clear";
    clearBtn.textContent = "Limpar seleção";
    clearBtn.addEventListener("click", () => cbs.onClear());
    actions.appendChild(clearBtn);

    form.appendChild(actions);
    container.appendChild(form);
  }

  return { update };
}
