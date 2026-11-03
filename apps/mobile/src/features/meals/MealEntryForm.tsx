import { useMemo, useState } from "react";
import type { CreateMealEntryInput, MealEntry } from "@eatable/shared";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ActionButton } from "../../components/ActionButton";
import { useAppTheme } from "../../providers/AppThemeProvider";

interface MealEntryFormProps {
  onSave: (entry: Omit<CreateMealEntryInput, "date">) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel: () => void;
  initialEntry?: MealEntry;
}

export function MealEntryForm({ onSave, onDelete, onCancel, initialEntry }: MealEntryFormProps) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [type, setType] = useState<MealEntry["type"]>(initialEntry?.type ?? "dish");
  const [title, setTitle] = useState(initialEntry?.title ?? "");
  const [quantity, setQuantity] = useState(initialEntry?.quantity ?? "");
  const [notes, setNotes] = useState(initialEntry?.notes ?? "");
  const [calories, setCalories] = useState(initialEntry?.calories?.toString() ?? "");
  const [protein, setProtein] = useState(initialEntry?.protein?.toString() ?? "");
  const [carbohydrates, setCarbohydrates] = useState(initialEntry?.carbohydrates?.toString() ?? "");
  const [fat, setFat] = useState(initialEntry?.fat?.toString() ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const calorieValue = calories.trim() === "" ? undefined : Number(calories);
    if (calorieValue !== undefined && (!Number.isInteger(calorieValue) || calorieValue < 0 || calorieValue > 100_000)) {
      setError("errors.invalidCalories");
      return;
    }
    const macroInputs = { protein, carbohydrates, fat };
    const macroValues: Partial<Record<keyof typeof macroInputs, number>> = {};
    for (const [name, raw] of Object.entries(macroInputs)) {
      if (!raw.trim()) continue;
      const value = Number(raw);
      if (!Number.isInteger(value) || value < 0 || value > 100_000) {
        setError("errors.invalidMacro");
        return;
      }
      macroValues[name as keyof typeof macroInputs] = value;
    }

    setIsSaving(true);
    setError(null);
    let saved = false;
    try {
      await onSave({
        type,
        title: title.trim(),
        ...(quantity.trim() ? { quantity: quantity.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        ...(calorieValue === undefined ? {} : { calories: calorieValue }),
        ...macroValues,
      });
      saved = true;
    } catch {
      setError(initialEntry ? "errors.entryUpdateFailed" : "errors.entrySaveFailed");
    } finally {
      setIsSaving(false);
    }
    if (saved) onCancel();
  }

  async function remove() {
    if (!onDelete) return;
    setIsSaving(true);
    setError(null);
    try {
      await onDelete();
      onCancel();
    } catch {
      setError("errors.entryDeleteFailed");
    } finally {
      setIsSaving(false);
    }
  }

  function confirmRemove() {
    setIsDeleteConfirmOpen(true);
  }

  return (
    <View style={styles.form}>
      <Text style={styles.label}>{t("planner.entryType")}</Text>
      <View style={styles.typeOptions}>
        {(["dish", "product"] as const).map((option) => {
          const selected = type === option;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setType(option)}
              style={[styles.typeOption, selected && styles.typeOptionActive]}
            >
              <Text style={[styles.typeText, selected && styles.typeTextActive]}>
                {t(option === "dish" ? "planner.dish" : "planner.product")}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <TextInput
        autoCapitalize="sentences"
        maxLength={160}
        onChangeText={setTitle}
        placeholder={t("planner.entryTitlePlaceholder")}
        placeholderTextColor={colors.placeholder}
        style={styles.input}
        value={title}
      />
      <TextInput
        maxLength={60}
        onChangeText={setQuantity}
        placeholder={t("planner.entryQuantityPlaceholder")}
        placeholderTextColor={colors.placeholder}
        style={styles.input}
        value={quantity}
      />
      <TextInput
        maxLength={500}
        multiline
        onChangeText={setNotes}
        placeholder={t("planner.entryNotesPlaceholder")}
        placeholderTextColor={colors.placeholder}
        style={[styles.input, styles.notesInput]}
        value={notes}
      />
      <TextInput
        keyboardType="number-pad"
        maxLength={6}
        onChangeText={setCalories}
        placeholder={t("planner.entryCaloriesPlaceholder")}
        placeholderTextColor={colors.placeholder}
        style={styles.input}
        value={calories}
      />
      <View style={styles.macroInputs}>
        {([ ["protein", protein, setProtein], ["carbohydrates", carbohydrates, setCarbohydrates], ["fat", fat, setFat] ] as const).map(([name, value, setValue]) => (
          <View key={name} style={styles.macroField}>
            <Text style={styles.macroLabel}>{t(`planner.${name}`)}</Text>
            <TextInput accessibilityLabel={t(`planner.${name}`)} keyboardType="number-pad" maxLength={6} onChangeText={setValue} placeholder="g" placeholderTextColor={colors.placeholder} style={[styles.input, styles.macroInput]} value={value} />
          </View>
        ))}
      </View>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{t(error)}</Text> : null}
      <ActionButton
        title={t(initialEntry ? "planner.saveChanges" : "planner.saveEntry")}
        onPress={() => void submit()}
        loading={isSaving}
        disabled={!title.trim()}
      />
      {initialEntry && onDelete ? (
        <>
          <Pressable accessibilityRole="button" disabled={isSaving} onPress={confirmRemove} style={styles.deleteButton}>
            <Text style={styles.deleteText}>{t("planner.deleteEntry")}</Text>
          </Pressable>
          {isDeleteConfirmOpen ? (
            <View style={styles.deleteConfirm}>
              <Text style={styles.deleteConfirmTitle}>{t("planner.confirmDeleteTitle")}</Text>
              <Text style={styles.deleteConfirmMessage}>{t("planner.confirmDeleteMessage")}</Text>
              <View style={styles.deleteConfirmActions}>
                <Pressable accessibilityRole="button" disabled={isSaving} onPress={() => setIsDeleteConfirmOpen(false)} style={styles.confirmAction}>
                  <Text style={styles.cancelText}>{t("planner.cancelEntry")}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" disabled={isSaving} onPress={() => void remove()} style={styles.confirmAction}>
                  <Text style={styles.deleteText}>{t("planner.deleteEntry")}</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </>
      ) : null}
      <Pressable accessibilityRole="button" onPress={onCancel} style={styles.cancelButton}>
        <Text style={styles.cancelText}>{t("planner.cancelEntry")}</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: { border: string; danger: string; muted: string; placeholder: string; primary: string; surface: string; surfaceAlt: string; text: string }) {
  return StyleSheet.create({
    form: { borderTopColor: colors.border, borderTopWidth: 1, gap: 10, marginTop: 15, paddingTop: 15 },
    label: { color: colors.text, fontSize: 13, fontWeight: "600" },
    typeOptions: { flexDirection: "row", gap: 10 },
    typeOption: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 11, borderWidth: 1, flex: 1, minHeight: 42, justifyContent: "center" },
    typeOptionActive: { backgroundColor: colors.surfaceAlt, borderColor: colors.primary },
    typeText: { color: colors.muted, fontSize: 13, fontWeight: "600" },
    typeTextActive: { color: colors.primary },
    input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, color: colors.text, fontSize: 15, height: 52, paddingHorizontal: 14 },
    macroInputs: { flexDirection: "row", gap: 6, width: "100%" },
    macroField: { flex: 1, flexBasis: 0, gap: 5, minWidth: 0 },
    macroLabel: { color: colors.muted, fontSize: 11, fontWeight: "600" },
    macroInput: { flex: 1, flexBasis: 0, minWidth: 0, paddingHorizontal: 4, textAlign: "center" },
    notesInput: { height: 80, paddingTop: 14, textAlignVertical: "top" },
    error: { color: colors.danger, fontSize: 13, lineHeight: 19 },
    cancelButton: { alignSelf: "center", padding: 8 },
    deleteButton: { alignSelf: "center", padding: 8 },
    deleteText: { color: colors.danger, fontSize: 14, fontWeight: "600" },
    deleteConfirm: { backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderRadius: 14, borderWidth: 1, gap: 7, padding: 14 },
    deleteConfirmTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
    deleteConfirmMessage: { color: colors.muted, fontSize: 13 },
    deleteConfirmActions: { flexDirection: "row", justifyContent: "flex-end", marginTop: 4 },
    confirmAction: { paddingHorizontal: 10, paddingVertical: 8 },
    cancelText: { color: colors.muted, fontSize: 13, fontWeight: "600" },
  });
}
