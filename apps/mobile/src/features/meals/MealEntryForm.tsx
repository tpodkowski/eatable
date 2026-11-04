import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { CreateMealEntryInput, MealEntry } from "@eatable/shared";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ActionButton } from "../../components/ActionButton";
import { useAppTheme } from "../../providers/AppThemeProvider";
import { validateMealEntryForm } from "./mealEntryFormValidation";

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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const submitRef = useRef<() => Promise<void>>(async () => undefined);

  const submit = useCallback(async () => {
    const validation = validateMealEntryForm({ title, quantity, notes, calories, protein, carbohydrates, fat });
    setFieldErrors(validation);
    if (Object.keys(validation).length > 0) return;
    const calorieValue = calories.trim() === "" ? undefined : Number(calories);
    const macroInputs = { protein, carbohydrates, fat };
    const macroValues: Partial<Record<keyof typeof macroInputs, number>> = {};
    for (const [name, raw] of Object.entries(macroInputs)) {
      if (!raw.trim()) continue;
      macroValues[name as keyof typeof macroInputs] = Number(raw);
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
  }, [calories, carbohydrates, fat, initialEntry, notes, onCancel, onSave, protein, quantity, title]);
  submitRef.current = submit;

  useEffect(() => {
    onFooterChange(
      <View style={styles.footerActions}>
        <ActionButton
          title={t(initialEntry ? "planner.saveChanges" : "planner.saveEntry")}
          onPress={() => void submitRef.current()}
          loading={isSaving}
        />
      </View>,
    );
  }, [initialEntry, isSaving, onFooterChange, styles, t]);

  return (
    <View style={styles.form}>
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{t("planner.entryTitleLabel")}</Text>
        <TextInput accessibilityLabel={t("planner.entryTitleLabel")} autoCapitalize="sentences" maxLength={160} onChangeText={(value) => { setTitle(value); setFieldErrors((current) => ({ ...current, title: undefined })); }} placeholder={t("planner.entryTitlePlaceholder")} placeholderTextColor={colors.placeholder} style={[styles.input, fieldErrors.title && styles.inputInvalid]} value={title} />
        {fieldErrors.title ? <Text accessibilityRole="alert" style={styles.fieldError}>{t(fieldErrors.title)}</Text> : null}
      </View>
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{t("planner.entryQuantityLabel")}</Text>
        <TextInput accessibilityLabel={t("planner.entryQuantityLabel")} maxLength={60} onChangeText={(value) => { setQuantity(value); setFieldErrors((current) => ({ ...current, quantity: undefined })); }} placeholder={t("planner.entryQuantityPlaceholder")} placeholderTextColor={colors.placeholder} style={[styles.input, fieldErrors.quantity && styles.inputInvalid]} value={quantity} />
        {fieldErrors.quantity ? <Text accessibilityRole="alert" style={styles.fieldError}>{t(fieldErrors.quantity)}</Text> : null}
      </View>
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{t("planner.entryNotesLabel")}</Text>
        <TextInput accessibilityLabel={t("planner.entryNotesLabel")} maxLength={500} multiline onChangeText={(value) => { setNotes(value); setFieldErrors((current) => ({ ...current, notes: undefined })); }} placeholder={t("planner.entryNotesPlaceholder")} placeholderTextColor={colors.placeholder} style={[styles.input, styles.notesInput, fieldErrors.notes && styles.inputInvalid]} value={notes} />
        {fieldErrors.notes ? <Text accessibilityRole="alert" style={styles.fieldError}>{t(fieldErrors.notes)}</Text> : null}
      </View>
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{t("planner.entryCaloriesLabel")}</Text>
        <TextInput accessibilityLabel={t("planner.entryCaloriesLabel")} keyboardType="number-pad" maxLength={6} onChangeText={(value) => { setCalories(value); setFieldErrors((current) => ({ ...current, calories: undefined })); }} placeholder={t("planner.entryCaloriesPlaceholder")} placeholderTextColor={colors.placeholder} style={[styles.input, fieldErrors.calories && styles.inputInvalid]} value={calories} />
        {fieldErrors.calories ? <Text accessibilityRole="alert" style={styles.fieldError}>{t(fieldErrors.calories)}</Text> : null}
      </View>
      <View style={styles.macroInputs}>
        {([ ["protein", protein, setProtein], ["carbohydrates", carbohydrates, setCarbohydrates], ["fat", fat, setFat] ] as const).map(([name, value, setValue]) => (
          <View key={name} style={styles.field}>
            <Text style={styles.fieldLabel}>{t(`planner.${name}`)}</Text>
            <TextInput accessibilityLabel={t(`planner.${name}`)} keyboardType="number-pad" maxLength={6} onChangeText={(nextValue) => { setValue(nextValue); setFieldErrors((current) => ({ ...current, [name]: undefined })); }} placeholder="g" placeholderTextColor={colors.placeholder} style={[styles.input, styles.macroInput, fieldErrors[name] && styles.inputInvalid]} value={value} />
            {fieldErrors[name] ? <Text accessibilityRole="alert" style={styles.fieldError}>{t(fieldErrors[name]!)}</Text> : null}
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
    inputInvalid: { borderColor: colors.danger },
    macroInputs: { gap: 10, width: "100%" },
    macroInput: { width: 72, textAlign: "left" },
    notesInput: { height: 80, paddingTop: 14, textAlignVertical: "top" },
    error: { color: colors.danger, fontSize: 13, lineHeight: 19 },
    fieldError: { color: colors.danger, fontSize: 12, lineHeight: 17 },
    deleteText: { color: colors.danger, fontSize: 14, fontWeight: "600" },
  });
}
