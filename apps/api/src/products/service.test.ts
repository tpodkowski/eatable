import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Pool } from "pg";
import { createProduct, deleteProduct, getProduct, isDuplicateBarcodeError, listProducts, updateProduct } from "./service.js";
import { createProductMealEntry } from "../meals/service.js";

const productRow = {
  id: "b7906b25-4d20-465c-bbca-f5a922c4edb9",
  name: "Oat milk",
  brand: "Oats Co",
  barcode: "04006381333931",
  nutrition_basis: "ml" as const,
  calories: "46.50",
  protein: "1.10",
  carbohydrates: "6.70",
  fat: "1.50",
  created_at: "2026-11-05T10:00:00.000Z",
  updated_at: "2026-11-05T10:00:00.000Z",
};

const productInput = {
  name: "Oat milk", brand: "Oats Co", barcode: "04006381333931", nutritionBasis: "ml" as const,
  calories: 46.5, protein: 1.1, carbohydrates: 6.7, fat: 1.5,
};

function createPoolStub(handler: (sql: string, values?: unknown[]) => unknown) {
  const queries: Array<{ sql: string; values?: unknown[] }> = [];
  const pool = {
    query: async (sql: string, values?: unknown[]) => {
      queries.push({ sql, values });
      return handler(sql, values);
    },
  } as unknown as Pool;
  return { pool, queries };
}

describe("product service", () => {
  it("lists only the owner's products and maps numeric database values", async () => {
    const { pool, queries } = createPoolStub(() => ({ rows: [productRow] }));
    const products = await listProducts(pool, "user-1", "oat");

    assert.equal(products[0].calories, 46.5);
    assert.equal(products[0].barcode, "04006381333931");
    assert.match(queries[0].sql, /WHERE user_id = \$1/);
    assert.deepEqual(queries[0].values?.slice(0, 2), ["user-1", "oat"]);
  });

  it("scopes reads, creates, updates, and deletes by user id", async () => {
    const { pool, queries } = createPoolStub((sql) => {
      if (sql.startsWith("DELETE")) return { rowCount: 1 };
      if (sql.startsWith("SELECT")) return { rows: [productRow] };
      return { rows: [productRow] };
    });

    assert.equal((await getProduct(pool, "user-1", productRow.id))?.id, productRow.id);
    assert.equal((await createProduct(pool, "user-1", productInput)).name, "Oat milk");
    assert.equal((await updateProduct(pool, "user-1", productRow.id, productInput))?.id, productRow.id);
    assert.equal(await deleteProduct(pool, "user-1", productRow.id), true);

    assert.match(queries[0].sql, /WHERE user_id = \$1 AND id = \$2/);
    assert.deepEqual(queries[1].values?.slice(0, 2), ["user-1", "Oat milk"]);
    assert.match(queries[2].sql, /WHERE user_id = \$1 AND id = \$2/);
    assert.match(queries[3].sql, /WHERE user_id = \$1 AND id = \$2/);
  });

  it("returns not found when a product belongs to another user", async () => {
    const { pool } = createPoolStub(() => ({ rows: [] }));
    assert.equal(await getProduct(pool, "user-2", productRow.id), null);
    assert.equal(await updateProduct(pool, "user-2", productRow.id, productInput), null);
    assert.equal(await deleteProduct(pool, "user-2", productRow.id), false);
  });

  it("identifies PostgreSQL unique constraint violations for duplicate barcodes", () => {
    assert.equal(isDuplicateBarcodeError({ code: "23505" }), true);
    assert.equal(isDuplicateBarcodeError({ code: "23503" }), false);
    assert.equal(isDuplicateBarcodeError(null), false);
  });
});

describe("adding a product to a meal", () => {
  it("inserts calculated nutrition as a snapshot and scopes product/category to the user", async () => {
    const entry = {
      id: "a7906b25-4d20-465c-bbca-f5a922c4edb9",
      productId: productRow.id,
      title: "Oat milk",
      quantity: "125.50 ml",
      notes: null,
      calories: 58.36,
      protein: 1.38,
      carbohydrates: 8.41,
      fat: 1.88,
      createdAt: "2026-11-05T10:00:00.000Z",
    };
    const { pool, queries } = createPoolStub(() => ({ rows: [entry] }));
    const result = await createProductMealEntry(pool, "user-1", "meal-type-1", {
      date: "2026-11-05", productId: productRow.id, quantity: 125.5,
    });

    assert.deepEqual(result, entry);
    assert.match(queries[0].sql, /product\.user_id = meal_type\.user_id/);
    assert.match(queries[0].sql, /meal_type\.user_id = \$1/);
    assert.match(queries[0].sql, /round\(product\.calories \* \$5::numeric \/ 100, 2\)/);
    assert.deepEqual(queries[0].values, ["user-1", "meal-type-1", productRow.id, "2026-11-05", 125.5]);
  });
});
