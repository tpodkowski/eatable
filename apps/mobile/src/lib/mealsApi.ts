import type { CreateMealEntryInput, DailyMealsResponse, MealEntry } from "@eatable/shared";
import { Platform } from "react-native";
import { authClient } from "./authClient";
import { apiUrl } from "./apiUrl";

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

export async function updateMealEntry(mealTypeId: string, entryId: string, input: CreateMealEntryInput) {
  const response = await fetch(`${apiUrl}/api/meals/${mealTypeId}/entries/${entryId}`, {
    method: "PUT",
    credentials: Platform.OS === "web" ? "include" : "omit",
    headers: {
      "Content-Type": "application/json",
      ...(await requestHeaders()),
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("entryUpdateFailed");
  return (await response.json()) as MealEntry;
}

export async function deleteMealEntry(mealTypeId: string, entryId: string, date: string) {
  const response = await fetch(`${apiUrl}/api/meals/${mealTypeId}/entries/${entryId}?date=${date}`, {
    method: "DELETE",
    credentials: Platform.OS === "web" ? "include" : "omit",
    headers: await requestHeaders(),
  });
  if (!response.ok) throw new Error("entryDeleteFailed");
}
