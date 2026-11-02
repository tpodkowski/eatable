import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { AppScreen } from "../../components/AppScreen";
import { authClient } from "../../lib/auth-client";
import { localDateKey, shiftDate } from "../../lib/dates";
import { getInitials } from "../../lib/initials";
import { fetchDailyMeals } from "../../lib/meals-api";
import { useAppTheme } from "../../providers/AppThemeProvider";
import { useDailyMeals } from "../meals/useDailyMeals";
import { getNextMeal } from "../meals/meal-schedule";
import { mealNameKey } from "../../lib/meal-name";

export function DashboardScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { data: session } = authClient.useSession();
  const { dailyMeals, isLoading, error } = useDailyMeals(session?.user.id);
  const [now, setNow] = useState(() => new Date());
  const [tomorrowMeals, setTomorrowMeals] = useState<typeof dailyMeals>(null);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const entries = dailyMeals?.mealTypes.flatMap((mealType) => mealType.entries) ?? [];
  const calories = entries.reduce((sum, entry) => sum + (entry.calories ?? 0), 0);
  const locale = i18n.resolvedLanguage === "pl" ? "pl-PL" : "en-US";
  const today = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const nextMeal = getNextMeal(dailyMeals?.mealTypes ?? [], now);
  const tomorrowDate = shiftDate(localDateKey(now), 1);
  useEffect(() => {
    if (!nextMeal?.tomorrow) {
      setTomorrowMeals(null);
      return;
    }
    let active = true;
    void fetchDailyMeals(tomorrowDate)
      .then((result) => { if (active) setTomorrowMeals(result); })
      .catch(() => { if (active) setTomorrowMeals(null); });
    return () => { active = false; };
  }, [nextMeal?.tomorrow, tomorrowDate]);
  const displayedNextMeal = nextMeal?.tomorrow
    ? { ...nextMeal, meal: tomorrowMeals?.mealTypes.find((meal) => meal.id === nextMeal.meal.id) ?? nextMeal.meal }
    : nextMeal;

  return (
    <AppScreen>
      <View style={styles.header}>
        <Pressable accessibilityLabel={t("app.goToDashboard")} accessibilityRole="button" onPress={() => router.replace("/")}>
          <Text style={styles.eyebrow}>EATABLE</Text>
        </Pressable>
        <Pressable accessibilityLabel={t("app.openSettings")} accessibilityRole="button" onPress={() => router.push("/settings")} style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(session?.user.name || session?.user.email || "")}</Text>
        </Pressable>
      </View>

      <Text style={styles.date}>{today}</Text>
      <Text style={styles.greeting}>{t("dashboard.greeting")} {session?.user.name?.split(" ")[0] ?? ""}</Text>
      <Text style={styles.subtitle}>{t("dashboard.subtitle")}</Text>

      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>{t("dashboard.todayCalories")}</Text>
        {isLoading ? <ActivityIndicator color={colors.primary} style={styles.spinner} /> : (
          <Text style={styles.calories}>{error ? "—" : calories}<Text style={styles.unit}> kcal</Text></Text>
        )}
        <Text style={styles.summaryHint}>{t("dashboard.caloriesHint")}</Text>
      </View>

      <View style={styles.nextMeal}>
        <Text style={styles.nextMealLabel}>{t("dashboard.nextMeal")}</Text>
        {isLoading || (nextMeal?.tomorrow && !tomorrowMeals) ? <ActivityIndicator color={colors.primary} style={styles.spinner} /> : displayedNextMeal ? (
          <>
            <View style={styles.nextMealRow}>
              <Text style={styles.nextMealName}>{mealNameKey(displayedNextMeal.meal.name) ? t(mealNameKey(displayedNextMeal.meal.name)) : displayedNextMeal.meal.name}</Text>
              <Text style={styles.nextMealTime}>{displayedNextMeal.time}</Text>
            </View>
            {displayedNextMeal.meal.entries.length > 0 ? (
              <View style={styles.nextMealEntries}>
                {displayedNextMeal.meal.entries.map((entry) => (
                  <Text key={entry.id} style={styles.nextMealEntry}>•  {entry.title}{entry.quantity ? ` · ${entry.quantity}` : ""}</Text>
                ))}
              </View>
            ) : <Text style={styles.summaryHint}>{t("dashboard.noMealEntries")}</Text>}
          </>
        ) : <Text style={styles.nextMealName}>—</Text>}
        {displayedNextMeal?.tomorrow ? <Text style={styles.summaryHint}>{t("dashboard.tomorrow")}</Text> : null}
      </View>

      <Pressable accessibilityRole="button" onPress={() => router.push("/meals")} style={({ pressed }) => [styles.mealsButton, pressed && styles.pressed]}>
        <View style={styles.buttonTextWrap}>
          <Text style={styles.buttonTitle}>{t("dashboard.openMeals")}</Text>
          <Text style={styles.buttonSubtitle}>{t("dashboard.mealsSubtitle")}</Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </Pressable>
    </AppScreen>
  );
}

function createStyles(colors: { blue: string; muted: string; orange: string; primary: string; surface: string; surfaceAlt: string; text: string; violet: string }) {
  return StyleSheet.create({
    header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
    eyebrow: { color: colors.blue, fontSize: 12, fontWeight: "700", letterSpacing: 2.5 },
    date: { color: colors.muted, fontSize: 14, marginTop: 24, textTransform: "capitalize" },
    avatar: { alignItems: "center", backgroundColor: colors.surfaceAlt, borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
    avatarText: { color: colors.violet, fontSize: 14, fontWeight: "700" },
    greeting: { color: colors.text, fontSize: 32, fontWeight: "700", letterSpacing: -0.8, marginTop: 42 },
    subtitle: { color: colors.muted, fontSize: 15, marginTop: 7 },
    summary: { backgroundColor: colors.surface, borderColor: colors.surfaceAlt, borderRadius: 22, borderWidth: 1, marginTop: 30, minHeight: 180, padding: 22 },
    summaryLabel: { color: colors.orange, fontSize: 12, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
    calories: { color: colors.text, fontSize: 48, fontWeight: "700", letterSpacing: -1.5, marginTop: 18 },
    unit: { color: colors.muted, fontSize: 19, fontWeight: "600", letterSpacing: 0 },
    summaryHint: { color: colors.muted, fontSize: 13, marginTop: 5 },
    nextMeal: { backgroundColor: colors.surface, borderColor: colors.surfaceAlt, borderRadius: 18, borderWidth: 1, marginTop: 14, padding: 18 },
    nextMealLabel: { color: colors.orange, fontSize: 12, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
    nextMealRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
    nextMealName: { color: colors.text, fontSize: 20, fontWeight: "700", marginTop: 10 },
    nextMealTime: { color: colors.primary, fontSize: 20, fontWeight: "700" },
    nextMealEntries: { gap: 7, marginTop: 12 },
    nextMealEntry: { color: colors.text, fontSize: 14, lineHeight: 20 },
    spinner: { alignSelf: "flex-start", marginTop: 28 },
    mealsButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 18, flexDirection: "row", justifyContent: "space-between", marginTop: 16, minHeight: 82, paddingHorizontal: 20 },
    buttonTextWrap: { gap: 4 },
    buttonTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
    buttonSubtitle: { color: "#FFFFFF", fontSize: 13, opacity: 0.8 },
    arrow: { color: "#FFFFFF", fontSize: 32, fontWeight: "300" },
    pressed: { opacity: 0.82 },
  });
}
