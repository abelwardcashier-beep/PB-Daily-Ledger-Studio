import { supabase, isSupabaseConfigured } from '../core/supabase';
import type { Database } from '../core/database.types';
import { TABLE_VAULT_TRANSACTIONS } from '../core/constants';
import type { StaffMember, VaultTransaction, VaultTxType, VaultDepositType } from '../core/types';
import { STAFF_MEMBERS } from '../core/types';
import { localStore, uid } from '../utils/localStore';

/** Supabase row shape for the `vault_transactions` table. */
type VaultTransactionRow = Database['public']['Tables']['vault_transactions']['Row'];

export interface NewVaultInput {
  business_date: string;
  type: VaultTxType;
  amount: number;
  note?: string | null;
  /** Funding source when recording money that lands in the safe. */
  deposit_type?: VaultDepositType | null;
  staff?: StaffMember | null;
}

const DEPOSIT_TYPES: readonly VaultDepositType[] = ['committee', 'capital', 'bank_withdrawal', 'cash_deposit'];

/** Guarded cast of the raw string column to the strict `VaultDepositType` union. */
function asDepositType(value: string | null): VaultDepositType | null {
  return DEPOSIT_TYPES.some((d) => d === value) ? (value as VaultDepositType) : null;
}

/** Guarded cast of the raw string column to the strict `StaffMember` union. */
function asStaff(value: string | null): StaffMember | null {
  return (STAFF_MEMBERS as readonly string[]).includes(value ?? '') ? (value as StaffMember) : null;
}

/** Guarded cast of the raw string column to the strict `VaultTxType` union. */
function asVaultTxType(value: string): VaultTxType {
  switch (value) {
    case 'withdrawal':
      return 'withdrawal';
    case 'internal_transfer':
      return 'internal_transfer';
    default:
      return 'deposit';
  }
}

/**
 * Adapter: maps a raw Supabase row onto the strict domain model,
 * handling nullability (`??`) and enum narrowing — no `as any` needed.
 */
const mapRowToDomain = (row: VaultTransactionRow): VaultTransaction => ({
  id: row.id,
  business_date: row.business_date,
  type: asVaultTxType(row.type),
  amount: row.amount ?? 0,
  note: row.note ?? null,
  deposit_type: asDepositType(row.deposit_type ?? null),
  staff: asStaff(row.staff ?? null),
  created_at: row.created_at ?? new Date().toISOString(),
});

/** Local-storage rows are loosely typed; normalise them into a VaultTransactionRow first. */
const toRow = (raw: Record<string, unknown>): VaultTransactionRow => ({
  id: String(raw.id ?? uid()),
  business_date: String(raw.business_date ?? ''),
  type: String(raw.type ?? 'deposit'),
  amount: Number(raw.amount ?? 0),
  note: raw.note == null ? null : String(raw.note),
  deposit_type: raw.deposit_type == null ? null : String(raw.deposit_type),
  staff: raw.staff == null ? null : String(raw.staff),
  created_at: raw.created_at == null ? null : String(raw.created_at),
});

/** CRUD wrapper for safe-vault movements. */
export const vaultService = {
  async list(): Promise<VaultTransaction[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from(TABLE_VAULT_TRANSACTIONS)
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []).map(mapRowToDomain);
    }
    return localStore.list(TABLE_VAULT_TRANSACTIONS).map(toRow).map(mapRowToDomain);
  },

  async listByDate(businessDate: string): Promise<VaultTransaction[]> {
    const all = await this.list();
    return all.filter((m) => m.business_date === businessDate);
  },

  async create(input: NewVaultInput): Promise<VaultTransaction> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from(TABLE_VAULT_TRANSACTIONS)
        .insert({ ...input, note: input.note ?? null })
        .select()
        .single();
      if (error) throw error;
      return mapRowToDomain(data);
    }
    const row = localStore.insert(TABLE_VAULT_TRANSACTIONS, { ...input, note: input.note ?? null });
    return mapRowToDomain(toRow(row));
  },

  async remove(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from(TABLE_VAULT_TRANSACTIONS).delete().eq('id', id);
      if (error) throw error;
      return;
    }
    localStore.remove(TABLE_VAULT_TRANSACTIONS, id);
  },
};
