import { useEffect, useMemo, useRef, useState } from "react";
import type { DailyMealType, MealEntry } from "@eatable/shared";
import { useTranslation } from "react-i18next";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { mealNameKey } from "../../lib/meal-name";
import { useAppTheme } from "../../providers/AppThemeProvider";

export function MealCard({ mealType, onEditEntry }: { mealType: DailyMealType; onEditEntry: (entry: MealEntry) => void }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const localizedMealName = mealNameKey(mealType.name);
  const [expanded, setExpanded] = useState(false);
  const chevronRotation = useRef(new Animated.Value(0)).current;
  const contentHeight = useRef(new Animated.Value(0)).current;
  const measuredHeight = useRef(0);
  const total = (key: "calories" | "protein" | "carbohydrates" | "fat") => mealType.entries.reduce((sum, entry) => sum + (entry[key] ?? 0), 0);

  useEffect(() => {
    Animated.timing(chevronRotation, {
      toValue: expanded ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [chevronRotation, expanded]);

  useEffect(() => {
    Animated.timing(contentHeight, { toValue: expanded ? measuredHeight.current : 0, duration: 240, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }).start();
  }, [contentHeight, expanded]);

  return (
    <View style={styles.card}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => {
        setExpanded((current) => !current);
      }} style={styles.heading}>
        <Text style={styles.name}>{localizedMealName ? t(localizedMealName) : mealType.name}</Text>
        <Animated.Text style={[styles.chevron, { transform: [{ rotate: chevronRotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] }) }] }]}>⌄</Animated.Text>
      </Pressable>

      <Animated.View pointerEvents={expanded ? "auto" : "none"} style={{ height: contentHeight, overflow: "hidden" }}>
        <View onLayout={(event) => {
          measuredHeight.current = event.nativeEvent.layout.height;
          if (expanded) contentHeight.setValue(measuredHeight.current);
        }}>
          {mealType.entries.length > 0 ? mealType.entries.map((entry) => (
            <Pressable key={entry.id} accessibilityRole="button" accessibilityLabel={t("planner.editEntry", { title: entry.title })} onPress={() => onEditEntry(entry)} style={styles.entry}>
              <View style={styles.entryHeading}>
                <Text style={styles.entryTitle}>{entry.title}</Text>
              </View>
              {entry.quantity ? <Text style={styles.entryQuantity}>{entry.quantity}</Text> : null}
              {entry.notes ? <Text style={styles.entryNotes}>{entry.notes}</Text> : null}
            </Pressable>
          )) : <Text style={styles.emptyText}>{t("planner.noMeals")}</Text>}
        </View>
      </Animated.View>
      <Pressable
        accessibilityRole={mealType.entries.length ? "button" : undefined}
        accessibilityLabel={mealType.entries[0] ? t("planner.editEntry", { title: mealType.entries[0].title }) : undefined}
        disabled={mealType.entries.length === 0}
        onPress={() => {
          const firstEntry = mealType.entries[0];
          if (firstEntry) onEditEntry(firstEntry);
        }}
      >
        <NutritionSummary total={total} t={t} styles={styles} />
      </Pressable>
    </View>
  );
}

function NutritionSummary({ total, t, styles }: { total: (key: "calories" | "protein" | "carbohydrates" | "fat") => number; t: (key: string) => string; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.nutrition}>
      <Text style={styles.mealCalories}>{total("calories")} kcal</Text>
      <Text style={styles.mealMacros}>{t("planner.proteinShort")} {total("protein")} g  ·  {t("planner.carbohydratesShort")} {total("carbohydrates")} g  ·  {t("planner.fatShort")} {total("fat")} g</Text>
    </View>
  );
}

function createStyles(colors: { blue: string; border: string; divider: string; muted: string; subtle: string; text: string; surface: string }) {
  return StyleSheet.create({
    card: { borderBottomColor: colors.border, borderBottomWidth: 1, paddingHorizontal: 4, paddingVertical: 12 },
    heading: { alignItems: "center", flexDirection: "row", minHeight: 28 },
    name: { color: colors.text, flex: 1, fontSize: 16, fontWeight: "600" },
    chevron: { color: colors.muted, fontSize: 20, lineHeight: 22, paddingHorizontal: 4 },
    nutrition: { gap: 3, marginTop: 8 },
    mealCalories: { color: colors.blue, fontSize: 14, fontWeight: "600" },
    mealMacros: { color: colors.muted, fontSize: 12, lineHeight: 18 },
    emptyText: { color: colors.subtle, fontSize: 13, marginTop: 10 },
    entry: { borderTopColor: colors.divider, borderTopWidth: 1, marginHorizontal: 8, marginTop: 10, paddingTop: 9 },
    entryHeading: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between" },
    entryTitle: { color: colors.text, flex: 1, fontSize: 14, fontWeight: "600" },
    entryQuantity: { color: colors.muted, fontSize: 12, marginTop: 4 },
    entryNotes: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 3 },
  });
}
