import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateMealEntryForm } from "./meal-entry-form-validation.ts";

const validForm = {
  title: "Oatmeal",
  quantity: "250 g",
  notes: "With berries",
  calories: "380",
  protein: "12",
  carbohydrates: "44",
  fat: "8",
};

describe("meal entry form validation", () => {
  it("accepts valid values and optional blank nutrition fields", () => {
    assert.deepEqual(validateMealEntryForm({ ...validForm, calories: "", protein: "", carbohydrates: "", fat: "" }), {});
  });

  it("requires a non-whitespace title and enforces title length", () => {
    assert.equal(validateMealEntryForm({ ...validForm, title: "  " }).title, "planner.validationTitleRequired");
    assert.equal(validateMealEntryForm({ ...validForm, title: "x".repeat(161) }).title, "planner.validationTitleTooLong");
  });

  it("enforces quantity and notes length", () => {
    assert.equal(validateMealEntryForm({ ...validForm, quantity: "x".repeat(61) }).quantity, "planner.validationQuantityTooLong");
    assert.equal(validateMealEntryForm({ ...validForm, notes: "x".repeat(501) }).notes, "planner.validationNotesTooLong");
  });

  it("rejects non-integer, negative, and oversized calorie and macro values", () => {
    for (const value of ["1.5", "-1", "100001", "1x"]) {
      assert.equal(validateMealEntryForm({ ...validForm, calories: value }).calories, "errors.invalidCalories");
      assert.equal(validateMealEntryForm({ ...validForm, protein: value }).protein, "errors.invalidMacro");
    }
  });

  it("accepts zero and the maximum supported nutrition value", () => {
    assert.deepEqual(validateMealEntryForm({ ...validForm, calories: "0", protein: "100000", carbohydrates: "0", fat: "100000" }), {});
  });
});
