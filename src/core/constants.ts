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
  'Gross Sales': { badge: 'bg-income-tint text-income-deep ring-income/30', dot: 'bg-income' },
  'Credit Recovery': { badge: 'bg-verdant-tint text-verdant-deep ring-verdant/30', dot: 'bg-verdant' },
  'Petty Cash': { badge: 'bg-gilded-tint text-gilded-deep ring-gilded/30', dot: 'bg-gilded' },
  Rent: { badge: 'bg-expense-tint text-expense-deep ring-expense/30', dot: 'bg-expense' },
  Salary: { badge: 'bg-sienna-tint text-sienna-deep ring-sienna/30', dot: 'bg-sienna' },
  Utilities: { badge: 'bg-lagoon-tint text-lagoon ring-lagoon/30', dot: 'bg-lagoon' },
  Supplies: { badge: 'bg-primary-tint text-primary-deep ring-primary/30', dot: 'bg-primary' },
  'Bank Charge': { badge: 'bg-plum-tint text-plum-deep ring-plum/30', dot: 'bg-plum' },
  Other: { badge: 'bg-bg-subtle text-ink-soft ring-border-subtle', dot: 'bg-border-default' },
};

/** Chart palette */
export const CHART_COLORS = {
  cashIn: '#059669',   /* --accent-emerald */
  cashOut: '#BE123C',  /* --accent-rose */
  net: '#2D5F4A',      /* --primary (forest green) */
  drawer: '#0E7490',   /* muted lagoon */
  vault: '#D97706',    /* --accent-amber */
  grid: '#E8E0D0',     /* --border-subtle */
  axis: '#9A9A9A',     /* --text-muted */
} as const;

/** Denominations used by the cash counter (PKR notes) */
export const DENOMINATIONS = [5000, 1000, 500, 100, 50, 20, 10] as const;
