import type { FastifyPluginAsync } from "fastify";
import { fromNodeHeaders } from "better-auth/node";
import type { UserProfile } from "@eatable/shared";
import { auth, pool } from "../auth.js";
import { DEFAULT_DAILY_CALORIE_LIMIT, macrosForCalories, validateUserProfile } from "../profile.js";

export const registerProfileRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Reply: UserProfile | { error: string } }>("/api/profile", async (request, reply) => {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
    if (!session) return reply.status(401).send({ error: "Unauthorized" });
    const result = await pool.query<{ daily_calorie_limit: number; daily_protein_limit: number; daily_carbohydrates_limit: number; daily_fat_limit: number }>(
      `INSERT INTO user_profiles (user_id) VALUES ($1)
       ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
       RETURNING daily_calorie_limit, daily_protein_limit, daily_carbohydrates_limit, daily_fat_limit`,
      [session.user.id],
    );
    return toUserProfile(result.rows[0]);
  });

  app.put<{ Body: unknown; Reply: UserProfile | { error: string } }>("/api/profile", async (request, reply) => {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
    if (!session) return reply.status(401).send({ error: "Unauthorized" });
    const validated = validateUserProfile(request.body);
    if (!validated.success) return reply.status(400).send({ error: "invalidUserProfile" });
    const { dailyCalorieLimit, dailyProteinLimit, dailyCarbohydratesLimit, dailyFatLimit } = validated.data;
    const result = await pool.query<{ daily_calorie_limit: number; daily_protein_limit: number; daily_carbohydrates_limit: number; daily_fat_limit: number }>(
      `INSERT INTO user_profiles (user_id, daily_calorie_limit, daily_protein_limit, daily_carbohydrates_limit, daily_fat_limit)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE SET daily_calorie_limit = EXCLUDED.daily_calorie_limit, daily_protein_limit = EXCLUDED.daily_protein_limit,
         daily_carbohydrates_limit = EXCLUDED.daily_carbohydrates_limit, daily_fat_limit = EXCLUDED.daily_fat_limit
       RETURNING daily_calorie_limit, daily_protein_limit, daily_carbohydrates_limit, daily_fat_limit`,
      [session.user.id, dailyCalorieLimit, dailyProteinLimit, dailyCarbohydratesLimit, dailyFatLimit],
    );
    return toUserProfile(result.rows[0]);
  });
};

function toUserProfile(row: { daily_calorie_limit: number | null; daily_protein_limit: number | null; daily_carbohydrates_limit: number | null; daily_fat_limit: number | null }): UserProfile {
  const dailyCalorieLimit = row.daily_calorie_limit ?? DEFAULT_DAILY_CALORIE_LIMIT;
  const derivedMacros = macrosForCalories(dailyCalorieLimit);
  return { dailyCalorieLimit, dailyProteinLimit: row.daily_protein_limit ?? derivedMacros.dailyProteinLimit,
    dailyCarbohydratesLimit: row.daily_carbohydrates_limit ?? derivedMacros.dailyCarbohydratesLimit,
    dailyFatLimit: row.daily_fat_limit ?? derivedMacros.dailyFatLimit };
}
