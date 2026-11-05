import type { Pool } from "pg";

const createAppSchema = `
CREATE TABLE IF NOT EXISTS user_meal_settings (
  user_id text PRIMARY KEY REFERENCES "user" (id) ON DELETE CASCADE,
  defaults_seeded_at timestamptz
);

CREATE TABLE IF NOT EXISTS user_meal_types (
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

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id text PRIMARY KEY REFERENCES "user" (id) ON DELETE CASCADE,
  daily_calorie_limit integer NOT NULL DEFAULT 2000 CHECK (daily_calorie_limit BETWEEN 1 AND 100000),
  daily_protein_limit integer NOT NULL DEFAULT 100 CHECK (daily_protein_limit BETWEEN 1 AND 100000),
  daily_carbohydrates_limit integer NOT NULL DEFAULT 250 CHECK (daily_carbohydrates_limit BETWEEN 1 AND 100000),
  daily_fat_limit integer NOT NULL DEFAULT 67 CHECK (daily_fat_limit BETWEEN 1 AND 100000)
);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160),
  brand text CHECK (brand IS NULL OR char_length(brand) BETWEEN 1 AND 100),
  barcode char(14),
  nutrition_basis text NOT NULL CHECK (nutrition_basis IN ('g', 'ml')),
  calories numeric(10, 2) NOT NULL CHECK (calories BETWEEN 0 AND 100000),
  protein numeric(10, 2) NOT NULL CHECK (protein BETWEEN 0 AND 100000),
  carbohydrates numeric(10, 2) NOT NULL CHECK (carbohydrates BETWEEN 0 AND 100000),
  fat numeric(10, 2) NOT NULL CHECK (fat BETWEEN 0 AND 100000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, id)
);

CREATE TABLE IF NOT EXISTS meal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  meal_type_id uuid NOT NULL,
  product_id uuid,
  meal_date date NOT NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  quantity text CHECK (quantity IS NULL OR char_length(quantity) BETWEEN 1 AND 60),
  notes text,
  calories numeric(12, 2) CHECK (calories IS NULL OR calories >= 0),
  protein numeric(12, 2) CHECK (protein IS NULL OR protein >= 0),
  carbohydrates numeric(12, 2) CHECK (carbohydrates IS NULL OR carbohydrates >= 0),
  fat numeric(12, 2) CHECK (fat IS NULL OR fat >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (user_id, meal_type_id)
    REFERENCES user_meal_types (user_id, id) ON DELETE CASCADE,
  FOREIGN KEY (user_id, product_id)
    REFERENCES products (user_id, id) ON DELETE SET NULL (product_id)
);

CREATE INDEX IF NOT EXISTS meal_entries_user_date_idx
  ON meal_entries (user_id, meal_date, created_at);
CREATE INDEX IF NOT EXISTS user_meal_types_user_order_idx
  ON user_meal_types (user_id, sort_order, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS products_user_barcode_idx
  ON products (user_id, barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS products_user_name_idx ON products (user_id, lower(name));
`;

export async function initializeAppSchema(pool: Pool) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(createAppSchema);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
