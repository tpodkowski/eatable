import type { FastifyPluginAsync } from "fastify";
import type { HealthResponse } from "@eatable/shared";
import { pool } from "../auth.js";

export const registerHealthRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Reply: HealthResponse }>("/health", async () => {
    await pool.query("SELECT 1");
    return { status: "ok", service: "eatable-api", timestamp: new Date().toISOString() };
  });
};
