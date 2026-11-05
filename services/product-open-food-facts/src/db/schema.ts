import { sql } from "drizzle-orm";
import { check, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const openFoodFactsProducts = pgTable("open_food_facts_products", {
  id: uuid("id").defaultRandom().primaryKey(),
  providerProductId: text("provider_product_id").notNull().unique("open_food_facts_products_provider_product_id_unique"),
  name: text("name").notNull(),
  brand: text("brand"),
  barcode: text("barcode"),
  nutritionBasis: text("nutrition_basis", { enum: ["100g", "100ml"] }),
  calories: numeric("calories", { precision: 10, scale: 2, mode: "number" }),
  protein: numeric("protein", { precision: 10, scale: 2, mode: "number" }),
  carbohydrates: numeric("carbohydrates", { precision: 10, scale: 2, mode: "number" }),
  fat: numeric("fat", { precision: 10, scale: 2, mode: "number" }),
  imageUrl: text("image_url"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("open_food_facts_products_nutrition_basis_check", sql`${table.nutritionBasis} IS NULL OR ${table.nutritionBasis} IN ('100g', '100ml')`),
  uniqueIndex("open_food_facts_products_barcode_idx").on(table.barcode).where(sql`${table.barcode} IS NOT NULL`),
]);

export type OpenFoodFactsProduct = typeof openFoodFactsProducts.$inferSelect;
export type NewOpenFoodFactsProduct = typeof openFoodFactsProducts.$inferInsert;
