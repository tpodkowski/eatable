import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { DailyMealsResponse } from "@eatable/shared";
import { authClient } from "./src/lib/auth-client";
import i18n from "./src/i18n";
import type { AppLanguage } from "./src/i18n/translations";

const apiUrl = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000").replace(/\/$/, "");
const googleSignInEnabled = process.env.EXPO_PUBLIC_GOOGLE_SIGN_IN_ENABLED === "true";

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDate(dateKey: string, amount: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + amount);
  return localDateKey(date);
}

function formatDate(dateKey: string, locale: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  const formatted = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  return formatted.charAt(0).toLocaleUpperCase(locale) + formatted.slice(1);
}

function getInitials(name: string) {
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
  return (parts.length > 1
    ? `${parts[0][0]}${parts[1][0]}`
    : parts[0]?.slice(0, 2) ?? "U").toLocaleUpperCase("pl-PL");
}

function authErrorKey(message: string | undefined) {
  const error = message?.toLocaleLowerCase("en-US") ?? "";

  if (error.includes("invalid email or password") || error.includes("invalid credentials")) {
    return "errors.invalidCredentials";
  }
  if (error.includes("already exists") || error.includes("already registered")) {
    return "errors.accountExists";
  }
  if (error.includes("email") && (error.includes("invalid") || error.includes("valid"))) {
    return "errors.invalidEmail";
  }
  if (error.includes("password") && (error.includes("short") || error.includes("at least") || error.includes("minimum"))) {
    return "errors.shortPassword";
  }
  if (error.includes("not verified") || error.includes("not been verified")) {
    return "errors.emailUnverified";
  }
  if (error.includes("too many") || error.includes("rate limit")) {
    return "errors.tooManyAttempts";
  }
  if (error.includes("network") || error.includes("fetch") || error.includes("connection") || error.includes("load failed")) {
    return "errors.network";
  }

  return undefined;
}

function mealNameKey(name: string) {
  const normalizedName = name.trim().toLocaleLowerCase("pl-PL");
  const keys: Record<string, string> = {
    "śniadanie": "planner.breakfast",
    "drugie śniadanie": "planner.secondBreakfast",
    "obiad": "planner.lunch",
    "podwieczorek": "planner.afternoonSnack",
    "kolacja": "planner.dinner",
  };
  return keys[normalizedName];
}

async function readLanguagePreference() {
  if (Platform.OS === "web") {
    return typeof localStorage === "undefined" ? null : localStorage.getItem("eatable.language");
  }
  return SecureStore.getItemAsync("eatable.language");
}

async function saveLanguagePreference(language: AppLanguage) {
  if (Platform.OS === "web") {
    if (typeof localStorage !== "undefined") localStorage.setItem("eatable.language", language);
    return;
  }
  await SecureStore.setItemAsync("eatable.language", language);
}

