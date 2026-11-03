export const DEFAULT_DAILY_CALORIE_LIMIT = 2000;
export const DEFAULT_DAILY_PROTEIN_LIMIT = 100;
export const DEFAULT_DAILY_CARBOHYDRATES_LIMIT = 250;
export const DEFAULT_DAILY_FAT_LIMIT = 67;

export function macrosForCalories(calories: number) {
  return {
    dailyProteinLimit: Math.max(1, Math.round(calories * 0.05)),
    dailyCarbohydratesLimit: Math.max(1, Math.round(calories * 0.125)),
    dailyFatLimit: Math.max(1, Math.round(calories * 0.3 / 9)),
  };
}

export function validateUserProfile(value: unknown) {
  if (value !== undefined && value !== null && typeof value !== "object") return { success: false as const };
  const profile = (value ?? {}) as Record<string, unknown>;
  const dailyCalorieLimit = profile.dailyCalorieLimit ?? DEFAULT_DAILY_CALORIE_LIMIT;
  if (typeof dailyCalorieLimit !== "number" || !Number.isInteger(dailyCalorieLimit) || dailyCalorieLimit < 1 || dailyCalorieLimit > 100_000) {
    return { success: false as const };
  }
  const derivedMacros = macrosForCalories(dailyCalorieLimit);
  const limits = [profile.dailyProteinLimit ?? derivedMacros.dailyProteinLimit,
    profile.dailyCarbohydratesLimit ?? derivedMacros.dailyCarbohydratesLimit,
    profile.dailyFatLimit ?? derivedMacros.dailyFatLimit];
  if (limits.some((limit) => typeof limit !== "number" || !Number.isInteger(limit) || limit < 1 || limit > 100_000)) {
    return { success: false as const };
  }
  return { success: true as const, data: {
    dailyCalorieLimit,
    dailyProteinLimit: limits[0] as number,
    dailyCarbohydratesLimit: limits[1] as number,
    dailyFatLimit: limits[2] as number,
  } };
}

export function validateDailyCalorieLimit(value: unknown): { success: true; data: number } | { success: false } {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 100_000) {
    return { success: false };
  }
  return { success: true, data: value };
}
