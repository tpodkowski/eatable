import type { ProductSearchResult } from "@eatable/shared";
import { Platform } from "react-native";
import { authClient } from "./authClient";
import { apiUrl } from "./apiUrl";

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
