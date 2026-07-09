// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { dropPlaceAtY } from "./treeReorder";

describe("treeReorder", () => {
  it("dropPlaceAtY usa metade superior como before", () => {
    const el = document.createElement("div");
    el.getBoundingClientRect = () => ({
      top: 100, bottom: 200, left: 0, right: 100, width: 100, height: 100,
      x: 0, y: 100, toJSON: () => ({}),
    });
    expect(dropPlaceAtY(120, el)).toBe("before");
    expect(dropPlaceAtY(180, el)).toBe("after");
  });
});
