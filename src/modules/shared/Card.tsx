import type { HTMLAttributes, ReactNode } from 'react';
import { motion } from 'motion/react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  /** Optional heroicon element rendered next to the title. */
  icon?: ReactNode;
  action?: ReactNode;
  padded?: boolean;
}

/** White rounded-xl surface with soft shadow — the core SaaS container. */
export function Card({ title, subtitle, icon, action, padded = true, className = '', children, ...rest }: CardProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`bg-bg-card rounded-xl border border-border-subtle shadow-sm ${className}`}
      {...(rest as object)}
    >
      {(title || icon || action) && (
        <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-0">
          <div className="flex items-start gap-2.5 min-w-0">
            {icon && (
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-tint text-primary">
                {icon}
              </span>
            )}
            <div className="min-w-0">
              {title && <h3 className="text-sm font-bold text-ink">{title}</h3>}
              {subtitle && <p className="text-xs text-ink-soft mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {action}
        </header>
      )}
      {padded ? <div className="p-5">{children}</div> : children}
    </motion.section>
  );
}

export type StatTone = 'primary' | 'income' | 'expense' | 'gilded' | 'lagoon';

export interface StatCardProps {
  label: string;
  /** Pre-formatted display value (e.g. `formatCurrency(n)`). */
  value: string;
  hint?: string;
  icon: ReactNode;
  tone?: StatTone;
  /** Signed percentage trend shown as ↑/↓ badge with an emerald/rose semantic colour. */
  trend?: number;
}

const TONES: Record<StatTone, string> = {
  primary: 'bg-primary-tint text-primary',
  income: 'bg-income-tint text-income',
  expense: 'bg-expense-tint text-expense',
  gilded: 'bg-gilded-tint text-gilded',
  lagoon: 'bg-lagoon-tint text-lagoon',
};

export function StatCard({ label, value, hint, icon, tone = 'primary', trend }: StatCardProps) {
  const hasTrend = typeof trend === 'number' && Number.isFinite(trend);
  const up = hasTrend && trend >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="bg-bg-card rounded-xl border border-border-subtle shadow-sm p-5 flex items-start gap-4"
    >
      <div className={`h-10 w-10 shrink-0 rounded-lg flex items-center justify-center ${TONES[tone]}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-ink-soft truncate">{label}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-xl font-bold text-ink tracking-tight tabular-nums truncate">{value}</p>
          {hasTrend && (
            <span
              className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                up ? 'bg-income-tint text-income' : 'bg-expense-tint text-expense'
              }`}
            >
              {up ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
            </span>
          )}
        </div>
        {hint && <p className="text-xs text-ink-faint mt-0.5 truncate">{hint}</p>}
      </div>
    </motion.div>
  );
}
