import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import type { UserProfile } from "@eatable/shared";
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import { AppScreen } from "../../components/AppScreen";
import { SkeletonBlock } from "../../components/SkeletonBlock";
import { authClient } from "../../lib/auth-client";
import { isValidDateKey, shiftDate } from "../../lib/dates";
import { useAppTheme } from "../../providers/AppThemeProvider";
import { MealCard } from "./MealCard";
import { useDailyMeals } from "./useDailyMeals";
import { fetchUserProfile } from "../../lib/profile-api";
import { MacroProgress } from "../../components/MacroProgress";
import { DateStrip } from "./DateStrip";
import { useFocusEffect } from "expo-router";

export function DailyPlanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string }>();
  const routeDate = isValidDateKey(params.date) ? params.date : undefined;
  const { t, i18n } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { data: session } = authClient.useSession();
  const { date, setDate, dailyMeals, datesWithEntries, caloriesByDate, isLoading, error, refresh } = useDailyMeals(session?.user.id, routeDate);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const dayTransition = useRef(new Animated.Value(1)).current;
  const dayOffset = useRef(new Animated.Value(0)).current;
  const [stripAnchor, setStripAnchor] = useState(date);
  const hasFocusedOnce = useRef(false);
  const locale = i18n.resolvedLanguage === "pl" ? "pl-PL" : "en-US";
  useEffect(() => {
    if (routeDate) setDate(routeDate);
  }, [routeDate, setDate]);
  useFocusEffect(useCallback(() => {
    if (hasFocusedOnce.current) refresh();
    else hasFocusedOnce.current = true;
  }, [refresh]));
  useEffect(() => {
    if (!session?.user.id) {
      setProfile(null);
      return;
    }
    let active = true;
    void fetchUserProfile().then((value) => { if (active) setProfile(value); }).catch(() => { if (active) setProfile(null); });
    return () => { active = false; };
  }, [session?.user.id]);
  const changeDay = useCallback((offset: number) => {
    Animated.parallel([
      Animated.timing(dayTransition, { toValue: 0, duration: 110, useNativeDriver: true }),
      Animated.timing(dayOffset, { toValue: offset > 0 ? -12 : 12, duration: 110, useNativeDriver: true }),
    ]).start(() => {
      setDate((current) => shiftDate(current, offset));
      dayOffset.setValue(offset > 0 ? 12 : -12);
      Animated.parallel([
        Animated.spring(dayTransition, { toValue: 1, damping: 18, stiffness: 190, useNativeDriver: true }),
        Animated.spring(dayOffset, { toValue: 0, damping: 18, stiffness: 190, useNativeDriver: true }),
      ]).start();
    });
  }, [dayOffset, dayTransition, setDate]);
  const daySwipeResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 24 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2,
    onPanResponderRelease: (_, gesture) => {
      if (Math.abs(gesture.dx) < 56 || Math.abs(gesture.dx) < Math.abs(gesture.dy) * 1.2) return;
      changeDay(gesture.dx < 0 ? 1 : -1);
    },
  }), [changeDay]);


  return (
    <>
    <AppScreen>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel={t("app.goToDashboard")}
          accessibilityRole="button"
          onPress={() => router.replace("/")}
          style={styles.backButton}
        >
          <Text style={styles.backText}>{t("app.back")}</Text>
        </Pressable>
      </View>
      <DateStrip anchor={stripAnchor} date={date} datesWithEntries={datesWithEntries} caloriesByDate={caloriesByDate} dailyCalorieLimit={profile?.dailyCalorieLimit} locale={locale} onAnchorChange={setStripAnchor} onDateChange={setDate} />

      <View {...daySwipeResponder.panHandlers}>
      <Animated.View style={{ opacity: dayTransition, transform: [{ translateX: dayOffset }] }}>
      {isLoading ? (
        <View style={styles.skeletonList}>
          {[0, 1, 2, 3].map((item) => <View key={item} style={styles.skeletonMeal}>
            <SkeletonBlock width="42%" height={17} color={colors.surfaceAlt} />
            <SkeletonBlock width="30%" height={14} color={colors.surfaceAlt} />
            <SkeletonBlock width="74%" height={12} color={colors.surfaceAlt} />
          </View>)}
        </View>
      ) : error ? (
        <Text accessibilityRole="alert" style={styles.error}>{t(error)}</Text>
      ) : (
        <>
        {dailyMeals ? <DailyNutritionSummary mealTypes={dailyMeals.mealTypes} profile={profile} styles={styles} t={t} colors={colors} /> : null}
        <View style={styles.mealList}>
          {dailyMeals?.mealTypes.map((mealType) => (
            <MealCard
              key={mealType.id}
              mealType={mealType}
              onPress={() => router.push({ pathname: "/meal/[mealTypeId]", params: { mealTypeId: mealType.id, date } })}
            />
          ))}
        </View>
        </>
      )}
      </Animated.View>
      </View>
    </AppScreen>
    </>
  );
}

