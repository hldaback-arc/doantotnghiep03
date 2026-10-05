import { type Budget, type BudgetCategoryLimit, type BudgetSummary, type Transaction } from "@/lib/types";
import { fromCents, sumMoney, toCents } from "@/lib/money";
import { buildSpendingReport, getReportRange, type SpendingPeriod } from "@/lib/reporting";
import { defaultBudgetAlertThresholds, getCrossedBudgetThresholds } from "@/lib/budget-alerts";
import {
  createBudgetRecord,
  createBudgetAlert,
  createTransactionRecord,
  deleteBudgetRecord,
  deleteTransactionRecord,
  getBudgetsByUser,
  getBudgetAlertSettingsForUser,
  findBudgetAlert,
  listBudgetAlertsForMonth,
  getTransactionsInRangeByUser,
  getTransactionsByUser,
  updateBudgetRecord,
  updateTransactionRecord,
  replaceBudgetAlertSettings,
} from "@/server/repositories/budget.repository";

type BudgetRecord = Awaited<ReturnType<typeof getBudgetsByUser>>[number];
type TransactionRecord = Awaited<ReturnType<typeof getTransactionsByUser>>[number];

function getMonth(record: BudgetRecord) {
  return record.period_start.toISOString().slice(0, 7);
}

function mapTransaction(record: TransactionRecord): Transaction {
  return {
    id: record.id,
    userId: record.user_id,
    type: record.type.toLowerCase() as Transaction["type"],
    category: record.categories.name,
    categoryId: record.category_id,
    amount: record.amount.toString(),
    description: record.note ?? "",
    date: record.transaction_date.toISOString(),
    createdAt: record.created_at.toISOString(),
  };
}

function periodTransactions(record: BudgetRecord, transactions: Transaction[]): Transaction[] {
  const start = record.period_start.getTime();
  const end = record.period_end.getTime() + 86400000;
  return transactions.filter((transaction) => {
    const date = new Date(transaction.date).getTime();
    return date >= start && date < end;
  });
}

function getExpenses(transactions: Transaction[]) {
  return sumMoney(
    transactions
      .filter((transaction) => transaction.type === "expense")
      .map((transaction) => transaction.amount),
  );
}

function mapBudget(record: BudgetRecord, transactions: Transaction[] = []): Budget {
  const periodRecords = periodTransactions(record, transactions);
  const categoryLimits: BudgetCategoryLimit[] = record.budget_categories.map((item) => {
    const categoryTransactions = periodRecords.filter(
      (transaction) => transaction.categoryId === item.category_id && transaction.type === "expense",
    );
    const spent = sumMoney(categoryTransactions.map((transaction) => transaction.amount));
    const limit = item.limit_amount.toString();

    return {
      categoryId: item.category_id,
      category: item.categories.name,
      limit,
      spent,
      remaining: fromCents(toCents(limit) - toCents(spent)),
    };
  });
  const total = record.total_budget.toString();
  const spent = getExpenses(periodRecords);

  return {
    id: record.id,
    userId: record.user_id,
    month: getMonth(record),
    category: "Tổng",
    total,
    remaining: fromCents(toCents(total) - toCents(spent)),
    categoryLimits,
    createdAt: record.created_at.toISOString(),
    updatedAt: record.updated_at.toISOString(),
  };
}

export async function listBudgets(userId: string): Promise<Budget[]> {
  const [records, transactionRecords] = await Promise.all([
    getBudgetsByUser(userId),
    getTransactionsByUser(userId),
  ]);
  const transactions = transactionRecords.map(mapTransaction);
  return records.map((record) => mapBudget(record, transactions));
}

export async function createBudget(input: {
  id?: string;
  userId: string;
  month: string;
  category?: string;
  categoryLimit?: string;
  total: string;
}): Promise<Budget> {
  const record = await createBudgetRecord(input);
  const transactions = (await getTransactionsByUser(input.userId, input.month)).map(mapTransaction);
  return mapBudget(record, transactions);
}

export async function updateBudget(
  userId: string,
  id: string,
  input: { month: string; total: string; category?: string; categoryLimit?: string },
): Promise<Budget | null> {
  const record = await updateBudgetRecord(userId, id, input);
  if (!record) return null;
  const transactions = (await getTransactionsByUser(userId, input.month)).map(mapTransaction);
  return mapBudget(record, transactions);
}

export async function deleteBudget(userId: string, id: string): Promise<boolean> {
  const result = await deleteBudgetRecord(userId, id);
  return result.count > 0;
}

export async function listTransactions(userId: string, month?: string): Promise<Transaction[]> {
  return (await getTransactionsByUser(userId, month)).map(mapTransaction);
}

