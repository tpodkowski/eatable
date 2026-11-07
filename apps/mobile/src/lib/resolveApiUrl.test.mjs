import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveApiUrl } from "./resolveApiUrl.ts";

describe("API URL resolution", () => {
  it("prefers an explicit URL and strips its trailing slash", () => {
    assert.equal(
      resolveApiUrl({ envUrl: "https://api.example.test/", hostUri: "192.168.1.20:8081" }),
      "https://api.example.test",
    );
  });

  it("reuses the Metro host on the local network when no URL is set", () => {
    assert.equal(resolveApiUrl({ hostUri: "192.168.1.20:8081" }), "http://192.168.1.20:3000");
    assert.equal(resolveApiUrl({ envUrl: "  ", hostUri: "macbook.local:8081" }), "http://macbook.local:3000");
  });

  it("supports a custom API port and IPv6 hosts", () => {
    assert.equal(resolveApiUrl({ hostUri: "10.0.0.5:8081", apiPort: 4000 }), "http://10.0.0.5:4000");
    assert.equal(resolveApiUrl({ hostUri: "[fe80::1]:8081" }), "http://[fe80::1]:3000");
  });

  it("falls back to localhost without a usable Metro host", () => {
    assert.equal(resolveApiUrl({}), "http://localhost:3000");
    assert.equal(resolveApiUrl({ hostUri: null }), "http://localhost:3000");
    assert.equal(resolveApiUrl({ hostUri: "abc-anonymous-8081.exp.direct" }), "http://localhost:3000");
  });
});
