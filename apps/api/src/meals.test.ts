import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isValidMealDate, validateMealEntryInput } from "./meals.js";

describe("meal entry input", () => {
  it("normalizes a product with optional nutrition details", () => {
    const result = validateMealEntryInput({
      date: "2026-11-02",
      title: "  Oatmeal  ",
      quantity: "  250 g ",
      notes: "  With berries  ",
      calories: 380,
      protein: 12,
      carbohydrates: 44,
      fat: 8,
    });

    assert.deepEqual(result, {
      success: true,
      data: {
        date: "2026-11-02",
        title: "Oatmeal",
        quantity: "250 g",
        notes: "With berries",
        calories: 380,
        protein: 12,
        carbohydrates: 44,
        fat: 8,
      },
    });
  });

  it("converts empty optional fields to null", () => {
    const result = validateMealEntryInput({
      date: "2024-02-29",
      title: "Apple",
      quantity: "",
      notes: "",
    });

    assert.equal(result.success, true);
    if (result.success) {
      assert.deepEqual(result.data, {
        date: "2024-02-29",
        title: "Apple",
        quantity: null,
        notes: null,
        calories: null,
        protein: null,
        carbohydrates: null,
        fat: null,
      });
    }
  });

  it("rejects malformed dates and empty or oversized titles", () => {
    assert.equal(isValidMealDate("2026-02-30"), false);
    assert.deepEqual(validateMealEntryInput({ date: "2026-11-02", title: "  " }), {
      success: false,
      error: "invalidTitle",
    });
    assert.deepEqual(validateMealEntryInput({ date: "2026-11-02", title: "x".repeat(161) }), {
      success: false,
      error: "invalidTitle",
    });
  });

  it("rejects invalid quantities, notes, and calorie values", () => {
    const base = { date: "2026-11-02", title: "Apple" };
    assert.equal(validateMealEntryInput({ ...base, quantity: "x".repeat(61) }).success, false);
    assert.equal(validateMealEntryInput({ ...base, notes: "x".repeat(501) }).success, false);
    assert.deepEqual(validateMealEntryInput({ ...base, calories: -1 }), { success: false, error: "invalidCalories" });
    assert.deepEqual(validateMealEntryInput({ ...base, calories: 1.5 }), { success: false, error: "invalidCalories" });
    assert.deepEqual(validateMealEntryInput({ ...base, protein: -1 }), { success: false, error: "invalidProtein" });
    assert.deepEqual(validateMealEntryInput({ ...base, carbohydrates: 1.5 }), { success: false, error: "invalidCarbohydrates" });
  });
});
