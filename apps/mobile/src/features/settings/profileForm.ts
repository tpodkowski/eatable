import type { UserProfile } from "@eatable/shared";

export type ProfileLimitKey = keyof UserProfile;

export function updateProfileFromCalories(profile: UserProfile, raw: string): UserProfile {
  if (!/^\d*$/.test(raw)) return profile;
  const calories = raw === "" ? 0 : Number(raw);
  return {
    dailyCalorieLimit: calories,
    dailyProteinLimit: Math.max(1, Math.round(calories * 0.05)),
    dailyCarbohydratesLimit: Math.max(1, Math.round(calories * 0.125)),
    dailyFatLimit: Math.max(1, Math.round(calories * 0.3 / 9)),
  };
}

export function updateProfileFromMacro(profile: UserProfile, key: Exclude<ProfileLimitKey, "dailyCalorieLimit">, raw: string): UserProfile {
  if (!/^\d*$/.test(raw)) return profile;
  const value = raw === "" ? 0 : Number(raw);
  const next = { ...profile, [key]: value };
  return { ...next, dailyCalorieLimit: next.dailyProteinLimit * 4 + next.dailyCarbohydratesLimit * 4 + next.dailyFatLimit * 9 };
}

export function isValidUserProfile(profile: UserProfile): boolean {
  return Object.values(profile).every((value) => Number.isInteger(value) && value >= 1 && value <= 100_000);
}
