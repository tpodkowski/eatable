import type { FastifyPluginAsync } from "fastify";
import { fromNodeHeaders } from "better-auth/node";
import type { DailyMealsResponse, MealEntry } from "@eatable/shared";
import { auth, pool } from "../auth.js";
import { createMealEntry, getDailyMeals } from "../meals/service.js";
import { isValidMealDate, validateMealEntryInput } from "../meals.js";

export const registerMealRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { date?: string }; Reply: DailyMealsResponse | { error: string } }>("/api/meals", async (request, reply) => {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
    if (!session) return reply.status(401).send({ error: "Unauthorized" });
    const date = request.query.date ?? new Date().toISOString().slice(0, 10);
    if (!isValidMealDate(date)) return reply.status(400).send({ error: "date must use YYYY-MM-DD format" });
    return getDailyMeals(pool, session.user.id, date);
  });

  app.post<{
    Params: { mealTypeId: string };
    Body: unknown;
    Reply: MealEntry | { error: string };
  }>("/api/meals/:mealTypeId/entries", async (request, reply) => {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
    if (!session) return reply.status(401).send({ error: "Unauthorized" });
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(request.params.mealTypeId)) {
      return reply.status(400).send({ error: "invalidMealTypeId" });
    }
    const validated = validateMealEntryInput(request.body);
    if (!validated.success) return reply.status(400).send({ error: validated.error });
    const entry = await createMealEntry(pool, session.user.id, request.params.mealTypeId, validated.data);
    if (!entry) return reply.status(404).send({ error: "mealNotFound" });
    return reply.status(201).send(entry);
  });
};
