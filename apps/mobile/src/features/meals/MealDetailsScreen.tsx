import { useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import type { MealEntry } from "@eatable/shared";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { AppScreen } from "../../components/AppScreen";
import { authClient } from "../../lib/auth-client";
import { formatDate, isValidDateKey, localDateKey } from "../../lib/dates";
import { mealNameKey } from "../../lib/meal-name";
import { useAppTheme } from "../../providers/AppThemeProvider";
import { AddMealEntryModal } from "./AddMealEntryModal";
import { useDailyMeals } from "./useDailyMeals";

export function MealDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mealTypeId?: string; date?: string }>();
  const { t, i18n } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { data: session } = authClient.useSession();
  const date = isValidDateKey(params.date) ? params.date : localDateKey(new Date());
  const { dailyMeals, isLoading, error, addEntry, editEntry, removeEntry } = useDailyMeals(session?.user.id, date);
  const [editingEntry, setEditingEntry] = useState<MealEntry | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const mealType = dailyMeals?.mealTypes.find((item) => item.id === params.mealTypeId);
  const locale = i18n.resolvedLanguage === "pl" ? "pl-PL" : "en-US";
  const localizedName = mealType ? mealNameKey(mealType.name) : null;

  return (
    <>
      <AppScreen footer={mealType ? (
        <View style={styles.fabArea}>
          <Pressable accessibilityRole="button" accessibilityLabel={t("planner.addEntry")} disabled={Boolean(error)} onPress={() => { setEditingEntry(null); setModalOpen(true); }} style={({ pressed }) => [styles.fab, pressed && styles.pressed, Boolean(error) && styles.disabled]}>
            <View style={styles.fabPlusIcon}>
              <View style={styles.fabPlusHorizontal} />
              <View style={styles.fabPlusVertical} />
            </View>
          </Pressable>
        </View>
      ) : undefined}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>{t("app.back")}</Text>
          </Pressable>
          <Text style={styles.date}>{formatDate(date, locale)}</Text>
        </View>
        <Text style={styles.title}>{mealType ? (localizedName ? t(localizedName) : mealType.name) : ""}</Text>
        <Text style={styles.subtitle}>{t("planner.entriesInMeal")}</Text>

        {isLoading ? <Text style={styles.message}>{t("planner.loadingMeals")}</Text> : error ? (
          <Text accessibilityRole="alert" style={styles.error}>{t(error)}</Text>
        ) : !mealType ? (
          <Text style={styles.message}>{t("planner.noMeals")}</Text>
        ) : mealType.entries.length === 0 ? (
          <Text style={styles.message}>{t("planner.noMeals")}</Text>
        ) : (
          <View style={styles.entries}>
            {mealType.entries.map((entry) => (
              <View key={entry.id} style={styles.entry}>
                <Pressable accessibilityRole="button" accessibilityLabel={t("planner.editEntry", { title: entry.title })} onPress={() => { setEditingEntry(entry); setModalOpen(true); }} style={styles.entryInfo}>
                  <Text style={styles.entryTitle}>{entry.title}</Text>
                  {entry.quantity ? <Text style={styles.entryMeta}>{entry.quantity}</Text> : null}
                  {entry.notes ? <Text style={styles.entryNotes}>{entry.notes}</Text> : null}
                  <Text style={styles.entryCalories}>{entry.calories ?? 0} kcal</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={`${t("planner.deleteEntry")}: ${entry.title}`} onPress={() => {
                  void removeEntry(mealType.id, entry).catch(() => Alert.alert(t("errors.entryDeleteFailed")));
                }} style={styles.deleteButton}>
                  <Text style={styles.deleteText}>✕</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </AppScreen>
      <AddMealEntryModal
        visible={modalOpen}
        date={date}
        locale={locale}
        mealTypes={mealType ? [mealType] : []}
        editingEntry={editingEntry && mealType ? { mealTypeId: mealType.id, entry: editingEntry } : null}
        onClose={() => setModalOpen(false)}
        onSave={addEntry}
        onUpdate={editEntry}
      />
    </>
  );
}

function createStyles(colors: { border: string; danger: string; muted: string; primary: string; primaryText: string; surface: string; surfaceAlt: string; text: string }) {
  return StyleSheet.create({
    header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
    backButton: { paddingVertical: 8, paddingRight: 12 },
    backText: { color: colors.primary, fontSize: 15, fontWeight: "600" },
    date: { color: colors.muted, fontSize: 13 },
    title: { color: colors.text, fontSize: 32, fontWeight: "700", letterSpacing: -0.8, marginTop: 22 },
    subtitle: { color: colors.muted, fontSize: 14, marginTop: 6 },
    entries: { gap: 10, marginTop: 22 },
    entry: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, flexDirection: "row", padding: 14 },
    entryInfo: { flex: 1 },
    entryTitle: { color: colors.text, fontSize: 16, fontWeight: "600" },
    entryMeta: { color: colors.muted, fontSize: 13, marginTop: 4 },
    entryNotes: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 4 },
    entryCalories: { color: colors.primary, fontSize: 13, fontWeight: "600", marginTop: 8 },
    deleteButton: { alignItems: "center", height: 40, justifyContent: "center", marginLeft: 8, width: 40 },
    deleteText: { color: colors.danger, fontSize: 18, fontWeight: "700" },
    message: { color: colors.muted, fontSize: 14, marginTop: 24 },
    error: { color: colors.danger, fontSize: 14, marginTop: 24 },
    fabArea: { alignItems: "flex-end", width: "100%" },
    fab: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 32, height: 64, justifyContent: "center", shadowColor: "#000000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 8, width: 64, elevation: 6 },
    fabPlusIcon: { alignItems: "center", height: 24, justifyContent: "center", width: 24 },
    fabPlusHorizontal: { backgroundColor: "#FFFFFF", height: 4, position: "absolute", width: 28 },
    fabPlusVertical: { backgroundColor: "#FFFFFF", height: 28, position: "absolute", width: 4 },
    pressed: { opacity: 0.82 },
    disabled: { opacity: 0.5 },
  });
}
