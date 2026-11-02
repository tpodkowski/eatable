import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import pg from "pg";

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const isDevelopment = process.env.NODE_ENV !== "production";

export const auth = betterAuth({
  appName: "Eatable",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET,
  database: pool,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  ...(googleClientId && googleClientSecret
    ? {
        socialProviders: {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            prompt: "select_account" as const,
          },
        },
      }
    : {}),
  trustedOrigins: [
    "eatable://",
    "eatable://*",
    ...(process.env.CLIENT_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? []),
    ...(isDevelopment ? ["exp://", "exp://**"] : []),
  ],
  plugins: [expo()],
});
