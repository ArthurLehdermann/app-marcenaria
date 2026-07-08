export type DoubleTapOptions = {
  maxDelayMs?: number;
  maxDistancePx?: number;
};

export function createDoubleTapHandler(
  onDoubleTap: (key: string) => void,
  options: DoubleTapOptions = {},
) {
  const maxDelay = options.maxDelayMs ?? 350;
  const maxDist = options.maxDistancePx ?? 28;
  let lastKey = "";
  let lastTime = 0;
  let lastX = 0;
  let lastY = 0;

  return (key: string, clientX: number, clientY: number): boolean => {
    const now = Date.now();
    const isDouble =
      key === lastKey &&
      now - lastTime <= maxDelay &&
      Math.hypot(clientX - lastX, clientY - lastY) <= maxDist;
    if (isDouble) {
      lastKey = "";
      onDoubleTap(key);
      return true;
    }
    lastKey = key;
    lastTime = now;
    lastX = clientX;
    lastY = clientY;
    return false;
  };
}
