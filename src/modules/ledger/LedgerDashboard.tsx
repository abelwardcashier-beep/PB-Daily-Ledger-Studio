import { ArrowTrendingUpIcon, BanknotesIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import type { LedgerSummary } from '../../core/types';
import { formatCurrency } from '../../utils/format';

export interface LedgerDashboardProps {
  /**
   * Day summary computed by `useTransactions` — internal transfers are already
   * excluded from grossSales / totalCashOut there (business rule lives in the hook).
   */
  summary: LedgerSummary;
  /** Net operating flow shown on the Indigo card. */
  netFlow?: number;
}

/**
 * Presentational KPI strip for the daily ledger.
 * Emerald = income · Rose = expenses · Indigo = net flow.
 */
export function LedgerDashboard({ summary, netFlow }: LedgerDashboardProps) {
  const net = netFlow ?? summary.netCash;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Today's Gross Sales — excludes internal transfers */}
      <div className="bg-bg-card rounded-xl border border-border-subtle shadow-sm p-5 flex items-start gap-4">
        <div className="h-10 w-10 shrink-0 rounded-lg bg-income-tint text-income flex items-center justify-center">
          <ClipboardDocumentListIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-ink-soft">Today&apos;s Gross Sales</p>
          <p className="text-xl font-bold text-ink tabular-nums tracking-tight mt-0.5">
            {formatCurrency(summary.grossSales)}
          </p>
          <p className="text-[11px] text-ink-faint mt-0.5">Excludes internal safe transfers</p>
        </div>
      </div>

      {/* Today's Operating Expenses — excludes internal transfers */}
      <div className="bg-bg-card rounded-xl border border-border-subtle shadow-sm p-5 flex items-start gap-4">
        <div className="h-10 w-10 shrink-0 rounded-lg bg-expense-tint text-expense flex items-center justify-center">
          <ArrowTrendingUpIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-ink-soft">Today&apos;s Operating Expenses</p>
          <p className="text-xl font-bold text-ink tabular-nums tracking-tight mt-0.5">
            {formatCurrency(summary.totalCashOut)}
          </p>
          <p className="text-[11px] text-ink-faint mt-0.5">
            {(summary.expenseRatio * 100).toFixed(0)}% of cash inflow
          </p>
        </div>
      </div>

      {/* Net Flow */}
      <div className="bg-bg-card rounded-xl border border-border-subtle shadow-sm p-5 flex items-start gap-4">
        <div className="h-10 w-10 shrink-0 rounded-lg bg-primary-tint text-primary flex items-center justify-center">
          <BanknotesIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-ink-soft">Net Flow</p>
          <p
            className={`text-xl font-bold tabular-nums tracking-tight mt-0.5 ${
              net >= 0 ? 'text-ink' : 'text-expense'
            }`}
          >
            {formatCurrency(net)}
          </p>
          <p className="text-[11px] text-ink-faint mt-0.5">Inflow minus outflow</p>
        </div>
      </div>
    </div>
  );
}
