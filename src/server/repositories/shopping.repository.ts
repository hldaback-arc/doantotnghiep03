import { prisma } from "../../lib/prisma.ts";

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

export async function getProductsByStore(storeId: string) {
  return prisma.store_products.findMany({
    where: { store_id: storeId, active: true, deleted_at: null },
    include: { products: true },
  });
}

export async function createPurchaseRecord(input: {
  id?: string;
  userId: string;
  cartId: string;
  idempotencyKey: string;
  actualTotal: string;
  status?: string;
}) {
  return prisma.purchases.create({
    data: {
      ...(input.id ? { id: input.id } : {}),
      user_id: input.userId,
      cart_id: input.cartId,
      idempotency_key: input.idempotencyKey,
      actual_total: input.actualTotal,
      status: input.status ?? "PENDING",
    },
    include: { purchase_items: true },
  });
}

export async function createPurchaseItemRecord(input: {
  id?: string;
  purchaseId: string;
  productId: string;
  storeId: string;
  quantity: string;
  unit: string;
  snapshotPrice: string;
  actualPrice: string;
  productSourceId: string;
  sourceUpdatedAt: Date;
}) {
  return prisma.purchase_items.create({
    data: {
      ...(input.id ? { id: input.id } : {}),
      purchase_id: input.purchaseId,
      product_id: input.productId,
      store_id: input.storeId,
      quantity: input.quantity,
      unit: input.unit,
      snapshot_price: input.snapshotPrice,
      actual_price: input.actualPrice,
      product_source_id: input.productSourceId,
      source_updated_at: input.sourceUpdatedAt,
    },
  });
}
