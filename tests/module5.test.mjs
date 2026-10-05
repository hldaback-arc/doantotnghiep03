import assert from "node:assert/strict";
import test from "node:test";

import { summarizeFoodPreferences } from "../src/server/services/food-preferences.service.ts";

test("module 5 summarizes user food preferences without duplication", () => {
  const summary = summarizeFoodPreferences({
    dietType: "VEGETARIAN",
    allergies: [
      { allergenCode: "GLUTEN", ingredientId: "ing-1" },
      { allergenCode: "GLUTEN", ingredientId: "ing-2" },
      { allergenCode: "NUT", ingredientId: null },
    ],
    dislikedIngredients: ["ing-1", "ing-3"],
    preferredCuisines: ["Vietnamese", "Japanese", "Vietnamese"],
  });

  assert.equal(summary.dietType, "VEGETARIAN");
  assert.equal(summary.allergyCount, 2);
  assert.equal(summary.dislikedIngredientCount, 2);
  assert.equal(summary.preferredCuisineCount, 2);
  assert.deepEqual(summary.allergyCodes, ["GLUTEN", "NUT"]);
});
