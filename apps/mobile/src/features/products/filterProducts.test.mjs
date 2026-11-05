import assert from "node:assert/strict";
import test from "node:test";
import { filterProducts } from "./filterProducts.ts";

const products = [
  { id: "1", name: "Oat milk", brand: "Oatly" },
  { id: "2", name: "Whole milk", brand: "Farm" },
];

test("filterProducts matches product names and brands without case sensitivity", () => {
  assert.deepEqual(filterProducts(products, "OATLY").map(({ id }) => id), ["1"]);
  assert.deepEqual(filterProducts(products, "milk").map(({ id }) => id), ["1", "2"]);
});

test("filterProducts returns all products for an empty or whitespace query", () => {
  assert.equal(filterProducts(products, " ").length, 2);
});
