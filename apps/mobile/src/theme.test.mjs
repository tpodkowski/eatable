import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isThemeMode, resolveTheme, themes } from "./theme.ts";

describe("theme preferences", () => {
  it("follows the system color scheme by default, with a light fallback", () => {
    assert.equal(resolveTheme("system", "dark"), "dark");
    assert.equal(resolveTheme("system", "light"), "light");
    assert.equal(resolveTheme("system", null), "light");
  });

  it("keeps explicit light and dark preferences independent of the system", () => {
    assert.equal(resolveTheme("light", "dark"), "light");
    assert.equal(resolveTheme("dark", "light"), "dark");
  });

  it("accepts only supported persisted modes", () => {
    assert.equal(isThemeMode("system"), true);
    assert.equal(isThemeMode("light"), true);
    assert.equal(isThemeMode("dark"), true);
    assert.equal(isThemeMode("auto"), false);
    assert.equal(isThemeMode(null), false);
  });

  it("defines the requested brand palette in both color schemes", () => {
    for (const palette of Object.values(themes)) {
      assert.equal(palette.amber, "#FFBE0B");
      assert.equal(palette.orange, "#FB5607");
      assert.equal(palette.pink, "#FF006E");
      assert.equal(palette.violet, "#8338EC");
      assert.equal(palette.blue, "#3A86FF");
    }
  });
});
