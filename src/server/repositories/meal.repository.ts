import { prisma } from "../../lib/prisma.ts";

export async function getIngredientsByUser(userId: string) {
  return prisma.ingredients.findMany({
    where: { active: true, deleted_at: null },
    orderBy: { created_at: "desc" },
  });
}

export async function getDishesByUser(userId: string) {
  return prisma.dishes.findMany({
    where: { active: true, deleted_at: null },
    include: {
      dish_ingredients: {
        include: { ingredients: true },
      },
    },
    orderBy: { created_at: "desc" },
  });
}

export async function getDishByIdForUser(userId: string, dishId: string) {
  return prisma.dishes.findFirst({
    where: { id: dishId, active: true, deleted_at: null },
    include: {
      dish_ingredients: {
        include: { ingredients: true },
      },
    },
  });
}

export async function createIngredientForUser(input: {
  id?: string;
  userId: string;
  name: string;
  unit: string;
  category: string;
}) {
  return prisma.ingredients.create({
    data: {
      ...(input.id ? { id: input.id } : {}),
      name: input.name,
      normalized_name: input.name,
      category: input.category,
      default_unit: input.unit,
      active: true,
    },
  });
}

export async function createDishForUser(input: {
  id?: string;
  userId: string;
  name: string;
  description?: string;
  ingredients: Array<{ ingredientId: string; quantity: string; unit: string }>;
}) {
  return prisma.$transaction(async (client) => {
    const dish = await client.dishes.create({
      data: {
        ...(input.id ? { id: input.id } : {}),
        name: input.name,
        description: input.description ?? null,
        active: true,
      },
    });

    await client.dish_ingredients.createMany({
      data: input.ingredients.map((item) => ({
        dish_id: dish.id,
        ingredient_id: item.ingredientId,
        quantity: item.quantity,
        unit: item.unit,
        optional_flag: false,
      })),
    });

    return client.dishes.findUniqueOrThrow({
      where: { id: dish.id },
      include: {
        dish_ingredients: { include: { ingredients: true } },
      },
    });
  });
}

export async function getPantryByUser(userId: string) {
  return prisma.pantry_items.findMany({
    where: { user_id: userId, deleted_at: null },
    include: { ingredients: true },
    orderBy: { created_at: "desc" },
  });
}

export async function addPantryItemForUser(input: {
  id?: string;
  userId: string;
  ingredientId: string;
  quantity: string;
  unit: string;
  expiryDate?: string | null;
}) {
  return prisma.pantry_items.create({
    data: {
      ...(input.id ? { id: input.id } : {}),
      user_id: input.userId,
      ingredient_id: input.ingredientId,
      quantity: input.quantity,
      unit: input.unit,
      expires_at: input.expiryDate ? new Date(input.expiryDate) : null,
      estimated: false,
    },
    include: { ingredients: true },
  });
}
