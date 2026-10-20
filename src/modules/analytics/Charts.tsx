import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  LineChart,
  PieChart,
  Pie,
  Cell,

  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { CHART_COLORS } from '../../core/constants';
import type { DailyTrendPoint } from '../../core/types';
import { formatCurrency, formatCurrencyCompact } from '../../utils/format';

interface TooltipEntry {
  name?: string | number;
  value?: number | string;
  color?: string;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md text-xs">
      {label !== undefined && <p className="font-bold text-slate-900 mb-1">{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} className="flex items-center gap-1.5 text-slate-600">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
          <span className="capitalize">{String(entry.name)}:</span>
          <span className="font-semibold tabular-nums">{formatCurrency(Number(entry.value ?? 0))}</span>
        </p>
      ))}
    </div>
  );
}

const axisProps = {
  tick: { fontSize: 11, fill: CHART_COLORS.axis },
  axisLine: { stroke: CHART_COLORS.grid },
  tickLine: false as const,
};

/** Cash-in vs cash-out daily bars with net line overlay. */
export function CashFlowComposedChart({ trend }: { trend: DailyTrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis {...axisProps} tickFormatter={formatCurrencyCompact} width={72} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="cashIn" name="Cash In" fill={CHART_COLORS.cashIn} radius={[4, 4, 0, 0]} maxBarSize={26} />
        <Bar dataKey="cashOut" name="Cash Out" fill={CHART_COLORS.cashOut} radius={[4, 4, 0, 0]} maxBarSize={26} />
        <Line type="monotone" dataKey="net" name="Net" stroke={CHART_COLORS.net} strokeWidth={2.5} dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/** Running drawer + vault balances. */
export function BalanceAreaChart({ trend }: { trend: DailyTrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="gradDrawer" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS.drawer} stopOpacity={0.25} />
            <stop offset="100%" stopColor={CHART_COLORS.drawer} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis {...axisProps} tickFormatter={formatCurrencyCompact} width={72} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {/* Area rendered via Line+fill trick kept simple: use Area inside LineChart is invalid, so we render both lines */}
        <Line type="monotone" dataKey="drawer" name="Drawer Balance" stroke={CHART_COLORS.drawer} strokeWidth={2.5} dot={false} />
        <Line type="monotone" dataKey="vault" name="Vault Balance" stroke={CHART_COLORS.vault} strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Weekly rollup bars. */
export function WeeklyBarsChart({ data }: { data: Array<{ week: string; cashIn: number; cashOut: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
        <XAxis dataKey="week" {...axisProps} />
        <YAxis {...axisProps} tickFormatter={formatCurrencyCompact} width={72} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="cashIn" name="Cash In" fill={CHART_COLORS.cashIn} radius={[4, 4, 0, 0]} maxBarSize={22} />
        <Bar dataKey="cashOut" name="Cash Out" fill={CHART_COLORS.cashOut} radius={[4, 4, 0, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const PIE_COLORS = ['#F43F5E', '#F59E0B', '#4F46E5', '#0EA5E9', '#8B5CF6', '#10B981', '#64748B'];

/** Expense category donut. */
export function CategoryPieChart({ data }: { data: Array<{ category: string; amount: number }> }) {
  const total = data.reduce((acc, d) => acc + d.amount, 0);
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <ResponsiveContainer width="100%" height={240} className="max-w-[280px] mx-auto">
        <PieChart>
          <Pie data={data} dataKey="amount" nameKey="category" innerRadius={62} outerRadius={95} paddingAngle={2} strokeWidth={0}>
            {data.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <ul className="w-full space-y-1.5 text-sm">
        {data.map((d, i) => (
          <li key={d.category} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
            <span className="text-slate-600 truncate">{d.category}</span>
            <span className="ml-auto font-semibold text-slate-900 tabular-nums">{formatCurrency(d.amount)}</span>
            <span className="w-12 text-right text-xs text-slate-400 tabular-nums">
              {total > 0 ? ((d.amount / total) * 100).toFixed(0) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}




/* ────────────────────────────────────────────────────────────
 * AnalyticsDashboard charts (Step 4) — Line: 7-day flow, Bar: top categories
 * ──────────────────────────────────────────────────────────── */

export interface CashFlowLinePoint {
  label: string;
  income: number;
  expenses: number;
}

export interface CashFlowTrendChartProps {
  data: CashFlowLinePoint[];
  /** Defaults to the Emerald palette colour. */
  incomeColor?: string;
  /** Defaults to the Indigo palette colour. */
  expenseColor?: string;
}

/** Line chart: Income vs Expenses over the last 7 days. */
export function CashFlowTrendChart({
  data,
  incomeColor = CHART_COLORS.cashIn,
  expenseColor = CHART_COLORS.net,
}: CashFlowTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis {...axisProps} tickFormatter={formatCurrencyCompact} width={72} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="income" name="Income" stroke={incomeColor} strokeWidth={2.5} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="expenses" name="Expenses" stroke={expenseColor} strokeWidth={2.5} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export interface ExpenseCategoryBarChartProps {
  data: Array<{ category: string; amount: number }>;
  /** Defaults to the Indigo palette colour. */
  color?: string;
}

/** Horizontal bar chart: top expense categories for the current month. */
export function ExpenseCategoryBarChart({ data, color = CHART_COLORS.net }: ExpenseCategoryBarChartProps) {
  if (data.length === 0) {
    return <p className="py-20 text-center text-sm text-slate-400">No expenses recorded this month.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} horizontal={false} />
        <XAxis type="number" {...axisProps} tickFormatter={formatCurrencyCompact} />
        <YAxis type="category" dataKey="category" {...axisProps} width={100} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F1F5F9' }} />
        <Bar dataKey="amount" name="Amount" fill={color} radius={[0, 4, 4, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}
