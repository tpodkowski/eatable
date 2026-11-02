import { createApp } from "./app.js";
import { pool } from "./auth.js";
import { runAppMigrations } from "./db/migrations.js";

const app = await createApp();
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

app.addHook("onClose", async () => pool.end());

try {
  await runAppMigrations(pool);
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
