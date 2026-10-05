import type { Transaction } from "./types.ts";
import { fromCents, sumMoney, toCents } from "./money.ts";

/* Supported report grouping levels; all ranges and buckets use UTC. */
export type SpendingPeriod = "day" | "week" | "month" | "year";

/* Report response with period totals, category breakdown, and trend buckets. */
export interface SpendingReport {
  period: SpendingPeriod;
  from: string;
  to: string;
  totalIncome: string;
  totalExpense: string;
  availableBalance: string;
  categories: Array<{
    categoryId: string | null;
    category: string;
    income: string;
    expense: string;
  }>;
  trend: Array<{
    period: string;
    income: string;
    expense: string;
  }>;
}

/* Produces a stable UTC date key for daily report buckets. */
function utcDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

/* Resolves the selected date into an inclusive start/exclusive end range. */
export function getReportRange(period: SpendingPeriod, date: string) {
  const selectedDate = new Date(`${date}T00:00:00.000Z`);
  let start: Date;
  let end: Date;
  let bucket: "day" | "month";

  if (period === "day") {
    start = selectedDate;
    end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 1));
    bucket = "day";
  } else if (period === "week") {
    const offset = (selectedDate.getUTCDay() + 6) % 7;
    start = new Date(Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), selectedDate.getUTCDate() - offset));
    end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 7));
    bucket = "day";
  } else if (period === "month") {
    start = new Date(Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), 1));
    end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    bucket = "day";
  } else {
    start = new Date(Date.UTC(selectedDate.getUTCFullYear(), 0, 1));
    end = new Date(Date.UTC(start.getUTCFullYear() + 1, 0, 1));
    bucket = "month";
  }

  return { start, end, bucket };
}

/* Aggregates a user's transactions by category and period using exact money helpers. */
export function buildSpendingReport(
  period: SpendingPeriod,
  start: Date,
  end: Date,
  transactions: Transaction[],
): SpendingReport {
  const categoryMap = new Map<string, { categoryId: string | null; category: string; income: string[]; expense: string[] }>();
  const bucketMap = new Map<string, { income: string[]; expense: string[] }>();
  const bucketType = period === "year" ? "month" : "day";

  for (const transaction of transactions) {
    const categoryKey = transaction.categoryId ?? transaction.category.toLowerCase();
    const category = categoryMap.get(categoryKey) ?? {
      categoryId: transaction.categoryId ?? null,
      category: transaction.category,
      income: [],
      expense: [],
    };
    const bucketDate = new Date(transaction.date);
    const bucketKey = bucketType === "month"
      ? bucketDate.toISOString().slice(0, 7)
      : utcDateKey(bucketDate);

    if (transaction.type === "income") {
      category.income.push(transaction.amount);
      const bucket = bucketMap.get(bucketKey) ?? { income: [], expense: [] };
      bucket.income.push(transaction.amount);
      bucketMap.set(bucketKey, bucket);
    } else {
      category.expense.push(transaction.amount);
      const bucket = bucketMap.get(bucketKey) ?? { income: [], expense: [] };
      bucket.expense.push(transaction.amount);
      bucketMap.set(bucketKey, bucket);
    }
    categoryMap.set(categoryKey, category);
  }

  const trend: SpendingReport["trend"] = [];
  for (let cursor = new Date(start); cursor < end;) {
    const key = bucketType === "month" ? cursor.toISOString().slice(0, 7) : utcDateKey(cursor);
    const bucket = bucketMap.get(key) ?? { income: [], expense: [] };
    trend.push({ period: key, income: sumMoney(bucket.income), expense: sumMoney(bucket.expense) });
    cursor = bucketType === "month"
      ? new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))
      : new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate() + 1));
  }

  const totalIncome = sumMoney(transactions.filter((item) => item.type === "income").map((item) => item.amount));
  const totalExpense = sumMoney(transactions.filter((item) => item.type === "expense").map((item) => item.amount));

  return {
    period,
    from: start.toISOString(),
    to: end.toISOString(),
    totalIncome,
    totalExpense,
    availableBalance: fromCents(toCents(totalIncome) - toCents(totalExpense)),
    categories: [...categoryMap.values()]
      .map((item) => ({
        categoryId: item.categoryId,
        category: item.category,
        income: sumMoney(item.income),
        expense: sumMoney(item.expense),
      }))
      .sort((left, right) => toCents(right.expense) > toCents(left.expense) ? 1 : -1),
    trend,
  };
}