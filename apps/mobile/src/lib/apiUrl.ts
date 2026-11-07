import Constants from "expo-constants";
import { Platform } from "react-native";
import { resolveApiUrl } from "./resolveApiUrl";

function developmentHostUri() {
  if (!__DEV__) return null;
  // In the browser, reuse the host the page was opened from so cookies and CORS stay on one host.
  if (Platform.OS === "web") return globalThis.location?.host ?? null;
  return Constants.expoConfig?.hostUri ?? null;
}

export const apiUrl = resolveApiUrl({
  envUrl: process.env.EXPO_PUBLIC_API_URL,
  hostUri: developmentHostUri(),
});
