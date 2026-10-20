import { supabase, isSupabaseConfigured } from '../core/supabase';
import type { Database } from '../core/database.types';
import { TABLE_TRANSACTIONS } from '../core/constants';
import type { Transaction, StaffMember, TxCategory, TxKind } from '../core/types';
import { STAFF_MEMBERS } from '../core/types';
import { localStore, uid } from '../utils/localStore';

/** Supabase row shape for the `ledger_transactions` table. */
type TransactionRow = Database['public']['Tables']['ledger_transactions']['Row'];

export interface NewTransactionInput {
  business_date: string;
  kind: TxKind;
  category: TxCategory;
  amount: number;
  description?: string | null;
  reference?: string | null;
  is_internal_transfer?: boolean;
  staff?: StaffMember | null;
}

/** Guarded cast of the raw string column to the strict `TxKind` union. */
function asTxKind(value: string): TxKind {
  return value === 'cash_out' ? 'cash_out' : 'cash_in';
}

/** Guarded cast of the raw string column to the strict `TxCategory` union (type-guard based, no blind casts). */
const isTxCategory = (value: unknown): value is TxCategory =>
  (['Gross Sales', 'Credit Recovery', 'Petty Cash', 'Rent', 'Salary', 'Utilities', 'Supplies', 'Bank Charge', 'Other'] as const).some(
    (c) => c === value,
  );

function asTxCategory(value: string | null): TxCategory {
  return isTxCategory(value) ? value : 'Other';
}

/** Guarded cast of the raw string column to the strict `StaffMember` union. */
function asStaff(value: string | null): StaffMember | null {
  return (STAFF_MEMBERS as readonly string[]).includes(value ?? '') ? (value as StaffMember) : null;
}

/**
 * Adapter: maps a raw Supabase row onto the strict domain model,
 * handling nullability (`??`) and enum narrowing — no `as any` needed.
 */
const mapRowToDomain = (row: TransactionRow): Transaction => ({
  id: row.id,
  business_date: row.business_date,
  kind: asTxKind(row.kind),
  category: asTxCategory(row.category ?? 'Other'),
  amount: row.amount ?? 0,
  description: row.description ?? null,
  reference: row.reference ?? null,
  is_internal_transfer: row.is_internal_transfer ?? false,
  staff: asStaff(row.staff ?? null),
  created_at: row.created_at ?? new Date().toISOString(),
});

/** Local-storage rows are loosely typed; normalise them into a TransactionRow first. */
const toRow = (raw: Record<string, unknown>): TransactionRow => ({
  id: String(raw.id ?? uid()),
  business_date: String(raw.business_date ?? ''),
  kind: String(raw.kind ?? 'cash_in'),
  category: raw.category == null ? null : String(raw.category),
  amount: Number(raw.amount ?? 0),
  description: raw.description == null ? null : String(raw.description),
  reference: raw.reference == null ? null : String(raw.reference),
  is_internal_transfer: raw.is_internal_transfer == null ? null : Boolean(raw.is_internal_transfer),
  staff: raw.staff == null ? null : String(raw.staff),
  created_at: raw.created_at == null ? null : String(raw.created_at),
});

/** CRUD wrapper for ledger transactions (Supabase with local fallback). */
export const transactionService = {
  async listByDate(businessDate: string): Promise<Transaction[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from(TABLE_TRANSACTIONS)
        .select('*')
        .eq('business_date', businessDate)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []).map(mapRowToDomain);
    }
    return localStore.list(TABLE_TRANSACTIONS, { business_date: businessDate }).map(toRow).map(mapRowToDomain);
  },

  async create(input: NewTransactionInput): Promise<Transaction> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from(TABLE_TRANSACTIONS).insert(input).select().single();
      if (error) throw error;
      return mapRowToDomain(data);
    }
    const row = localStore.insert(TABLE_TRANSACTIONS, {
      ...input,
      description: input.description ?? null,
      reference: input.reference ?? null,
    });
    return mapRowToDomain(toRow(row));
  },

  async update(id: string, patch: Partial<NewTransactionInput>): Promise<Transaction> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from(TABLE_TRANSACTIONS).update(patch).eq('id', id).select().single();
      if (error) throw error;
      return mapRowToDomain(data);
    }
    const updated = localStore.update(TABLE_TRANSACTIONS, id, patch);
    if (!updated) throw new Error(`Transaction ${id} not found`);
    return mapRowToDomain(toRow(updated));
  },

  async remove(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from(TABLE_TRANSACTIONS).delete().eq('id', id);
      if (error) throw error;
      return;
    }
    localStore.remove(TABLE_TRANSACTIONS, id);
  },

  /** All transactions (used by analytics). */
  async listAll(): Promise<Transaction[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from(TABLE_TRANSACTIONS)
        .select('*')
        .order('business_date', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []).map(mapRowToDomain);
    }
    return localStore.list(TABLE_TRANSACTIONS).map(toRow).map(mapRowToDomain);
  },

  async clearByDate(businessDate: string): Promise<void> {
    const rows = await this.listByDate(businessDate);
    await Promise.all(rows.map((r) => this.remove(r.id)));
  },
};
