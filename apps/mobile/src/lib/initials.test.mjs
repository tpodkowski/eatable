import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getInitials } from "./initials.ts";

describe("user initials", () => {
  it("uses the first letters of the first and last name", () => {
    assert.equal(getInitials("Anna Kowalska"), "AK");
  });

  it("handles a single name and email address", () => {
    assert.equal(getInitials("Anna"), "AN");
    assert.equal(getInitials("anna.kowalska@example.com"), "AK");
  });

  it("uses a fallback for blank values", () => {
    assert.equal(getInitials("  "), "U");
  });
});
