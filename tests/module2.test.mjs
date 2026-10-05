import assert from "node:assert/strict";
import test from "node:test";

import { computeDishIngredientsStatus } from "../src/server/services/meal.service.ts";

test("module 2 calculates missing pantry ingredients accurately", () => {
  const dish = {
    id: "dish-1",
    name: "Cơm trứng cà chua",
    ingredients: [
      { ingredientId: "ing-1", quantity: "0.50", unit: "kg" },
      { ingredientId: "ing-2", quantity: "2", unit: "quả" },
      { ingredientId: "ing-3", quantity: "0.30", unit: "kg" },
    ],
  };

  const pantry = [
    { ingredientId: "ing-1", quantity: "0.20", unit: "kg" },
    { ingredientId: "ing-2", quantity: "3", unit: "quả" },
  ];

  const status = computeDishIngredientsStatus(dish, pantry);

  assert.deepEqual(status.missingIngredients, [
    {
      ingredientId: "ing-1",
      required: 0.5,
      available: 0.2,
      missing: 0.3,
      unit: "kg",
    },
    {
      ingredientId: "ing-3",
      required: 0.3,
      available: 0,
      missing: 0.3,
      unit: "kg",
    },
  ]);
  assert.equal(status.canCook, false);
});
