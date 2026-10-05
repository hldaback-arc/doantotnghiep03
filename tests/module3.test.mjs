import assert from "node:assert/strict";
import test from "node:test";

import { computeDishIngredientsStatus } from "../src/server/services/meal.service.ts";

test("module 3 meal plan creation inputs validate and are mapped to project types", () => {
  const status = computeDishIngredientsStatus(
    {
      ingredients: [
        { ingredientId: "ing-a", quantity: "1.0", unit: "kg" },
        { ingredientId: "ing-b", quantity: "2", unit: "quả" },
      ],
    },
    [
      { ingredientId: "ing-a", quantity: "1.0", unit: "kg" },
      { ingredientId: "ing-b", quantity: "3", unit: "quả" },
    ],
  );

  assert.equal(status.canCook, true);
  assert.deepEqual(status.missingIngredients, []);
});
