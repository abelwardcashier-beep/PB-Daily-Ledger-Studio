import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  ChartBarSquareIcon,
} from '@heroicons/react/24/outline';
import type { useAnalytics } from '../../hooks/useAnalytics';
import type { useVault } from '../../hooks/useVault';
import { formatCurrency } from '../../utils/format';
import { Card, StatCard } from '../shared/Card';
import { BalanceAreaChart, CashFlowComposedChart, CategoryPieChart, WeeklyBarsChart } from './Charts';

type AnalyticsHook = ReturnType<typeof useAnalytics>;
type VaultHook = ReturnType<typeof useVault>;

interface AnalyticsViewProps {
  analytics: AnalyticsHook;
  vault: VaultHook;
}

export function AnalyticsView({ analytics, vault }: AnalyticsViewProps) {
  const { trend, weeklyRollup, categoryBreakdown, kpis, loading } = analytics;

  if (loading && trend.length === 0) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-72 rounded-xl bg-bg-subtle animate-pulse" />
        ))}
      </div>
    );
  }

  if (trend.length === 0) {
    return (
      <Card className="max-w-lg mx-auto mt-10 text-center">
        <div className="py-10">
          <div className="mx-auto h-14 w-14 rounded-xl bg-primary-tint flex items-center justify-center mb-4">
            <ChartBarSquareIcon className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-ink">No data yet</h2>
          <p className="text-sm text-ink-soft mt-1.5 max-w-xs mx-auto">
            Post a few ledger entries on the Daily Ledger tab and the trends will appear here automatically.
          </p>
        </div>
      </Card>
    );
  }

  const positive = kpis.revenueChangePct >= 0;

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Revenue · Last 7 Days"
          value={formatCurrency(kpis.revenue7)}
          tone="income"
          icon={positive ? <ArrowTrendingUpIcon className="h-5 w-5" /> : <ArrowTrendingDownIcon className="h-5 w-5" />}
          hint={`${positive ? '▲' : '▼'} ${Math.abs(kpis.revenueChangePct).toFixed(1)}% vs previous week`}
        />
        <StatCard label="Expenses · Last 7 Days" value={formatCurrency(kpis.expenses7)} tone="expense" icon={<ArrowTrendingDownIcon className="h-5 w-5" />} />
        <StatCard label="Avg Daily Revenue" value={formatCurrency(kpis.avgDailyRevenue)} tone="lagoon" icon={<CalendarDaysIcon className="h-5 w-5" />} />
        <StatCard
          label="Best Day"
          value={kpis.bestDay ? kpis.bestDay.label : '—'}
          tone="primary"
          icon={<BanknotesIcon className="h-5 w-5" />}
          hint={kpis.bestDay ? formatCurrency(kpis.bestDay.cashIn) : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Cash Flow Trend" subtitle="Daily cash-in vs cash-out with net overlay">
          <CashFlowComposedChart trend={trend} />
        </Card>
        <Card title="Balance Evolution" subtitle="Running drawer & safe-vault position">
          <BalanceAreaChart trend={trend} />
        </Card>
        <Card title="Weekly Rollup" subtitle="Aggregated inflow / outflow per week">
          <WeeklyBarsChart data={weeklyRollup} />
        </Card>
        <Card title="Expense Breakdown" subtitle="Cash-out categories · last 8 weeks">
          {categoryBreakdown.length > 0 ? (
            <CategoryPieChart data={categoryBreakdown} />
          ) : (
            <p className="py-16 text-center text-sm text-ink-faint">No expenses recorded in the recent period.</p>
          )}
        </Card>
      </div>

      <Card title="Vault Snapshot" subtitle="Safe balance included in total position">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
          <span className="text-ink-soft">
            Safe Vault: <b className="text-gilded tabular-nums">{formatCurrency(vault.vaultBalance)}</b>
          </span>
          <span className="text-ink-soft">
            Movements recorded: <b className="text-ink tabular-nums">{vault.movements.length}</b>
          </span>
          <span className="text-ink-soft">
            Trading days tracked: <b className="text-ink tabular-nums">{trend.length}</b>
          </span>
        </div>
      </Card>
    </div>
  );
}
