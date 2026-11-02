import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { AppScreen } from "../components/AppScreen";
import { authClient } from "../lib/auth-client";
import { readLanguagePreference } from "../lib/preferences";
import i18n from "../i18n";
import { AppThemeProvider, useAppTheme } from "../providers/AppThemeProvider";

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <LanguagePreferenceLoader />
      <SessionRouter />
    </AppThemeProvider>
  );
}

function LanguagePreferenceLoader() {
  useEffect(() => {
    let active = true;
    void readLanguagePreference()
      .then((savedLanguage) => {
        if (active && (savedLanguage === "pl" || savedLanguage === "en")) {
          return i18n.changeLanguage(savedLanguage);
        }
        return undefined;
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  return null;
}

function SessionRouter() {
  const router = useRouter();
  const segments = useSegments();
  const { data: session, isPending } = authClient.useSession();
  const inAuthGroup = segments[0] === "(auth)";
  const needsRedirect = !isPending && (session ? inAuthGroup : !inAuthGroup);

  useEffect(() => {
    if (isPending) return;
    if (session && inAuthGroup) router.replace("/");
    else if (!session && !inAuthGroup) router.replace("/(auth)/sign-in");
  }, [inAuthGroup, isPending, router, session]);

  if (isPending || needsRedirect) return <LoadingScreen />;
  return <Stack screenOptions={{ headerShown: false }} />;
}

function LoadingScreen() {
  const { colors } = useAppTheme();
  return (
    <AppScreen>
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({ loading: { alignItems: "center", justifyContent: "center", minHeight: 300 } });