function DailyNutritionSummary({ mealTypes, profile, styles, t, colors }: { mealTypes: NonNullable<ReturnType<typeof useDailyMeals>["dailyMeals"]>["mealTypes"]; profile: UserProfile | null; styles: ReturnType<typeof createStyles>; t: (key: string) => string; colors: { blue: string; danger: string; orange: string; pink: string; success: string } }) {
  const entries = mealTypes.flatMap((mealType) => mealType.entries);
  const total = (key: "calories" | "protein" | "carbohydrates" | "fat") => entries.reduce((sum, entry) => sum + (entry[key] ?? 0), 0);
  return (
    <View style={styles.summary}>
      <Text style={styles.summaryTitle}>{t("planner.dayTotal")}</Text>
      <Text style={[styles.summaryCalories, profile && total("calories") > profile.dailyCalorieLimit ? styles.caloriesOverLimit : profile && total("calories") < profile.dailyCalorieLimit ? styles.caloriesUnderLimit : null]}>
        {total("calories")}{profile ? <Text style={styles.calorieLimit}> / {profile.dailyCalorieLimit} kcal</Text> : <Text style={styles.calorieLimit}> kcal</Text>}
      </Text>
      {profile ? <MacroProgress size="compact" items={[
        { key: "protein", label: t("planner.proteinShort"), consumed: total("protein"), target: profile.dailyProteinLimit, color: colors.blue },
        { key: "fat", label: t("planner.fatShort"), consumed: total("fat"), target: profile.dailyFatLimit, color: colors.pink },
        { key: "carbohydrates", label: t("planner.carbohydratesShort"), consumed: total("carbohydrates"), target: profile.dailyCarbohydratesLimit, color: colors.orange },
      ]} /> : null}
    </View>
  );
}

function createStyles(colors: { background: string; border: string; blue: string; danger: string; muted: string; orange: string; pink: string; primary: string; primaryText: string; success: string; surface: string; surfaceAlt: string; text: string }) {
  return StyleSheet.create({
    header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: -8, minHeight: 36 },
    backButton: { alignItems: "flex-start", justifyContent: "center", minHeight: 26, paddingRight: 8 },
    backText: { color: colors.primary, fontSize: 14, fontWeight: "600" },
    skeletonList: { gap: 10, marginTop: 18 },
    skeletonMeal: { borderBottomColor: colors.surfaceAlt, borderBottomWidth: 1, gap: 10, paddingHorizontal: 4, paddingVertical: 14 },
    muted: { color: colors.muted, fontSize: 14 },
    error: { color: colors.danger, fontSize: 13, lineHeight: 19, marginTop: 20 },
    mealList: { gap: 10, marginTop: 18 },
    summary: { backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderRadius: 16, borderWidth: 1, marginTop: 22, padding: 16 },
    summaryTitle: { color: colors.muted, fontSize: 11, fontWeight: "600", letterSpacing: 0.6, textTransform: "uppercase" },
    summaryCalories: { color: colors.text, fontSize: 20, fontWeight: "600", marginTop: 4 },
    calorieLimit: { color: colors.muted, fontSize: 16, fontWeight: "600" },
    caloriesUnderLimit: { color: colors.success },
    caloriesOverLimit: { color: colors.danger },
  });
}
