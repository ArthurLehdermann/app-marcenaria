/** Feedback visual imediato ao toque (iOS não aplica :active com preventDefault). */
export function bindPressFeedback(el: HTMLElement) {
  const press = () => el.classList.add("is-pressed");
  const release = () => el.classList.remove("is-pressed");

  el.addEventListener("pointerdown", press);
  el.addEventListener("pointerup", release);
  el.addEventListener("pointercancel", release);
  el.addEventListener("pointerleave", release);
}
