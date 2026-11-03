import type { FastifyPluginAsync } from "fastify";
import { fromNodeHeaders } from "better-auth/node";
import type { UserProfile } from "@eatable/shared";
import { auth, pool } from "../auth.js";
import { validateDailyCalorieLimit } from "../profile.js";

export const registerProfileRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Reply: UserProfile | { error: string } }>("/api/profile", async (request, reply) => {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
    if (!session) return reply.status(401).send({ error: "Unauthorized" });
    const result = await pool.query<{ daily_calorie_limit: number }>(
      `INSERT INTO user_profiles (user_id) VALUES ($1)
       ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
       RETURNING daily_calorie_limit`,
      [session.user.id],
    );
    return { dailyCalorieLimit: result.rows[0].daily_calorie_limit };
  });

  app.put<{ Body: unknown; Reply: UserProfile | { error: string } }>("/api/profile", async (request, reply) => {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
    if (!session) return reply.status(401).send({ error: "Unauthorized" });
    const value = request.body && typeof request.body === "object"
      ? (request.body as Record<string, unknown>).dailyCalorieLimit
      : undefined;
    const validated = validateDailyCalorieLimit(value);
    if (!validated.success) return reply.status(400).send({ error: "invalidDailyCalorieLimit" });
    const result = await pool.query<{ daily_calorie_limit: number }>(
      `INSERT INTO user_profiles (user_id, daily_calorie_limit) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET daily_calorie_limit = EXCLUDED.daily_calorie_limit
       RETURNING daily_calorie_limit`,
      [session.user.id, validated.data],
    );
    return { dailyCalorieLimit: result.rows[0].daily_calorie_limit };
  });
};
