import type { ProductInput, ProductNutritionBasis } from "@eatable/shared";

export type ValidatedProductInput = ProductInput & { brand: string | null; barcode: string | null };
export type ProductInputValidation =
  | { success: true; data: ValidatedProductInput }
  | { success: false; error: string };

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

function isNutritionValue(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100_000
    && Math.abs(Math.round(value * 100) - value * 100) < 1e-8;
}

export function validateProductInput(input: unknown): ProductInputValidation {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { success: false, error: "invalidBody" };
  }
  const body = input as Record<string, unknown>;
  if (typeof body.name !== "string" || body.name.trim().length === 0 || body.name.trim().length > 160) {
    return { success: false, error: "invalidName" };
  }

  const brand = body.brand === undefined || body.brand === null || body.brand === "" ? null : body.brand;
  if (brand !== null && (typeof brand !== "string" || brand.trim().length === 0 || brand.trim().length > 100)) {
    return { success: false, error: "invalidBrand" };
  }

  const barcodeValue = body.barcode === undefined || body.barcode === null || body.barcode === "" ? null : body.barcode;
  if (barcodeValue !== null && typeof barcodeValue !== "string") return { success: false, error: "invalidBarcode" };
  const barcode = barcodeValue === null ? null : normalizeGtin(barcodeValue);
  if (barcodeValue !== null && barcode === null) return { success: false, error: "invalidBarcode" };

  const nutritionBasis = body.nutritionBasis;
  if (nutritionBasis !== "g" && nutritionBasis !== "ml") return { success: false, error: "invalidNutritionBasis" };

  for (const field of ["calories", "protein", "carbohydrates", "fat"] as const) {
    if (!isNutritionValue(body[field])) return { success: false, error: `invalid${field[0].toUpperCase()}${field.slice(1)}` };
  }

  return {
    success: true,
    data: {
      name: body.name.trim(),
      brand: typeof brand === "string" ? brand.trim() : null,
      barcode,
      nutritionBasis: nutritionBasis as ProductNutritionBasis,
      calories: body.calories as number,
      protein: body.protein as number,
      carbohydrates: body.carbohydrates as number,
      fat: body.fat as number,
    },
  };
}

export function validateProductMealInput(input: unknown):
  | { success: true; data: { date: string; productId: string; quantity: number } }
  | { success: false; error: string } {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { success: false, error: "invalidBody" };
  }
  const body = input as Record<string, unknown>;
  if (typeof body.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    return { success: false, error: "invalidDate" };
  }
  const date = new Date(`${body.date}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== body.date) {
    return { success: false, error: "invalidDate" };
  }
  if (typeof body.productId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.productId)) {
    return { success: false, error: "invalidProductId" };
  }
  if (typeof body.quantity !== "number" || !Number.isFinite(body.quantity) || body.quantity <= 0
    || body.quantity > 100_000 || Math.abs(Math.round(body.quantity * 100) - body.quantity * 100) >= 1e-8) {
    return { success: false, error: "invalidQuantity" };
  }
  return { success: true, data: { date: body.date, productId: body.productId, quantity: body.quantity } };
}
