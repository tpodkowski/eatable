import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getNextMeal } from "./meal-schedule.ts";

const meals = ["08:00", "11:00", "14:00", "17:00", "20:00"].map((mealTime, sortOrder) => ({ id: String(sortOrder), name: `Meal ${sortOrder}`, mealTime, sortOrder, entries: [] }));

describe("meal schedule", () => {
  it("selects the next meal after the current local time", () => {
    assert.equal(getNextMeal(meals, new Date(2026, 0, 1, 10, 59)).meal.name, "Meal 1");
    assert.equal(getNextMeal(meals, new Date(2026, 0, 1, 14, 0)).meal.name, "Meal 3");
  });

  it("wraps to breakfast tomorrow after the final meal", () => {
    const next = getNextMeal(meals, new Date(2026, 0, 1, 20, 0));
    assert.equal(next.meal.name, "Meal 0");
    assert.equal(next.tomorrow, true);
  });

  it("returns no meal when the schedule is empty", () => {
    assert.equal(getNextMeal([], new Date()), null);
  });

  it("ignores meals with missing or invalid stored times", () => {
    const unscheduled = [{ ...meals[0], mealTime: undefined }, { ...meals[1], mealTime: "25:90" }];
    assert.equal(getNextMeal(unscheduled, new Date(2026, 0, 1, 7, 0)), null);
    assert.equal(getNextMeal([{ ...meals[0], mealTime: undefined }, meals[1]], new Date(2026, 0, 1, 10, 0)).meal.id, "1");
  });

  it("uses each meal's stored time rather than its display order", () => {
    const reordered = meals.map((meal, index) => ({ ...meal, mealTime: ["12:15", "09:30", "18:00", "15:00", "21:00"][index] }));
    const next = getNextMeal(reordered, new Date(2026, 0, 1, 10, 0));
    assert.equal(next.meal.id, "0");
    assert.equal(next.time, "12:15");
  });
});
