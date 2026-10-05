import { useState, type FormEvent } from "react";
import { useRouter } from "next/router";
import type { GetServerSideProps } from "next";

import { formatCurrency } from "@/lib/money";
import type { SpendingReport } from "@/lib/reporting";
import type { Budget, BudgetAlert, BudgetSummary } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/server/auth/session";
import {
  getBudgetAlertSettings,
  getBudgetAlerts,
  getBudgetSummary,
  getSpendingReport,
  listBudgets,
} from "@/server/services/budget.service";

type HomeProps = {
  summary: BudgetSummary;
  budgets: Budget[];
  alerts: BudgetAlert[];
  alertThresholds: string[];
  report: SpendingReport;
  user: { email: string; name: string | null };
};

export const getServerSideProps: GetServerSideProps<HomeProps> = async ({ req }) => {
  const userId = getSessionUserId(req);
  if (!userId) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { email: true, deleted_at: true, profiles: { select: { full_name: true } } },
  });
  if (!user || user.deleted_at) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  const month = new Date().toISOString().slice(0, 7);
  const today = new Date().toISOString().slice(0, 10);
  const [summary, budgets, alerts, alertSettings, report] = await Promise.all([
    getBudgetSummary(userId, month),
    listBudgets(userId),
    getBudgetAlerts(userId, month),
    getBudgetAlertSettings(userId),
    getSpendingReport(userId, "month", today),
  ]);
  return {
    props: {
      summary,
      budgets,
      alerts,
      alertThresholds: alertSettings.thresholds,
      report,
      user: { email: user.email, name: user.profiles?.full_name ?? null },
    },
  };
};

