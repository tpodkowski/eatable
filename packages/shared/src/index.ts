export interface HealthResponse {
  status: "ok";
  service: "eatable-api";
  timestamp: string;
}

export interface MealEntry {
  id: string;
  title: string;
  notes: string | null;
  calories: number | null;
  createdAt: string;
}

export interface DailyMealType {
  id: string;
  name: string;
  sortOrder: number;
  entries: MealEntry[];
}

export interface DailyMealsResponse {
  date: string;
  mealTypes: DailyMealType[];
}
