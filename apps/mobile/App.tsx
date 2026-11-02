import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
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
import type { DailyMealsResponse, HealthResponse } from "@eatable/shared";
import { authClient } from "./src/lib/auth-client";

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

function formatDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  const formatted = new Intl.DateTimeFormat("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  return formatted.charAt(0).toLocaleUpperCase("pl-PL") + formatted.slice(1);
}

export default function App() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [apiError, setApiError] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => localDateKey(new Date()));
  const [dailyMeals, setDailyMeals] = useState<DailyMealsResponse | null>(null);
  const [mealsLoading, setMealsLoading] = useState(false);
  const [mealsError, setMealsError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`${apiUrl}/health`)
      .then(async (response) => {
        if (!response.ok) throw new Error("API unavailable");
        return (await response.json()) as HealthResponse;
      })
      .then((data) => active && setHealth(data))
      .catch(() => active && setApiError(true));
    return () => {
      active = false;
    };
  }, []);

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
        if (!response.ok) throw new Error("Nie udało się pobrać listy posiłków.");
        const result = (await response.json()) as DailyMealsResponse;
        if (active) setDailyMeals(result);
      } catch (error) {
        if (active) {
          setMealsError(error instanceof Error ? error.message : "Nie udało się pobrać listy posiłków.");
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
      if (result.error) setMessage(result.error.message ?? "Nie udało się zalogować.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nie udało się połączyć z API.");
    } finally {
      setBusy(false);
    }
  }

  async function signInWithGoogle() {
    setBusy(true);
    setMessage(null);
    try {
      const result = await authClient.signIn.social({ provider: "google", callbackURL: "/" });
      if (result.error) setMessage(result.error.message ?? "Logowanie Google nie powiodło się.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Logowanie Google nie powiodło się.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    setMessage(null);
    try {
      const result = await authClient.signOut();
      if (result.error) setMessage(result.error.message ?? "Nie udało się wylogować.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nie udało się wylogować.");
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
            <Text style={styles.eyebrow}>EATABLE</Text>
            {sessionPending ? (
              <View style={styles.loading}>
                <ActivityIndicator color="#39735d" size="large" />
                <Text style={styles.muted}>Sprawdzam sesję…</Text>
              </View>
            ) : session ? (
              <>
                <Text style={styles.title}>Twój dzień.</Text>
                <Text style={styles.description}>Jesteś zalogowany jako {session.user.email}.</Text>

                <View style={styles.dayPicker}>
                  <Pressable
                    accessibilityLabel="Poprzedni dzień"
                    accessibilityRole="button"
                    onPress={() => setSelectedDate((date) => shiftDate(date, -1))}
                    style={styles.dayArrow}
                  >
                    <Text style={styles.dayArrowText}>‹</Text>
                  </Pressable>
                  <View style={styles.dayHeading}>
                    <Text style={styles.dayEyebrow}>{selectedDate === localDateKey(new Date()) ? "DZISIAJ" : "PLAN DNIA"}</Text>
                    <Text style={styles.dayDate}>{formatDate(selectedDate)}</Text>
                  </View>
                  <Pressable
                    accessibilityLabel="Następny dzień"
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
                    <Text style={styles.muted}>Wczytuję posiłki…</Text>
                  </View>
                ) : mealsError ? (
                  <Text accessibilityRole="alert" style={styles.error}>{mealsError}</Text>
                ) : (
                  <View style={styles.mealList}>
                    {dailyMeals?.mealTypes.map((mealType) => (
                      <View key={mealType.id} style={styles.mealCard}>
                        <View style={styles.mealCardHeading}>
                          <View style={styles.mealOrder}>
                            <Text style={styles.mealOrderText}>{String(mealType.sortOrder + 1).padStart(2, "0")}</Text>
                          </View>
                          <Text style={styles.mealName}>{mealType.name}</Text>
                        </View>
                        {mealType.entries.length > 0 ? mealType.entries.map((entry) => (
                          <View key={entry.id} style={styles.mealEntry}>
                            <Text style={styles.mealEntryTitle}>{entry.title}</Text>
                            {entry.notes ? <Text style={styles.mealEntryNotes}>{entry.notes}</Text> : null}
                            {entry.calories !== null ? <Text style={styles.mealEntryCalories}>{entry.calories} kcal</Text> : null}
                          </View>
                        )) : (
                          <Text style={styles.emptyMeal}>Brak zapisanych dań</Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.statusCard}>
                  <View style={[styles.dot, health ? styles.online : apiError ? styles.offline : styles.pending]} />
                  <Text style={styles.statusDetail}>
                    {health ? "Połączono z API i PostgreSQL" : apiError ? "Brak połączenia z API" : "Sprawdzam API…"}
                  </Text>
                </View>
                {message ? <Text accessibilityRole="alert" style={styles.error}>{message}</Text> : null}
                <ActionButton title="Wyloguj się" onPress={signOut} loading={busy} secondary />
              </>
            ) : (
              <>
                <Text style={styles.title}>{mode === "sign-in" ? "Witaj\nz powrotem." : "Dołącz do\nEatable."}</Text>
                <Text style={styles.description}>
                  {mode === "sign-in" ? "Zaloguj się, aby kontynuować." : "Utwórz konto i zacznij korzystać z aplikacji."}
                </Text>

                <View style={styles.form}>
                  {mode === "sign-up" ? (
                    <TextInput
                      autoCapitalize="words"
                      autoComplete="name"
                      onChangeText={setName}
                      placeholder="Imię i nazwisko"
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
                    placeholder="Adres e-mail"
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
                    placeholder="Hasło (min. 8 znaków)"
                    placeholderTextColor="#91a097"
                    returnKeyType="go"
                    secureTextEntry
                    style={styles.input}
                    textContentType={mode === "sign-up" ? "newPassword" : "password"}
                    value={password}
                  />
                  {message ? <Text accessibilityRole="alert" style={styles.error}>{message}</Text> : null}
                  <ActionButton
                    title={mode === "sign-in" ? "Zaloguj się" : "Utwórz konto"}
                    onPress={submitEmail}
                    loading={busy}
                    disabled={!email.trim() || !password || (mode === "sign-up" && !name.trim())}
                  />
                </View>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>LUB</Text>
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
                  <Text style={styles.googleText}>Kontynuuj z Google</Text>
                </Pressable>
                {!googleSignInEnabled ? (
                  <Text style={styles.hint}>Skonfiguruj klucze Google OAuth w pliku .env, aby włączyć tę opcję.</Text>
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
                    {mode === "sign-in" ? "Nie masz konta? " : "Masz już konto? "}
                    <Text style={styles.switchAction}>{mode === "sign-in" ? "Zarejestruj się" : "Zaloguj się"}</Text>
                  </Text>
                </Pressable>

                <View style={styles.apiNote}>
                  <View style={[styles.dot, health ? styles.online : apiError ? styles.offline : styles.pending]} />
                  <Text style={styles.apiNoteText}>
                    {health ? "API i PostgreSQL są gotowe" : apiError ? "Nie można połączyć się z API" : "Łączenie z API…"}
                  </Text>
                </View>
              </>
            )}
          </View>
          <Text style={styles.footer}>BEZPIECZNE LOGOWANIE · EATABLE</Text>
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
  eyebrow: { color: "#39735d", fontSize: 12, fontWeight: "700", letterSpacing: 2.5 },
  title: { color: "#183a30", fontSize: 48, fontWeight: "700", letterSpacing: -2, lineHeight: 52, marginTop: 34 },
  description: { color: "#64746c", fontSize: 16, lineHeight: 24, marginTop: 14 },
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
  statusCard: { alignItems: "center", backgroundColor: "#fff", borderRadius: 18, flexDirection: "row", gap: 12, marginTop: 36, padding: 18 },
  dot: { borderRadius: 6, height: 12, width: 12 },
  online: { backgroundColor: "#3e9a6b" },
  offline: { backgroundColor: "#d87563" },
  pending: { backgroundColor: "#d6a64b" },
  statusDetail: { color: "#64746c", flex: 1, fontSize: 14 },
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
  apiNote: { alignItems: "center", flexDirection: "row", gap: 9, justifyContent: "center", marginTop: 28 },
  apiNoteText: { color: "#829087", fontSize: 12 },
  loading: { alignItems: "center", gap: 16, paddingVertical: 72 },
  muted: { color: "#64746c", fontSize: 14 },
  footer: { color: "#91a097", fontSize: 10, fontWeight: "700", letterSpacing: 1.5, marginHorizontal: 28, marginTop: 42, marginBottom: 24, textAlign: "center" },
});
