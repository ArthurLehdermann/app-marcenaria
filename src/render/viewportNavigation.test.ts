// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { isTypingTarget } from "./viewportNavigation";

describe("isTypingTarget", () => {
  it("detecta campos de texto", () => {
    const input = document.createElement("input");
    expect(isTypingTarget(input)).toBe(true);
  });

  it("ignora canvas", () => {
    const canvas = document.createElement("canvas");
    expect(isTypingTarget(canvas)).toBe(false);
  });
});
