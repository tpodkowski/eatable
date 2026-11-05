import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createApp } from "./app.js";
import { auth } from "./auth.js";

describe("CORS for meal entry mutations", () => {
  it("allows browser preflight requests for PUT and DELETE", async () => {
    const app = await createApp();
    try {
      for (const method of ["PUT", "DELETE"]) {
        const response = await app.inject({
          method: "OPTIONS",
          url: "/api/meals/meal-id/entries/entry-id?date=2026-11-03",
          headers: {
            origin: "http://localhost:8081",
            "access-control-request-method": method,
            "access-control-request-headers": "content-type",
          },
        });
        assert.equal(response.statusCode, 204);
        assert.equal(response.headers["access-control-allow-origin"], "http://localhost:8081");
        assert.match(response.headers["access-control-allow-methods"] ?? "", new RegExp(`\\b${method}\\b`));
      }
    } finally {
      await app.close();
    }
  });
});

describe("product API authentication", () => {
  it("requires a session for every product operation and product meal creation", async () => {
    const authApi = auth.api as unknown as { getSession: (...args: never[]) => Promise<null> };
    const originalGetSession = authApi.getSession;
    authApi.getSession = async () => null;
    const app = await createApp();
    try {
      const requests = [
        { method: "GET", url: "/api/products" },
        { method: "GET", url: "/api/products/barcode/4006381333931" },
        { method: "GET", url: "/api/products/b7906b25-4d20-465c-bbca-f5a922c4edb9" },
        { method: "POST", url: "/api/products", payload: {} },
        { method: "PUT", url: "/api/products/b7906b25-4d20-465c-bbca-f5a922c4edb9", payload: {} },
        { method: "DELETE", url: "/api/products/b7906b25-4d20-465c-bbca-f5a922c4edb9" },
        { method: "POST", url: "/api/meals/9c7652b2-2fb9-4ea0-992e-09cfb43a4cf9/entries/from-product", payload: {} },
      ] as const;

      for (const request of requests) {
        const response = await app.inject(request);
        assert.equal(response.statusCode, 401, `${request.method} ${request.url}`);
      }
    } finally {
      await app.close();
      authApi.getSession = originalGetSession;
    }
  });
});
