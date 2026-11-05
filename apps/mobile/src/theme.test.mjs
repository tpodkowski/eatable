import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isThemeMode, resolveTheme, themes } from "./theme.ts";

describe("theme preferences", () => {
  it("follows the system color scheme, with a dark fallback", () => {
    assert.equal(resolveTheme("system", "dark"), "dark");
    assert.equal(resolveTheme("system", "light"), "light");
    assert.equal(resolveTheme("system", null), "dark");
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

  it("defines the charcoal, ash, white, and lime dark palette", () => {
    assert.equal(themes.dark.background, "#212121");
    assert.equal(themes.dark.surface, "#282828");
    assert.equal(themes.dark.text, "#FFFFFF");
    assert.equal(themes.dark.primary, "#D0FE5D");
    assert.equal(themes.dark.primaryText, "#212121");
    assert.equal(themes.dark.muted, "#D0D0D0");
    assert.equal(themes.dark.border, "#414141");
  });

  it("uses a darker lime accent with readable contrast in light mode", () => {
    assert.equal(themes.light.primary, "#587500");
    assert.equal(themes.light.orange, "#587500");
    assert.notEqual(themes.light.primary, themes.dark.primary);
  });
});
