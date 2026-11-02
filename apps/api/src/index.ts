import fastify from "fastify";
import cors from "@fastify/cors";
import { fromNodeHeaders } from "better-auth/node";
import type { HealthResponse } from "@eatable/shared";
import { auth, pool } from "./auth.js";
import type { DailyMealsResponse } from "@eatable/shared";
import { runAppMigrations } from "./db/migrations.js";

const app = fastify({ logger: true });
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";
const allowedOrigins = process.env.CLIENT_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean)
  ?? ["http://localhost:8081"];
const defaultMealTypes = [
  "Śniadanie",
  "Drugie śniadanie",
  "Obiad",
  "Podwieczorek",
  "Kolacja",
];

await app.register(cors, {
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie", "X-Requested-With"],
});

app.route({
  method: ["GET", "POST"],
  url: "/api/auth/*",
  async handler(request, reply) {
    try {
      const url = new URL(request.url, process.env.BETTER_AUTH_URL ?? "http://localhost:3000");
      const headers = fromNodeHeaders(request.headers);
      const body = request.body === undefined ? undefined : JSON.stringify(request.body);
      const authRequest = new Request(url, {
        method: request.method,
        headers,
        ...(body === undefined ? {} : { body }),
      });
      const response = await auth.handler(authRequest);

      response.headers.forEach((value, key) => {
        if (key.toLowerCase() !== "set-cookie") reply.header(key, value);
      });
      const cookies = response.headers.getSetCookie();
      if (cookies.length > 0) reply.header("set-cookie", cookies);

      return reply.status(response.status).send(response.body ? await response.text() : null);
    } catch (error) {
      app.log.error(error, "Authentication request failed");
      return reply.status(500).send({ error: "Internal authentication error" });
    }
  },
});

app.get<{ Querystring: { date?: string }; Reply: DailyMealsResponse | { error: string } }>(
  "/api/meals",
  async (request, reply) => {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
    if (!session) return reply.status(401).send({ error: "Unauthorized" });

    const date = request.query.date ?? new Date().toISOString().slice(0, 10);
    const dateTimestamp = Date.parse(`${date}T00:00:00.000Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date)
      || !Number.isFinite(dateTimestamp)
      || new Date(dateTimestamp).toISOString().slice(0, 10) !== date
    ) {
      return reply.status(400).send({ error: "date must use YYYY-MM-DD format" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "INSERT INTO user_meal_settings (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING",
        [session.user.id],
      );
      const settings = await client.query<{ defaults_seeded_at: Date | null }>(
        "SELECT defaults_seeded_at FROM user_meal_settings WHERE user_id = $1 FOR UPDATE",
        [session.user.id],
      );

      if (settings.rows[0]?.defaults_seeded_at === null) {
        for (const [sortOrder, name] of defaultMealTypes.entries()) {
          await client.query(
            `INSERT INTO user_meal_types (user_id, name, sort_order)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, name) DO NOTHING`,
            [session.user.id, name, sortOrder],
          );
        }
        await client.query(
          "UPDATE user_meal_settings SET defaults_seeded_at = now() WHERE user_id = $1",
          [session.user.id],
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    const meals = await pool.query<DailyMealsResponse["mealTypes"][number]>(
      `SELECT
         meal_type.id,
         meal_type.name,
         meal_type.sort_order AS "sortOrder",
         COALESCE(
           json_agg(
             json_build_object(
               'id', entry.id,
               'title', entry.title,
               'notes', entry.notes,
               'calories', entry.calories,
               'createdAt', entry.created_at
             ) ORDER BY entry.created_at
           ) FILTER (WHERE entry.id IS NOT NULL),
           '[]'::json
         ) AS entries
       FROM user_meal_types AS meal_type
       LEFT JOIN meal_entries AS entry
         ON entry.user_id = meal_type.user_id
        AND entry.meal_type_id = meal_type.id
        AND entry.meal_date = $2
       WHERE meal_type.user_id = $1
       GROUP BY meal_type.id
       ORDER BY meal_type.sort_order, meal_type.created_at`,
      [session.user.id, date],
    );

    return { date, mealTypes: meals.rows };
  },
);

app.get("/", async (_request, reply) => {
  return reply.type("text/html").send(`<!doctype html>
<html lang="pl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Eatable API</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f4f4ed; color: #183a30; font: 16px system-ui, sans-serif; }
      main { max-width: 520px; padding: 40px; }
      p { color: #64746c; line-height: 1.6; }
      a { color: #39735d; font-weight: 600; }
      code { padding: 3px 7px; border-radius: 5px; background: #e7ebe2; }
    </style>
  </head>
  <body>
    <main>
      <p><strong>EATABLE · API</strong></p>
      <h1>API działa.</h1>
      <p>Backend jest uruchomiony i połączony z PostgreSQL.</p>
      <p>Stan usługi sprawdzisz pod <a href="/health"><code>/health</code></a>.</p>
    </main>
  </body>
</html>`);
});

app.get<{ Reply: HealthResponse }>("/health", async () => {
  await pool.query("SELECT 1");
  return {
    status: "ok",
    service: "eatable-api",
    timestamp: new Date().toISOString(),
  };
});

app.addHook("onClose", async () => pool.end());

try {
  await runAppMigrations(pool);
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
