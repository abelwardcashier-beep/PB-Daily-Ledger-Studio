/** Global domain types for PB-Daily-Ledger-Studio */

export type TxKind = 'cash_in' | 'cash_out';

export type TxCategory =
  | 'Gross Sales'
  | 'Credit Recovery'
  | 'Petty Cash'
  | 'Rent'
  | 'Salary'
  | 'Utilities'
  | 'Supplies'
  | 'Bank Charge'
  | 'Other';

export const CASH_IN_CATEGORIES: readonly TxCategory[] = [
  'Gross Sales',
  'Credit Recovery',
  'Petty Cash',
  'Other',
] as const;

export const CASH_OUT_CATEGORIES: readonly TxCategory[] = [
  'Rent',
  'Salary',
  'Utilities',
  'Supplies',
  'Bank Charge',
  'Petty Cash',
  'Other',
] as const;

/** Staff members allowed on ledger entries (extend freely). */
export const STAFF_MEMBERS = ['Ahsan', 'Bilal', 'Usman', 'Zain'] as const;

export type StaffMember = (typeof STAFF_MEMBERS)[number];

/** A single daily ledger entry (Cash-in / Cash-out). */
export interface Transaction {
  id: string;
  /** Business day in ISO format yyyy-MM-dd */
  business_date: string;
  kind: TxKind;
  category: TxCategory;
  amount: number;
  description: string | null;
  reference: string | null;
  /** True when the entry moves cash between drawer & safe (excluded from sales/expense KPIs). */
  is_internal_transfer: boolean;
  staff: StaffMember | null;
  created_at: string;
}

export type VaultTxType = 'deposit' | 'withdrawal' | 'internal_transfer';

/** Funding sources for money that lands inside the safe vault. */
export type VaultDepositType = 'committee' | 'capital' | 'bank_withdrawal' | 'cash_deposit';

/** Movement of physical cash between drawer and safe vault. */
export interface VaultTransaction {
  id: string;
  business_date: string;
  type: VaultTxType;
  amount: number;
  note: string | null;
  /** Present for funding-source deposits (committee / capital / bank withdrawal). */
  deposit_type?: VaultDepositType | null;
  staff?: StaffMember | null;
  created_at: string;
}

/** One "day" in the ledger, started with an opening balance. */
export interface LedgerDay {
  id: string;
  business_date: string; // yyyy-MM-dd
  opening_balance: number;
  status: 'open' | 'closed';
  created_at: string;
}

/** Snapshot of derived numbers used across dashboard cards. */
export interface LedgerSummary {
  grossSales: number;
  totalCashIn: number;
  totalCashOut: number;
  netCash: number; // drawer balance incl. opening + vault movements
  expenseRatio: number; // 0..1
}

export interface DailyTrendPoint {
  date: string; // yyyy-MM-dd
  label: string; // dd MMM
  cashIn: number;
  cashOut: number;
  net: number;
  drawer: number;
  vault: number;
}

/** Row shape for XLSX exports. */
export type SpreadsheetRow = Record<string, string | number>;
