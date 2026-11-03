import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import type { MealEntry } from "@eatable/shared";
import type { ScrollViewInstance } from "react-native";
import { Animated, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppScreen } from "../../components/AppScreen";
import { SkeletonBlock } from "../../components/SkeletonBlock";
import { authClient } from "../../lib/auth-client";
import { getDateStrip, isValidDateKey, localDateKey, shiftDate } from "../../lib/dates";
import { useAppTheme } from "../../providers/AppThemeProvider";
import { MealCard } from "./MealCard";
import { AddMealEntryModal } from "./AddMealEntryModal";
import { DatePickerModal } from "./DatePickerModal";
import { useDailyMeals } from "./useDailyMeals";

const ADD_EMOJIS = ["🍎", "🍉", "🍌", "🥑", "🍔", "🍕", "🧀", "🥗", "🍖", "🍹"];
const DATE_STRIP_ITEM_INTERVAL = 56;

export function DailyPlanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string }>();
  const routeDate = isValidDateKey(params.date) ? params.date : undefined;
  const { t, i18n } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { data: session } = authClient.useSession();
  const { date, setDate, dailyMeals, isLoading, error, addEntry, editEntry, removeEntry } = useDailyMeals(session?.user.id, routeDate);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<{ mealTypeId: string; entry: MealEntry } | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [emojiIndex, setEmojiIndex] = useState(0);
  const emojiOpacity = useRef(new Animated.Value(1)).current;
  const dayTransition = useRef(new Animated.Value(1)).current;
  const dayOffset = useRef(new Animated.Value(0)).current;
  const [stripAnchor, setStripAnchor] = useState(date);
  const [dateStripWidth, setDateStripWidth] = useState(0);
  const dateStripRef = useRef<ScrollViewInstance>(null);
  const locale = i18n.resolvedLanguage === "pl" ? "pl-PL" : "en-US";
  const dateStrip = useMemo(() => getDateStrip(stripAnchor), [stripAnchor]);
  const selectedDayIndex = dateStrip.indexOf(date);
  const today = localDateKey(new Date());
  const [selectedYear, selectedMonth, selectedDay] = date.split("-").map(Number);
  const selectedDate = new Date(selectedYear, selectedMonth - 1, selectedDay, 12);
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(selectedDate);
  useEffect(() => {
    if (routeDate) setDate(routeDate);
  }, [routeDate, setDate]);
  useEffect(() => {
    if (!dateStrip.includes(date)) setStripAnchor(date);
  }, [date, dateStrip]);
  useEffect(() => {
    if (selectedDayIndex >= 0) {
      dateStripRef.current?.scrollTo({ x: selectedDayIndex * DATE_STRIP_ITEM_INTERVAL, y: 0, animated: true });
    }
  }, [date, dateStrip, selectedDayIndex]);
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

  useEffect(() => {
    const timer = setInterval(() => {
      Animated.sequence([
        Animated.timing(emojiOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(emojiOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
      ]).start();
      setEmojiIndex((current) => (current + 1) % ADD_EMOJIS.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [emojiOpacity]);

  return (
    <>
    <AppScreen footer={(
      <Pressable
        accessibilityLabel={t("planner.addEntry")}
        accessibilityRole="button"
        disabled={!dailyMeals || Boolean(error)}
        onPress={() => {
          setEditingEntry(null);
          setAddModalOpen(true);
        }}
        style={({ pressed }) => [styles.addButton, (!dailyMeals || Boolean(error)) && styles.disabledButton, pressed && styles.pressed]}
      >
        <Text style={styles.addButtonText}>{t("planner.addEntryShort")}</Text>
        <Animated.Text style={[styles.addButtonEmoji, { opacity: emojiOpacity, transform: [{ scale: emojiOpacity.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] }) }] }]}>
          {ADD_EMOJIS[emojiIndex]}
        </Animated.Text>
      </Pressable>
    )}>
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

      <View style={styles.dateStripHeader}>
        <Pressable accessibilityLabel={t("planner.chooseDate")} accessibilityRole="button" onPress={() => setDatePickerOpen(true)} style={styles.monthPicker}>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <Text style={styles.monthChevron}>⌄</Text>
        </Pressable>
      </View>
      <ScrollView
        key={dateStrip[0]}
        ref={dateStripRef}
        contentOffset={{ x: Math.max(0, selectedDayIndex * DATE_STRIP_ITEM_INTERVAL), y: 0 }}
        contentContainerStyle={[styles.dateStrip, { paddingHorizontal: Math.max(0, (dateStripWidth - 48) / 2) }]}
        decelerationRate="fast"
        horizontal
        onLayout={(event) => setDateStripWidth(event.nativeEvent.layout.width)}
        snapToAlignment="start"
        snapToInterval={DATE_STRIP_ITEM_INTERVAL}
        showsHorizontalScrollIndicator={false}
      >
        {dateStrip.map((dayKey) => {
          const [year, month, day] = dayKey.split("-").map(Number);
          const stripDate = new Date(year, month - 1, day, 12);
          const isSelected = dayKey === date;
          const isToday = dayKey === today;
          const weekday = new Intl.DateTimeFormat(locale, { weekday: "short" }).format(stripDate).replace(/\.$/, "");
          const accessibilityDate = new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(stripDate);
          return (
            <Pressable
              key={dayKey}
              accessibilityLabel={accessibilityDate}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => setDate(dayKey)}
              style={[styles.dateButton, isSelected && styles.selectedDateButton, isToday && !isSelected && styles.todayDateButton]}
            >
              <Text style={[styles.weekdayText, isSelected && styles.selectedDateText, isToday && !isSelected && styles.todayDateText]}>{weekday}</Text>
              <Text style={[styles.dayNumberText, isSelected && styles.selectedDateText, isToday && !isSelected && styles.todayDateText]}>{day}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

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
        <View style={styles.mealList}>
          {dailyMeals?.mealTypes.map((mealType) => (
            <MealCard
              key={mealType.id}
              mealType={mealType}
              onEditEntry={(entry) => {
                setEditingEntry({ mealTypeId: mealType.id, entry });
                setAddModalOpen(true);
              }}
            />
          ))}
        </View>
        {dailyMeals ? <DailyNutritionSummary mealTypes={dailyMeals.mealTypes} styles={styles} t={t} /> : null}
        </>
      )}
      </Animated.View>
      </View>
    </AppScreen>
    <AddMealEntryModal
      visible={addModalOpen}
      date={date}
      locale={locale}
      mealTypes={dailyMeals?.mealTypes ?? []}
      editingEntry={editingEntry}
      onClose={() => setAddModalOpen(false)}
      onSave={addEntry}
      onUpdate={editEntry}
      onDelete={removeEntry}
    />
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

function DailyNutritionSummary({ mealTypes, styles, t }: { mealTypes: NonNullable<ReturnType<typeof useDailyMeals>["dailyMeals"]>["mealTypes"]; styles: ReturnType<typeof createStyles>; t: (key: string) => string }) {
  const entries = mealTypes.flatMap((mealType) => mealType.entries);
  const total = (key: "calories" | "protein" | "carbohydrates" | "fat") => entries.reduce((sum, entry) => sum + (entry[key] ?? 0), 0);
  return (
    <View style={styles.summary}>
      <Text style={styles.summaryTitle}>{t("planner.dayTotal")}</Text>
      <Text style={styles.summaryCalories}>{total("calories")} kcal</Text>
      <Text style={styles.summaryMacros}>{t("planner.proteinShort")} {total("protein")} g  ·  {t("planner.carbohydratesShort")} {total("carbohydrates")} g  ·  {t("planner.fatShort")} {total("fat")} g</Text>
    </View>
  );
}

function createStyles(colors: { background: string; blue: string; danger: string; muted: string; orange: string; primary: string; primaryText: string; surface: string; surfaceAlt: string; text: string }) {
  return StyleSheet.create({
    header: { alignItems: "center", flexDirection: "row", justifyContent: "flex-start" },
    backButton: { alignItems: "flex-start", justifyContent: "center", minHeight: 44, paddingRight: 12 },
    backText: { color: colors.primary, fontSize: 15, fontWeight: "600" },
    dateStripHeader: { alignItems: "center", flexDirection: "row", justifyContent: "flex-end", marginTop: 16 },
    monthPicker: { alignItems: "center", flexDirection: "row", gap: 5, minHeight: 36, paddingHorizontal: 4 },
    monthLabel: { color: colors.muted, fontSize: 13, fontWeight: "600", textTransform: "capitalize" },
    monthChevron: { color: colors.primary, fontSize: 18, lineHeight: 22 },
    dateStrip: { gap: 8, paddingVertical: 4 },
    dateButton: { alignItems: "center", backgroundColor: "transparent", borderRadius: 13, height: 62, justifyContent: "center", marginRight: 0, width: 48 },
    selectedDateButton: { backgroundColor: colors.primary },
    todayDateButton: { backgroundColor: colors.orange },
    weekdayText: { color: colors.muted, fontSize: 11, fontWeight: "600", textTransform: "uppercase" },
    dayNumberText: { color: colors.text, fontSize: 16, fontWeight: "700", marginTop: 4 },
    selectedDateText: { color: colors.primaryText },
    todayDateText: { color: colors.primaryText },
    skeletonList: { gap: 10, marginTop: 18 },
    skeletonMeal: { borderBottomColor: colors.surfaceAlt, borderBottomWidth: 1, gap: 10, paddingHorizontal: 4, paddingVertical: 14 },
    muted: { color: colors.muted, fontSize: 14 },
    error: { color: colors.danger, fontSize: 13, lineHeight: 19, marginTop: 20 },
    mealList: { gap: 10, marginTop: 18 },
    summary: { marginTop: 22, paddingHorizontal: 4, paddingBottom: 8 },
    summaryTitle: { color: colors.muted, fontSize: 11, fontWeight: "600", letterSpacing: 0.6, textTransform: "uppercase" },
    summaryCalories: { color: colors.text, fontSize: 20, fontWeight: "600", marginTop: 4 },
    summaryMacros: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 5 },
    addButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 16, flexDirection: "row", gap: 8, height: 52, justifyContent: "center", width: "100%" },
    addButtonEmoji: { fontSize: 22, lineHeight: 28 },
    addButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
    disabledButton: { opacity: 0.5 },
    pressed: { opacity: 0.82 },
  });
}
