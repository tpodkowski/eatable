import fastify from "fastify";
import cors from "@fastify/cors";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerMealRoutes } from "./routes/meals.js";
import { registerProfileRoutes } from "./routes/profile.js";
import { registerProductRoutes } from "./routes/products.js";

export async function createApp() {
  const app = fastify({ logger: true });
  const allowedOrigins = process.env.CLIENT_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean)
    ?? ["http://localhost:8081"];

  await app.register(cors, {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie", "X-Requested-With"],
  });

  await app.register(registerAuthRoutes);
  await app.register(registerMealRoutes);
  await app.register(registerProfileRoutes);
  await app.register(registerProductRoutes);
  await app.register(registerHealthRoutes);
  return app;
}
