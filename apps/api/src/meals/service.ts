import type { Pool, PoolClient } from "pg";
import type { DailyMealsResponse, MealEntry } from "@eatable/shared";
import { defaultMealTypes } from "./settings.js";

async function seedDefaultMealTypes(client: PoolClient, userId: string) {
  await client.query("BEGIN");
  try {
    await client.query("INSERT INTO user_meal_settings (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING", [userId]);
    const settings = await client.query<{ defaults_seeded_at: Date | null }>(
      "SELECT defaults_seeded_at FROM user_meal_settings WHERE user_id = $1 FOR UPDATE", [userId],
    );
    if (settings.rows[0]?.defaults_seeded_at === null) {
      for (const [sortOrder, { name, mealTime }] of defaultMealTypes.entries()) {
        await client.query(
          "INSERT INTO user_meal_types (user_id, name, sort_order, meal_time) VALUES ($1, $2, $3, $4::time) ON CONFLICT (user_id, name) DO NOTHING",
          [userId, name, sortOrder, mealTime],
        );
      }
      await client.query("UPDATE user_meal_settings SET defaults_seeded_at = now() WHERE user_id = $1", [userId]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

export async function getDailyMeals(pool: Pool, userId: string, date: string): Promise<DailyMealsResponse> {
  const client = await pool.connect();
  try {
    await seedDefaultMealTypes(client, userId);
  } finally {
    client.release();
  }

  const meals = await pool.query<DailyMealsResponse["mealTypes"][number]>(
    `SELECT meal_type.id, meal_type.name, meal_type.sort_order AS "sortOrder",
       to_char(meal_type.meal_time, 'HH24:MI') AS "mealTime",
       COALESCE(json_agg(json_build_object(
         'id', entry.id, 'type', entry.item_type, 'title', entry.title, 'quantity', entry.quantity,
         'notes', entry.notes, 'calories', entry.calories, 'protein', entry.protein,
         'carbohydrates', entry.carbohydrates, 'fat', entry.fat, 'createdAt', entry.created_at
       ) ORDER BY entry.created_at) FILTER (WHERE entry.id IS NOT NULL), '[]'::json) AS entries
     FROM user_meal_types AS meal_type
     LEFT JOIN meal_entries AS entry ON entry.user_id = meal_type.user_id
       AND entry.meal_type_id = meal_type.id AND entry.meal_date = $2
     WHERE meal_type.user_id = $1
     GROUP BY meal_type.id ORDER BY meal_type.sort_order, meal_type.created_at`,
    [userId, date],
  );
  return { date, mealTypes: meals.rows };
}

export async function createMealEntry(
  pool: Pool,
  userId: string,
  mealTypeId: string,
  data: { date: string; type: MealEntry["type"]; title: string; quantity: string | null; notes: string | null; calories: number | null; protein: number | null; carbohydrates: number | null; fat: number | null },
): Promise<MealEntry | null> {
  const result = await pool.query<MealEntry>(
    `INSERT INTO meal_entries (user_id, meal_type_id, meal_date, item_type, title, quantity, notes, calories, protein, carbohydrates, fat)
     SELECT $1, meal_type.id, $3::date, $4, $5, $6, $7, $8, $9, $10, $11
     FROM user_meal_types AS meal_type WHERE meal_type.user_id = $1 AND meal_type.id = $2
     RETURNING id, item_type AS type, title, quantity, notes, calories, protein, carbohydrates, fat, created_at AS "createdAt"`,
    [userId, mealTypeId, data.date, data.type, data.title, data.quantity, data.notes, data.calories, data.protein, data.carbohydrates, data.fat],
  );
  return result.rows[0] ?? null;
}

export async function updateMealEntry(
  pool: Pool,
  userId: string,
  mealTypeId: string,
  entryId: string,
  data: { date: string; type: MealEntry["type"]; title: string; quantity: string | null; notes: string | null; calories: number | null; protein: number | null; carbohydrates: number | null; fat: number | null },
): Promise<MealEntry | null> {
  const result = await pool.query<MealEntry>(
    `UPDATE meal_entries SET item_type = $4, title = $5, quantity = $6, notes = $7,
       calories = $8, protein = $9, carbohydrates = $10, fat = $11, updated_at = now()
     WHERE user_id = $1 AND meal_type_id = $2 AND id = $3 AND meal_date = $12::date
     RETURNING id, item_type AS type, title, quantity, notes, calories, protein, carbohydrates, fat, created_at AS "createdAt"`,
    [userId, mealTypeId, entryId, data.type, data.title, data.quantity, data.notes, data.calories, data.protein, data.carbohydrates, data.fat, data.date],
  );
  return result.rows[0] ?? null;
}

export async function deleteMealEntry(pool: Pool, userId: string, mealTypeId: string, entryId: string, date: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM meal_entries
     WHERE user_id = $1 AND meal_type_id = $2 AND id = $3 AND meal_date = $4::date`,
    [userId, mealTypeId, entryId, date],
  );
  return (result.rowCount ?? 0) > 0;
}
