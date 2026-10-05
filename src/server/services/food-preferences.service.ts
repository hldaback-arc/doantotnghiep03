export type UserFoodPreferenceInput = {
  dietType?: string | null;
  allergies?: Array<{ allergenCode: string; ingredientId?: string | null }>;
  dislikedIngredients?: string[];
  preferredCuisines?: string[];
};

export function summarizeFoodPreferences(input: UserFoodPreferenceInput) {
  const allergyCodes = [...new Set((input.allergies ?? []).map((item) => item.allergenCode))];
  const dislikedIngredients = [...new Set(input.dislikedIngredients ?? [])];
  const preferredCuisines = [...new Set((input.preferredCuisines ?? []).filter(Boolean))];

  return {
    dietType: input.dietType ?? null,
    allergyCount: allergyCodes.length,
    dislikedIngredientCount: dislikedIngredients.length,
    preferredCuisineCount: preferredCuisines.length,
    allergyCodes,
    dislikedIngredients,
    preferredCuisines,
  };
}
