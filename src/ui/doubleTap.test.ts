// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createDoubleTapHandler } from "./doubleTap";

describe("createDoubleTapHandler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("dispara apenas no segundo toque no mesmo alvo", () => {
    const onDoubleTap = vi.fn();
    const register = createDoubleTapHandler(onDoubleTap);

    expect(register("a", 10, 10)).toBe(false);
    vi.advanceTimersByTime(100);
    expect(register("a", 12, 11)).toBe(true);
    expect(onDoubleTap).toHaveBeenCalledOnce();
    expect(onDoubleTap).toHaveBeenCalledWith("a");
  });

  it("nao dispara se o intervalo for longo", () => {
    const onDoubleTap = vi.fn();
    const register = createDoubleTapHandler(onDoubleTap);

    register("a", 0, 0);
    vi.advanceTimersByTime(400);
    expect(register("a", 0, 0)).toBe(false);
    expect(onDoubleTap).not.toHaveBeenCalled();
  });
});
