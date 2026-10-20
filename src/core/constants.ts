import type { TxCategory } from './types';

/** App identity */
export const APP_NAME = 'PB Daily Ledger Studio';
export const APP_TAGLINE = 'Cash-in / Cash-out · Safe Vault · Analytics';

/** Formatting */
export const CURRENCY_CODE = 'PKR';
export const CURRENCY_LOCALE = 'en-PK';
export const CURRENCY_SYMBOL = 'Rs.';

/** Supabase table names */
export const TABLE_TRANSACTIONS = 'ledger_transactions';
export const TABLE_VAULT_TRANSACTIONS = 'vault_transactions';
export const TABLE_LEDGER_DAYS = 'ledger_days';

/** Category visual metadata (Tailwind class fragments) */
export const CATEGORY_STYLES: Record<TxCategory, { badge: string; dot: string }> = {
  'Gross Sales': { badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  'Credit Recovery': { badge: 'bg-teal-50 text-teal-700 ring-teal-200', dot: 'bg-teal-500' },
  'Petty Cash': { badge: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500' },
  Rent: { badge: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500' },
  Salary: { badge: 'bg-orange-50 text-orange-700 ring-orange-200', dot: 'bg-orange-500' },
  Utilities: { badge: 'bg-sky-50 text-sky-700 ring-sky-200', dot: 'bg-sky-500' },
  Supplies: { badge: 'bg-indigo-50 text-indigo-700 ring-indigo-200', dot: 'bg-indigo-500' },
  'Bank Charge': { badge: 'bg-violet-50 text-violet-700 ring-violet-200', dot: 'bg-violet-500' },
  Other: { badge: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400' },
};

/** Chart palette */
export const CHART_COLORS = {
  cashIn: '#10B981',
  cashOut: '#F43F5E',
  net: '#4F46E5',
  drawer: '#0EA5E9',
  vault: '#F59E0B',
  grid: '#E2E8F0',
  axis: '#94A3B8',
} as const;

/** Target amount that should be sitting inside the safe vault (PKR). */
export const VAULT_TARGET_BALANCE = 433_500;

/** Denominations used by the cash counter (PKR notes) */
export const DENOMINATIONS = [5000, 1000, 500, 100, 50, 20, 10] as const;
