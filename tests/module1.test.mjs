import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { fromCents, sumMoney, toCents } from "../src/lib/money.ts";
import { getCrossedBudgetThresholds } from "../src/lib/budget-alerts.ts";
import { buildSpendingReport, getReportRange } from "../src/lib/reporting.ts";
import { budgetSchema, monthSchema } from "../src/lib/validators/budget.ts";
import { transactionSchema } from "../src/lib/validators/transaction.ts";
import { sqlServerGuidSchema } from "../src/lib/validators/uuid.ts";
import { hashPassword, verifyPassword } from "../src/server/auth/password.ts";
import { getSessionUserId, setSessionCookie } from "../src/server/auth/session.ts";

const originalSecret = process.env.SESSION_SECRET;
process.env.SESSION_SECRET = "test-secret-for-module-one-at-least-32-characters";

after(() => {
  if (originalSecret === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = originalSecret;
});

describe("module 1 money and validation", () => {
  it("calculates decimal money without floating-point drift", () => {
    assert.equal(toCents("0.10") + toCents("0.20"), 30n);
    assert.equal(sumMoney(["0.10", "0.20", "1.05"]), "1.35");
    assert.equal(fromCents(-35n), "-0.35");
  });

  it("accepts only valid calendar months and financial payloads", () => {
    assert.equal(monthSchema.safeParse("2026-09").success, true);
    assert.equal(monthSchema.safeParse("2026-13").success, false);
    assert.equal(
      budgetSchema.safeParse({ month: "2026-09", category: "Food", categoryLimit: "40.00", total: "100.00" }).success,
      true,
    );
    assert.equal(
      budgetSchema.safeParse({ month: "2026-09", total: "123456789012345678.00" }).success,
      false,
    );
    assert.equal(
      transactionSchema.safeParse({
        type: "expense",
        category: "Food",
        amount: "1.25",
        description: "Lunch",
        date: "2026-09-20",
      }).success,
      true,
    );
    assert.equal(
      transactionSchema.safeParse({
        type: "expense",
        category: "Food",
        amount: "123456789012345678.00",
        description: "Overflow",
        date: "2026-09-20",
      }).success,
      false,
    );
  });

  it("accepts SQL Server sequential GUIDs regardless of RFC version bits", () => {
    assert.equal(sqlServerGuidSchema.safeParse("2f36e4c0-e5bb-f111-ad0b-201a066bb85f").success, true);
  });
});

describe("module 1 account security", () => {
  it("hashes passwords and rejects incorrect passwords", async () => {
    const hash = await hashPassword("correct horse battery");
    assert.notEqual(hash, "correct horse battery");
    assert.equal(await verifyPassword("correct horse battery", hash), true);
    assert.equal(await verifyPassword("wrong password", hash), false);
  });

  it("accepts signed sessions and rejects tampered tokens", () => {
    const userId = "11111111-1111-4111-8111-111111111111";
    let cookieHeader = "";
    setSessionCookie({ setHeader: (_name, value) => { cookieHeader = value; } }, userId);
    const token = cookieHeader.split(";")[0].slice("doan3_session=".length);

    assert.equal(getSessionUserId({ cookies: { doan3_session: token } }), userId);
    assert.equal(getSessionUserId({ cookies: { doan3_session: `${token}tampered` } }), null);
  });
});

describe("module 1 spending reports", () => {
  it("crosses budget thresholds using exact integer comparisons", () => {
    assert.deepEqual(getCrossedBudgetThresholds("80.00", "100.00", ["80.00", "90.00", "100.00"]), ["80.00"]);
    assert.deepEqual(getCrossedBudgetThresholds("100.00", "100.00", ["80.00", "90.00", "100.00"]), ["80.00", "90.00", "100.00"]);
    assert.deepEqual(getCrossedBudgetThresholds("1.00", "0.00", ["80.00"]), []);
  });

  it("groups income and expense by category and period without float arithmetic", () => {
    const range = getReportRange("month", "2026-09-29");
    const report = buildSpendingReport("month", range.start, range.end, [
      {
        id: "income-1",
        userId: "user-1",
        type: "income",
        category: "Salary",
        categoryId: "income-category",
        amount: "100.10",
        description: "Salary",
        date: "2026-09-01T00:00:00.000Z",
        createdAt: "2026-09-01T00:00:00.000Z",
      },
      {
        id: "expense-1",
        userId: "user-1",
        type: "expense",
        category: "Food",
        categoryId: "food-category",
        amount: "10.10",
        description: "Food",
        date: "2026-09-29T12:00:00.000Z",
        createdAt: "2026-09-29T12:00:00.000Z",
      },
      {
        id: "expense-2",
        userId: "user-1",
        type: "expense",
        category: "Food",
        categoryId: "food-category",
        amount: "0.20",
        description: "Snack",
        date: "2026-09-29T13:00:00.000Z",
        createdAt: "2026-09-29T13:00:00.000Z",
      },
    ]);

    assert.equal(report.totalIncome, "100.10");
    assert.equal(report.totalExpense, "10.30");
    assert.equal(report.availableBalance, "89.80");
    assert.equal(report.categories.find((item) => item.category === "Food")?.expense, "10.30");
    assert.equal(report.trend.find((item) => item.period === "2026-09-29")?.expense, "10.30");
  });
});