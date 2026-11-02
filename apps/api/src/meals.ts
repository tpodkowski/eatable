import type { CreateMealEntryInput, MealEntry } from "@eatable/shared";

export type ValidatedMealEntryInput = Omit<CreateMealEntryInput, "quantity" | "notes" | "calories"> & {
  quantity: string | null;
  notes: string | null;
  calories: number | null;
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
  if (body.type !== "dish" && body.type !== "product") {
    return { success: false, error: "invalidType" };
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

  return {
    success: true,
    data: {
      date: body.date,
      type: body.type as MealEntry["type"],
      title: body.title.trim(),
      quantity: typeof quantity === "string" ? quantity.trim() : null,
      notes: typeof notes === "string" && notes.trim().length > 0 ? notes.trim() : null,
      calories: typeof calories === "number" ? calories : null,
    },
  };
}

