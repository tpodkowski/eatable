import { useMemo } from "react";
import type { DailyMealType } from "@eatable/shared";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { mealNameKey } from "../../lib/meal-name";
import { useAppTheme } from "../../providers/AppThemeProvider";

export function MealCard({ mealType, onPress }: { mealType: DailyMealType; onPress: () => void }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const localizedMealName = mealNameKey(mealType.name);
  const total = (key: "calories" | "protein" | "carbohydrates" | "fat") => mealType.entries.reduce((sum, entry) => sum + (entry[key] ?? 0), 0);

  return (
    <View style={styles.card}>
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.heading}>
        <Text style={styles.name}>{localizedMealName ? t(localizedMealName) : mealType.name}</Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onPress}>
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
    chevron: { color: colors.muted, fontSize: 24, lineHeight: 26, paddingHorizontal: 4 },
    nutrition: { gap: 3, marginTop: 8 },
    mealCalories: { color: colors.blue, fontSize: 14, fontWeight: "600" },
    mealMacros: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  });
}
