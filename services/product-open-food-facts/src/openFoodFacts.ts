import type { ProvidedProduct } from "@eatable/shared";
import { normalizeGtin } from "@eatable/shared";
import { eq } from "drizzle-orm";
import type { NewOpenFoodFactsProduct, OpenFoodFactsProduct } from "./db/schema.js";
import { openFoodFactsDb } from "./db/database.js";
import { openFoodFactsProducts } from "./db/schema.js";

type OpenFoodFactsPayload = {
  status?: number;
  product?: {
    code?: string;
    product_name?: string;
    brands?: string;
    image_url?: string;
    nutriments?: Record<string, unknown>;
  };
};

type OpenFoodFactsSearchPayload = { products?: OpenFoodFactsPayload["product"][] };

export interface OpenFoodFactsStore {
  findByBarcode(barcode: string): Promise<OpenFoodFactsProduct | undefined>;
  upsert(product: NewOpenFoodFactsProduct): Promise<OpenFoodFactsProduct>;
}

export const openFoodFactsStore: OpenFoodFactsStore = {
  async findByBarcode(barcode) {
    const [product] = await openFoodFactsDb.select().from(openFoodFactsProducts)
      .where(eq(openFoodFactsProducts.barcode, barcode)).limit(1);
    return product;
  },
  async upsert(product) {
    const [saved] = await openFoodFactsDb.insert(openFoodFactsProducts).values(product).onConflictDoUpdate({
      target: openFoodFactsProducts.providerProductId,
      set: {
        name: product.name,
        brand: product.brand,
        barcode: product.barcode,
        nutritionBasis: product.nutritionBasis,
        calories: product.calories,
        protein: product.protein,
        carbohydrates: product.carbohydrates,
        fat: product.fat,
        imageUrl: product.imageUrl,
        updatedAt: new Date(),
      },
    }).returning();
    return saved;
  },
};

