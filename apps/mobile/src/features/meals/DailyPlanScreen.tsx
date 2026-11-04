import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import type { UserProfile } from "@eatable/shared";
import type { ScrollViewInstance } from "react-native";
import { Animated, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppScreen } from "../../components/AppScreen";
import { SkeletonBlock } from "../../components/SkeletonBlock";
import { authClient } from "../../lib/auth-client";
import { getDateStrip, isValidDateKey, localDateKey, shiftDate } from "../../lib/dates";
import { useAppTheme } from "../../providers/AppThemeProvider";
import { MealCard } from "./MealCard";
import { DatePickerModal } from "./DatePickerModal";
import { useDailyMeals } from "./useDailyMeals";
import { fetchUserProfile } from "../../lib/profile-api";
import { MacroProgress } from "../../components/MacroProgress";

const DATE_STRIP_ITEM_WIDTH = 48;
const DATE_STRIP_ITEM_INTERVAL = 56;

export function DailyPlanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string }>();
  const routeDate = isValidDateKey(params.date) ? params.date : undefined;
  const { t, i18n } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { data: session } = authClient.useSession();
  const { date, setDate, dailyMeals, datesWithEntries, isLoading, error } = useDailyMeals(session?.user.id, routeDate);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const dayTransition = useRef(new Animated.Value(1)).current;
  const dayOffset = useRef(new Animated.Value(0)).current;
  const [stripAnchor, setStripAnchor] = useState(date);
  const [dateStripWidth, setDateStripWidth] = useState(0);
  const [todayOffscreenDirection, setTodayOffscreenDirection] = useState<"left" | "right" | null>(null);
  const dateStripItemInterval = dateStripWidth > DATE_STRIP_ITEM_WIDTH
    ? (dateStripWidth - DATE_STRIP_ITEM_WIDTH) / Math.max(1, Math.round((dateStripWidth - DATE_STRIP_ITEM_WIDTH) / DATE_STRIP_ITEM_INTERVAL))
    : DATE_STRIP_ITEM_INTERVAL;
  const dateStripRef = useRef<ScrollViewInstance>(null);
  const locale = i18n.resolvedLanguage === "pl" ? "pl-PL" : "en-US";
  const dateStrip = useMemo(() => getDateStrip(stripAnchor), [stripAnchor]);
  const selectedDayIndex = dateStrip.indexOf(date);
  const today = localDateKey(new Date());
  const todayIndex = dateStrip.indexOf(today);
  const [selectedYear, selectedMonth, selectedDay] = date.split("-").map(Number);
  const selectedDate = new Date(selectedYear, selectedMonth - 1, selectedDay, 12);
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(selectedDate);
  useEffect(() => {
    if (routeDate) setDate(routeDate);
  }, [routeDate, setDate]);
  useEffect(() => {
    if (!session?.user.id) {
      setProfile(null);
      return;
    }
    let active = true;
    void fetchUserProfile().then((value) => { if (active) setProfile(value); }).catch(() => { if (active) setProfile(null); });
    return () => { active = false; };
  }, [session?.user.id]);
  useEffect(() => {
    if (!dateStrip.includes(date)) setStripAnchor(date);
  }, [date, dateStrip]);
  useEffect(() => {
    if (selectedDayIndex >= 0) {
      dateStripRef.current?.scrollTo({ x: selectedDayIndex * dateStripItemInterval, y: 0, animated: true });
    }
  }, [date, dateStrip, dateStripItemInterval, selectedDayIndex]);
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
        <Pressable accessibilityLabel={t("planner.chooseDate")} accessibilityRole="button" onPress={() => setDatePickerOpen(true)} style={styles.monthPicker}>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <Text style={styles.monthChevron}>⌄</Text>
        </Pressable>
      </View>
      <View style={styles.dateStripContainer}>
      <ScrollView
        style={styles.dateStripScroll}
        key={dateStrip[0]}
        ref={dateStripRef}
        contentOffset={{ x: Math.max(0, selectedDayIndex * dateStripItemInterval), y: 0 }}
        contentContainerStyle={[styles.dateStrip, { gap: dateStripItemInterval - DATE_STRIP_ITEM_WIDTH, paddingHorizontal: Math.max(0, (dateStripWidth - DATE_STRIP_ITEM_WIDTH) / 2) }]}
        decelerationRate="fast"
        horizontal
        onLayout={(event) => setDateStripWidth(event.nativeEvent.layout.width)}
        onScroll={(event) => {
          if (todayIndex < 0 || dateStripWidth === 0) return;
          const todayStart = todayIndex * dateStripItemInterval + Math.max(0, (dateStripWidth - DATE_STRIP_ITEM_WIDTH) / 2);
          const scrollX = event.nativeEvent.contentOffset.x;
          setTodayOffscreenDirection(todayStart + DATE_STRIP_ITEM_WIDTH < scrollX ? "left" : todayStart > scrollX + dateStripWidth ? "right" : null);
        }}
        scrollEventThrottle={100}
        snapToAlignment="start"
        snapToInterval={dateStripItemInterval}
        showsHorizontalScrollIndicator={false}
      >
        {dateStrip.map((dayKey) => {
          const [year, month, day] = dayKey.split("-").map(Number);
          const stripDate = new Date(year, month - 1, day, 12);
          const isSelected = dayKey === date;
          const isToday = dayKey === today;
          const hasEntries = datesWithEntries.has(dayKey);
          const weekday = new Intl.DateTimeFormat(locale, { weekday: "short" }).format(stripDate).replace(/\.$/, "");
          const accessibilityDate = new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(stripDate);
          return (
            <Pressable
              key={dayKey}
              accessibilityLabel={accessibilityDate}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => setDate(dayKey)}
              style={[styles.dateButton, isSelected && styles.selectedDateButton]}
            >
              <Text style={[styles.weekdayText, isToday && styles.todayDateText, isSelected && styles.selectedDateText]}>{weekday}</Text>
              <Text style={[styles.dayNumberText, isToday && styles.todayDateText, isSelected && styles.selectedDateText]}>{day}</Text>
              {hasEntries ? <View style={[styles.entryDot, isSelected && styles.selectedEntryDot]} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
      {todayOffscreenDirection ? (
        <View style={[styles.todayJumpOverlay, todayOffscreenDirection === "left" ? styles.todayJumpLeft : styles.todayJumpRight]}>
          <View pointerEvents="none" style={[styles.todayFadeBand, styles.todayFadeBandWide, todayOffscreenDirection === "right" && styles.todayFadeBandRight]} />
          <View pointerEvents="none" style={[styles.todayFadeBand, styles.todayFadeBandMedium, todayOffscreenDirection === "right" && styles.todayFadeBandRight]} />
          <View pointerEvents="none" style={[styles.todayFadeBand, styles.todayFadeBandNarrow, todayOffscreenDirection === "right" && styles.todayFadeBandRight]} />
          <Pressable
            accessibilityLabel={t("planner.goToToday")}
            accessibilityRole="button"
            onPress={() => {
              if (todayIndex >= 0) {
                dateStripRef.current?.scrollTo({ x: todayIndex * dateStripItemInterval, y: 0, animated: true });
              }
              setDate(today);
            }}
            style={styles.todayJumpButton}
          >
            <Text style={styles.todayJumpArrow}>{todayOffscreenDirection === "left" ? "‹" : "›"}</Text>
          </Pressable>
        </View>
      ) : null}
      </View>

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
    <DatePickerModal
      visible={datePickerOpen}
      date={date}
      locale={locale}
      onClose={() => setDatePickerOpen(false)}
      onSelect={(selectedDate) => {
        setDate(selectedDate);
        setDatePickerOpen(false);
      }}
    />
    </>
  );
}

function DailyNutritionSummary({ mealTypes, profile, styles, t, colors }: { mealTypes: NonNullable<ReturnType<typeof useDailyMeals>["dailyMeals"]>["mealTypes"]; profile: UserProfile | null; styles: ReturnType<typeof createStyles>; t: (key: string) => string; colors: { blue: string; orange: string; pink: string } }) {
  const entries = mealTypes.flatMap((mealType) => mealType.entries);
  const total = (key: "calories" | "protein" | "carbohydrates" | "fat") => entries.reduce((sum, entry) => sum + (entry[key] ?? 0), 0);
  return (
    <View style={styles.summary}>
      <Text style={styles.summaryTitle}>{t("planner.dayTotal")}</Text>
      <Text style={styles.summaryCalories}>{total("calories")} kcal</Text>
      <Text style={styles.summaryMacros}>{t("planner.proteinShort")} {total("protein")} g  ·  {t("planner.carbohydratesShort")} {total("carbohydrates")} g  ·  {t("planner.fatShort")} {total("fat")} g</Text>
      {profile ? <MacroProgress diameter={58} items={[
        { key: "protein", label: t("planner.proteinShort"), consumed: total("protein"), target: profile.dailyProteinLimit, color: colors.blue },
        { key: "fat", label: t("planner.fatShort"), consumed: total("fat"), target: profile.dailyFatLimit, color: colors.pink },
        { key: "carbohydrates", label: t("planner.carbohydratesShort"), consumed: total("carbohydrates"), target: profile.dailyCarbohydratesLimit, color: colors.orange },
      ]} /> : null}
    </View>
  );
}

function createStyles(colors: { background: string; border: string; blue: string; danger: string; muted: string; orange: string; pink: string; primary: string; primaryText: string; surface: string; surfaceAlt: string; text: string }) {
  return StyleSheet.create({
    header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: -8, minHeight: 36 },
    backButton: { alignItems: "flex-start", justifyContent: "center", minHeight: 26, paddingRight: 8 },
    backText: { color: colors.primary, fontSize: 14, fontWeight: "600" },
    monthPicker: { alignItems: "center", flexDirection: "row", gap: 5, minHeight: 36, paddingHorizontal: 4 },
    monthLabel: { color: colors.muted, fontSize: 13, fontWeight: "600", textTransform: "capitalize" },
    monthChevron: { color: colors.primary, fontSize: 18, includeFontPadding: false, lineHeight: 18, textAlignVertical: "center" },
    dateStripScroll: { marginHorizontal: -16, marginVertical: 8 },
    dateStripContainer: { position: "relative" },
    todayJumpOverlay: { height: 70, position: "absolute", top: 4, width: 54, zIndex: 4 },
    todayJumpLeft: { left: -16 },
    todayJumpRight: { right: -16 },
    todayFadeBand: { backgroundColor: colors.background, bottom: 0, left: 0, position: "absolute", top: 0 },
    todayFadeBandRight: { left: undefined, right: 0 },
    todayFadeBandWide: { opacity: 0.25, width: 54 },
    todayFadeBandMedium: { opacity: 0.35, width: 38 },
    todayFadeBandNarrow: { opacity: 0.4, width: 22 },
    todayJumpButton: { alignItems: "center", height: 70, justifyContent: "center", width: 54 },
    todayJumpArrow: { color: colors.primary, fontSize: 25, lineHeight: 28, marginTop: -3 },
    dateStrip: { gap: 8, paddingVertical: 4 },
    dateButton: { alignItems: "center", borderRadius: 16, height: 62, marginRight: 0, position: "relative", width: 48 },
    selectedDateButton: { backgroundColor: colors.blue },
    weekdayText: { color: colors.muted, fontSize: 11, fontWeight: "600", position: "absolute", textAlign: "center", textTransform: "uppercase", top: 12, width: "100%" },
    dayNumberText: { color: colors.text, fontSize: 16, fontWeight: "700", position: "absolute", textAlign: "center", top: 30, width: "100%" },
    entryDot: { backgroundColor: colors.blue, borderRadius: 3, bottom: 7, height: 6, position: "absolute", width: 6 },
    selectedEntryDot: { backgroundColor: "#FFFFFF" },
    selectedDateText: { color: colors.primaryText },
    todayDateText: { color: colors.orange },
    skeletonList: { gap: 10, marginTop: 18 },
    skeletonMeal: { borderBottomColor: colors.surfaceAlt, borderBottomWidth: 1, gap: 10, paddingHorizontal: 4, paddingVertical: 14 },
    muted: { color: colors.muted, fontSize: 14 },
    error: { color: colors.danger, fontSize: 13, lineHeight: 19, marginTop: 20 },
    mealList: { gap: 10, marginTop: 18 },
    summary: { backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderRadius: 16, borderWidth: 1, marginTop: 22, padding: 16 },
    summaryTitle: { color: colors.muted, fontSize: 11, fontWeight: "600", letterSpacing: 0.6, textTransform: "uppercase" },
    summaryCalories: { color: colors.text, fontSize: 20, fontWeight: "600", marginTop: 4 },
    summaryMacros: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 5 },
  });
}
