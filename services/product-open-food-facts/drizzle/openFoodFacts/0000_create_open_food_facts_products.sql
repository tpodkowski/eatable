CREATE TABLE "open_food_facts_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_product_id" text NOT NULL,
	"name" text NOT NULL,
	"brand" text,
	"barcode" text,
	"nutrition_basis" text,
	"calories" numeric(10, 2),
	"protein" numeric(10, 2),
	"carbohydrates" numeric(10, 2),
	"fat" numeric(10, 2),
	"image_url" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "open_food_facts_products_provider_product_id_unique" UNIQUE("provider_product_id"),
	CONSTRAINT "open_food_facts_products_nutrition_basis_check" CHECK ("open_food_facts_products"."nutrition_basis" IS NULL OR "open_food_facts_products"."nutrition_basis" IN ('100g', '100ml'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "open_food_facts_products_barcode_idx" ON "open_food_facts_products" USING btree ("barcode") WHERE "open_food_facts_products"."barcode" IS NOT NULL;