import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ProductSearchResult } from "@eatable/shared";
import { searchProductProviders, type ProductSearchProvider } from "./providerRegistry.js";

const result: ProductSearchResult = {
  id: "user:1",
  provider: "user",
  providerProductId: "1",
  name: "Oat drink",
  brand: null,
  barcode: null,
  nutritionBasis: "100ml",
  calories: 46,
  protein: 1,
  carbohydrates: 6,
  fat: 1,
  imageUrl: null,
  imageAttribution: null,
  imageLicense: null,
  license: "user-provided",
  attribution: "User-provided",
};

describe("product search provider registry", () => {
  it("aggregates all provider results and keeps working when one provider fails", async () => {
    const providers: ProductSearchProvider[] = [
      { search: async () => [result] },
      { search: async () => { throw new Error("provider unavailable"); } },
    ];

    assert.deepEqual(await searchProductProviders(providers, "oat"), [result]);
  });
});
