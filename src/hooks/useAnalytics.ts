import { useCallback, useEffect, useMemo, useState } from 'react';
import { parseISO, startOfWeek, format, subWeeks } from 'date-fns';
import type { DailyTrendPoint, Transaction, VaultTransaction } from '../core/types';
import { TABLE_TRANSACTIONS, TABLE_VAULT_TRANSACTIONS, TABLE_LEDGER_DAYS } from '../core/constants';
import { transactionService } from '../services/transactionService';
import { vaultService } from '../services/vaultService';
import { ledgerDayService } from '../services/ledgerDayService';
import { useRealtimeTable } from './useRealtimeTable';

const HISTORY_WEEKS = 8;

/** Aggregates multi-week history for the analytics module. */
export function useAnalytics(enabled: boolean) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [vaultMovements, setVaultMovements] = useState<VaultTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [txs, vms, days] = await Promise.all([
        transactionService.listAll(),
        vaultService.list(),
        ledgerDayService.list(),
      ]);
      setTransactions(txs);
      setVaultMovements(vms);
      // Pre-compute nothing else; derivation happens in memo below.
      void days;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, []);

  /** Silent refresh used by realtime listeners (no loading flicker). */
  const handleRealtimeChange = useCallback(() => {
    if (!enabled) return;
    Promise.all([transactionService.listAll(), vaultService.list()])
      .then(([txs, vms]) => {
        setTransactions(txs);
        setVaultMovements(vms);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Realtime refresh failed'));
  }, [enabled]);

  useEffect(() => {
    if (enabled) void reload();
  }, [enabled, reload]);

  useRealtimeTable({ table: TABLE_TRANSACTIONS, channelName: 'analytics-transactions', onChange: handleRealtimeChange });
  useRealtimeTable({ table: TABLE_VAULT_TRANSACTIONS, channelName: 'analytics-vault', onChange: handleRealtimeChange });
  useRealtimeTable({ table: TABLE_LEDGER_DAYS, channelName: 'analytics-days', onChange: handleRealtimeChange });

  const trend: DailyTrendPoint[] = useMemo(() => {
    const byDate = new Map<string, { cashIn: number; cashOut: number }>();
    for (const t of transactions) {
      const cur = byDate.get(t.business_date) ?? { cashIn: 0, cashOut: 0 };
      if (t.kind === 'cash_in') cur.cashIn += t.amount;
      else cur.cashOut += t.amount;
      byDate.set(t.business_date, cur);
    }

    const points: DailyTrendPoint[] = [];
    let runningDrawer = 0;
    let runningVault = 0;
    const sortedDates = [...byDate.keys()].sort();
    for (const date of sortedDates) {
      const { cashIn, cashOut } = byDate.get(date)!;
      const vaultNet = vaultMovements
        .filter((m) => m.business_date === date)
        .reduce((acc, m) => acc + (m.type === 'deposit' ? -m.amount : m.type === 'withdrawal' ? m.amount : 0), 0);
      const vaultDelta = vaultMovements
        .filter((m) => m.business_date === date && m.type === 'deposit')
        .reduce((acc, m) => acc + m.amount, 0);
      runningDrawer += cashIn - cashOut + vaultNet;
      runningVault += vaultDelta;
      points.push({
        date,
        label: format(parseISO(date), 'dd MMM'),
        cashIn,
        cashOut,
        net: cashIn - cashOut,
        drawer: runningDrawer,
        vault: runningVault,
      });
    }
    return points.slice(-HISTORY_WEEKS * 7);
  }, [transactions, vaultMovements]);

  const weeklyRollup = useMemo(() => {
    if (trend.length === 0) return [];
    const map = new Map<string, { week: string; cashIn: number; cashOut: number }>();
    for (const p of trend) {
      const d = parseISO(p.date);
      const wkStart = startOfWeek(d, { weekStartsOn: 1 });
      const key = format(wkStart, 'yyyy-MM-dd');
      const cur = map.get(key) ?? { week: format(wkStart, 'dd MMM'), cashIn: 0, cashOut: 0 };
      cur.cashIn += p.cashIn;
      cur.cashOut += p.cashOut;
      map.set(key, cur);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-HISTORY_WEEKS).map(([, v]) => v);
  }, [trend]);

  const categoryBreakdown = useMemo(() => {
    const cutoff = format(startOfWeek(subWeeks(new Date(), HISTORY_WEEKS), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const totals = new Map<string, number>();
    for (const t of transactions) {
      if (t.business_date < cutoff || t.kind !== 'cash_out') continue;
      totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount);
    }
    return [...totals.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  const kpis = useMemo(() => {
    const last7 = trend.slice(-7);
    const prev7 = trend.slice(-14, -7);
    const sum = (arr: DailyTrendPoint[], key: 'cashIn' | 'cashOut') => arr.reduce((a, p) => a + p[key], 0);
    const revenue7 = sum(last7, 'cashIn');
    const revenuePrev = sum(prev7, 'cashIn');
    const expenses7 = sum(last7, 'cashOut');
    return {
      revenue7,
      revenueChangePct: revenuePrev > 0 ? ((revenue7 - revenuePrev) / revenuePrev) * 100 : 0,
      expenses7,
      avgDailyRevenue: last7.length > 0 ? revenue7 / last7.length : 0,
      bestDay: last7.reduce<DailyTrendPoint | null>((best, p) => (!best || p.cashIn > best.cashIn ? p : best), null),
    };
  }, [trend]);

  return { trend, weeklyRollup, categoryBreakdown, kpis, loading, error, reload };
}
