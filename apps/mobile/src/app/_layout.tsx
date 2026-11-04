import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { AppScreen } from "../components/AppScreen";
import { authClient } from "../lib/authClient";
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
    else if (!session && !inAuthGroup) router.replace("/(auth)/signIn");
  }, [inAuthGroup, isPending, router, session]);

  if (isPending || needsRedirect) return <LoadingScreen />;
  return <View style={styles.appRoot}>
    <Stack screenOptions={{ headerShown: false }} />
  </View>;
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

const styles = StyleSheet.create({
  appRoot: { flex: 1 },
  loading: { alignItems: "center", justifyContent: "center", minHeight: 300 },
  rainbowTrack: { flexDirection: "row", height: 3, left: 0, overflow: "hidden", position: "absolute", right: 0, top: 0, zIndex: 10 },
  rainbowSegment: { flex: 1 },
});
