import type { Pool } from "pg";
import type { Product, ProductInput } from "@eatable/shared";

type ProductRow = {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  nutrition_basis: "g" | "ml";
  calories: string | number;
  protein: string | number;
  carbohydrates: string | number;
  fat: string | number;
  created_at: Date | string;
  updated_at: Date | string;
};

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    barcode: row.barcode?.trim() ?? null,
    nutritionBasis: row.nutrition_basis,
    calories: Number(row.calories),
    protein: Number(row.protein),
    carbohydrates: Number(row.carbohydrates),
    fat: Number(row.fat),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

const productColumns = `id, name, brand, barcode, nutrition_basis, calories, protein, carbohydrates, fat,
  created_at, updated_at`;

export async function listProducts(pool: Pool, userId: string, search?: string): Promise<Product[]> {
  const term = search?.trim();
  const result = await pool.query<ProductRow>(
    `SELECT ${productColumns} FROM products
     WHERE user_id = $1 AND ($2::text IS NULL OR name ILIKE $3 OR COALESCE(brand, '') ILIKE $3 OR barcode = $4)
     ORDER BY lower(name), created_at DESC`,
    [userId, term || null, term ? `%${term.replace(/[\\%_]/g, "\\$&")}%` : null, term ? term.replace(/\D/g, "").padStart(14, "0") : null],
  );
  return result.rows.map(toProduct);
}

export async function getProduct(pool: Pool, userId: string, productId: string): Promise<Product | null> {
  const result = await pool.query<ProductRow>(
    `SELECT ${productColumns} FROM products WHERE user_id = $1 AND id = $2`, [userId, productId],
  );
  return result.rows[0] ? toProduct(result.rows[0]) : null;
}

export async function createProduct(pool: Pool, userId: string, data: ProductInput): Promise<Product> {
  const result = await pool.query<ProductRow>(
    `INSERT INTO products (user_id, name, brand, barcode, nutrition_basis, calories, protein, carbohydrates, fat)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING ${productColumns}`,
    [userId, data.name, data.brand ?? null, data.barcode ?? null, data.nutritionBasis, data.calories, data.protein, data.carbohydrates, data.fat],
  );
  return toProduct(result.rows[0]);
}

export async function updateProduct(pool: Pool, userId: string, productId: string, data: ProductInput): Promise<Product | null> {
  const result = await pool.query<ProductRow>(
    `UPDATE products SET name = $3, brand = $4, barcode = $5, nutrition_basis = $6,
       calories = $7, protein = $8, carbohydrates = $9, fat = $10, updated_at = now()
     WHERE user_id = $1 AND id = $2 RETURNING ${productColumns}`,
    [userId, productId, data.name, data.brand ?? null, data.barcode ?? null, data.nutritionBasis, data.calories, data.protein, data.carbohydrates, data.fat],
  );
  return result.rows[0] ? toProduct(result.rows[0]) : null;
}

export async function deleteProduct(pool: Pool, userId: string, productId: string): Promise<boolean> {
  const result = await pool.query("DELETE FROM products WHERE user_id = $1 AND id = $2", [userId, productId]);
  return (result.rowCount ?? 0) > 0;
}

export function isDuplicateBarcodeError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "23505";
}
