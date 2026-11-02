import { useMemo, useState } from "react";
import type { CreateMealEntryInput, MealEntry } from "@eatable/shared";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ActionButton } from "../../components/ActionButton";
import { useAppTheme } from "../../providers/AppThemeProvider";

interface MealEntryFormProps {
  onSave: (entry: Omit<CreateMealEntryInput, "date">) => Promise<void>;
  onCancel: () => void;
}

export function MealEntryForm({ onSave, onCancel }: MealEntryFormProps) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [type, setType] = useState<MealEntry["type"]>("dish");
  const [title, setTitle] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [calories, setCalories] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const calorieValue = calories.trim() === "" ? undefined : Number(calories);
    if (calorieValue !== undefined && (!Number.isInteger(calorieValue) || calorieValue < 0 || calorieValue > 100_000)) {
      setError("errors.invalidCalories");
      return;
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
      });
      saved = true;
    } catch {
      setError("errors.entrySaveFailed");
    } finally {
      setIsSaving(false);
    }
    if (saved) onCancel();
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
      {error ? <Text accessibilityRole="alert" style={styles.error}>{t(error)}</Text> : null}
      <ActionButton
        title={t("planner.saveEntry")}
        onPress={() => void submit()}
        loading={isSaving}
        disabled={!title.trim()}
      />
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
    notesInput: { height: 80, paddingTop: 14, textAlignVertical: "top" },
    error: { color: colors.danger, fontSize: 13, lineHeight: 19 },
    cancelButton: { alignSelf: "center", padding: 8 },
    cancelText: { color: colors.muted, fontSize: 13, fontWeight: "600" },
  });
}
