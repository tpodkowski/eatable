import type { CreateMealEntryInput, DailyMealsResponse, MealEntry } from "@eatable/shared";
import { Platform } from "react-native";
import { authClient } from "./auth-client";

const apiUrl = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000").replace(/\/$/, "");

async function requestHeaders() {
  const cookie = Platform.OS === "web" ? null : await authClient.getCookie();
  return {
    ...(cookie ? { Cookie: cookie } : {}),
  };
}

export async function fetchDailyMeals(date: string) {
  const response = await fetch(`${apiUrl}/api/meals?date=${date}`, {
    credentials: Platform.OS === "web" ? "include" : "omit",
    headers: await requestHeaders(),
  });
  if (!response.ok) throw new Error("mealsLoadFailed");
  return (await response.json()) as DailyMealsResponse;
}

export async function createMealEntry(mealTypeId: string, input: CreateMealEntryInput) {
  const response = await fetch(`${apiUrl}/api/meals/${mealTypeId}/entries`, {
    method: "POST",
    credentials: Platform.OS === "web" ? "include" : "omit",
    headers: {
      "Content-Type": "application/json",
      ...(await requestHeaders()),
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("entrySaveFailed");
  return (await response.json()) as MealEntry;
}
