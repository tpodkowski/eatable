import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isValidUserProfile, updateProfileFromCalories, updateProfileFromMacro } from "./profileForm.ts";

const defaults = { dailyCalorieLimit: 2000, dailyProteinLimit: 100, dailyCarbohydratesLimit: 250, dailyFatLimit: 67 };

describe("profile macro form calculations", () => {
  it("allocates calories to the default 20/30/50 split", () => {
    assert.deepEqual(updateProfileFromCalories(defaults, "2400"), {
      dailyCalorieLimit: 2400, dailyProteinLimit: 120, dailyCarbohydratesLimit: 300, dailyFatLimit: 80,
    });
  });
  it("recalculates calories from edited macro grams using 4/4/9 kcal per gram", () => {
    assert.equal(updateProfileFromMacro(defaults, "dailyFatLimit", "70").dailyCalorieLimit, 2030);
  });
  it("validates the supported integer range and ignores non-digit edits", () => {
    assert.equal(isValidUserProfile(defaults), true);
    assert.equal(isValidUserProfile({ ...defaults, dailyProteinLimit: 0 }), false);
    assert.deepEqual(updateProfileFromCalories(defaults, "2.5"), defaults);
  });
});
