import type { ProductSearchResult } from "@eatable/shared";
import { normalizeGtin } from "@eatable/shared";
import {
  getOpenFoodFactsProductByBarcode,
  searchOpenFoodFactsProducts,
} from "@eatable/product-open-food-facts";
import type { Pool } from "pg";
import { listProducts, toUserProductSearchResult } from "./service.js";

export interface ProductSearchProvider {
  search(query: string): Promise<ProductSearchResult[]>;
}

export function createProductSearchProviders(pool: Pool, userId: string): ProductSearchProvider[] {
  return [
    {
      search: async (query) => (await listProducts(pool, userId, query)).map(toUserProductSearchResult),
    },
    {
      search: async (query) => {
        const [textResult, barcodeResult] = await Promise.allSettled([
          searchOpenFoodFactsProducts(query),
          normalizeGtin(query) ? getOpenFoodFactsProductByBarcode(query).then((product) => [product]) : Promise.resolve([]),
        ]);
        const textResults = textResult.status === "fulfilled" ? textResult.value : [];
        const exact = barcodeResult.status === "fulfilled" ? barcodeResult.value[0] : undefined;
        return exact
          ? [exact, ...textResults.filter((product) => product.providerProductId !== exact.providerProductId)]
          : textResults;
      },
    },
  ];
}

export async function searchProductProviders(
  providers: ProductSearchProvider[],
  query: string,
): Promise<ProductSearchResult[]> {
  const results = await Promise.allSettled(providers.map((provider) => provider.search(query)));
  return results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
}
