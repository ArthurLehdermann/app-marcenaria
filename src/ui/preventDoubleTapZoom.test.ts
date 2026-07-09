import { describe, it, expect } from "vitest";
import { isDoubleTapZoomGesture } from "./preventDoubleTapZoom";

describe("isDoubleTapZoomGesture", () => {
  it("detecta duplo toque no mesmo ponto", () => {
    expect(isDoubleTapZoomGesture(200, 10)).toBe(true);
  });

  it("ignora toques distantes", () => {
    expect(isDoubleTapZoomGesture(200, 120)).toBe(false);
  });

  it("ignora toques com intervalo longo", () => {
    expect(isDoubleTapZoomGesture(500, 5)).toBe(false);
  });
});
