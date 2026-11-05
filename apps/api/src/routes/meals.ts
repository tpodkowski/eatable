import type { FastifyPluginAsync } from "fastify";
import { fromNodeHeaders } from "better-auth/node";
import type { DailyMealsResponse, MealEntry } from "@eatable/shared";
import { auth, pool } from "../auth.js";
import { createMealEntry, createProductMealEntry, deleteMealEntry, getDailyMeals, updateMealEntry } from "../meals/service.js";
import { isValidMealDate, validateMealEntryInput } from "../meals.js";
import { validateProductMealInput } from "../products.js";

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

  app.post<{
    Params: { mealTypeId: string };
    Body: unknown;
    Reply: MealEntry | { error: string };
  }>("/api/meals/:mealTypeId/entries/from-product", async (request, reply) => {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
    if (!session) return reply.status(401).send({ error: "Unauthorized" });
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(request.params.mealTypeId)) {
      return reply.status(400).send({ error: "invalidMealTypeId" });
    }
    const validated = validateProductMealInput(request.body);
    if (!validated.success) return reply.status(400).send({ error: validated.error });
    const entry = await createProductMealEntry(pool, session.user.id, request.params.mealTypeId, validated.data);
    if (!entry) return reply.status(404).send({ error: "mealOrProductNotFound" });
    return reply.status(201).send(entry);
  });

  app.put<{
    Params: { mealTypeId: string; entryId: string };
    Body: unknown;
    Reply: MealEntry | { error: string };
  }>("/api/meals/:mealTypeId/entries/:entryId", async (request, reply) => {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
    if (!session) return reply.status(401).send({ error: "Unauthorized" });
    const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
    if (!isUuid(request.params.mealTypeId) || !isUuid(request.params.entryId)) {
      return reply.status(400).send({ error: "invalidMealEntryId" });
    }
    const validated = validateMealEntryInput(request.body);
    if (!validated.success) return reply.status(400).send({ error: validated.error });
    const entry = await updateMealEntry(pool, session.user.id, request.params.mealTypeId, request.params.entryId, validated.data);
    if (!entry) return reply.status(404).send({ error: "mealEntryNotFound" });
    return reply.send(entry);
  });

  app.delete<{
    Params: { mealTypeId: string; entryId: string };
    Querystring: { date?: string };
    Reply: { success: true } | { error: string };
  }>("/api/meals/:mealTypeId/entries/:entryId", async (request, reply) => {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
    if (!session) return reply.status(401).send({ error: "Unauthorized" });
    const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
    if (!isUuid(request.params.mealTypeId) || !isUuid(request.params.entryId)) {
      return reply.status(400).send({ error: "invalidMealEntryId" });
    }
    if (!request.query.date || !isValidMealDate(request.query.date)) {
      return reply.status(400).send({ error: "invalidDate" });
    }
    const deleted = await deleteMealEntry(pool, session.user.id, request.params.mealTypeId, request.params.entryId, request.query.date);
    if (!deleted) return reply.status(404).send({ error: "mealEntryNotFound" });
    return reply.send({ success: true });
  });
};
