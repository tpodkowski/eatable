import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const apiUrl = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const authClient = createAuthClient({
  baseURL: `${apiUrl}/api/auth`,
  plugins: Platform.OS === "web"
    ? []
    : [
        expoClient({
          scheme: "eatable",
          storagePrefix: "eatable",
          storage: SecureStore,
        }),
      ],
});
