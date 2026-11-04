import { useCallback, useEffect, useState } from "react";
import type { CreateMealEntryInput, DailyMealsResponse, MealEntry } from "@eatable/shared";
import { localDateKey } from "../../lib/dates";
import { createMealEntry, deleteMealEntry, fetchDailyMeals, updateMealEntry } from "../../lib/meals-api";
import { beginGlobalLoading } from "../../lib/global-loading";

export function useDailyMeals(userId: string | undefined, initialDate = localDateKey(new Date())) {
  const [date, setDate] = useState(initialDate);
  const [dailyMeals, setDailyMeals] = useState<DailyMealsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [datesWithEntries, setDatesWithEntries] = useState<Set<string>>(() => new Set());
  const [caloriesByDate, setCaloriesByDate] = useState<Map<string, number>>(() => new Map());
  const [reloadToken, setReloadToken] = useState(0);
  const refresh = useCallback(() => setReloadToken((current) => current + 1), []);

  useEffect(() => {
    if (!userId) {
      setDailyMeals(null);
      setIsLoading(false);
      return;
    }

    let active = true;
    async function loadMeals() {
      const finishLoading = beginGlobalLoading();
      setIsLoading(true);
      setError(null);
      try {
        const result = await fetchDailyMeals(date);
        if (active) {
          setDailyMeals(result);
          setCaloriesByDate((current) => new Map(current).set(date, result.mealTypes.flatMap((mealType) => mealType.entries).reduce((sum, entry) => sum + (entry.calories ?? 0), 0)));
          setDatesWithEntries((current) => {
            const next = new Set(current);
            if (result.mealTypes.some((mealType) => mealType.entries.length > 0)) next.add(date);
            else next.delete(date);
            return next;
          });
        }
      } catch {
        if (active) setError("errors.mealsLoadFailed");
      } finally {
        finishLoading();
        if (active) setIsLoading(false);
      }
    }

    void loadMeals();
    return () => {
      active = false;
    };
  }, [date, userId, reloadToken]);

  async function addEntry(mealTypeId: string, input: Omit<CreateMealEntryInput, "date">) {
    const finishLoading = beginGlobalLoading();
    try {
      const createdEntry = await createMealEntry(mealTypeId, { ...input, date });
      setDailyMeals((current) => current && ({
        ...current,
        mealTypes: current.mealTypes.map((mealType) => mealType.id === mealTypeId
          ? { ...mealType, entries: [...mealType.entries, createdEntry] }
          : mealType),
      }));
      setCaloriesByDate((current) => new Map(current).set(date, (current.get(date) ?? 0) + (createdEntry.calories ?? 0)));
      setDatesWithEntries((current) => new Set(current).add(date));
    } finally { finishLoading(); }
  }

  async function editEntry(mealTypeId: string, entry: MealEntry, input: Omit<CreateMealEntryInput, "date">) {
    const finishLoading = beginGlobalLoading();
    try {
      const updatedEntry = await updateMealEntry(mealTypeId, entry.id, { ...input, date });
      setDailyMeals((current) => current && ({
        ...current,
        mealTypes: current.mealTypes.map((mealType) => mealType.id === mealTypeId
          ? { ...mealType, entries: mealType.entries.map((currentEntry) => currentEntry.id === entry.id ? updatedEntry : currentEntry) }
          : mealType),
      }));
      setCaloriesByDate((current) => new Map(current).set(date, Math.max(0, (current.get(date) ?? 0) - (entry.calories ?? 0) + (updatedEntry.calories ?? 0))));
    } finally { finishLoading(); }
  }

  async function removeEntry(mealTypeId: string, entry: MealEntry) {
    const finishLoading = beginGlobalLoading();
    try {
      await deleteMealEntry(mealTypeId, entry.id, date);
      setDailyMeals((current) => current && ({
        ...current,
        mealTypes: current.mealTypes.map((mealType) => mealType.id === mealTypeId
          ? { ...mealType, entries: mealType.entries.filter((currentEntry) => currentEntry.id !== entry.id) }
          : mealType),
      }));
      setCaloriesByDate((current) => new Map(current).set(date, Math.max(0, (current.get(date) ?? 0) - (entry.calories ?? 0))));
      setDatesWithEntries((current) => {
        if (!dailyMeals) return current;
        const hasOtherEntries = dailyMeals.mealTypes.some((mealType) =>
          mealType.entries.some((currentEntry) => !(mealType.id === mealTypeId && currentEntry.id === entry.id)),
        );
        if (hasOtherEntries) return current;
        const next = new Set(current);
        next.delete(date);
        return next;
      });
    } finally { finishLoading(); }
  }

  return { date, setDate, dailyMeals, datesWithEntries, caloriesByDate, isLoading, error, refresh, addEntry, editEntry, removeEntry };
}
