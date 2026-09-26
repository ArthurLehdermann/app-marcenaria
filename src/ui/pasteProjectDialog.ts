/** Modal para colar JSON de projeto (Abrir → Colar texto). */
export function openPasteProjectDialog(): Promise<string | null> {
  const overlay = document.getElementById("paste-project-overlay");
  const dialog = document.getElementById("paste-project-dialog");
  const textarea = document.getElementById("paste-project-text") as HTMLTextAreaElement | null;
  const btnOk = document.getElementById("btn-paste-project-import");
  const btnCancel = document.getElementById("btn-paste-project-cancel");
  if (!overlay || !dialog || !textarea || !btnOk || !btnCancel) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    let done = false;
    const finish = (value: string | null) => {
      if (done) return;
      done = true;
      overlay.classList.remove("open");
      overlay.setAttribute("aria-hidden", "true");
      document.removeEventListener("keydown", onKey);
      btnOk.removeEventListener("click", onImport);
      btnCancel.removeEventListener("click", onCancel);
      overlay.removeEventListener("click", onOverlay);
      resolve(value);
    };

    const onImport = () => {
      const text = textarea.value.trim();
      if (!text) {
        textarea.focus();
        return;
      }
      finish(text);
    };
    const onCancel = () => finish(null);
    const onOverlay = (e: MouseEvent) => {
      if (e.target === overlay) finish(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish(null);
    };

    textarea.value = "";
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
    btnOk.addEventListener("click", onImport);
    btnCancel.addEventListener("click", onCancel);
    overlay.addEventListener("click", onOverlay);
    document.addEventListener("keydown", onKey);
    requestAnimationFrame(() => textarea.focus());
  });
}
