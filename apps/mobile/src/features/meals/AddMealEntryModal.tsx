import { useEffect, useMemo, useState } from "react";
import type { CreateMealEntryInput, DailyMealType, MealEntry } from "@eatable/shared";
import { useTranslation } from "react-i18next";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { AppScreen } from "../../components/AppScreen";
import { formatDate } from "../../lib/dates";
import { mealNameKey } from "../../lib/meal-name";
import { useAppTheme } from "../../providers/AppThemeProvider";
import { MealEntryForm } from "./MealEntryForm";

interface AddMealEntryModalProps {
  visible: boolean;
  date: string;
  locale: string;
  mealTypes: DailyMealType[];
  onClose: () => void;
  onSave: (mealTypeId: string, entry: Omit<CreateMealEntryInput, "date">) => Promise<void>;
  onUpdate: (mealTypeId: string, entry: MealEntry, input: Omit<CreateMealEntryInput, "date">) => Promise<void>;
  onDelete: (mealTypeId: string, entry: MealEntry) => Promise<void>;
  editingEntry: { mealTypeId: string; entry: MealEntry } | null;
}

export function AddMealEntryModal({ visible, date, locale, mealTypes, onClose, onSave, onUpdate, onDelete, editingEntry }: AddMealEntryModalProps) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selectedMealTypeId, setSelectedMealTypeId] = useState<string | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setSelectedMealTypeId(editingEntry?.mealTypeId ?? null);
      setSelectedEntryId(editingEntry?.entry.id ?? null);
    }
  }, [visible, editingEntry]);

  const selectedMealType = mealTypes.find((mealType) => mealType.id === selectedMealTypeId);
  const selectedEntry = selectedMealType?.entries.find((entry) => entry.id === selectedEntryId);

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
      visible={visible}
    >
      <AppScreen>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>{t("app.back")}</Text>
          </Pressable>
          <Text style={styles.date}>{formatDate(date, locale)}</Text>
        </View>
        <Text style={styles.title}>{t(selectedEntry ? "planner.editEntryTitle" : "planner.addEntryTitle")}</Text>
        <Text style={styles.description}>{t(selectedEntry ? "planner.editEntryDescription" : "planner.chooseMeal")}</Text>

        {!editingEntry ? <View style={styles.mealOptions}>
          {mealTypes.map((mealType) => {
            const selected = selectedMealTypeId === mealType.id;
            const localizedName = mealNameKey(mealType.name);
            return (
              <Pressable
                key={mealType.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setSelectedMealTypeId(mealType.id)}
                style={[styles.mealOption, selected && styles.mealOptionActive]}
              >
                <Text style={[styles.mealOptionText, selected && styles.mealOptionTextActive]}>
                  {localizedName ? t(localizedName) : mealType.name}
                </Text>
              </Pressable>
            );
          })}
        </View> : null}

        {selectedMealType && selectedMealType.entries.length > 0 ? (
          <View style={styles.entriesSection}>
            <Text style={styles.entriesLabel}>{t("planner.entriesInMeal")}</Text>
            {selectedMealType.entries.map((entry) => {
              const selected = selectedEntryId === entry.id;
              return (
                <Pressable
                  key={entry.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setSelectedEntryId(entry.id)}
                  style={[styles.entryOption, selected && styles.mealOptionActive]}
                >
                  <Text style={[styles.mealOptionText, selected && styles.mealOptionTextActive]}>{entry.title}</Text>
                  <Text style={styles.entryType}>{t(entry.type === "product" ? "planner.product" : "planner.dish")}</Text>
                </Pressable>
              );
            })}
            <Pressable accessibilityRole="button" onPress={() => setSelectedEntryId(null)} style={styles.addAnother}>
              <Text style={styles.addAnotherText}>{t("planner.addAnotherEntry")}</Text>
            </Pressable>
          </View>
        ) : null}

        {selectedMealTypeId ? (
          <MealEntryForm
            key={selectedEntry?.id ?? `new-${selectedMealTypeId}`}
            initialEntry={selectedEntry}
            onDelete={selectedEntry ? () => onDelete(selectedMealTypeId, selectedEntry) : undefined}
            onSave={(entry) => selectedEntry
              ? onUpdate(selectedMealTypeId, selectedEntry, entry)
              : onSave(selectedMealTypeId, entry)}
            onCancel={onClose}
          />
        ) : (
          <Text style={styles.hint}>{t("planner.chooseMealHint")}</Text>
        )}
      </AppScreen>
    </Modal>
  );
}

function createStyles(colors: { border: string; muted: string; primary: string; surface: string; surfaceAlt: string; text: string; violet: string }) {
  return StyleSheet.create({
    header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
    closeButton: { alignSelf: "flex-start", paddingVertical: 8, paddingRight: 12 },
    closeText: { color: colors.primary, fontSize: 15, fontWeight: "600" },
    date: { color: colors.muted, fontSize: 13 },
    title: { color: colors.text, fontSize: 34, fontWeight: "700", letterSpacing: -1, lineHeight: 40, marginTop: 24 },
    description: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 8 },
    mealOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 24 },
    mealOption: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, minHeight: 42, justifyContent: "center", paddingHorizontal: 14 },
    mealOptionActive: { backgroundColor: colors.surfaceAlt, borderColor: colors.primary },
    mealOptionText: { color: colors.muted, fontSize: 13, fontWeight: "600" },
    mealOptionTextActive: { color: colors.primary },
    entriesSection: { gap: 8, marginTop: 20 },
    entriesLabel: { color: colors.text, fontSize: 13, fontWeight: "600" },
    entryOption: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", minHeight: 42, paddingHorizontal: 12 },
    entryType: { color: colors.violet, fontSize: 11, fontWeight: "600" },
    addAnother: { alignSelf: "flex-start", paddingVertical: 8 },
    addAnotherText: { color: colors.primary, fontSize: 14, fontWeight: "600" },
    hint: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 24 },
  });
}
