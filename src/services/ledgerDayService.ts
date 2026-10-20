import { supabase, isSupabaseConfigured } from '../core/supabase';
import type { Database } from '../core/database.types';
import { TABLE_LEDGER_DAYS } from '../core/constants';
import type { LedgerDay } from '../core/types';
import { localStore, uid } from '../utils/localStore';

/** Supabase row shape for the `ledger_days` table. */
type LedgerDayRow = Database['public']['Tables']['ledger_days']['Row'];

export interface NewLedgerDayInput {
  business_date: string;
  opening_balance: number;
}

/** Guarded cast of the raw string column to the strict status union. */
function asStatus(value: string | null): LedgerDay['status'] {
  return value === 'closed' ? 'closed' : 'open';
}

/**
 * Adapter: maps a raw Supabase row onto the strict domain model,
 * handling nullability (`??`) and enum narrowing — no `as any` needed.
 */
const mapRowToDomain = (row: LedgerDayRow): LedgerDay => ({
  id: row.id,
  business_date: row.business_date,
  opening_balance: row.opening_balance ?? 0,
  status: asStatus(row.status ?? 'open'),
  created_at: row.created_at ?? new Date().toISOString(),
});

/** Local-storage rows are loosely typed; normalise them into a LedgerDayRow first. */
const toRow = (raw: Record<string, unknown>): LedgerDayRow => ({
  id: String(raw.id ?? uid()),
  business_date: String(raw.business_date ?? ''),
  opening_balance: Number(raw.opening_balance ?? 0),
  status: raw.status == null ? null : String(raw.status),
  created_at: raw.created_at == null ? null : String(raw.created_at),
});

/** CRUD wrapper for daily ledger sessions (opening balance per day). */
export const ledgerDayService = {
  async list(): Promise<LedgerDay[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from(TABLE_LEDGER_DAYS).select('*').order('business_date', { ascending: true });
      if (error) throw error;
      return (data ?? []).map(mapRowToDomain);
    }
    return localStore.list(TABLE_LEDGER_DAYS).map(toRow).map(mapRowToDomain);
  },

  async findByDate(businessDate: string): Promise<LedgerDay | null> {
    const days = await this.list();
    return days.find((d) => d.business_date === businessDate) ?? null;
  },

  async create(input: NewLedgerDayInput): Promise<LedgerDay> {
    const existing = await this.findByDate(input.business_date);
    if (existing) return existing;
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from(TABLE_LEDGER_DAYS)
        .insert({ ...input, status: 'open' })
        .select()
        .single();
      if (error) throw error;
      return mapRowToDomain(data);
    }
    const row = localStore.insert(TABLE_LEDGER_DAYS, { ...input, status: 'open' });
    return mapRowToDomain(toRow(row));
  },

  async setStatus(id: string, status: LedgerDay['status']): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from(TABLE_LEDGER_DAYS).update({ status }).eq('id', id);
      if (error) throw error;
      return;
    }
    localStore.update(TABLE_LEDGER_DAYS, id, { status });
  },
};
