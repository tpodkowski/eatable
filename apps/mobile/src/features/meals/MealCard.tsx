import { useMemo } from "react";
import type { CreateMealEntryInput, DailyMealType } from "@eatable/shared";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MealEntryForm } from "./MealEntryForm";
import { mealNameKey } from "../../lib/meal-name";
import { useAppTheme } from "../../providers/AppThemeProvider";

interface MealCardProps {
  mealType: DailyMealType;
  entryFormOpen: boolean;
  onOpenEntryForm: () => void;
  onCloseEntryForm: () => void;
  onAddEntry: (entry: Omit<CreateMealEntryInput, "date">) => Promise<void>;
}

export function MealCard({ mealType, entryFormOpen, onOpenEntryForm, onCloseEntryForm, onAddEntry }: MealCardProps) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const localizedMealName = mealNameKey(mealType.name);

  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <View style={styles.orderBadge}>
          <Text style={styles.orderText}>{String(mealType.sortOrder + 1).padStart(2, "0")}</Text>
        </View>
        <Text style={styles.name}>{localizedMealName ? t(localizedMealName) : mealType.name}</Text>
      </View>

      {mealType.entries.length > 0 ? mealType.entries.map((entry) => (
        <View key={entry.id} style={styles.entry}>
          <View style={styles.entryHeading}>
            <Text style={styles.entryTitle}>{entry.title}</Text>
            <Text style={styles.entryType}>{t(entry.type === "product" ? "planner.product" : "planner.dish")}</Text>
          </View>
          {entry.quantity ? <Text style={styles.entryQuantity}>{entry.quantity}</Text> : null}
          {entry.notes ? <Text style={styles.entryNotes}>{entry.notes}</Text> : null}
          {entry.calories !== null ? <Text style={styles.entryCalories}>{entry.calories} kcal</Text> : null}
        </View>
      )) : (
        <Text style={styles.emptyText}>{t("planner.noMeals")}</Text>
      )}

      {entryFormOpen ? (
        <MealEntryForm onSave={onAddEntry} onCancel={onCloseEntryForm} />
      ) : (
        <Pressable accessibilityRole="button" onPress={onOpenEntryForm} style={styles.addButton}>
          <Text style={styles.addText}>＋ {t("planner.addEntry")}</Text>
        </Pressable>
      )}
    </View>
  );
}

function createStyles(colors: { amber: string; blue: string; border: string; divider: string; muted: string; subtle: string; text: string; violet: string; surface: string }) {
  return StyleSheet.create({
    card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 17, borderWidth: 1, paddingHorizontal: 17, paddingVertical: 16 },
    heading: { alignItems: "center", flexDirection: "row", gap: 12 },
    orderBadge: { alignItems: "center", backgroundColor: colors.amber, borderRadius: 10, height: 34, justifyContent: "center", width: 38 },
    orderText: { color: colors.text, fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
    name: { color: colors.text, flex: 1, fontSize: 16, fontWeight: "600" },
    emptyText: { color: colors.subtle, fontSize: 13, marginLeft: 50, marginTop: 12 },
    entry: { borderTopColor: colors.divider, borderTopWidth: 1, marginLeft: 50, marginTop: 12, paddingTop: 11 },
    entryHeading: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between" },
    entryTitle: { color: colors.text, flex: 1, fontSize: 14, fontWeight: "600" },
    entryType: { color: colors.violet, fontSize: 11, fontWeight: "600" },
    entryQuantity: { color: colors.muted, fontSize: 12, marginTop: 4 },
    entryNotes: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 3 },
    entryCalories: { color: colors.blue, fontSize: 12, fontWeight: "600", marginTop: 5 },
    addButton: { alignSelf: "flex-start", marginLeft: 50, marginTop: 16, paddingVertical: 5 },
    addText: { color: colors.blue, fontSize: 13, fontWeight: "700" },
  });
}
