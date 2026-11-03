import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import type { MealEntry } from "@eatable/shared";
import { ActivityIndicator, Animated, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import { AppScreen } from "../../components/AppScreen";
import { authClient } from "../../lib/auth-client";
import { formatDate, isValidDateKey, localDateKey, shiftDate } from "../../lib/dates";
import { getInitials } from "../../lib/initials";
import { useAppTheme } from "../../providers/AppThemeProvider";
import { MealCard } from "./MealCard";
import { AddMealEntryModal } from "./AddMealEntryModal";
import { DatePickerModal } from "./DatePickerModal";
import { useDailyMeals } from "./useDailyMeals";

const ADD_EMOJIS = ["🍎", "🍉", "🍌", "🥑", "🍔", "🍕", "🧀", "🥗", "🍖", "🍹"];

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
  const locale = i18n.resolvedLanguage === "pl" ? "pl-PL" : "en-US";
  useEffect(() => {
    if (routeDate) setDate(routeDate);
  }, [routeDate, setDate]);
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
        <Pressable accessibilityLabel={t("app.goToDashboard")} accessibilityRole="button" onPress={() => router.replace("/")}>
          <Text style={styles.eyebrow}>EATABLE</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={t("app.openSettings")}
          accessibilityRole="button"
          onPress={() => router.push("/settings")}
          style={styles.avatarButton}
        >
          <Text style={styles.avatarText}>{getInitials(session?.user.name || session?.user.email || "")}</Text>
        </Pressable>
      </View>

      <View {...daySwipeResponder.panHandlers}>
      <Animated.View style={{ opacity: dayTransition, transform: [{ translateX: dayOffset }] }}>
      <View style={styles.dayPicker}>
        <Pressable
          accessibilityLabel={t("app.previousDay")}
          accessibilityRole="button"
          onPress={() => changeDay(-1)}
          style={styles.dayArrow}
        >
          <Text style={styles.dayArrowText}>‹</Text>
        </Pressable>
        <View style={styles.dayHeading}>
          <Text style={styles.dayEyebrow}>{t(date === localDateKey(new Date()) ? "planner.today" : "planner.dayPlan")}</Text>
          <Pressable accessibilityLabel={t("planner.chooseDate")} accessibilityRole="button" onPress={() => setDatePickerOpen(true)}>
            <Text style={styles.dayDate}>{formatDate(date, locale)}</Text>
          </Pressable>
        </View>
        <Pressable
          accessibilityLabel={t("app.nextDay")}
          accessibilityRole="button"
          onPress={() => changeDay(1)}
          style={styles.dayArrow}
        >
          <Text style={styles.dayArrowText}>›</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.muted}>{t("planner.loadingMeals")}</Text>
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

function createStyles(colors: { background: string; blue: string; danger: string; muted: string; orange: string; primary: string; surface: string; surfaceAlt: string; text: string; violet: string }) {
  return StyleSheet.create({
    header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
    eyebrow: { color: colors.blue, fontSize: 12, fontWeight: "700", letterSpacing: 2.5 },
    avatarButton: { alignItems: "center", backgroundColor: colors.surfaceAlt, borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
    avatarText: { color: colors.violet, fontSize: 14, fontWeight: "700" },
    dayPicker: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
    dayArrow: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
    dayArrowText: { color: colors.primary, fontSize: 30, fontWeight: "400", lineHeight: 34, marginTop: -3 },
    dayHeading: { alignItems: "center", flex: 1, paddingHorizontal: 6 },
    dayEyebrow: { color: colors.orange, fontSize: 10, fontWeight: "700", letterSpacing: 1.8 },
    dayDate: { color: colors.text, fontSize: 15, fontWeight: "600", marginTop: 3, textAlign: "center" },
    loading: { alignItems: "center", gap: 10, paddingVertical: 40 },
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
