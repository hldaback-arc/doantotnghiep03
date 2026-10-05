import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

function getMonthRange(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return {
    start: new Date(Date.UTC(year, monthNumber - 1, 1)),
    end: new Date(Date.UTC(year, monthNumber, 0)),
  };
}

async function findOrCreateCategory(
  client: Prisma.TransactionClient,
  userId: string,
  name: string,
  type: "INCOME" | "EXPENSE",
) {
  const normalizedName = name.trim();
  return (
    (await client.categories.findFirst({
      where: { user_id: userId, name: normalizedName, type, deleted_at: null },
    })) ??
    (await client.categories.findFirst({
      where: { user_id: null, name: normalizedName, type, deleted_at: null },
    })) ??
    (await client.categories.create({
      data: { user_id: userId, name: normalizedName, type },
    }))
  );
}

export async function getBudgetsByUser(userId: string) {
  return prisma.budgets.findMany({
    where: { user_id: userId, deleted_at: null, status: "ACTIVE" },
    include: {
      budget_categories: { include: { categories: true } },
    },
    orderBy: { period_start: "desc" },
  });
}

export async function getTransactionsByUser(userId: string, month?: string) {
  const range = month ? getMonthRange(month) : undefined;
  return prisma.transactions.findMany({
    where: {
      user_id: userId,
      deleted_at: null,
      status: "POSTED",
      ...(range
        ? { transaction_date: { gte: range.start, lt: new Date(range.end.getTime() + 86400000) } }
        : {}),
    },
    include: { categories: true },
    orderBy: { transaction_date: "desc" },
  });
}

export async function getTransactionsInRangeByUser(userId: string, start: Date, end: Date) {
  return prisma.transactions.findMany({
    where: {
      user_id: userId,
      deleted_at: null,
      status: "POSTED",
      transaction_date: { gte: start, lt: end },
    },
    include: { categories: true },
    orderBy: { transaction_date: "asc" },
  });
}

export async function getBudgetAlertSettingsForUser(userId: string) {
  return prisma.budget_alert_settings.findMany({
    where: { user_id: userId, enabled: true },
    orderBy: { threshold_percent: "asc" },
  });
}

export async function replaceBudgetAlertSettings(
  userId: string,
  thresholds: string[],
) {
  return prisma.$transaction(async (client: Prisma.TransactionClient) => {
    await client.budget_alert_settings.deleteMany({ where: { user_id: userId } });
    if (thresholds.length) {
      await client.budget_alert_settings.createMany({
        data: thresholds.map((threshold) => ({
          user_id: userId,
          threshold_percent: threshold,
          enabled: true,
        })),
      });
    }
    return client.budget_alert_settings.findMany({
      where: { user_id: userId, enabled: true },
      orderBy: { threshold_percent: "asc" },
    });
  });
}

export async function findBudgetAlert(
  userId: string,
  budgetId: string,
  categoryId: string | null,
  threshold: string,
) {
  return prisma.budget_alerts.findFirst({
    where: { user_id: userId, budget_id: budgetId, category_id: categoryId, threshold_percent: threshold },
  });
}

export async function createBudgetAlert(input: {
  userId: string;
  budgetId: string;
  categoryId: string | null;
  threshold: string;
}) {
  return prisma.budget_alerts.create({
    data: {
      user_id: input.userId,
      budget_id: input.budgetId,
      category_id: input.categoryId,
      threshold_percent: input.threshold,
    },
  });
}

export async function listBudgetAlertsForMonth(userId: string, month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 1));
  return prisma.budget_alerts.findMany({
    where: { user_id: userId, triggered_at: { gte: start, lt: end } },
    include: { categories: true },
    orderBy: { triggered_at: "desc" },
  });
}

