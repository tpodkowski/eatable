import type { FastifyPluginAsync } from "fastify";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth.js";

export const registerAuthRoutes: FastifyPluginAsync = async (app) => {
  app.route({
    method: ["GET", "POST"],
    url: "/api/auth/*",
    async handler(request, reply) {
      try {
        const url = new URL(request.url, process.env.BETTER_AUTH_URL ?? "http://localhost:3000");
        const body = request.body === undefined ? undefined : JSON.stringify(request.body);
        const response = await auth.handler(new Request(url, {
          method: request.method,
          headers: fromNodeHeaders(request.headers),
          ...(body === undefined ? {} : { body }),
        }));

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
};
