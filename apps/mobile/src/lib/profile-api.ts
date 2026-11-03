import type { UserProfile } from "@eatable/shared";
import { Platform } from "react-native";
import { authClient } from "./auth-client";

const apiUrl = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000").replace(/\/$/, "");

async function requestHeaders() {
  const cookie = Platform.OS === "web" ? null : await authClient.getCookie();
  return { ...(cookie ? { Cookie: cookie } : {}) };
}

export async function fetchUserProfile(): Promise<UserProfile> {
  const response = await fetch(`${apiUrl}/api/profile`, {
    credentials: Platform.OS === "web" ? "include" : "omit",
    headers: await requestHeaders(),
  });
  if (!response.ok) throw new Error("profileLoadFailed");
  return (await response.json()) as UserProfile;
}

export async function updateDailyCalorieLimit(dailyCalorieLimit: number): Promise<UserProfile> {
  const response = await fetch(`${apiUrl}/api/profile`, {
    method: "PUT",
    credentials: Platform.OS === "web" ? "include" : "omit",
    headers: { "Content-Type": "application/json", ...(await requestHeaders()) },
    body: JSON.stringify({ dailyCalorieLimit }),
  });
  if (!response.ok) throw new Error(response.status === 400 ? "invalidDailyCalorieLimit" : "profileSaveFailed");
  return (await response.json()) as UserProfile;
}
