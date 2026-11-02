import type { Pool } from "pg";

const APP_MIGRATION_ID = "2026-11-02-user-meals";
const MEAL_ENTRY_DETAILS_MIGRATION_ID = "2026-11-02-meal-entry-details";

const createMealTables = `
CREATE TABLE user_meal_settings (
  user_id text PRIMARY KEY REFERENCES "user" (id) ON DELETE CASCADE,
  defaults_seeded_at timestamptz
);

CREATE TABLE user_meal_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name),
  UNIQUE (user_id, id)
);

CREATE TABLE meal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  meal_type_id uuid NOT NULL,
  meal_date date NOT NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  notes text,
  calories integer CHECK (calories IS NULL OR calories >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (user_id, meal_type_id)
    REFERENCES user_meal_types (user_id, id) ON DELETE CASCADE
);

CREATE INDEX meal_entries_user_date_idx
  ON meal_entries (user_id, meal_date, created_at);
CREATE INDEX user_meal_types_user_order_idx
  ON user_meal_types (user_id, sort_order, created_at);
`;

const addMealEntryDetails = `
ALTER TABLE meal_entries
  ADD COLUMN item_type text NOT NULL DEFAULT 'dish' CHECK (item_type IN ('dish', 'product')),
  ADD COLUMN quantity text CHECK (quantity IS NULL OR char_length(quantity) BETWEEN 1 AND 60);
`;

export async function runAppMigrations(pool: Pool) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_migrations (
        id text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const existing = await client.query("SELECT 1 FROM app_migrations WHERE id = $1", [APP_MIGRATION_ID]);
    if (existing.rowCount === 0) {
      await client.query(createMealTables);
      await client.query("INSERT INTO app_migrations (id) VALUES ($1)", [APP_MIGRATION_ID]);
    }

    const detailsMigration = await client.query("SELECT 1 FROM app_migrations WHERE id = $1", [MEAL_ENTRY_DETAILS_MIGRATION_ID]);
    if (detailsMigration.rowCount === 0) {
      await client.query(addMealEntryDetails);
      await client.query("INSERT INTO app_migrations (id) VALUES ($1)", [MEAL_ENTRY_DETAILS_MIGRATION_ID]);
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
