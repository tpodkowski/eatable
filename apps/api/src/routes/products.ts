import type { FastifyPluginAsync } from "fastify";
import { fromNodeHeaders } from "better-auth/node";
import type { Product } from "@eatable/shared";
import { auth, pool } from "../auth.js";
import { validateProductInput } from "../products.js";
import { createProduct, deleteProduct, getProduct, isDuplicateBarcodeError, listProducts, updateProduct } from "../products/service.js";

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export const registerProductRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { q?: string }; Reply: Product[] | { error: string } }>("/api/products", async (request, reply) => {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
    if (!session) return reply.status(401).send({ error: "Unauthorized" });
    if (request.query.q !== undefined && (typeof request.query.q !== "string" || request.query.q.length > 100)) {
      return reply.status(400).send({ error: "invalidSearch" });
    }
    return listProducts(pool, session.user.id, request.query.q);
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
