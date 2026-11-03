import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppScreen } from "../../components/AppScreen";
import { BrandLogo } from "../../components/BrandLogo";
import { SkeletonBlock } from "../../components/SkeletonBlock";
import { authClient } from "../../lib/auth-client";
import { localDateKey, shiftDate } from "../../lib/dates";
import { getInitials } from "../../lib/initials";
import { fetchDailyMeals } from "../../lib/meals-api";
import { useAppTheme } from "../../providers/AppThemeProvider";
import { useDailyMeals } from "../meals/useDailyMeals";
import { getNextMeal } from "../meals/meal-schedule";
import { mealNameKey } from "../../lib/meal-name";
import { beginGlobalLoading } from "../../lib/global-loading";

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
    const finishLoading = beginGlobalLoading();
    void fetchDailyMeals(tomorrowDate)
      .then((result) => { if (active) setTomorrowMeals(result); })
      .catch(() => { if (active) setTomorrowMeals(null); })
      .finally(finishLoading);
    return () => { active = false; };
  }, [nextMeal?.tomorrow, tomorrowDate]);
  const displayedNextMeal = nextMeal?.tomorrow
    ? { ...nextMeal, meal: tomorrowMeals?.mealTypes.find((meal) => meal.id === nextMeal.meal.id) ?? nextMeal.meal }
    : nextMeal;

  return (
    <AppScreen>
      <View style={styles.header}>
        <BrandLogo accessibilityLabel={t("app.goToDashboard")} onPress={() => router.replace("/")} />
        <Pressable accessibilityLabel={t("app.openSettings")} accessibilityRole="button" onPress={() => router.push("/settings")} style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(session?.user.name || session?.user.email || "")}</Text>
        </Pressable>
      </View>

      <Text style={styles.date}>{today}</Text>
      <Text style={styles.greeting}>{t("dashboard.greeting")} {session?.user.name?.split(" ")[0] ?? ""}</Text>
      <Text style={styles.subtitle}>{t("dashboard.subtitle")}</Text>

      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>{t("dashboard.todayCalories")}</Text>
        {isLoading ? <View style={styles.summarySkeleton}><SkeletonBlock width="48%" height={40} color={colors.surfaceAlt} /><SkeletonBlock width="72%" height={13} color={colors.surfaceAlt} /></View> : (
          <Text style={styles.calories}>{error ? "—" : calories}<Text style={styles.unit}> kcal</Text></Text>
        )}
        <Text style={styles.summaryHint}>{t("dashboard.caloriesHint")}</Text>
      </View>

      <Pressable
        accessibilityLabel={t("dashboard.openNextMeal")}
        accessibilityRole="button"
        disabled={!nextMeal}
        onPress={() => router.push({
          pathname: "/meals",
          params: { date: nextMeal?.tomorrow ? tomorrowDate : localDateKey(now) },
        })}
        style={({ pressed }) => [styles.nextMeal, pressed && styles.pressed]}
      >
        <Text style={styles.nextMealLabel}>{t("dashboard.nextMeal")}</Text>
        {isLoading || (nextMeal?.tomorrow && !tomorrowMeals) ? <View style={styles.nextMealSkeleton}><SkeletonBlock width="65%" height={18} color={colors.surfaceAlt} /><SkeletonBlock width="90%" height={12} color={colors.surfaceAlt} /></View> : displayedNextMeal ? (
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
      </Pressable>

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
    nextMeal: { backgroundColor: colors.surface, borderColor: colors.surfaceAlt, borderRadius: 14, borderWidth: 1, marginTop: 12, padding: 12 },
    nextMealLabel: { color: colors.orange, fontSize: 12, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
    nextMealRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
    nextMealName: { color: colors.text, fontSize: 16, fontWeight: "700", marginTop: 6 },
    nextMealTime: { color: colors.primary, fontSize: 16, fontWeight: "700" },
    nextMealEntries: { gap: 5, marginTop: 8 },
    nextMealEntry: { color: colors.text, fontSize: 12, lineHeight: 17 },
    summarySkeleton: { gap: 16, marginTop: 18 },
    nextMealSkeleton: { gap: 12, marginTop: 12 },
    mealsButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 18, flexDirection: "row", justifyContent: "space-between", marginTop: 16, minHeight: 82, paddingHorizontal: 20 },
    buttonTextWrap: { gap: 4 },
    buttonTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
    buttonSubtitle: { color: "#FFFFFF", fontSize: 13, opacity: 0.8 },
    arrow: { color: "#FFFFFF", fontSize: 32, fontWeight: "300" },
    pressed: { opacity: 0.82 },
  });
}