export class OpenFoodFactsProviderError extends Error {
  constructor(public readonly kind: "notFound" | "timeout" | "unavailable") {
    super(kind);
  }
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

export function normalizeOpenFoodFactsProduct(payload: unknown, requestedBarcode: string): Omit<ProvidedProduct, "id"> | null {
  if (typeof payload !== "object" || payload === null) return null;
  const response = payload as OpenFoodFactsPayload;
  const source = response.product;
  if (response.status !== 1 || !source || typeof source.product_name !== "string" || !source.product_name.trim()) return null;
  const nutriments = source.nutriments ?? {};
  const hasMl = numberOrNull(nutriments["energy-kcal_100ml"]) !== null;
  const suffix = hasMl ? "100ml" : "100g";
  const barcode = normalizeGtin(typeof source.code === "string" ? source.code : requestedBarcode) ?? requestedBarcode;
  return {
    provider: "open-food-facts",
    providerProductId: typeof source.code === "string" && source.code ? source.code : requestedBarcode,
    name: source.product_name.trim().slice(0, 160),
    brand: typeof source.brands === "string" && source.brands.trim() ? source.brands.split(",")[0].trim().slice(0, 100) : null,
    barcode: barcode || null,
    nutritionBasis: suffix,
    calories: numberOrNull(nutriments[`energy-kcal_${suffix}`]),
    protein: numberOrNull(nutriments[`proteins_${suffix}`]),
    carbohydrates: numberOrNull(nutriments[`carbohydrates_${suffix}`]),
    fat: numberOrNull(nutriments[`fat_${suffix}`]),
    imageUrl: typeof source.image_url === "string" ? source.image_url : null,
    imageAttribution: "Open Food Facts contributors",
    imageLicense: "See the product image's license on Open Food Facts",
    license: "ODbL-1.0",
    attribution: "Data from Open Food Facts (https://world.openfoodfacts.org/)",
  };
}

function toProvidedProduct(row: OpenFoodFactsProduct): ProvidedProduct {
  return {
    id: `open-food-facts:${row.providerProductId}`,
    provider: "open-food-facts",
    providerProductId: row.providerProductId,
    name: row.name,
    brand: row.brand,
    barcode: row.barcode?.trim() || null,
    nutritionBasis: row.nutritionBasis,
    calories: row.calories,
    protein: row.protein,
    carbohydrates: row.carbohydrates,
    fat: row.fat,
    imageUrl: row.imageUrl,
    imageAttribution: "Open Food Facts contributors",
    imageLicense: "See the product image's license on Open Food Facts",
    license: "ODbL-1.0",
    attribution: "Data from Open Food Facts (https://world.openfoodfacts.org/)",
  };
}

function toStoredProduct(product: Omit<ProvidedProduct, "id">): NewOpenFoodFactsProduct {
  return {
    providerProductId: product.providerProductId,
    name: product.name,
    brand: product.brand,
    barcode: product.barcode,
    nutritionBasis: product.nutritionBasis,
    calories: product.calories,
    protein: product.protein,
    carbohydrates: product.carbohydrates,
    fat: product.fat,
    imageUrl: product.imageUrl,
  };
}

export async function getOpenFoodFactsProductByBarcode(
  barcodeInput: string,
  fetcher: typeof fetch = fetch,
  store: OpenFoodFactsStore = openFoodFactsStore,
): Promise<ProvidedProduct> {
  const barcode = normalizeGtin(barcodeInput);
  if (!barcode) throw new OpenFoodFactsProviderError("notFound");
  const cached = await store.findByBarcode(barcode);
  if (cached) return toProvidedProduct(cached);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  let payload: unknown;
  try {
    const response = await fetcher(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=code,product_name,brands,image_url,nutriments`, {
      signal: controller.signal,
      headers: { "User-Agent": "Eatable/1.0 (product lookup)" },
    });
    if (!response.ok) throw new OpenFoodFactsProviderError("unavailable");
    payload = await response.json();
  } catch (error) {
    if (error instanceof OpenFoodFactsProviderError) throw error;
    if (controller.signal.aborted) throw new OpenFoodFactsProviderError("timeout");
    throw new OpenFoodFactsProviderError("unavailable");
  } finally {
    clearTimeout(timeout);
  }
  const product = normalizeOpenFoodFactsProduct(payload, barcode);
  if (!product) throw new OpenFoodFactsProviderError("notFound");
  return toProvidedProduct(await store.upsert(toStoredProduct(product)));
}

export async function searchOpenFoodFactsProducts(
  query: string,
  fetcher: typeof fetch = fetch,
  store: OpenFoodFactsStore = openFoodFactsStore,
): Promise<ProvidedProduct[]> {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: "1",
    action: "process",
    json: "1",
    page_size: "20",
    fields: "code,product_name,brands,image_url,nutriments",
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  let products: OpenFoodFactsPayload["product"][];
  try {
    const response = await fetcher(`https://world.openfoodfacts.org/cgi/search.pl?${params}`, {
      signal: controller.signal,
      headers: { "User-Agent": "Eatable/1.0 (product search)" },
    });
    if (!response.ok) throw new OpenFoodFactsProviderError("unavailable");
    const payload = await response.json() as OpenFoodFactsSearchPayload;
    products = Array.isArray(payload.products) ? payload.products : [];
  } catch (error) {
    if (error instanceof OpenFoodFactsProviderError) throw error;
    throw new OpenFoodFactsProviderError(controller.signal.aborted ? "timeout" : "unavailable");
  } finally {
    clearTimeout(timeout);
  }

  const normalized = products.flatMap((product) => {
    if (!product || typeof product.code !== "string" || !product.code) return [];
    const normalizedProduct = normalizeOpenFoodFactsProduct({ status: 1, product }, product.code);
    return normalizedProduct ? [normalizedProduct] : [];
  });
  const saved = await Promise.all(normalized.map((product) => store.upsert(toStoredProduct(product))));
  return saved.map(toProvidedProduct);
}
