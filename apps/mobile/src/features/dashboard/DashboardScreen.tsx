import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AppScreen } from "../../components/AppScreen";
import { SkeletonBlock } from "../../components/SkeletonBlock";
import { authClient } from "../../lib/authClient";
import { localDateKey, shiftDate } from "../../lib/dates";
import { getInitials } from "../../lib/initials";
import { useAppTheme } from "../../providers/AppThemeProvider";
import { useDailyMeals } from "../meals/useDailyMeals";
import { getNextMeal } from "../meals/mealSchedule";
import { mealNameKey } from "../../lib/mealName";
import { MacroProgress } from "../../components/MacroProgress";
import { useDashboardProfile } from "./useDashboardProfile";
import { useTomorrowMeals } from "./useTomorrowMeals";

export function DashboardScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { data: session } = authClient.useSession();
  const { dailyMeals, isLoading, error } = useDailyMeals(session?.user.id);
  const [now, setNow] = useState(() => new Date());
  const profile = useDashboardProfile(session?.user.id);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const entries = dailyMeals?.mealTypes.flatMap((mealType) => mealType.entries) ?? [];
  const calories = entries.reduce((sum, entry) => sum + (entry.calories ?? 0), 0);
  const protein = entries.reduce((sum, entry) => sum + (entry.protein ?? 0), 0);
  const carbohydrates = entries.reduce((sum, entry) => sum + (entry.carbohydrates ?? 0), 0);
  const fat = entries.reduce((sum, entry) => sum + (entry.fat ?? 0), 0);
  const locale = i18n.resolvedLanguage === "pl" ? "pl-PL" : "en-US";
  const today = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const nextMeal = getNextMeal(dailyMeals?.mealTypes ?? [], now);
  const tomorrowDate = shiftDate(localDateKey(now), 1);
  const tomorrowMeals = useTomorrowMeals(tomorrowDate, Boolean(nextMeal?.tomorrow));
  const displayedNextMeal = nextMeal?.tomorrow
    ? { ...nextMeal, meal: tomorrowMeals?.mealTypes.find((meal) => meal.id === nextMeal.meal.id) ?? nextMeal.meal }
    : nextMeal;

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.date}>{today}</Text>
        <Pressable accessibilityLabel={t("app.openSettings")} accessibilityRole="button" onPress={() => router.push("/settings")} style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(session?.user.name || session?.user.email || "")}</Text>
        </Pressable>
      </View>

      <Text style={styles.greeting}>{t("dashboard.greeting")} 👋 {session?.user.name?.split(" ")[0] ?? ""}</Text>
      <Text style={styles.subtitle}>{t("dashboard.subtitle")}</Text>

      <View style={styles.summary}>
        <View style={styles.widgetHeading}>
          <Text style={styles.widgetEmoji}>🔥</Text>
          <Text style={styles.summaryLabel}>{t("dashboard.todayCalories")}</Text>
        </View>
        {isLoading ? <View style={styles.summarySkeleton}><SkeletonBlock width="48%" height={40} color={colors.surfaceAlt} /><SkeletonBlock width="72%" height={13} color={colors.surfaceAlt} /></View> : (
          <Text style={[
            styles.calories,
            profile !== null && calories > profile.dailyCalorieLimit
              ? styles.caloriesOverLimit
              : profile !== null && calories < profile.dailyCalorieLimit
                ? styles.caloriesUnderLimit
                : null,
          ]}>
            {error ? "—" : calories}
            {profile !== null ? <Text style={styles.unit}> / {profile.dailyCalorieLimit} kcal</Text> : <Text style={styles.unit}> kcal</Text>}
          </Text>
        )}
        <Text style={styles.summaryHint}>{t("dashboard.caloriesHint")}</Text>
        {!isLoading && !error && profile ? (
          <MacroProgress items={[
            { key: "protein", label: t("planner.proteinShort"), consumed: protein, target: profile.dailyProteinLimit, color: colors.blue },
            { key: "fat", label: t("planner.fatShort"), consumed: fat, target: profile.dailyFatLimit, color: colors.pink },
            { key: "carbohydrates", label: t("planner.carbohydratesShort"), consumed: carbohydrates, target: profile.dailyCarbohydratesLimit, color: colors.orange },
          ]} />
        ) : null}
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
        <View style={styles.widgetHeading}>
          <Text style={styles.widgetEmoji}>🍽️</Text>
          <Text style={styles.nextMealLabel}>{t("dashboard.nextMeal")}</Text>
        </View>
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

      <View style={styles.tilesRow}>
        <Pressable accessibilityRole="button" onPress={() => router.push("/meals")} style={({ pressed }) => [styles.tile, styles.mealsTile, pressed && styles.pressed]}>
          <LinearGradient
            colors={[colors.primary, colors.primary]}
            end={{ x: 0.5, y: 1 }}
            pointerEvents="none"
            start={{ x: 0.5, y: 0 }}
            style={styles.tileGradient}
          />
          <Text style={styles.tileEmoji}>📅</Text>
          <Text style={[styles.tileTitle, styles.mealsTileTitle]}>{t("dashboard.openMeals")}</Text>
          <Text style={[styles.tileSubtitle, styles.mealsTileSubtitle]}>{t("dashboard.mealsSubtitle")}</Text>
        </Pressable>
        <View accessibilityRole="text" style={[styles.tile, styles.comingSoonTile]}>
          <Text style={styles.tileEmoji}>📖</Text>
          <Text style={styles.tileTitle}>{t("dashboard.recipes")}</Text>
          <Text style={styles.tileSubtitle}>{t("dashboard.recipesComingSoon")}</Text>
        </View>
      </View>

    </AppScreen>
  );
}

