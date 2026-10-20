import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LedgerSummary, Transaction, TxKind } from '../core/types';
import { TABLE_TRANSACTIONS } from '../core/constants';
import { transactionService, type NewTransactionInput } from '../services/transactionService';
import { useRealtimeTable } from './useRealtimeTable';

export type TxFilter = 'all' | TxKind;

/**
 * Loads and mutates the ledger for a given business date.
 *
 * Subscribes to the `ledger_transactions` table over Supabase Realtime and
 * silently refetches on INSERT / UPDATE / DELETE so the UI updates instantly
 * when any session changes the database.
 */
export function useTransactions(businessDate: string) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await transactionService.listByDate(businessDate);
      setTransactions(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [businessDate]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Realtime listener — refetch without toggling the loading flag.
  const handleRealtimeChange = useCallback(() => {
    transactionService
      .listByDate(businessDate)
      .then(setTransactions)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Realtime refresh failed'));
  }, [businessDate]);

  useRealtimeTable({ table: TABLE_TRANSACTIONS, onChange: handleRealtimeChange });

  const addTransaction = useCallback(
    async (input: NewTransactionInput) => {
      const row = await transactionService.create(input);
      setTransactions((prev) => [...prev, row]);
      return row;
    },
    [],
  );

  const editTransaction = useCallback(async (id: string, patch: Partial<NewTransactionInput>) => {
    const row = await transactionService.update(id, patch);
    setTransactions((prev) => prev.map((t) => (t.id === id ? row : t)));
    return row;
  }, []);

  const deleteTransaction = useCallback(async (id: string) => {
    await transactionService.remove(id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAll = useCallback(async () => {
    await transactionService.clearByDate(businessDate);
    setTransactions([]);
  }, [businessDate]);

  const summary = useMemo<LedgerSummary>(() => {
    let grossSales = 0;
    let totalCashIn = 0;
    let totalCashOut = 0;
    for (const t of transactions) {
      // BUSINESS RULE: internal transfers (drawer <-> safe) never count towards
      // Gross Sales or Operating Expenses — they only move cash between pockets.
      if (t.is_internal_transfer) continue;
      if (t.kind === 'cash_in') {
        totalCashIn += t.amount || 0;
        if (t.category === 'Gross Sales') grossSales += t.amount || 0;
      } else {
        totalCashOut += t.amount || 0;
      }
    }
    return {
      grossSales,
      totalCashIn,
      totalCashOut,
      netCash: totalCashIn - totalCashOut,
      expenseRatio: totalCashIn > 0 ? totalCashOut / totalCashIn : 0,
    };
  }, [transactions]);

  return {
    transactions,
    summary,
    isLoading: loading,
    loading,
    error,
    reload,
    addTransaction,
    editTransaction,
    updateTransaction: editTransaction,
    deleteTransaction,
    clearAll,
  };
}
