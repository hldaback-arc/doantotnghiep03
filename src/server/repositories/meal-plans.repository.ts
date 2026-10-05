import { prisma } from "../../lib/prisma.ts";

export async function getMealPlansByUser(userId: string) {
  return prisma.meal_plans.findMany({
    where: { user_id: userId, deleted_at: null },
    include: {
      meal_plan_items: true,
    },
    orderBy: { created_at: "desc" },
  });
}

export async function getMealPlanByIdForUser(userId: string, mealPlanId: string) {
  return prisma.meal_plans.findFirst({
    where: { id: mealPlanId, user_id: userId, deleted_at: null },
    include: {
      meal_plan_items: true,
    },
  });
}

export async function createMealPlanForUser(input: {
  id?: string;
  userId: string;
  planDate: string;
  peopleCount: number;
  dayCount: number;
  goal?: string | null;
  status?: string;
}) {
  return prisma.meal_plans.create({
    data: {
      ...(input.id ? { id: input.id } : {}),
      user_id: input.userId,
      plan_date: new Date(input.planDate),
      people_count: input.peopleCount,
      day_count: input.dayCount,
      goal: input.goal ?? null,
      status: input.status ?? "DRAFT",
    },
    include: { meal_plan_items: true },
  });
}

export async function addMealPlanItemForUser(input: {
  mealPlanId: string;
  dishId?: string;
  dishNameSnapshot: string;
  dayNumber: number;
  mealType: string;
  servings: string;
}) {
  return prisma.meal_plan_items.create({
    data: {
      meal_plan_id: input.mealPlanId,
      dish_id: input.dishId ?? null,
      day_number: input.dayNumber,
      meal_type: input.mealType,
      servings: input.servings,
      dish_name_snapshot: input.dishNameSnapshot,
    },
  });
}

export async function getCartSessionsByUser(userId: string) {
  return prisma.cart_sessions.findMany({
    where: { user_id: userId, deleted_at: null },
    orderBy: { created_at: "desc" },
  });
}

export async function createCartSessionForUser(input: {
  id?: string;
  userId: string;
  mealPlanId?: string | null;
  budgetSnapshot: string;
  strategy: string;
  status?: string;
}) {
  return prisma.cart_sessions.create({
    data: {
      ...(input.id ? { id: input.id } : {}),
      user_id: input.userId,
      meal_plan_id: input.mealPlanId ?? null,
      budget_snapshot: input.budgetSnapshot,
      strategy: input.strategy,
      status: input.status ?? "DRAFT",
      currency: "VND",
    },
  });
}
