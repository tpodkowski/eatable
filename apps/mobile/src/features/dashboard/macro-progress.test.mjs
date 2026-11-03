import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getProgressRatio } from "../../lib/macro-progress.ts";

describe("dashboard macro progress", () => {
  it("calculates the consumed share of a daily target", () => {
    assert.equal(getProgressRatio(25, 100), 0.25);
  });
  it("caps progress at the target and handles invalid inputs", () => {
    assert.equal(getProgressRatio(150, 100), 1);
    assert.equal(getProgressRatio(-5, 100), 0);
    assert.equal(getProgressRatio(20, 0), 0);
  });
});
