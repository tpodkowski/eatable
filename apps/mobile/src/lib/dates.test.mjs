import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isValidDateKey } from "./dates.ts";

describe("date route parameter validation", () => {
  it("accepts real calendar dates", () => {
    assert.equal(isValidDateKey("2026-11-03"), true);
    assert.equal(isValidDateKey("2024-02-29"), true);
  });

  it("rejects malformed and impossible date values", () => {
    assert.equal(isValidDateKey("2026-11-3"), false);
    assert.equal(isValidDateKey("2026-02-30"), false);
    assert.equal(isValidDateKey(["2026-11-03"]), false);
    assert.equal(isValidDateKey(undefined), false);
  });
});
