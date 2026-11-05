import type { ProductSearchResult } from "@eatable/shared";
import { Platform } from "react-native";
import { authClient } from "./authClient";

const apiUrl = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000").replace(/\/$/, "");

export async function fetchProducts(search?: string) {
  const cookie = Platform.OS === "web" ? null : await authClient.getCookie();
  const query = search?.trim() ? `?q=${encodeURIComponent(search.trim())}` : "";
  const response = await fetch(`${apiUrl}/api/products${query}`, {
    credentials: Platform.OS === "web" ? "include" : "omit",
    headers: cookie ? { Cookie: cookie } : {},
  });
  if (!response.ok) throw new Error("productsLoadFailed");
  return (await response.json()) as ProductSearchResult[];
}
