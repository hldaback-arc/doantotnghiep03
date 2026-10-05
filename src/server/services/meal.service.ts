import type { Dish, Ingredient, PantryItem } from "../../lib/types.ts";
import {
  addPantryItemForUser,
  createDishForUser,
  createIngredientForUser,
  getDishByIdForUser,
  getDishesByUser,
  getIngredientsByUser,
  getPantryByUser,
} from "../repositories/meal.repository.ts";

export function computeDishIngredientsStatus(
  dish: Pick<Dish, "ingredients">,
  pantry: Array<Pick<PantryItem, "ingredientId" | "quantity" | "unit">>,
) {
  const pantryMap = new Map(
    pantry.map((item) => [item.ingredientId, Number(item.quantity)]),
  );

  const missingIngredients = dish.ingredients
    .map((ingredient) => {
      const required = Number(ingredient.quantity);
      const available = pantryMap.get(ingredient.ingredientId) ?? 0;
      const missing = Math.max(0, required - available);
      return {
        ingredientId: ingredient.ingredientId,
        required,
        available,
        missing,
        unit: ingredient.unit,
      };
    })
    .filter((ingredient) => ingredient.missing > 0);

  return {
    canCook: missingIngredients.length === 0,
    missingIngredients,
  };
}

export async function listIngredients(userId: string): Promise<Ingredient[]> {
  const records = await getIngredientsByUser(userId);
  return records.map((record) => ({
    id: record.id,
    userId,
    name: record.name,
    unit: record.default_unit ?? "unit",
    category: record.category ?? "general",
    createdAt: record.created_at.toISOString(),
  }));
}

export async function createIngredient(input: Omit<Ingredient, "createdAt">): Promise<Ingredient> {
  const record = await createIngredientForUser({
    id: input.id,
    userId: input.userId,
    name: input.name,
    unit: input.unit,
    category: input.category,
  });

  return {
    id: record.id,
    userId: input.userId,
    name: record.name,
    unit: record.default_unit ?? input.unit,
    category: record.category ?? input.category,
    createdAt: record.created_at.toISOString(),
  };
}

export async function listDishes(userId: string): Promise<Dish[]> {
  const records = await getDishesByUser(userId);
  return records.map((record) => ({
    id: record.id,
    userId,
    name: record.name,
    description: record.description ?? undefined,
    ingredients: record.dish_ingredients.map((item) => ({
      ingredientId: item.ingredient_id,
      quantity: item.quantity.toString(),
      unit: item.unit,
    })),
    createdAt: record.created_at.toISOString(),
  }));
}

export async function createDish(input: Omit<Dish, "createdAt">): Promise<Dish> {
  const record = await createDishForUser({
    id: input.id,
    userId: input.userId,
    name: input.name,
    description: input.description,
    ingredients: input.ingredients,
  });

  return {
    id: record.id,
    userId: input.userId,
    name: record.name,
    description: record.description ?? undefined,
    ingredients: record.dish_ingredients.map((item) => ({
      ingredientId: item.ingredients.id,
      quantity: item.quantity.toString(),
      unit: item.unit,
    })),
    createdAt: record.created_at.toISOString(),
  };
}

export async function listPantry(userId: string): Promise<PantryItem[]> {
  const records = await getPantryByUser(userId);
  return records.map((record) => ({
    id: record.id,
    userId,
    ingredientId: record.ingredient_id,
    quantity: record.quantity.toString(),
    unit: record.unit,
    expiryDate: record.expires_at?.toISOString(),
    createdAt: record.created_at.toISOString(),
  }));
}

export async function addPantryItem(input: Omit<PantryItem, "createdAt">): Promise<PantryItem> {
  const record = await addPantryItemForUser({
    id: input.id,
    userId: input.userId,
    ingredientId: input.ingredientId,
    quantity: input.quantity,
    unit: input.unit,
    expiryDate: input.expiryDate,
  });

  return {
    id: record.id,
    userId: input.userId,
    ingredientId: record.ingredient_id,
    quantity: record.quantity.toString(),
    unit: record.unit,
    expiryDate: record.expires_at?.toISOString(),
    createdAt: record.created_at.toISOString(),
  };
}

export async function getDishIngredientsStatus(userId: string, dishId: string) {
  const dish = await getDishByIdForUser(userId, dishId);
  if (!dish) {
    return { dish: null, missingIngredients: [] };
  }

  const pantry = await getPantryByUser(userId);
  const status = computeDishIngredientsStatus(
    {
      ingredients: dish.dish_ingredients.map((item) => ({
        ingredientId: item.ingredient_id,
        quantity: item.quantity.toString(),
        unit: item.unit,
      })),
    },
    pantry.map((item) => ({
      ingredientId: item.ingredient_id,
      quantity: item.quantity.toString(),
      unit: item.unit,
    })),
  );

  return {
    dish: {
      id: dish.id,
      userId,
      name: dish.name,
      description: dish.description ?? undefined,
      ingredients: dish.dish_ingredients.map((item) => ({
        ingredientId: item.ingredient_id,
        quantity: item.quantity.toString(),
        unit: item.unit,
      })),
      createdAt: dish.created_at.toISOString(),
    },
    missingIngredients: status.missingIngredients,
    canCook: status.canCook,
  };
}
