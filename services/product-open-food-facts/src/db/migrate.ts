import { migrate } from "drizzle-orm/node-postgres/migrator";
import { fileURLToPath } from "node:url";
import { openFoodFactsDb } from "./database.js";

export async function migrateOpenFoodFactsDatabase(): Promise<void> {
  await migrate(openFoodFactsDb, {
    migrationsFolder: fileURLToPath(new URL("../../drizzle/openFoodFacts", import.meta.url)),
  });
}
