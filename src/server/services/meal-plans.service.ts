import type { CartSessionSummary, MealPlan } from "../../lib/types.ts";
import {
  addMealPlanItemForUser,
  createCartSessionForUser,
  createMealPlanForUser,
  getCartSessionsByUser,
  getMealPlanByIdForUser,
  getMealPlansByUser,
} from "../repositories/meal-plans.repository.ts";

export async function listMealPlans(userId: string): Promise<MealPlan[]> {
  const records = await getMealPlansByUser(userId);
  return records.map((record) => ({
    id: record.id,
    userId,
    planDate: record.plan_date.toISOString(),
    peopleCount: record.people_count,
    dayCount: record.day_count,
    goal: record.goal ?? null,
    status: record.status as MealPlan["status"],
    items: record.meal_plan_items.map((item) => ({
      id: item.id,
      dishId: item.dish_id ?? undefined,
      dayNumber: item.day_number,
      mealType: item.meal_type as MealPlan["items"][number]["mealType"],
      servings: item.servings.toString(),
      dishNameSnapshot: item.dish_name_snapshot,
      createdAt: item.created_at.toISOString(),
    })),
    createdAt: record.created_at.toISOString(),
    updatedAt: record.updated_at.toISOString(),
  }));
}

export async function createMealPlan(input: {
  id?: string;
  userId: string;
  planDate: string;
  peopleCount: number;
  dayCount: number;
  goal?: string | null;
  status?: MealPlan["status"];
}): Promise<MealPlan> {
  const record = await createMealPlanForUser(input);
  return {
    id: record.id,
    userId: input.userId,
    planDate: record.plan_date.toISOString(),
    peopleCount: record.people_count,
    dayCount: record.day_count,
    goal: record.goal ?? null,
    status: record.status as MealPlan["status"],
    items: [],
    createdAt: record.created_at.toISOString(),
    updatedAt: record.updated_at.toISOString(),
  };
}

export async function addMealPlanItem(input: {
  mealPlanId: string;
  userId: string;
  dishId?: string;
  dishNameSnapshot: string;
  dayNumber: number;
  mealType: MealPlan["items"][number]["mealType"];
  servings: string;
}) {
  const plan = await getMealPlanByIdForUser(input.userId, input.mealPlanId);
  if (!plan) throw new Error("Meal plan not found");

  const item = await addMealPlanItemForUser({
    mealPlanId: input.mealPlanId,
    dishId: input.dishId,
    dishNameSnapshot: input.dishNameSnapshot,
    dayNumber: input.dayNumber,
    mealType: input.mealType,
    servings: input.servings,
  });

  return {
    id: item.id,
    dishId: item.dish_id ?? undefined,
    dayNumber: item.day_number,
    mealType: item.meal_type as MealPlan["items"][number]["mealType"],
    servings: item.servings.toString(),
    dishNameSnapshot: item.dish_name_snapshot,
    createdAt: item.created_at.toISOString(),
  };
}

export async function listCartSessions(userId: string): Promise<CartSessionSummary[]> {
  const records = await getCartSessionsByUser(userId);
  return records.map((record) => ({
    id: record.id,
    userId,
    mealPlanId: record.meal_plan_id ?? undefined,
    budgetSnapshot: record.budget_snapshot.toString(),
    strategy: record.strategy,
    status: record.status,
    createdAt: record.created_at.toISOString(),
  }));
}

export async function createCartSession(input: {
  id?: string;
  userId: string;
  mealPlanId?: string | null;
  budgetSnapshot: string;
  strategy: string;
  status?: string;
}): Promise<CartSessionSummary> {
  const record = await createCartSessionForUser(input);
  return {
    id: record.id,
    userId: input.userId,
    mealPlanId: record.meal_plan_id ?? undefined,
    budgetSnapshot: record.budget_snapshot.toString(),
    strategy: record.strategy,
    status: record.status,
    createdAt: record.created_at.toISOString(),
  };
}
