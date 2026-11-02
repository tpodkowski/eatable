import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { AppLanguage } from "../i18n/translations";
import type { ThemeMode } from "../theme";

async function readPreference(key: string) {
  if (Platform.OS === "web") {
    return typeof localStorage === "undefined" ? null : localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function savePreference(key: string, value: string) {
  if (Platform.OS === "web") {
    if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export const readLanguagePreference = () => readPreference("eatable.language");
export const saveLanguagePreference = (language: AppLanguage) => savePreference("eatable.language", language);
export const readThemePreference = () => readPreference("eatable.theme");
export const saveThemePreference = (theme: ThemeMode) => savePreference("eatable.theme", theme);
