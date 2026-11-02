import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isValidMealDate, validateMealEntryInput } from "./meals.js";

describe("meal entry input", () => {
  it("normalizes and accepts a dish with optional nutrition details", () => {
    const result = validateMealEntryInput({
      date: "2026-11-02",
      type: "dish",
      title: "  Oatmeal  ",
      quantity: "  250 g ",
      notes: "  With berries  ",
      calories: 380,
    });

    assert.deepEqual(result, {
      success: true,
      data: {
        date: "2026-11-02",
        type: "dish",
        title: "Oatmeal",
        quantity: "250 g",
        notes: "With berries",
        calories: 380,
      },
    });
  });

  it("accepts a product and converts empty optional fields to null", () => {
    const result = validateMealEntryInput({
      date: "2024-02-29",
      type: "product",
      title: "Apple",
      quantity: "",
      notes: "",
    });

    assert.equal(result.success, true);
    if (result.success) {
      assert.deepEqual(result.data, {
        date: "2024-02-29",
        type: "product",
        title: "Apple",
        quantity: null,
        notes: null,
        calories: null,
      });
    }
  });

  it("rejects malformed dates, unknown types, and empty or oversized titles", () => {
    assert.equal(isValidMealDate("2026-02-30"), false);
    assert.deepEqual(validateMealEntryInput({ date: "2026-11-02", type: "recipe", title: "Soup" }), {
      success: false,
      error: "invalidType",
    });
    assert.deepEqual(validateMealEntryInput({ date: "2026-11-02", type: "dish", title: "  " }), {
      success: false,
      error: "invalidTitle",
    });
    assert.deepEqual(validateMealEntryInput({ date: "2026-11-02", type: "dish", title: "x".repeat(161) }), {
      success: false,
      error: "invalidTitle",
    });
  });

  it("rejects invalid quantities, notes, and calorie values", () => {
    const base = { date: "2026-11-02", type: "product", title: "Apple" };
    assert.equal(validateMealEntryInput({ ...base, quantity: "x".repeat(61) }).success, false);
    assert.equal(validateMealEntryInput({ ...base, notes: "x".repeat(501) }).success, false);
    assert.deepEqual(validateMealEntryInput({ ...base, calories: -1 }), { success: false, error: "invalidCalories" });
    assert.deepEqual(validateMealEntryInput({ ...base, calories: 1.5 }), { success: false, error: "invalidCalories" });
  });
});
