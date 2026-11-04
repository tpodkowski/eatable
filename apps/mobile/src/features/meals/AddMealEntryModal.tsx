import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { CreateMealEntryInput, DailyMealType, MealEntry } from "@eatable/shared";
import { useTranslation } from "react-i18next";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { AppScreen } from "../../components/AppScreen";
import { formatDate } from "../../lib/dates";
import { mealNameKey } from "../../lib/mealName";
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
  editingEntry: { mealTypeId: string; entry: MealEntry } | null;
}

export function AddMealEntryModal({ visible, date, locale, mealTypes, onClose, onSave, onUpdate, editingEntry }: AddMealEntryModalProps) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selectedMealTypeId, setSelectedMealTypeId] = useState<string | null>(null);
  const [formFooter, setFormFooter] = useState<ReactNode>(null);
  const soleMealTypeId = mealTypes.length === 1 ? mealTypes[0].id : null;

  useEffect(() => {
    if (visible) {
      setSelectedMealTypeId(editingEntry?.mealTypeId ?? soleMealTypeId);
      setFormFooter(null);
    }
  }, [visible, editingEntry, soleMealTypeId]);

  const selectedEntry = editingEntry?.mealTypeId === selectedMealTypeId ? editingEntry.entry : undefined;

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
      visible={visible}
    >
      <AppScreen footer={formFooter}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>{t("app.back")}</Text>
          </Pressable>
          <Text style={styles.date}>{formatDate(date, locale)}</Text>
          <View style={styles.headerAction} />
        </View>
        <Text style={styles.title}>{t(selectedEntry ? "planner.editEntryTitle" : "planner.addEntryTitle")}</Text>
        {selectedEntry || mealTypes.length > 1 ? (
          <Text style={styles.description}>{t(selectedEntry ? "planner.editEntryDescription" : "planner.chooseMeal")}</Text>
        ) : null}

        {!editingEntry && mealTypes.length > 1 ? <View style={styles.mealOptions}>
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

        {selectedMealTypeId ? (
          <MealEntryForm
            key={selectedEntry?.id ?? `new-${selectedMealTypeId}`}
            initialEntry={selectedEntry}
            onSave={(entry) => selectedEntry
              ? onUpdate(selectedMealTypeId, selectedEntry, entry)
              : onSave(selectedMealTypeId, entry)}
            onCancel={onClose}
            onFooterChange={setFormFooter}
          />
        ) : (
          <Text style={styles.hint}>{t("planner.chooseMealHint")}</Text>
        )}
      </AppScreen>
    </Modal>
  );
}

function createStyles(colors: { border: string; danger: string; muted: string; primary: string; surface: string; surfaceAlt: string; text: string; violet: string }) {
  return StyleSheet.create({
    header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
    closeButton: { alignSelf: "flex-start", paddingVertical: 8, paddingRight: 12 },
    closeText: { color: colors.primary, fontSize: 15, fontWeight: "600" },
    headerAction: { alignItems: "flex-end", minWidth: 52 },
    date: { color: colors.muted, fontSize: 13 },
    title: { color: colors.text, fontSize: 34, fontWeight: "700", letterSpacing: -1, lineHeight: 40, marginTop: 24 },
    description: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 8 },
    mealOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 24 },
    mealOption: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, minHeight: 42, justifyContent: "center", paddingHorizontal: 14 },
    mealOptionActive: { backgroundColor: colors.surfaceAlt, borderColor: colors.primary },
    mealOptionText: { color: colors.muted, fontSize: 13, fontWeight: "600" },
    mealOptionTextActive: { color: colors.primary },
    hint: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 24 },
  });
}
