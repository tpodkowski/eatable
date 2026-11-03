import type { CreateMealEntryInput, MealEntry } from "@eatable/shared";

export type ValidatedMealEntryInput = Omit<CreateMealEntryInput, "quantity" | "notes" | "calories" | "protein" | "carbohydrates" | "fat"> & {
  quantity: string | null;
  notes: string | null;
  calories: number | null;
  protein: number | null;
  carbohydrates: number | null;
  fat: number | null;
};

export type MealEntryValidation =
  | { success: true; data: ValidatedMealEntryInput }
  | { success: false; error: string };

export function isValidMealDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const dateTimestamp = Date.parse(`${date}T00:00:00.000Z`);
  return Number.isFinite(dateTimestamp) && new Date(dateTimestamp).toISOString().slice(0, 10) === date;
}

export function validateMealEntryInput(input: unknown): MealEntryValidation {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { success: false, error: "invalidBody" };
  }

  const body = input as Record<string, unknown>;
  if (typeof body.date !== "string" || !isValidMealDate(body.date)) {
    return { success: false, error: "invalidDate" };
  }
  if (typeof body.title !== "string" || body.title.trim().length === 0 || body.title.trim().length > 160) {
    return { success: false, error: "invalidTitle" };
  }

  const quantity = body.quantity === undefined || body.quantity === "" ? null : body.quantity;
  if (quantity !== null && (typeof quantity !== "string" || quantity.trim().length === 0 || quantity.trim().length > 60)) {
    return { success: false, error: "invalidQuantity" };
  }

  const notes = body.notes === undefined || body.notes === "" ? null : body.notes;
  if (notes !== null && (typeof notes !== "string" || notes.trim().length > 500)) {
    return { success: false, error: "invalidNotes" };
  }

  const calories = body.calories === undefined || body.calories === "" ? null : body.calories;
  if (calories !== null && (!Number.isInteger(calories) || Number(calories) < 0 || Number(calories) > 100_000)) {
    return { success: false, error: "invalidCalories" };
  }
  const macros = ["protein", "carbohydrates", "fat"] as const;
  const values: Record<(typeof macros)[number], number | null> = { protein: null, carbohydrates: null, fat: null };
  for (const macro of macros) {
    const value = body[macro] === undefined || body[macro] === "" ? null : body[macro];
    if (value !== null && (!Number.isInteger(value) || Number(value) < 0 || Number(value) > 100_000)) {
      return { success: false, error: `invalid${macro[0].toUpperCase()}${macro.slice(1)}` };
    }
    values[macro] = typeof value === "number" ? value : null;
  }

  return {
    success: true,
    data: {
      date: body.date,
      title: body.title.trim(),
      quantity: typeof quantity === "string" ? quantity.trim() : null,
      notes: typeof notes === "string" && notes.trim().length > 0 ? notes.trim() : null,
      calories: typeof calories === "number" ? calories : null,
      ...values,
    },
  };
}

