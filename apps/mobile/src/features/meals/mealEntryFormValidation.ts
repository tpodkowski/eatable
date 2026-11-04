export interface MealEntryFormValues {
  title: string;
  quantity: string;
  notes: string;
  calories: string;
  protein: string;
  carbohydrates: string;
  fat: string;
}

export type MealEntryFormField = keyof MealEntryFormValues;
export type MealEntryFormErrors = Partial<Record<MealEntryFormField, string>>;

export function validateMealEntryForm(values: MealEntryFormValues): MealEntryFormErrors {
  const errors: MealEntryFormErrors = {};
  const title = values.title.trim();
  if (!title) errors.title = "planner.validationTitleRequired";
  else if (title.length > 160) errors.title = "planner.validationTitleTooLong";

  const quantity = values.quantity.trim();
  if (quantity.length > 60) errors.quantity = "planner.validationQuantityTooLong";

  if (values.notes.length > 500) errors.notes = "planner.validationNotesTooLong";

  if (!isOptionalWholeNumber(values.calories)) errors.calories = "errors.invalidCalories";
  for (const field of ["protein", "carbohydrates", "fat"] as const) {
    if (!isOptionalWholeNumber(values[field])) errors[field] = "errors.invalidMacro";
  }
  return errors;
}

function isOptionalWholeNumber(raw: string) {
  const value = raw.trim();
  if (!value) return true;
  if (!/^\d+$/.test(value)) return false;
  const number = Number(value);
  return Number.isSafeInteger(number) && number <= 100_000;
}
