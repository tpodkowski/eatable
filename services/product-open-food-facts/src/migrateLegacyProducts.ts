import { openFoodFactsDb } from "./db/database.js";
import { openFoodFactsProducts } from "./db/schema.js";
import type { Pool } from "pg";

type LegacyProduct = {
  provider_product_id: string | null;
  name: string | null;
  brand: string | null;
  barcode: string | null;
  nutrition_basis: string | null;
  calories: number | null;
  protein: number | null;
  carbohydrates: number | null;
  fat: number | null;
  image_url: string | null;
  updated_at: Date | null;
};

export async function moveLegacyOpenFoodFactsProducts(applicationPool: Pool): Promise<void> {
  const tables = await applicationPool.query<{ table_name: string }>(`
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name IN ('provider_product_id', 'nutrition_basis', 'image_url')
    GROUP BY table_name
    HAVING COUNT(DISTINCT column_name) = 3
    LIMIT 1
  `);
  const tableName = tables.rows[0]?.table_name;
  if (!tableName || !/^[a-z_][a-z0-9_]*$/i.test(tableName)) return;

  const legacyProducts = await applicationPool.query<LegacyProduct>(`
    SELECT provider_product_id, name, brand, barcode, nutrition_basis, calories, protein,
      carbohydrates, fat, image_url, updated_at
    FROM "${tableName}"
  `);
  for (const product of legacyProducts.rows) {
    if (!product.provider_product_id || !product.name) continue;
    const nutritionBasis = product.nutrition_basis === "100g" || product.nutrition_basis === "100ml"
      ? product.nutrition_basis
      : null;
    await openFoodFactsDb.insert(openFoodFactsProducts).values({
      providerProductId: product.provider_product_id,
      name: product.name,
      brand: product.brand,
      barcode: product.barcode?.trim() || null,
      nutritionBasis,
      calories: product.calories,
      protein: product.protein,
      carbohydrates: product.carbohydrates,
      fat: product.fat,
      imageUrl: product.image_url,
      updatedAt: product.updated_at ?? new Date(),
    }).onConflictDoNothing({ target: openFoodFactsProducts.providerProductId });
  }

  await applicationPool.query(`DROP TABLE "${tableName}"`);
}
