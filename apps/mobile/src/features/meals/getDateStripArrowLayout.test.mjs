import assert from "node:assert/strict";
import test from "node:test";
import { getDateStripArrowLayout } from "./getDateStripArrowLayout.ts";

test("keeps an opaque arrow button and fades only toward the center", () => {
  for (const direction of ["left", "right"]) {
    const layout = getDateStripArrowLayout(direction, "#fffaf0");

    assert.equal(layout.button.backgroundColor, "#fffaf0");
    assert.equal(layout.button.width, 54);
    assert.equal(layout.gradient.width, 32);
    assert.equal(layout.overlayWidth, layout.button.width + layout.gradient.width);
    assert.ok(layout.gradient.opacityStops.every((opacity) => opacity > 0 && opacity < 1));
    assert.ok(layout.gradient.opacityStops.every((opacity, index, stops) => index === 0 || (
      direction === "left" ? opacity < stops[index - 1] : opacity > stops[index - 1]
    )));
  }
});

test("mirrors the fade and button alignment for the opposite edge", () => {
  const left = getDateStripArrowLayout("left", "#fffaf0");
  const right = getDateStripArrowLayout("right", "#fffaf0");

  assert.equal(left.button.left, 0);
  assert.equal(left.gradient.left, left.button.width);
  assert.equal(right.button.right, 0);
  assert.equal(right.gradient.right, right.button.width);
  assert.deepEqual(right.gradient.opacityStops, [...left.gradient.opacityStops].reverse());
});
