import { useMemo } from 'react';
import { eachDayOfInterval, format, startOfMonth, subDays } from 'date-fns';
import type { Transaction } from '../../core/types';
import { CHART_COLORS } from '../../core/constants';
import { Card } from '../shared/Card';
import { ErrorBanner } from '../shared/ErrorBanner';
import { CashFlowTrendChart, ExpenseCategoryBarChart } from './Charts';

export interface AnalyticsDashboardProps {
  /** All transactions (from `useTransactions` / `useAnalytics`). */
  transactions: Transaction[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

interface LinePoint {
  label: string;
  income: number;
  expenses: number;
}

/**
 * Trends & insights screen.
 * All aggregation is derived here from raw domain rows via pure selectors —
 * components stay presentational and the hooks own the data fetching.
 */
export function AnalyticsDashboard({ transactions, isLoading = false, error = null, onRetry }: AnalyticsDashboardProps) {
  // ── Last-7-days income vs expenses (internal transfers excluded) ──────
  const weeklyTrend = useMemo<LinePoint[]>(() => {
    const today = new Date();
    const days = eachDayOfInterval({ start: subDays(today, 6), end: today });
    return days.map((day) => {
      const iso = format(day, 'yyyy-MM-dd');
      let income = 0;
      let expenses = 0;
      for (const t of transactions) {
        if (t.business_date !== iso || t.is_internal_transfer) continue;
        const amount = t.amount || 0;
        if (t.kind === 'cash_in') income += amount;
        else expenses += amount;
      }
      return { label: format(day, 'dd MMM'), income, expenses };
    });
  }, [transactions]);

  // ── Top-5 expense categories for the current month (transfers excluded) ─
  const topExpenses = useMemo(() => {
    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const totals = new Map<string, number>();
    for (const t of transactions) {
      if (t.kind !== 'cash_out' || t.is_internal_transfer) continue;
      if (t.business_date < monthStart) continue;
      totals.set(t.category, (totals.get(t.category) ?? 0) + (t.amount || 0));
    }
    return [...totals.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [transactions]);

  if (error) {
    return <ErrorBanner message={error} onRetry={onRetry} />;
  }

  if (isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="h-80 rounded-xl bg-slate-100 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card
        title="Cash Flow Trend"
        subtitle="Income vs Expenses · last 7 days"
      >
        <CashFlowTrendChart
          data={weeklyTrend}
          incomeColor={CHART_COLORS.cashIn}
          expenseColor={CHART_COLORS.cashOut}
        />
      </Card>

      <Card
        title="Top Expense Categories"
        subtitle={`Current month (${format(new Date(), 'MMMM yyyy')}) · internal transfers excluded`}
      >
        <ExpenseCategoryBarChart data={topExpenses} color={CHART_COLORS.net} />
      </Card>
    </div>
  );
}
