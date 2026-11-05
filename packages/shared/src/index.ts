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

export function normalizeGtin(value: string): string | null {
  const digits = value.trim();
  if (!/^\d+$/.test(digits) || ![8, 12, 13, 14].includes(digits.length)) return null;

  let sum = 0;
  let multiplier = 3;
  for (let index = digits.length - 2; index >= 0; index -= 1) {
    sum += Number(digits[index]) * multiplier;
    multiplier = multiplier === 3 ? 1 : 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  if (checkDigit !== Number(digits.at(-1))) return null;
  return digits.padStart(14, "0");
}

export type ProductProviderId = "open-food-facts" | "user";

export interface ProductSearchResult {
  id: string;
  provider: ProductProviderId;
  providerProductId: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  nutritionBasis: "100g" | "100ml" | null;
  calories: number | null;
  protein: number | null;
  carbohydrates: number | null;
  fat: number | null;
  imageUrl: string | null;
  imageAttribution: string | null;
  imageLicense: string | null;
  license: string;
  attribution: string;
}

export type ProvidedProduct = ProductSearchResult;

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
