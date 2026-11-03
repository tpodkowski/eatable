export interface HealthResponse {
  status: "ok";
  service: "eatable-api";
  timestamp: string;
}

export interface UserProfile {
  dailyCalorieLimit: number;
}

export interface MealEntry {
  id: string;
  title: string;
  quantity: string | null;
  notes: string | null;
  calories: number | null;
  protein: number | null;
  carbohydrates: number | null;
  fat: number | null;
  createdAt: string;
}

export interface CreateMealEntryInput {
  date: string;
  title: string;
  quantity?: string;
  notes?: string;
  calories?: number;
  protein?: number;
  carbohydrates?: number;
  fat?: number;
}

export type UpdateMealEntryInput = Omit<CreateMealEntryInput, "date">;

export interface DailyMealType {
  id: string;
  name: string;
  sortOrder: number;
  mealTime: string;
  entries: MealEntry[];
}

export interface DailyMealsResponse {
  date: string;
  mealTypes: DailyMealType[];
}
