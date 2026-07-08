import { describe, it, expect } from "vitest";
import { edgeIndicatorCoreSize } from "./edgeIndicator";

describe("edgeIndicatorCoreSize", () => {
  it("quadrado gera miolo quadrado no tamanho maximo", () => {
    expect(edgeIndicatorCoreSize(600, 600)).toEqual({ w: 22, h: 22 });
  });

  it("retangulo horizontal: largura no maximo, altura proporcional", () => {
    const { w, h } = edgeIndicatorCoreSize(964, 582);
    expect(w).toBe(22);
    expect(h).toBeGreaterThan(5);
    expect(h).toBeLessThan(22);
    expect(w / h).toBeCloseTo(964 / 582, 0);
  });

  it("retangulo vertical: altura no maximo, largura proporcional", () => {
    const { w, h } = edgeIndicatorCoreSize(600, 760);
    expect(h).toBe(22);
    expect(w).toBeGreaterThan(5);
    expect(w).toBeLessThan(22);
    expect(w / h).toBeCloseTo(600 / 760, 0);
  });

  it("ripa fina mantém espessura minima visivel", () => {
    const { w, h } = edgeIndicatorCoreSize(964, 50);
    expect(w).toBe(22);
    expect(h).toBe(5);
  });

  it("dimensoes invalidas caem no quadrado padrao", () => {
    expect(edgeIndicatorCoreSize(0, 100)).toEqual({ w: 22, h: 22 });
  });
});
