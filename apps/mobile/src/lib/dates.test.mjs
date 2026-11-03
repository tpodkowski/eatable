import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getDateStrip, isValidDateKey, shiftDate } from "./dates.ts";

describe("date route parameter validation", () => {
  it("accepts real calendar dates", () => {
    assert.equal(isValidDateKey("2026-11-03"), true);
    assert.equal(isValidDateKey("2024-02-29"), true);
  });

  it("rejects malformed and impossible date values", () => {
    assert.equal(isValidDateKey("2026-11-3"), false);
    assert.equal(isValidDateKey("2026-02-30"), false);
    assert.equal(isValidDateKey(["2026-11-03"]), false);
    assert.equal(isValidDateKey(undefined), false);
  });
});

describe("horizontal date strip", () => {
  it("shows consecutive dates across the selected week and surrounding weeks", () => {
    const dates = getDateStrip("2026-11-04");

    assert.equal(dates.length, 35);
    assert.equal(dates[14], "2026-11-02");
    assert.ok(dates.includes("2026-11-04"));
    assert.ok(dates.every((date, index) => index === 0 || date === shiftDate(dates[index - 1], 1)));
  });

  it("starts on Monday when the selected date is a Sunday", () => {
    const dates = getDateStrip("2026-11-08", 0);
    assert.deepEqual(dates, [
      "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08",
    ]);
  });
});
