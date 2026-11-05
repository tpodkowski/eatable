import type { Product } from "@eatable/shared";

export function filterProducts(products: Product[], query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return products;
  return products.filter((product) =>
    `${product.name} ${product.brand ?? ""}`.toLocaleLowerCase().includes(normalizedQuery),
  );
}
