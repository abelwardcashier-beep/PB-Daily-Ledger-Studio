import { useCallback, useEffect, useMemo, useState } from 'react';
import type { VaultTransaction } from '../core/types';
import { TABLE_VAULT_TRANSACTIONS } from '../core/constants';
import { vaultService, type NewVaultInput } from '../services/vaultService';
import { useRealtimeTable } from './useRealtimeTable';

/**
 * Safe-vault state.
 *
 * Semantics:
 *  - `deposit`   : drawer -> safe (drawer decreases, vault increases)
 *  - `withdrawal`: safe -> drawer (vault decreases, drawer increases)
 *  - `internal_transfer`: recorded movement that nets to zero on both sides
 *    (e.g. branch-to-branch), tracked separately for audit.
 *
 * Subscribes to the `vault_transactions` table over Supabase Realtime and
 * silently refetches on any change so balances update instantly.
 */
export function useVault(businessDate: string) {
  const [movements, setMovements] = useState<VaultTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await vaultService.list();
      setMovements(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load vault movements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Realtime listener — refetch without toggling the loading flag.
  const handleRealtimeChange = useCallback(() => {
    vaultService
      .list()
      .then(setMovements)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Realtime refresh failed'));
  }, []);

  useRealtimeTable({ table: TABLE_VAULT_TRANSACTIONS, onChange: handleRealtimeChange });

  const recordMovement = useCallback(async (input: NewVaultInput) => {
    const row = await vaultService.create(input);
    setMovements((prev) => [...prev, row]);
    return row;
  }, []);

  const removeMovement = useCallback(async (id: string) => {
    await vaultService.remove(id);
    setMovements((prev) => prev.filter((m) => m.id !== id));
  }, []);

  /** All-time running balance inside the safe (deposits minus withdrawals). */
  const safeRunningBalance = useMemo(
    () =>
      movements.reduce(
        (acc, m) => acc + (m.type === 'deposit' ? m.amount || 0 : m.type === 'withdrawal' ? -(m.amount || 0) : 0),
        0,
      ),
    [movements],
  );

  /** Net effect of vault movements on today's drawer balance. */
  const drawerVaultEffect = useMemo(
    () =>
      movements
        .filter((m) => m.business_date === businessDate)
        .reduce((acc, m) => acc + (m.type === 'deposit' ? -(m.amount || 0) : m.type === 'withdrawal' ? m.amount || 0 : 0), 0),
    [movements, businessDate],
  );

  const todaysMovements = useMemo(
    () => movements.filter((m) => m.business_date === businessDate),
    [movements, businessDate],
  );

  return {
    movements,
    deposits: movements,
    todaysMovements,
    safeRunningBalance,
    vaultBalance: safeRunningBalance,
    safeBalance: safeRunningBalance,
    drawerVaultEffect,
    isLoading: loading,
    loading,
    error,
    reload,
    recordMovement,
    addDeposit: recordMovement,
    removeMovement,
    removeDeposit: removeMovement,
  };
}
