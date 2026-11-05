import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeOpenFoodFactsProduct, searchOpenFoodFactsProducts, type OpenFoodFactsStore } from "./openFoodFacts.js";

describe("Open Food Facts product normalization", () => {
  it("maps source identity, attribution, and available nutrition without inventing missing values", () => {
    const product = normalizeOpenFoodFactsProduct({
      status: 1,
      product: {
        code: "4006381333931",
        product_name: " Oat drink ",
        brands: "Oats Co, Other",
        image_url: "https://images.example/product.jpg",
        nutriments: { "energy-kcal_100ml": 46, proteins_100ml: 1.1, fat_100ml: 1.5 },
      },
    }, "04006381333931");

    assert.deepEqual(product, {
      provider: "open-food-facts",
      providerProductId: "4006381333931",
      name: "Oat drink",
      brand: "Oats Co",
      barcode: "04006381333931",
      nutritionBasis: "100ml",
      calories: 46,
      protein: 1.1,
      carbohydrates: null,
      fat: 1.5,
      imageUrl: "https://images.example/product.jpg",
      imageAttribution: "Open Food Facts contributors",
      imageLicense: "See the product image's license on Open Food Facts",
      license: "ODbL-1.0",
      attribution: "Data from Open Food Facts (https://world.openfoodfacts.org/)",
    });
  });

  it("returns null for missing, malformed, or unnamed provider records", () => {
    assert.equal(normalizeOpenFoodFactsProduct({ status: 0 }, "04006381333931"), null);
    assert.equal(normalizeOpenFoodFactsProduct({ status: 1, product: { product_name: " " } }, "04006381333931"), null);
    assert.equal(normalizeOpenFoodFactsProduct(null, "04006381333931"), null);
  });

  it("searches Open Food Facts by text, stores returned products, and maps them to the shared result", async () => {
    const savedProducts: unknown[] = [];
    const store: OpenFoodFactsStore = {
      findByBarcode: async () => undefined,
      upsert: async (product) => {
        savedProducts.push(product);
        return {
          id: "local-id",
          updatedAt: new Date(),
          providerProductId: product.providerProductId,
          name: product.name,
          brand: product.brand ?? null,
          barcode: product.barcode ?? null,
          nutritionBasis: product.nutritionBasis ?? null,
          calories: product.calories ?? null,
          protein: product.protein ?? null,
          carbohydrates: product.carbohydrates ?? null,
          fat: product.fat ?? null,
          imageUrl: product.imageUrl ?? null,
        };
      },
    };
    let requestedUrl = "";
    const fetcher: typeof fetch = async (input) => {
      requestedUrl = String(input);
      return new Response(JSON.stringify({ products: [{
        code: "4006381333931",
        product_name: "Oat drink",
        brands: "Oats Co",
        nutriments: { "energy-kcal_100ml": 46, proteins_100ml: 1.1, "fat_100ml": 1.5 },
      }] }), { status: 200 });
    };

    const products = await searchOpenFoodFactsProducts("oat drink", fetcher, store);
    assert.equal(new URL(requestedUrl).searchParams.get("search_terms"), "oat drink");
    assert.equal(products[0].providerProductId, "4006381333931");
    assert.equal(products[0].name, "Oat drink");
    assert.equal(products[0].calories, 46);
    assert.equal(savedProducts.length, 1);
  });
});