export async function createTransaction(input: {
  id?: string;
  idempotencyKey?: string;
  userId: string;
  type: "income" | "expense";
  category: string;
  amount: string;
  description: string;
  date: string;
}): Promise<Transaction> {
  const record = await createTransactionRecord(input);
  return mapTransaction(record);
}

export async function updateTransaction(
  userId: string,
  id: string,
  input: Omit<Transaction, "id" | "userId" | "createdAt">,
): Promise<Transaction | null> {
  const record = await updateTransactionRecord(userId, id, input);
  return record ? mapTransaction(record) : null;
}

export async function deleteTransaction(userId: string, id: string): Promise<boolean> {
  const result = await deleteTransactionRecord(userId, id);
  return result.count > 0;
}

export async function getBudgetSummary(userId: string, month: string): Promise<BudgetSummary> {
  const [budgetRecords, transactionRecords, allTransactionRecords] = await Promise.all([
    getBudgetsByUser(userId),
    getTransactionsByUser(userId, month),
    getTransactionsByUser(userId),
  ]);
  const monthBudgets = budgetRecords.filter((record) => getMonth(record) === month);
  const transactions = transactionRecords.map(mapTransaction);
  const totalBudget = sumMoney(monthBudgets.map((budget) => budget.total_budget.toString()));
  const totalIncome = sumMoney(
    transactions
      .filter((transaction) => transaction.type === "income")
      .map((transaction) => transaction.amount),
  );
  const totalExpense = getExpenses(transactions);
  const allTransactions = allTransactionRecords.map(mapTransaction);
  const allIncome = sumMoney(
    allTransactions.filter((transaction) => transaction.type === "income").map((transaction) => transaction.amount),
  );
  const allExpenses = getExpenses(allTransactions);

  return {
    userId,
    month,
    totalBudget,
    totalIncome,
    totalExpense,
    availableBalance: fromCents(toCents(allIncome) - toCents(allExpenses)),
    remaining: fromCents(toCents(totalBudget) - toCents(totalExpense)),
    transactions,
  };
}

export async function getSpendingReport(
  userId: string,
  period: SpendingPeriod,
  date: string,
) {
  const range = getReportRange(period, date);
  const records = await getTransactionsInRangeByUser(userId, range.start, range.end);
  return buildSpendingReport(period, range.start, range.end, records.map(mapTransaction));
}

export async function getBudgetAlertSettings(userId: string) {
  const settings = await getBudgetAlertSettingsForUser(userId);
  const thresholds = settings.length
    ? settings.map((setting) => setting.threshold_percent.toString())
    : defaultBudgetAlertThresholds;
  return { thresholds };
}

export async function saveBudgetAlertSettings(userId: string, thresholds: number[]) {
  const settings = await replaceBudgetAlertSettings(
    userId,
    thresholds.map((threshold) => threshold.toFixed(2)),
  );
  return { thresholds: settings.map((setting) => setting.threshold_percent.toString()) };
}

export async function getBudgetAlerts(userId: string, month: string) {
  const [budgets, transactionRecords, settingRecords] = await Promise.all([
    getBudgetsByUser(userId),
    getTransactionsByUser(userId, month),
    getBudgetAlertSettingsForUser(userId),
  ]);
  const thresholds = settingRecords.length
    ? settingRecords.map((setting) => setting.threshold_percent.toString())
    : defaultBudgetAlertThresholds;
  const transactions = transactionRecords.map(mapTransaction);

  for (const budget of budgets.filter((record) => getMonth(record) === month)) {
    const monthTransactions = periodTransactions(budget, transactions);
    const overallSpent = getExpenses(monthTransactions);
    const scopes = [
      { categoryId: null as string | null, limit: budget.total_budget.toString(), spent: overallSpent },
      ...budget.budget_categories.map((item) => ({
        categoryId: item.category_id,
        limit: item.limit_amount.toString(),
        spent: getExpenses(monthTransactions.filter((transaction) => transaction.categoryId === item.category_id)),
      })),
    ];

    for (const scope of scopes) {
      for (const threshold of getCrossedBudgetThresholds(scope.spent, scope.limit, thresholds)) {
        const existing = await findBudgetAlert(userId, budget.id, scope.categoryId, threshold);
        if (!existing) {
          await createBudgetAlert({
            userId,
            budgetId: budget.id,
            categoryId: scope.categoryId,
            threshold,
          });
        }
      }
    }
  }

  const alerts = await listBudgetAlertsForMonth(userId, month);
  return alerts.map((alert) => ({
    id: alert.id,
    budgetId: alert.budget_id,
    categoryId: alert.category_id,
    category: alert.categories?.name ?? "Tổng ngân sách",
    thresholdPercent: alert.threshold_percent.toString(),
    triggeredAt: alert.triggered_at.toISOString(),
    acknowledgedAt: alert.acknowledged_at?.toISOString() ?? null,
  }));
}