export default function Home({ summary, budgets, alerts, alertThresholds, report, user }: HomeProps) {
  const router = useRouter();
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [formError, setFormError] = useState("");
  const [thresholdInput, setThresholdInput] = useState(alertThresholds.join(", "));
  const [alertSettingsError, setAlertSettingsError] = useState("");

  async function addTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData)),
    });
    if (!response.ok) {
      const result = await response.json();
      setFormError(result.error?.message ?? "Không thể lưu giao dịch.");
      return;
    }
    setShowTransactionForm(false);
    await router.replace(router.asPath);
  }

  async function createBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    const formData = new FormData(event.currentTarget);
    const response = await fetch(editingBudget ? `/api/budgets/${editingBudget.id}` : "/api/budgets", {
      method: editingBudget ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData)),
    });
    if (!response.ok) {
      const result = await response.json();
      setFormError(result.error?.message ?? "Không thể lưu ngân sách.");
      return;
    }
    setShowBudgetForm(false);
    setEditingBudget(null);
    await router.replace(router.asPath);
  }

  async function removeBudget(id: string) {
    const response = await fetch(`/api/budgets/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setFormError("Không thể xóa ngân sách.");
      return;
    }
    await router.replace(router.asPath);
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    await router.push("/login");
  }

  async function saveAlertSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAlertSettingsError("");
    const thresholds = thresholdInput.split(",").map((value) => Number(value.trim()));
    const response = await fetch("/api/budgets/alerts/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ thresholds }),
    });
    if (!response.ok) {
      const result = await response.json();
      setAlertSettingsError(result.error?.message ?? "Không thể lưu ngưỡng cảnh báo.");
      return;
    }
    await router.replace(router.asPath);
  }

  async function removeTransaction(id: string) {
    const response = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setFormError("Không thể xóa giao dịch.");
      return;
    }
    await router.replace(router.asPath);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-emerald-400">
              Module 01 · Budget dashboard
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Quản lý chi tiêu cá nhân</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-400 sm:inline">{user.name || user.email}</span>
            <button onClick={signOut} className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800">
              Đăng xuất
            </button>
            <button onClick={() => { setEditingBudget(null); setShowBudgetForm((visible) => !visible); setShowTransactionForm(false); }} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800">
              + Ngân sách
            </button>
            <button onClick={() => setShowTransactionForm((visible) => !visible)} className="rounded-lg border border-emerald-500/60 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20">
              + Giao dịch
            </button>
          </div>
        </header>

        {alerts.length > 0 && (
          <section aria-live="polite" className="mb-6 border-l-4 border-amber-400 bg-amber-400/10 px-4 py-3">
            <h2 className="font-semibold text-amber-200">Cảnh báo ngân sách</h2>
            <ul className="mt-2 space-y-1 text-sm text-amber-100">
              {alerts.map((alert) => (
                <li key={alert.id}>{alert.category}: đã sử dụng {alert.thresholdPercent}% ngân sách.</li>
              ))}
            </ul>
          </section>
        )}

        {showBudgetForm && (
          <form key={editingBudget?.id ?? "new-budget"} onSubmit={createBudget} className="mb-6 grid gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 sm:grid-cols-2">
            <input name="month" required type="month" defaultValue={editingBudget?.month ?? summary.month} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" />
            <input name="total" required inputMode="decimal" pattern="[0-9]+(\.[0-9]{1,2})?" defaultValue={editingBudget?.total ?? ""} placeholder="Tổng ngân sách" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" />
            <input name="category" maxLength={50} defaultValue={editingBudget?.categoryLimits?.[0]?.category ?? ""} placeholder="Danh mục giới hạn (tùy chọn)" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" />
            <input name="categoryLimit" inputMode="decimal" pattern="[0-9]+(\.[0-9]{1,2})?" defaultValue={editingBudget?.categoryLimits?.[0]?.limit ?? ""} placeholder="Hạn mức danh mục" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" />
            {formError && <p className="text-sm text-rose-300 sm:col-span-2">{formError}</p>}
            <button className="rounded-lg bg-emerald-400 px-4 py-2 font-medium text-slate-950 sm:col-span-2">{editingBudget ? "Cập nhật ngân sách" : "Lưu ngân sách"}</button>
            {editingBudget && <button onClick={() => { setEditingBudget(null); setShowBudgetForm(false); }} className="text-sm text-slate-400 hover:text-slate-200 sm:col-span-2" type="button">Hủy sửa</button>}
          </form>
        )}

        {showTransactionForm && (
          <form onSubmit={addTransaction} className="mb-6 grid gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 sm:grid-cols-2 lg:grid-cols-5">
            <select name="type" required className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100">
              <option value="expense">Chi tiêu</option>
              <option value="income">Thu nhập</option>
            </select>
            <input name="category" required maxLength={50} placeholder="Danh mục" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" />
            <input name="amount" required inputMode="decimal" pattern="[0-9]+(\.[0-9]{1,2})?" placeholder="Số tiền" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" />
            <input name="description" required maxLength={200} placeholder="Mô tả" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" />
            <input name="date" required type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" />
            {formError && <p className="text-sm text-rose-300 sm:col-span-2 lg:col-span-5">{formError}</p>}
            <button className="rounded-lg bg-emerald-400 px-4 py-2 font-medium text-slate-950 sm:col-span-2 lg:col-span-5">Lưu giao dịch</button>
          </form>
        )}

        <section className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Ngân sách tháng" value={formatCurrency(summary.totalBudget)} tone="emerald" />
          <StatCard label="Thu nhập" value={formatCurrency(summary.totalIncome)} tone="sky" />
          <StatCard label="Chi tiêu" value={formatCurrency(summary.totalExpense)} tone="rose" />
          <StatCard label="Số dư khả dụng" value={formatCurrency(summary.availableBalance)} tone="sky" />
          <StatCard label="Còn lại ngân sách" value={formatCurrency(summary.remaining)} tone="amber" />
        </section>

        <section className="mt-8 grid gap-8 border-y border-slate-800 py-6 lg:grid-cols-2">
          <div>
            <h2 className="mb-4 text-lg font-semibold">Chi tiêu theo danh mục</h2>
            <div className="space-y-4">
              {report.categories.filter((item) => Number(item.expense) > 0).slice(0, 6).map((item) => {
                const largestExpense = Math.max(1, ...report.categories.map((entry) => Number(entry.expense)));
                const width = Math.max(2, (Number(item.expense) / largestExpense) * 100);
                return (
                  <div key={item.categoryId ?? item.category}>
                    <div className="mb-1 flex justify-between gap-3 text-sm">
                      <span className="text-slate-300">{item.category}</span>
                      <span className="text-slate-100">{formatCurrency(item.expense)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-800">
                      <div className="h-full bg-rose-400" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
              {report.categories.every((item) => Number(item.expense) === 0) && (
                <p className="text-sm text-slate-400">Chưa có khoản chi trong kỳ.</p>
              )}
            </div>
          </div>
          <div>
            <h2 className="mb-4 text-lg font-semibold">Xu hướng 7 ngày</h2>
            <div className="flex h-36 items-end gap-2 border-b border-slate-700 pb-2">
              {report.trend.slice(-7).map((item) => {
                const maxExpense = Math.max(1, ...report.trend.slice(-7).map((entry) => Number(entry.expense)));
                const height = Number(item.expense) > 0 ? Math.max(5, (Number(item.expense) / maxExpense) * 100) : 2;
                return (
                  <div key={item.period} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                    <div className="w-full max-w-8 bg-rose-400/80" style={{ height: `${height}%` }} title={formatCurrency(item.expense)} />
                    <span className="text-[10px] text-slate-500">{item.period.slice(-2)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Giao dịch gần đây</h2>
              <span className="text-sm text-slate-400">Tháng {summary.month}</span>
            </div>

            <div className="space-y-3">
              {summary.transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-slate-100">{transaction.description}</p>
                    <p className="text-xs text-slate-400">
                      {transaction.category} · {new Date(transaction.date).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                  <span
                    className={
                      transaction.type === "expense"
                        ? "text-rose-400"
                        : "text-emerald-400"
                    }
                  >
                    {transaction.type === "expense" ? "-" : "+"}
                    {formatCurrency(transaction.amount)}
                  </span>
                  <button
                    aria-label={`Xóa giao dịch ${transaction.description}`}
                    className="text-xs text-slate-500 hover:text-rose-300"
                    onClick={() => removeTransaction(transaction.id)}
                    title="Xóa giao dịch"
                    type="button"
                  >
                    Xóa
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="mb-5 text-lg font-semibold">Ngân sách theo danh mục</h2>
            <div className="space-y-3">
              {budgets.filter((budget) => budget.month === summary.month).map((budget) => (
                <div key={budget.id} className="space-y-2 border-b border-slate-800 pb-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-100">Ngân sách tổng</p>
                      <p className="text-xs text-slate-400">Còn {formatCurrency(budget.remaining)} / {formatCurrency(budget.total)}</p>
                    </div>
                    <div className="flex shrink-0 gap-3">
                      <button className="text-slate-400 hover:text-emerald-300" onClick={() => { setEditingBudget(budget); setShowBudgetForm(true); setShowTransactionForm(false); }} type="button">Sửa</button>
                      <button className="text-slate-400 hover:text-rose-300" onClick={() => removeBudget(budget.id)} type="button">Xóa</button>
                    </div>
                  </div>
                  {budget.categoryLimits?.map((limit) => (
                    <div key={limit.categoryId} className="flex justify-between gap-3 pl-4 text-xs text-slate-400">
                      <span>{limit.category}</span>
                      <span>Còn {formatCurrency(limit.remaining)} / {formatCurrency(limit.limit)}</span>
                    </div>
                  ))}
                </div>
              ))}
              {budgets.every((budget) => budget.month !== summary.month) && (
                <p className="text-sm text-slate-400">Chưa có ngân sách cho tháng này.</p>
              )}
            </div>
            <form onSubmit={saveAlertSettings} className="mt-6 border-t border-slate-800 pt-4">
              <label className="block text-sm text-slate-300">
                Ngưỡng cảnh báo (%)
                <input
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                  onChange={(event) => setThresholdInput(event.target.value)}
                  value={thresholdInput}
                />
              </label>
              {alertSettingsError && <p className="mt-2 text-sm text-rose-300">{alertSettingsError}</p>}
              <button className="mt-3 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800" type="submit">
                Lưu ngưỡng
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "emerald" | "sky" | "rose" | "amber";
}) {
  const toneMap = {
    emerald: "border-emerald-500/30 bg-emerald-500/8 text-emerald-300",
    sky: "border-sky-500/30 bg-sky-500/8 text-sky-300",
    rose: "border-rose-500/30 bg-rose-500/8 text-rose-300",
    amber: "border-amber-500/30 bg-amber-500/8 text-amber-300",
  };

  return (
    <div className={`rounded-2xl border p-4 ${toneMap[tone]}`}>
      <p className="text-sm text-slate-300">{label}</p>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
    </div>
  );
}
