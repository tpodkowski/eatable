import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { openFoodFactsProducts } from "./schema.js";

export const openFoodFactsPool = new pg.Pool({ connectionString: process.env.OPEN_FOOD_FACTS_DATABASE_URL });
export const openFoodFactsDb = drizzle({ client: openFoodFactsPool, schema: { openFoodFactsProducts } });
