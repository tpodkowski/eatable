import { useEffect, useState } from "react";
import type { CreateMealEntryInput, DailyMealsResponse } from "@eatable/shared";
import { localDateKey } from "../../lib/dates";
import { createMealEntry, fetchDailyMeals } from "../../lib/meals-api";

export function useDailyMeals(userId: string | undefined) {
  const [date, setDate] = useState(() => localDateKey(new Date()));
  const [dailyMeals, setDailyMeals] = useState<DailyMealsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setDailyMeals(null);
      setIsLoading(false);
      return;
    }

    let active = true;
    async function loadMeals() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await fetchDailyMeals(date);
        if (active) setDailyMeals(result);
      } catch {
        if (active) setError("errors.mealsLoadFailed");
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadMeals();
    return () => {
      active = false;
    };
  }, [date, userId]);

  async function addEntry(mealTypeId: string, input: Omit<CreateMealEntryInput, "date">) {
    const createdEntry = await createMealEntry(mealTypeId, { ...input, date });
    setDailyMeals((current) => current && ({
      ...current,
      mealTypes: current.mealTypes.map((mealType) => mealType.id === mealTypeId
        ? { ...mealType, entries: [...mealType.entries, createdEntry] }
        : mealType),
    }));
  }

  return { date, setDate, dailyMeals, isLoading, error, addEntry };
}
