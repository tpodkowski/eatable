import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateDailyCalorieLimit } from "./profile.js";

describe("daily calorie limit", () => {
  it("accepts whole numbers within the supported range", () => {
    assert.deepEqual(validateDailyCalorieLimit(1), { success: true, data: 1 });
    assert.deepEqual(validateDailyCalorieLimit(2000), { success: true, data: 2000 });
    assert.deepEqual(validateDailyCalorieLimit(100_000), { success: true, data: 100_000 });
  });

  it("rejects zero, negative, fractional, oversized, and non-numeric values", () => {
    for (const value of [0, -1, 1.5, 100_001, "2000", null, undefined]) {
      assert.deepEqual(validateDailyCalorieLimit(value), { success: false });
    }
  });
});