export async function createBudgetRecord(input: {
  id?: string;
  userId: string;
  month: string;
  total: string;
  category?: string;
  categoryLimit?: string;
}) {
  const { start, end } = getMonthRange(input.month);
  return prisma.$transaction(async (client: Prisma.TransactionClient) => {
    const existing = await client.budgets.findFirst({
      where: {
        user_id: input.userId,
        period_start: start,
        period_end: end,
        deleted_at: null,
      },
      include: { budget_categories: { include: { categories: true } } },
    });

    const budget = existing
      ? await client.budgets.update({
          where: { id: existing.id },
          data: { total_budget: input.total, status: "ACTIVE" },
          include: { budget_categories: { include: { categories: true } } },
        })
      : await client.budgets.create({
          data: {
            ...(input.id ? { id: input.id } : {}),
            user_id: input.userId,
            period_start: start,
            period_end: end,
            total_budget: input.total,
            status: "ACTIVE",
          },
          include: { budget_categories: { include: { categories: true } } },
        });

    if (input.category) {
      const category = await findOrCreateCategory(client, input.userId, input.category, "EXPENSE");
      await client.budget_categories.upsert({
        where: { budget_id_category_id: { budget_id: budget.id, category_id: category.id } },
        create: { budget_id: budget.id, category_id: category.id, limit_amount: input.categoryLimit! },
        update: { limit_amount: input.categoryLimit! },
      });
    }

    return client.budgets.findUniqueOrThrow({
      where: { id: budget.id },
      include: { budget_categories: { include: { categories: true } } },
    });
  });
}

export async function updateBudgetRecord(
  userId: string,
  id: string,
  input: { month: string; total: string; category?: string; categoryLimit?: string },
) {
  const { start, end } = getMonthRange(input.month);
  return prisma.$transaction(async (client: Prisma.TransactionClient) => {
    const existing = await client.budgets.findFirst({
      where: { id, user_id: userId, deleted_at: null },
    });
    if (!existing) return null;

    const updated = await client.budgets.update({
      where: { id },
      data: { period_start: start, period_end: end, total_budget: input.total },
    });

    if (input.category) {
      const category = await findOrCreateCategory(client, userId, input.category, "EXPENSE");
      await client.budget_categories.upsert({
        where: { budget_id_category_id: { budget_id: id, category_id: category.id } },
        create: { budget_id: id, category_id: category.id, limit_amount: input.categoryLimit! },
        update: { limit_amount: input.categoryLimit! },
      });
    }

    return client.budgets.findUniqueOrThrow({
      where: { id: updated.id },
      include: { budget_categories: { include: { categories: true } } },
    });
  });
}

export async function deleteBudgetRecord(userId: string, id: string) {
  return prisma.budgets.updateMany({
    where: { id, user_id: userId, deleted_at: null },
    data: { deleted_at: new Date(), status: "CANCELLED" },
  });
}

export async function createTransactionRecord(input: {
  id?: string;
  idempotencyKey?: string;
  userId: string;
  type: "income" | "expense";
  category: string;
  amount: string;
  description: string;
  date: string;
}) {
  return prisma.$transaction(async (client: Prisma.TransactionClient) => {
    const idempotencyKey = input.idempotencyKey ?? input.id;
    if (idempotencyKey) {
      const existing = await client.transactions.findFirst({
        where: {
          user_id: input.userId,
          idempotency_key: idempotencyKey,
          deleted_at: null,
        },
        include: { categories: true },
      });
      if (existing) return existing;
    }

    const category = await findOrCreateCategory(
      client,
      input.userId,
      input.category,
      input.type === "income" ? "INCOME" : "EXPENSE",
    );

    return client.transactions.create({
      data: {
        ...(input.id ? { id: input.id } : {}),
        user_id: input.userId,
        type: input.type.toUpperCase(),
        category_id: category.id,
        amount: input.amount,
        note: input.description,
        transaction_date: new Date(input.date),
        idempotency_key: idempotencyKey ?? null,
      },
      include: { categories: true },
    });
  });
}

export async function updateTransactionRecord(
  userId: string,
  id: string,
  input: {
    type: "income" | "expense";
    category: string;
    amount: string;
    description: string;
    date: string;
  },
) {
  return prisma.$transaction(async (client: Prisma.TransactionClient) => {
    const existing = await client.transactions.findFirst({
      where: { id, user_id: userId, deleted_at: null },
    });
    if (!existing) return null;

    const category = await findOrCreateCategory(
      client,
      userId,
      input.category,
      input.type === "income" ? "INCOME" : "EXPENSE",
    );

    return client.transactions.update({
      where: { id },
      data: {
        type: input.type.toUpperCase(),
        category_id: category.id,
        amount: input.amount,
        note: input.description,
        transaction_date: new Date(input.date),
      },
      include: { categories: true },
    });
  });
}

export async function deleteTransactionRecord(userId: string, id: string) {
  return prisma.transactions.updateMany({
    where: { id, user_id: userId, deleted_at: null, purchase_id: null },
    data: { deleted_at: new Date(), status: "REVERSED" },
  });
}