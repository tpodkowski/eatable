import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeGtin, validateProductInput, validateProductMealInput } from "./products.js";

const validProduct = {
  name: "  Oat milk ",
  brand: "  Oats Co ",
  barcode: "4006381333931",
  nutritionBasis: "ml",
  calories: 46.5,
  protein: 1.1,
  carbohydrates: 6.7,
  fat: 1.5,
};

describe("product validation", () => {
  it("normalizes product fields and GTINs", () => {
    const result = validateProductInput(validProduct);
    assert.equal(result.success, true);
    if (result.success) {
      assert.deepEqual(result.data, {
        ...validProduct,
        name: "Oat milk",
        brand: "Oats Co",
        barcode: "04006381333931",
      });
    }
  });

  it("allows products without a barcode", () => {
    const result = validateProductInput({ ...validProduct, brand: "", barcode: "" });
    assert.equal(result.success, true);
    if (result.success) assert.equal(result.data.barcode, null);
  });

  it("rejects missing names, invalid bases, out of range values, and precision beyond two decimals", () => {
    assert.equal(validateProductInput({ ...validProduct, name: " " }).success, false);
    assert.deepEqual(validateProductInput({ ...validProduct, nutritionBasis: "piece" }), {
      success: false, error: "invalidNutritionBasis",
    });
    assert.deepEqual(validateProductInput({ ...validProduct, calories: 100_001 }), {
      success: false, error: "invalidCalories",
    });
    assert.deepEqual(validateProductInput({ ...validProduct, protein: 1.234 }), {
      success: false, error: "invalidProtein",
    });
  });

  it("validates supported GTIN lengths and check digits", () => {
    assert.equal(normalizeGtin("96385074"), "00000096385074");
    assert.equal(normalizeGtin("036000291452"), "00036000291452");
    assert.equal(normalizeGtin("4006381333931"), "04006381333931");
    assert.equal(normalizeGtin("04006381333931"), "04006381333931");
    assert.equal(normalizeGtin("4006381333932"), null);
    assert.equal(normalizeGtin("1234567"), null);
  });
});

describe("product meal input validation", () => {
  it("accepts a positive quantity with up to two decimal places", () => {
    assert.deepEqual(validateProductMealInput({
      date: "2026-11-05", productId: "b7906b25-4d20-465c-bbca-f5a922c4edb9", quantity: 125.5,
    }), {
      success: true,
      data: { date: "2026-11-05", productId: "b7906b25-4d20-465c-bbca-f5a922c4edb9", quantity: 125.5 },
    });
  });

  it("rejects invalid dates, ids, and quantities", () => {
    assert.equal(validateProductMealInput({ date: "2026-02-30", productId: "b7906b25-4d20-465c-bbca-f5a922c4edb9", quantity: 10 }).success, false);
    assert.equal(validateProductMealInput({ date: "2026-11-05", productId: "bad-id", quantity: 10 }).success, false);
    assert.equal(validateProductMealInput({ date: "2026-11-05", productId: "b7906b25-4d20-465c-bbca-f5a922c4edb9", quantity: 0 }).success, false);
    assert.equal(validateProductMealInput({ date: "2026-11-05", productId: "b7906b25-4d20-465c-bbca-f5a922c4edb9", quantity: 1.234 }).success, false);
  });
});
