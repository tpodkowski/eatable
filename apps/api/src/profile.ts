export const DEFAULT_DAILY_CALORIE_LIMIT = 2000;

export function validateDailyCalorieLimit(value: unknown): { success: true; data: number } | { success: false } {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 100_000) {
    return { success: false };
  }
  return { success: true, data: value };
}
