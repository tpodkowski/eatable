import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { CreateMealEntryInput, MealEntry } from "@eatable/shared";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ActionButton } from "../../components/ActionButton";
import { useAppTheme } from "../../providers/AppThemeProvider";

interface MealEntryFormProps {
  onSave: (entry: Omit<CreateMealEntryInput, "date">) => Promise<void>;
  onCancel: () => void;
  onFooterChange: (footer: ReactNode) => void;
  initialEntry?: MealEntry;
}

export function MealEntryForm({ onSave, onCancel, onFooterChange, initialEntry }: MealEntryFormProps) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [title, setTitle] = useState(initialEntry?.title ?? "");
  const [quantity, setQuantity] = useState(initialEntry?.quantity ?? "");
  const [notes, setNotes] = useState(initialEntry?.notes ?? "");
  const [calories, setCalories] = useState(initialEntry?.calories?.toString() ?? "");
  const [protein, setProtein] = useState(initialEntry?.protein?.toString() ?? "");
  const [carbohydrates, setCarbohydrates] = useState(initialEntry?.carbohydrates?.toString() ?? "");
  const [fat, setFat] = useState(initialEntry?.fat?.toString() ?? "");
  const [isSaving, setIsSaving] = useState(false);
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

  useEffect(() => {
    onFooterChange(
      <View style={styles.footerActions}>
        <ActionButton
          title={t(initialEntry ? "planner.saveChanges" : "planner.saveEntry")}
          onPress={() => void submit()}
          loading={isSaving}
          disabled={!title.trim()}
        />
      </View>,
    );
  }, [isSaving, title, initialEntry, onFooterChange, styles, t]);

  return (
    <View style={styles.form}>
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{t("planner.entryTitleLabel")}</Text>
        <TextInput autoCapitalize="sentences" maxLength={160} onChangeText={setTitle} placeholder={t("planner.entryTitlePlaceholder")} placeholderTextColor={colors.placeholder} style={styles.input} value={title} />
      </View>
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{t("planner.entryQuantityLabel")}</Text>
        <TextInput maxLength={60} onChangeText={setQuantity} placeholder={t("planner.entryQuantityPlaceholder")} placeholderTextColor={colors.placeholder} style={styles.input} value={quantity} />
      </View>
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{t("planner.entryNotesLabel")}</Text>
        <TextInput maxLength={500} multiline onChangeText={setNotes} placeholder={t("planner.entryNotesPlaceholder")} placeholderTextColor={colors.placeholder} style={[styles.input, styles.notesInput]} value={notes} />
      </View>
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{t("planner.entryCaloriesLabel")}</Text>
        <TextInput keyboardType="number-pad" maxLength={6} onChangeText={setCalories} placeholder={t("planner.entryCaloriesPlaceholder")} placeholderTextColor={colors.placeholder} style={styles.input} value={calories} />
      </View>
      <View style={styles.macroInputs}>
        {([ ["protein", protein, setProtein], ["carbohydrates", carbohydrates, setCarbohydrates], ["fat", fat, setFat] ] as const).map(([name, value, setValue]) => (
          <View key={name} style={styles.field}>
            <Text style={styles.fieldLabel}>{t(`planner.${name}`)}</Text>
            <TextInput accessibilityLabel={t(`planner.${name}`)} keyboardType="number-pad" maxLength={6} onChangeText={setValue} placeholder="g" placeholderTextColor={colors.placeholder} style={[styles.input, styles.macroInput]} value={value} />
          </View>
        ))}
      </View>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{t(error)}</Text> : null}
    </View>
  );
}

function createStyles(colors: { border: string; danger: string; muted: string; placeholder: string; primary: string; surface: string; surfaceAlt: string; text: string }) {
  return StyleSheet.create({
    form: { borderTopColor: colors.border, borderTopWidth: 1, gap: 10, marginTop: 15, paddingTop: 15 },
    footerActions: { gap: 4 },
    field: { gap: 5, width: "100%" },
    fieldLabel: { color: colors.muted, fontSize: 12, fontWeight: "600" },
    input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, color: colors.text, fontSize: 15, height: 52, paddingHorizontal: 14 },
    macroInputs: { gap: 10, width: "100%" },
    macroInput: { width: 72, textAlign: "left" },
    notesInput: { height: 80, paddingTop: 14, textAlignVertical: "top" },
    error: { color: colors.danger, fontSize: 13, lineHeight: 19 },
    deleteText: { color: colors.danger, fontSize: 14, fontWeight: "600" },
  });
}
