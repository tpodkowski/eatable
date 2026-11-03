import { useEffect, useState } from "react";
import type { DailyMealsResponse } from "@eatable/shared";
import { beginGlobalLoading } from "../../lib/global-loading";
import { fetchDailyMeals } from "../../lib/meals-api";

export function useTomorrowMeals(date: string, shouldLoad: boolean) {
  const [meals, setMeals] = useState<DailyMealsResponse | null>(null);

  useEffect(() => {
    if (!shouldLoad) {
      setMeals(null);
      return;
    }

    let active = true;
    const finishLoading = beginGlobalLoading();
    void fetchDailyMeals(date)
      .then((result) => {
        if (active) setMeals(result);
      })
      .catch(() => {
        if (active) setMeals(null);
      })
      .finally(finishLoading);

    return () => {
      active = false;
    };
  }, [date, shouldLoad]);

  return meals;
}
