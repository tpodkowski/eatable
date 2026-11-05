export interface HealthResponse {
  status: "ok";
  service: "eatable-api";
  timestamp: string;
}

export interface UserProfile {
  dailyCalorieLimit: number;
  dailyProteinLimit: number;
  dailyCarbohydratesLimit: number;
  dailyFatLimit: number;
}

export interface MealEntry {
  id: string;
  productId: string | null;
  title: string;
  quantity: string | null;
  notes: string | null;
  calories: number | null;
  protein: number | null;
  carbohydrates: number | null;
  fat: number | null;
  createdAt: string;
}

export type ProductNutritionBasis = "g" | "ml";

export interface Product {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  nutritionBasis: ProductNutritionBasis;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  name: string;
  brand?: string | null;
  barcode?: string | null;
  nutritionBasis: ProductNutritionBasis;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
}

export interface AddProductToMealInput {
  date: string;
  productId: string;
  quantity: number;
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
