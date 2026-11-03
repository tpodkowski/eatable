import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateDailyCalorieLimit, validateUserProfile } from "./profile.js";

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

describe("user profile validation", () => {
  const valid = { dailyCalorieLimit: 2000, dailyProteinLimit: 100, dailyCarbohydratesLimit: 250, dailyFatLimit: 67 };
  it("accepts valid calorie and macro limits", () => {
    assert.deepEqual(validateUserProfile(valid), { success: true, data: valid });
  });
  it("defaults an empty profile and derives missing macros from the calorie limit", () => {
    assert.deepEqual(validateUserProfile(undefined), { success: true, data: valid });
    assert.deepEqual(validateUserProfile({ dailyCalorieLimit: 1800 }), {
      success: true,
      data: { dailyCalorieLimit: 1800, dailyProteinLimit: 90, dailyCarbohydratesLimit: 225, dailyFatLimit: 60 },
    });
    assert.deepEqual(validateUserProfile({ dailyCalorieLimit: 1800, dailyProteinLimit: 95 }), {
      success: true,
      data: { dailyCalorieLimit: 1800, dailyProteinLimit: 95, dailyCarbohydratesLimit: 225, dailyFatLimit: 60 },
    });
  });
  it("rejects missing, fractional, out-of-range, and non-numeric limits", () => {
    for (const invalid of [
      { ...valid, dailyProteinLimit: 0 }, { ...valid, dailyFatLimit: 100_001 },
      { ...valid, dailyCarbohydratesLimit: 12.5 }, { ...valid, dailyCalorieLimit: "2000" },
      { dailyProteinLimit: 0 },
    ]) assert.deepEqual(validateUserProfile(invalid), { success: false });
  });
});
