import type { FastifyPluginAsync } from "fastify";
import { fromNodeHeaders } from "better-auth/node";
import type { Product, ProductSearchResult, ProvidedProduct } from "@eatable/shared";
import { normalizeGtin } from "@eatable/shared";
import { getOpenFoodFactsProductByBarcode, OpenFoodFactsProviderError } from "@eatable/product-open-food-facts";
import { auth, pool } from "../auth.js";
import { validateProductInput } from "../products.js";
import { createProduct, deleteProduct, getProduct, isDuplicateBarcodeError, updateProduct } from "../products/service.js";
import { createProductSearchProviders, searchProductProviders } from "../products/providerRegistry.js";

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export const registerProductRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { barcode: string }; Reply: ProvidedProduct | { error: string } }>("/api/products/barcode/:barcode", async (request, reply) => {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
    if (!session) return reply.status(401).send({ error: "Unauthorized" });
    if (!normalizeGtin(request.params.barcode)) return reply.status(400).send({ error: "invalidBarcode" });
    try {
      return await getOpenFoodFactsProductByBarcode(request.params.barcode);
    } catch (error) {
      if (error instanceof OpenFoodFactsProviderError) {
        if (error.kind === "notFound") return reply.status(404).send({ error: "productNotFound" });
        if (error.kind === "timeout") return reply.status(504).send({ error: "providerTimeout" });
        return reply.status(502).send({ error: "providerUnavailable" });
      }
      throw error;
    }
  });

  app.get<{ Querystring: { q?: string }; Reply: ProductSearchResult[] | { error: string } }>("/api/products", async (request, reply) => {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
    if (!session) return reply.status(401).send({ error: "Unauthorized" });
    if (request.query.q !== undefined && (typeof request.query.q !== "string" || request.query.q.length > 100)) {
      return reply.status(400).send({ error: "invalidSearch" });
    }
    const query = request.query.q?.trim();
    if (!query) {
      const userProvider = createProductSearchProviders(pool, session.user.id)[0];
      return userProvider.search("");
    }
    return searchProductProviders(createProductSearchProviders(pool, session.user.id), query);
  });

  app.get<{ Params: { productId: string }; Reply: Product | { error: string } }>("/api/products/:productId", async (request, reply) => {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
    if (!session) return reply.status(401).send({ error: "Unauthorized" });
    if (!isUuid(request.params.productId)) return reply.status(400).send({ error: "invalidProductId" });
    const product = await getProduct(pool, session.user.id, request.params.productId);
    if (!product) return reply.status(404).send({ error: "productNotFound" });
    return product;
  });

  app.post<{ Body: unknown; Reply: Product | { error: string } }>("/api/products", async (request, reply) => {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
    if (!session) return reply.status(401).send({ error: "Unauthorized" });
    const validated = validateProductInput(request.body);
    if (!validated.success) return reply.status(400).send({ error: validated.error });
    try {
      return reply.status(201).send(await createProduct(pool, session.user.id, validated.data));
    } catch (error) {
      if (isDuplicateBarcodeError(error)) return reply.status(409).send({ error: "barcodeAlreadyExists" });
      throw error;
    }
  });

  app.put<{ Params: { productId: string }; Body: unknown; Reply: Product | { error: string } }>("/api/products/:productId", async (request, reply) => {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
    if (!session) return reply.status(401).send({ error: "Unauthorized" });
    if (!isUuid(request.params.productId)) return reply.status(400).send({ error: "invalidProductId" });
    const validated = validateProductInput(request.body);
    if (!validated.success) return reply.status(400).send({ error: validated.error });
    try {
      const product = await updateProduct(pool, session.user.id, request.params.productId, validated.data);
      if (!product) return reply.status(404).send({ error: "productNotFound" });
      return product;
    } catch (error) {
      if (isDuplicateBarcodeError(error)) return reply.status(409).send({ error: "barcodeAlreadyExists" });
      throw error;
    }
  });

  app.delete<{ Params: { productId: string }; Reply: { success: true } | { error: string } }>("/api/products/:productId", async (request, reply) => {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
    if (!session) return reply.status(401).send({ error: "Unauthorized" });
    if (!isUuid(request.params.productId)) return reply.status(400).send({ error: "invalidProductId" });
    const deleted = await deleteProduct(pool, session.user.id, request.params.productId);
    if (!deleted) return reply.status(404).send({ error: "productNotFound" });
    return { success: true };
  });
};
