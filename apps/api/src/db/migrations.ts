import type { Pool } from "pg";

const INITIAL_APP_SCHEMA_ID = "2026-11-03-initial-app-schema";

const createAppSchema = `
CREATE TABLE user_meal_settings (
  user_id text PRIMARY KEY REFERENCES "user" (id) ON DELETE CASCADE,
  defaults_seeded_at timestamptz
);

CREATE TABLE user_meal_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  sort_order integer NOT NULL DEFAULT 0,
  meal_time time NOT NULL,
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
  quantity text CHECK (quantity IS NULL OR char_length(quantity) BETWEEN 1 AND 60),
  notes text,
  calories integer CHECK (calories IS NULL OR calories >= 0),
  protein integer CHECK (protein IS NULL OR protein >= 0),
  carbohydrates integer CHECK (carbohydrates IS NULL OR carbohydrates >= 0),
  fat integer CHECK (fat IS NULL OR fat >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (user_id, meal_type_id)
    REFERENCES user_meal_types (user_id, id) ON DELETE CASCADE
);

CREATE INDEX meal_entries_user_date_idx
  ON meal_entries (user_id, meal_date, created_at);
CREATE INDEX user_meal_types_user_order_idx
  ON user_meal_types (user_id, sort_order, created_at);

CREATE TABLE user_profiles (
  user_id text PRIMARY KEY REFERENCES "user" (id) ON DELETE CASCADE,
  daily_calorie_limit integer NOT NULL DEFAULT 2000 CHECK (daily_calorie_limit BETWEEN 1 AND 100000),
  daily_protein_limit integer NOT NULL DEFAULT 100 CHECK (daily_protein_limit BETWEEN 1 AND 100000),
  daily_carbohydrates_limit integer NOT NULL DEFAULT 250 CHECK (daily_carbohydrates_limit BETWEEN 1 AND 100000),
  daily_fat_limit integer NOT NULL DEFAULT 67 CHECK (daily_fat_limit BETWEEN 1 AND 100000)
);
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

    const initialSchema = await client.query("SELECT 1 FROM app_migrations WHERE id = $1", [INITIAL_APP_SCHEMA_ID]);
    if (initialSchema.rowCount === 0) {
      await client.query(createAppSchema);
      await client.query("INSERT INTO app_migrations (id) VALUES ($1)", [INITIAL_APP_SCHEMA_ID]);
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
