import { useMemo, useState } from "react";
import type { DailyMealType, MealEntry } from "@eatable/shared";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { mealNameKey } from "../../lib/meal-name";
import { useAppTheme } from "../../providers/AppThemeProvider";

export function MealCard({ mealType, onEditEntry }: { mealType: DailyMealType; onEditEntry: (entry: MealEntry) => void }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const localizedMealName = mealNameKey(mealType.name);
  const [expanded, setExpanded] = useState(false);
  const total = (key: "calories" | "protein" | "carbohydrates" | "fat") => mealType.entries.reduce((sum, entry) => sum + (entry[key] ?? 0), 0);

  return (
    <View style={styles.card}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded((current) => !current)} style={styles.heading}>
        <Text style={styles.name}>{localizedMealName ? t(localizedMealName) : mealType.name}</Text>
        <Text style={styles.chevron}>{expanded ? "⌃" : "⌄"}</Text>
      </Pressable>

      {expanded ? (
        <>
          {mealType.entries.length > 0 ? mealType.entries.map((entry) => (
            <Pressable key={entry.id} accessibilityRole="button" accessibilityLabel={t("planner.editEntry", { title: entry.title })} onPress={() => onEditEntry(entry)} style={styles.entry}>
              <View style={styles.entryHeading}>
                <Text style={styles.entryTitle}>{entry.title}</Text>
                <Text style={styles.entryType}>{t(entry.type === "product" ? "planner.product" : "planner.dish")}</Text>
              </View>
              {entry.quantity ? <Text style={styles.entryQuantity}>{entry.quantity}</Text> : null}
              {entry.notes ? <Text style={styles.entryNotes}>{entry.notes}</Text> : null}
            </Pressable>
          )) : <Text style={styles.emptyText}>{t("planner.noMeals")}</Text>}
          {mealType.entries.length > 0 ? <NutritionSummary total={total} t={t} styles={styles} /> : null}
        </>
      ) : <NutritionSummary total={total} t={t} styles={styles} />}
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

function createStyles(colors: { blue: string; border: string; divider: string; muted: string; subtle: string; text: string; violet: string; surface: string }) {
  return StyleSheet.create({
    card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 17, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
    heading: { alignItems: "center", flexDirection: "row", minHeight: 28 },
    name: { color: colors.text, flex: 1, fontSize: 16, fontWeight: "600" },
    chevron: { color: colors.muted, fontSize: 20, lineHeight: 22, paddingHorizontal: 4 },
    nutrition: { gap: 3, marginTop: 8 },
    mealCalories: { color: colors.blue, fontSize: 14, fontWeight: "600" },
    mealMacros: { color: colors.muted, fontSize: 12, lineHeight: 18 },
    emptyText: { color: colors.subtle, fontSize: 13, marginTop: 10 },
    entry: { borderTopColor: colors.divider, borderTopWidth: 1, marginTop: 10, paddingTop: 9 },
    entryHeading: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between" },
    entryTitle: { color: colors.text, flex: 1, fontSize: 14, fontWeight: "600" },
    entryType: { color: colors.violet, fontSize: 11, fontWeight: "600" },
    entryQuantity: { color: colors.muted, fontSize: 12, marginTop: 4 },
    entryNotes: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 3 },
  });
}
