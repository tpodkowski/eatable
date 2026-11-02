import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createApp } from "./app.js";

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
