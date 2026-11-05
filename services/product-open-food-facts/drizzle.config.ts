import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle/openFoodFacts",
  dbCredentials: {
    url: process.env.OPEN_FOOD_FACTS_DATABASE_URL ?? "postgres://open_food_facts:open_food_facts@localhost:5433/open_food_facts",
  },
});
