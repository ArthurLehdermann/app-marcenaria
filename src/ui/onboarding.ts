const STORAGE_KEY = "marcenaria_onboarding_v1";

type Tip = { keys: string; text: string };

const MOBILE_TIPS: Tip[] = [
  { keys: "Toque", text: "seleciona a peça" },
  { keys: "Toque 2×", text: "abre propriedades" },
  { keys: "Botão mover", text: "ativa arrasto da peça selecionada" },
  { keys: "1 dedo", text: "gira a câmera · 2 dedos zoom e pan" },
  { keys: "+", text: "adiciona painel" },
  { keys: "☰", text: "novo, abrir, salvar e exportar pedido" },
];

const DESKTOP_TIPS: Tip[] = [
  { keys: "Clique", text: "seleciona a peça" },
  { keys: "Espaço + arrastar", text: "move a câmera" },
  { keys: "Scroll", text: "zoom · arrastar orbita · botão direito pan" },
  { keys: "Ctrl + arrastar", text: "move a peça selecionada" },
  { keys: "Shift + clique", text: "seleção múltipla para agrupar" },
  { keys: "Barra superior", text: "salvar projeto e exportar pedido WhatsApp" },
];

function isMobileViewport() {
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

function renderTips(tips: Tip[]): string {
  return tips.map(t => `
    <li class="onboarding-tip">
      <kbd class="onboarding-keys">${t.keys}</kbd>
      <span class="onboarding-text">${t.text}</span>
    </li>`).join("");
}

export function setupOnboarding(): { shown: boolean; dismiss: () => void } {
  const overlay = document.getElementById("onboarding-overlay");
  const list = document.getElementById("onboarding-tips");
  const btn = document.getElementById("btn-onboarding-close");
  if (!overlay || !list || !btn) return { shown: false, dismiss: () => {} };

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    overlay!.classList.remove("open");
    overlay!.setAttribute("aria-hidden", "true");
  }

  if (localStorage.getItem(STORAGE_KEY)) {
    return { shown: false, dismiss };
  }

  list.innerHTML = renderTips(isMobileViewport() ? MOBILE_TIPS : DESKTOP_TIPS);
  overlay.classList.add("open");
  overlay.setAttribute("aria-hidden", "false");

  btn.addEventListener("click", dismiss);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) dismiss();
  });

  return { shown: true, dismiss };
}
