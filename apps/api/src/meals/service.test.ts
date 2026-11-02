import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Pool } from "pg";
import { deleteMealEntry } from "./service.js";

describe("delete meal entry", () => {
  it("deletes only the entry owned by the user in the selected meal and date", async () => {
    let queryText = "";
    let values: unknown[] = [];
    const pool = {
      query: async (text: string, params: unknown[]) => {
        queryText = text;
        values = params;
        return { rowCount: 1 };
      },
    } as unknown as Pool;

    const deleted = await deleteMealEntry(pool, "user-1", "meal-1", "entry-1", "2026-11-02");

    assert.equal(deleted, true);
    assert.match(queryText, /user_id = \$1 AND meal_type_id = \$2 AND id = \$3 AND meal_date = \$4::date/);
    assert.deepEqual(values, ["user-1", "meal-1", "entry-1", "2026-11-02"]);
  });

  it("reports entries outside the user's meal or date as not found", async () => {
    const pool = { query: async () => ({ rowCount: 0 }) } as unknown as Pool;
    assert.equal(await deleteMealEntry(pool, "user-1", "meal-1", "entry-1", "2026-11-02"), false);
  });
});
