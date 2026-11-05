import { createApp } from "./app.js";
import { pool } from "./auth.js";
import { initializeAppSchema } from "./db/schema.js";

const app = await createApp();
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

app.addHook("onClose", async () => pool.end());

try {
  await initializeAppSchema(pool);
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
