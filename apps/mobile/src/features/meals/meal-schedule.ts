import type { DailyMealType } from "@eatable/shared";

export function getNextMeal(mealTypes: DailyMealType[], now: Date) {
  if (mealTypes.length === 0) return null;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const slots = mealTypes.flatMap((meal) => {
    const match = typeof meal.mealTime === "string" ? /^(\d{2}):(\d{2})$/.exec(meal.mealTime) : null;
    if (!match) return [];
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour > 23 || minute > 59) return [];
    return [{ meal, minutes: hour * 60 + minute, time: meal.mealTime }];
  }).sort((a, b) => a.minutes - b.minutes);
  if (slots.length === 0) return null;
  const upcoming = slots.find((slot) => slot.minutes > currentMinutes);
  return upcoming ? { ...upcoming, tomorrow: false } : { ...slots[0], tomorrow: true };
}
