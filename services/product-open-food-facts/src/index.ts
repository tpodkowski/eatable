import type { Pool } from "pg";
import { openFoodFactsPool } from "./db/database.js";
import { migrateOpenFoodFactsDatabase } from "./db/migrate.js";
import { moveLegacyOpenFoodFactsProducts } from "./migrateLegacyProducts.js";

export {
  getOpenFoodFactsProductByBarcode,
  OpenFoodFactsProviderError,
  normalizeOpenFoodFactsProduct,
  searchOpenFoodFactsProducts,
  type OpenFoodFactsStore,
} from "./openFoodFacts.js";

export async function initializeOpenFoodFactsProvider(applicationPool: Pool): Promise<void> {
  if (!process.env.OPEN_FOOD_FACTS_DATABASE_URL) {
    throw new Error("OPEN_FOOD_FACTS_DATABASE_URL must point to the separate Open Food Facts database");
  }
  await migrateOpenFoodFactsDatabase();
  await moveLegacyOpenFoodFactsProducts(applicationPool);
}

export async function closeOpenFoodFactsProvider(): Promise<void> {
  await openFoodFactsPool.end();
}