export default function App() {
  const { t } = useTranslation();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => localDateKey(new Date()));
  const [dailyMeals, setDailyMeals] = useState<DailyMealsResponse | null>(null);
  const [mealsLoading, setMealsLoading] = useState(false);
  const [mealsError, setMealsError] = useState<string | null>(null);
  const language: AppLanguage = i18n.resolvedLanguage === "pl" ? "pl" : "en";

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

  async function setLanguage(languageToSet: AppLanguage) {
    await i18n.changeLanguage(languageToSet);
    try {
      await saveLanguagePreference(languageToSet);
    } catch {
      // Keep the selected language for this session if device storage is unavailable.
    }
  }

  useEffect(() => {
    if (!session) {
      setDailyMeals(null);
      return;
    }

    let active = true;
    async function loadDailyMeals() {
      setMealsLoading(true);
      setMealsError(null);
      try {
        const cookie = Platform.OS === "web" ? null : await authClient.getCookie();
        const response = await fetch(`${apiUrl}/api/meals?date=${selectedDate}`, {
          credentials: Platform.OS === "web" ? "include" : "omit",
          ...(cookie ? { headers: { Cookie: cookie } } : {}),
        });
        if (!response.ok) throw new Error("mealsLoadFailed");
        const result = (await response.json()) as DailyMealsResponse;
        if (active) setDailyMeals(result);
      } catch {
        if (active) {
          setMealsError("errors.mealsLoadFailed");
        }
      } finally {
        if (active) setMealsLoading(false);
      }
    }

    void loadDailyMeals();
    return () => {
      active = false;
    };
  }, [session?.user.id, selectedDate]);

  async function submitEmail() {
    setBusy(true);
    setMessage(null);
    try {
      const result = mode === "sign-up"
        ? await authClient.signUp.email({ name: name.trim(), email: email.trim(), password })
        : await authClient.signIn.email({ email: email.trim(), password });
      if (result.error) {
        setMessage(authErrorKey(result.error.message) ?? (mode === "sign-up" ? "errors.signUpFailed" : "errors.signInFailed"));
      }
    } catch (error) {
      setMessage(authErrorKey(error instanceof Error ? error.message : undefined) ?? "errors.network");
    } finally {
      setBusy(false);
    }
  }

  async function signInWithGoogle() {
    setBusy(true);
    setMessage(null);
    try {
      const result = await authClient.signIn.social({ provider: "google", callbackURL: "/" });
      if (result.error) setMessage(authErrorKey(result.error.message) ?? "errors.googleFailed");
    } catch (error) {
      setMessage(authErrorKey(error instanceof Error ? error.message : undefined) ?? "errors.googleFailed");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    setMessage(null);
    try {
      const result = await authClient.signOut();
      if (result.error) setMessage(authErrorKey(result.error.message) ?? "errors.logoutFailed");
      else setSettingsOpen(false);
    } catch (error) {
      setMessage(authErrorKey(error instanceof Error ? error.message : undefined) ?? "errors.logoutFailed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.eyebrow}>EATABLE</Text>
              {session && !settingsOpen ? (
                <Pressable
                  accessibilityLabel={t("app.openSettings")}
                  accessibilityRole="button"
                  onPress={() => {
                    setMessage(null);
                    setSettingsOpen(true);
                  }}
                  style={({ pressed }) => [styles.avatarButton, pressed && styles.pressed]}
                >
                  <Text style={styles.avatarText}>{getInitials(session.user.name || session.user.email)}</Text>
                </Pressable>
              ) : null}
            </View>
            {sessionPending ? (
              <View style={styles.loading}>
                <ActivityIndicator color="#39735d" size="large" />
                <Text style={styles.muted}>{t("app.sessionLoading")}</Text>
              </View>
            ) : session ? settingsOpen ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setMessage(null);
                    setSettingsOpen(false);
                  }}
                  style={styles.backButton}
                >
                  <Text style={styles.backButtonText}>{t("app.back")}</Text>
                </Pressable>
                <Text style={styles.title}>{t("app.settings")}</Text>
                <Text style={styles.description}>{t("app.settingsDescription")}</Text>
                <View style={styles.accountCard}>
                  <View style={styles.accountAvatar}>
                    <Text style={styles.avatarText}>{getInitials(session.user.name || session.user.email)}</Text>
                  </View>
                  <View style={styles.accountDetails}>
                    {session.user.name ? <Text style={styles.accountName}>{session.user.name}</Text> : null}
                    <Text style={styles.accountEmail}>{session.user.email}</Text>
                  </View>
                </View>
                <View style={styles.languageSection}>
                  <Text style={styles.languageLabel}>{t("language.label")}</Text>
                  <View style={styles.languageOptions}>
                    {(["pl", "en"] as const).map((option) => {
                      const selected = language === option;
                      return (
                        <Pressable
                          key={option}
                          accessibilityLabel={t(option === "pl" ? "language.selectPolish" : "language.selectEnglish")}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          onPress={() => void setLanguage(option)}
                          style={[styles.languageOption, selected && styles.languageOptionActive]}
                        >
                          <Text style={[styles.languageOptionText, selected && styles.languageOptionTextActive]}>
                            {t(option === "pl" ? "language.polish" : "language.english")}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
                {message ? <Text accessibilityRole="alert" style={styles.error}>{t(message)}</Text> : null}
                <ActionButton title={t("app.logout")} onPress={signOut} loading={busy} secondary />
              </>
            ) : (
              <>
                <View style={styles.dayPicker}>
                  <Pressable
                    accessibilityLabel={t("app.previousDay")}
                    accessibilityRole="button"
                    onPress={() => setSelectedDate((date) => shiftDate(date, -1))}
                    style={styles.dayArrow}
                  >
                    <Text style={styles.dayArrowText}>‹</Text>
                  </Pressable>
                  <View style={styles.dayHeading}>
                    <Text style={styles.dayEyebrow}>{t(selectedDate === localDateKey(new Date()) ? "planner.today" : "planner.dayPlan")}</Text>
                    <Text style={styles.dayDate}>{formatDate(selectedDate, language === "pl" ? "pl-PL" : "en-US")}</Text>
                  </View>
                  <Pressable
                    accessibilityLabel={t("app.nextDay")}
                    accessibilityRole="button"
                    onPress={() => setSelectedDate((date) => shiftDate(date, 1))}
                    style={styles.dayArrow}
                  >
                    <Text style={styles.dayArrowText}>›</Text>
                  </Pressable>
                </View>

                {mealsLoading ? (
                  <View style={styles.mealsLoading}>
                    <ActivityIndicator color="#39735d" />
                    <Text style={styles.muted}>{t("planner.loadingMeals")}</Text>
                  </View>
                ) : mealsError ? (
                  <Text accessibilityRole="alert" style={styles.error}>{t(mealsError)}</Text>
                ) : (
                  <View style={styles.mealList}>
                    {dailyMeals?.mealTypes.map((mealType) => (
                      <View key={mealType.id} style={styles.mealCard}>
                        <View style={styles.mealCardHeading}>
                          <View style={styles.mealOrder}>
                            <Text style={styles.mealOrderText}>{String(mealType.sortOrder + 1).padStart(2, "0")}</Text>
                          </View>
                          <Text style={styles.mealName}>
                            {mealNameKey(mealType.name) ? t(mealNameKey(mealType.name)!) : mealType.name}
                          </Text>
                        </View>
                        {mealType.entries.length > 0 ? mealType.entries.map((entry) => (
                          <View key={entry.id} style={styles.mealEntry}>
                            <Text style={styles.mealEntryTitle}>{entry.title}</Text>
                            {entry.notes ? <Text style={styles.mealEntryNotes}>{entry.notes}</Text> : null}
                            {entry.calories !== null ? <Text style={styles.mealEntryCalories}>{entry.calories} kcal</Text> : null}
                          </View>
                        )) : (
                          <Text style={styles.emptyMeal}>{t("planner.noMeals")}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}

                {message ? <Text accessibilityRole="alert" style={styles.error}>{t(message)}</Text> : null}
              </>
            ) : (
              <>
                <Text style={styles.title}>{t(mode === "sign-in" ? "auth.signInTitle" : "auth.signUpTitle")}</Text>
                <Text style={styles.description}>
                  {t(mode === "sign-in" ? "auth.signInDescription" : "auth.signUpDescription")}
                </Text>

                <View style={styles.form}>
                  {mode === "sign-up" ? (
                    <TextInput
                      autoCapitalize="words"
                      autoComplete="name"
                      onChangeText={setName}
                      placeholder={t("auth.namePlaceholder")}
                      placeholderTextColor="#91a097"
                      returnKeyType="next"
                      style={styles.input}
                      value={name}
                    />
                  ) : null}
                  <TextInput
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    onChangeText={setEmail}
                    placeholder={t("auth.emailPlaceholder")}
                    placeholderTextColor="#91a097"
                    returnKeyType="next"
                    style={styles.input}
                    textContentType="emailAddress"
                    value={email}
                  />
                  <TextInput
                    autoCapitalize="none"
                    autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                    onChangeText={setPassword}
                    onSubmitEditing={submitEmail}
                    placeholder={t("auth.passwordPlaceholder")}
                    placeholderTextColor="#91a097"
                    returnKeyType="go"
                    secureTextEntry
                    style={styles.input}
                    textContentType={mode === "sign-up" ? "newPassword" : "password"}
                    value={password}
                  />
                  {message ? <Text accessibilityRole="alert" style={styles.error}>{t(message)}</Text> : null}
                  <ActionButton
                    title={t(mode === "sign-in" ? "auth.signIn" : "auth.signUp")}
                    onPress={submitEmail}
                    loading={busy}
                    disabled={!email.trim() || !password || (mode === "sign-up" && !name.trim())}
                  />
                </View>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>{t("auth.or")}</Text>
                  <View style={styles.dividerLine} />
                </View>

                <Pressable
                  accessibilityRole="button"
                  disabled={busy || !googleSignInEnabled}
                  onPress={signInWithGoogle}
                  style={({ pressed }) => [
                    styles.googleButton,
                    !googleSignInEnabled && styles.disabledButton,
                    pressed && googleSignInEnabled && styles.pressed,
                  ]}
                >
                  <Text style={styles.googleMark}>G</Text>
                  <Text style={styles.googleText}>{t("auth.google")}</Text>
                </Pressable>
                {!googleSignInEnabled ? (
                  <Text style={styles.hint}>{t("auth.googleHint")}</Text>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setMessage(null);
                    setMode(mode === "sign-in" ? "sign-up" : "sign-in");
                  }}
                  style={styles.switchMode}
                >
                  <Text style={styles.switchText}>
                    {t(mode === "sign-in" ? "auth.noAccount" : "auth.hasAccount")}
                    <Text style={styles.switchAction}>{t(mode === "sign-in" ? "auth.register" : "auth.signIn")}</Text>
                  </Text>
                </Pressable>

              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ActionButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={loading || disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        secondary && styles.secondaryButton,
        disabled && styles.disabledButton,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {loading ? <ActivityIndicator color={secondary ? "#183a30" : "#fff"} /> : (
        <Text style={[styles.actionText, secondary && styles.secondaryActionText]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: "#f4f4ed" },
  scrollContent: { flexGrow: 1, justifyContent: "space-between" },
  content: { paddingHorizontal: 28, paddingTop: 44, width: "100%", maxWidth: 560, alignSelf: "center" },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  eyebrow: { color: "#39735d", fontSize: 12, fontWeight: "700", letterSpacing: 2.5 },
  avatarButton: { alignItems: "center", backgroundColor: "#dce9df", borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  avatarText: { color: "#255842", fontSize: 14, fontWeight: "700" },
  backButton: { alignSelf: "flex-start", marginTop: 22, paddingVertical: 8, paddingRight: 12 },
  backButtonText: { color: "#39735d", fontSize: 15, fontWeight: "600" },
  title: { color: "#183a30", fontSize: 48, fontWeight: "700", letterSpacing: -2, lineHeight: 52, marginTop: 34 },
  description: { color: "#64746c", fontSize: 16, lineHeight: 24, marginTop: 14 },
  accountCard: { alignItems: "center", backgroundColor: "#fff", borderColor: "#e8ebe4", borderRadius: 17, borderWidth: 1, flexDirection: "row", gap: 14, marginTop: 28, padding: 17 },
  accountAvatar: { alignItems: "center", backgroundColor: "#dce9df", borderRadius: 24, height: 48, justifyContent: "center", width: 48 },
  accountDetails: { flex: 1, gap: 4 },
  accountName: { color: "#183a30", fontSize: 15, fontWeight: "600" },
  accountEmail: { color: "#64746c", fontSize: 13 },
  languageSection: { marginTop: 28 },
  languageLabel: { color: "#183a30", fontSize: 14, fontWeight: "600", marginBottom: 10 },
  languageOptions: { flexDirection: "row", gap: 10 },
  languageOption: { alignItems: "center", backgroundColor: "#fff", borderColor: "#dce3dc", borderRadius: 12, borderWidth: 1, flex: 1, minHeight: 46, justifyContent: "center", paddingHorizontal: 12 },
  languageOptionActive: { backgroundColor: "#e6efe7", borderColor: "#39735d" },
  languageOptionText: { color: "#64746c", fontSize: 14, fontWeight: "600" },
  languageOptionTextActive: { color: "#255842" },
  form: { gap: 12, marginTop: 30 },
  input: { backgroundColor: "#fff", borderColor: "#e4e8df", borderRadius: 14, borderWidth: 1, color: "#183a30", fontSize: 16, height: 56, paddingHorizontal: 16 },
  actionButton: { alignItems: "center", backgroundColor: "#255842", borderRadius: 14, height: 54, justifyContent: "center", marginTop: 4 },
  actionText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  secondaryButton: { backgroundColor: "#fff", borderColor: "#dce3dc", borderWidth: 1, marginTop: 24 },
  secondaryActionText: { color: "#183a30" },
  disabledButton: { opacity: 0.5 },
  pressed: { opacity: 0.82 },
  divider: { alignItems: "center", flexDirection: "row", gap: 12, marginTop: 24 },
  dividerLine: { backgroundColor: "#dce3dc", flex: 1, height: 1 },
  dividerText: { color: "#91a097", fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  googleButton: { alignItems: "center", backgroundColor: "#fff", borderColor: "#dce3dc", borderRadius: 14, borderWidth: 1, flexDirection: "row", height: 54, justifyContent: "center", marginTop: 18 },
  googleMark: { color: "#4285f4", fontSize: 19, fontWeight: "700", marginRight: 10 },
  googleText: { color: "#263a32", fontSize: 15, fontWeight: "600" },
  hint: { color: "#738078", fontSize: 12, lineHeight: 18, marginTop: 8, textAlign: "center" },
  switchMode: { alignItems: "center", marginTop: 23, padding: 8 },
  switchText: { color: "#64746c", fontSize: 14 },
  switchAction: { color: "#39735d", fontWeight: "700" },
  error: { color: "#a33d30", fontSize: 13, lineHeight: 19 },
  dayPicker: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 30 },
  dayArrow: { alignItems: "center", backgroundColor: "#fff", borderColor: "#e4e8df", borderRadius: 14, borderWidth: 1, height: 44, justifyContent: "center", width: 44 },
  dayArrowText: { color: "#255842", fontSize: 30, fontWeight: "400", lineHeight: 34, marginTop: -3 },
  dayHeading: { alignItems: "center", flex: 1, paddingHorizontal: 8 },
  dayEyebrow: { color: "#39735d", fontSize: 10, fontWeight: "700", letterSpacing: 1.8 },
  dayDate: { color: "#183a30", fontSize: 15, fontWeight: "600", marginTop: 5, textAlign: "center" },
  mealList: { gap: 12, marginTop: 22 },
  mealCard: { backgroundColor: "#fff", borderColor: "#e8ebe4", borderRadius: 17, borderWidth: 1, paddingHorizontal: 17, paddingVertical: 16 },
  mealCardHeading: { alignItems: "center", flexDirection: "row", gap: 12 },
  mealOrder: { alignItems: "center", backgroundColor: "#edf2ec", borderRadius: 10, height: 34, justifyContent: "center", width: 38 },
  mealOrderText: { color: "#39735d", fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  mealName: { color: "#183a30", flex: 1, fontSize: 16, fontWeight: "650" },
  emptyMeal: { color: "#8b978f", fontSize: 13, marginLeft: 50, marginTop: 12 },
  mealEntry: { borderTopColor: "#edf0eb", borderTopWidth: 1, marginLeft: 50, marginTop: 12, paddingTop: 11 },
  mealEntryTitle: { color: "#263a32", fontSize: 14, fontWeight: "600" },
  mealEntryNotes: { color: "#738078", fontSize: 13, lineHeight: 19, marginTop: 3 },
  mealEntryCalories: { color: "#39735d", fontSize: 12, fontWeight: "600", marginTop: 5 },
  mealsLoading: { alignItems: "center", gap: 10, paddingVertical: 40 },
  loading: { alignItems: "center", gap: 16, paddingVertical: 72 },
  muted: { color: "#64746c", fontSize: 14 },
});