function createStyles(colors: { border: string; blue: string; danger: string; muted: string; orange: string; pink: string; primary: string; primaryText: string; success: string; surfaceAlt: string; text: string; violet: string }) {
  return StyleSheet.create({
    header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
    date: { color: colors.muted, fontSize: 14, textTransform: "capitalize" },
    avatar: { alignItems: "center", backgroundColor: colors.surfaceAlt, borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
    avatarText: { color: colors.violet, fontSize: 14, fontWeight: "700" },
    greeting: { color: colors.text, fontSize: 32, fontWeight: "700", letterSpacing: -0.8, marginTop: 42 },
    subtitle: { color: colors.muted, fontSize: 15, marginTop: 7 },
    summary: { backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderRadius: 22, borderWidth: 1, marginTop: 30, minHeight: 180, padding: 22 },
    widgetHeading: { alignItems: "center", flexDirection: "row", gap: 8 },
    widgetEmoji: { fontSize: 17 },
    summaryLabel: { color: colors.orange, fontSize: 12, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
    calories: { color: colors.text, fontSize: 48, fontWeight: "700", letterSpacing: -1.5, marginTop: 18 },
    caloriesUnderLimit: { color: colors.success },
    caloriesOverLimit: { color: colors.danger },
    unit: { color: colors.muted, fontSize: 19, fontWeight: "600", letterSpacing: 0 },
    summaryHint: { color: colors.muted, fontSize: 13, marginTop: 5 },
    nextMeal: { backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderRadius: 14, borderWidth: 1, marginTop: 12, padding: 12 },
    nextMealLabel: { color: colors.orange, fontSize: 12, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
    nextMealRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
    nextMealName: { color: colors.text, fontSize: 16, fontWeight: "700", marginTop: 6 },
    nextMealTime: { color: colors.primary, fontSize: 16, fontWeight: "700" },
    nextMealEntries: { gap: 5, marginTop: 8 },
    nextMealEntry: { color: colors.text, fontSize: 12, lineHeight: 17 },
    summarySkeleton: { gap: 16, marginTop: 18 },
    nextMealSkeleton: { gap: 12, marginTop: 12 },
    recipesCard: { alignItems: "center", backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 14, marginTop: 12, minHeight: 82, paddingHorizontal: 18 },
    recipesEmoji: { fontSize: 25 },
    recipesTextWrap: { gap: 4 },
    recipesTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
    recipesSubtitle: { color: colors.muted, fontSize: 13 },
    tilesRow: { flexDirection: "row", gap: 12, marginTop: 12 },
    tile: { alignItems: "flex-start", backgroundColor: "transparent", borderColor: colors.border, borderRadius: 14, borderWidth: 1, flex: 1, gap: 7, justifyContent: "center", minHeight: 112, overflow: "hidden", padding: 14 },
    mealsTile: { borderColor: colors.primary },
    mealsTileTitle: { color: colors.primaryText },
    mealsTileSubtitle: { color: colors.primaryText, opacity: 0.8 },
    tileGradient: { ...StyleSheet.absoluteFill, borderRadius: 14 },
    comingSoonTile: { backgroundColor: colors.surfaceAlt, opacity: 0.58 },
    tileEmoji: { fontSize: 23 },
    tileTitle: { color: colors.text, fontSize: 14, fontWeight: "700" },
    tileSubtitle: { color: colors.muted, fontSize: 12 },
    pressed: { opacity: 0.82 },
  });
}
