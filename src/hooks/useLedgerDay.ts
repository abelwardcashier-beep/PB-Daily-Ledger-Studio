import { useCallback, useEffect, useState } from 'react';
import { todayIso } from '../utils/format';
import type { LedgerDay } from '../core/types';
import { TABLE_LEDGER_DAYS } from '../core/constants';
import { ledgerDayService } from '../services/ledgerDayService';
import { useRealtimeTable } from './useRealtimeTable';

/** Manages the selected business day + its opening balance session. */
export function useLedgerDay() {
  const [businessDate, setBusinessDate] = useState<string>(todayIso());
  const [day, setDay] = useState<LedgerDay | null>(null);
  const [days, setDays] = useState<LedgerDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await ledgerDayService.list();
      setDays(all);
      setDay(all.find((d) => d.business_date === businessDate) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load ledger days');
    } finally {
      setLoading(false);
    }
  }, [businessDate]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Realtime listener — silently refresh the day list when it changes elsewhere.
  const handleRealtimeChange = useCallback(() => {
    ledgerDayService
      .list()
      .then((all) => {
        setDays(all);
        setDay(all.find((d) => d.business_date === businessDate) ?? null);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Realtime refresh failed'));
  }, [businessDate]);

  useRealtimeTable({ table: TABLE_LEDGER_DAYS, channelName: 'ledger-days-session', onChange: handleRealtimeChange });

  /** Start (or resume) a day with an opening cash balance. */
  const startDay = useCallback(
    async (date: string, openingBalance: number): Promise<LedgerDay> => {
      const created = await ledgerDayService.create({ business_date: date, opening_balance: openingBalance });
      setBusinessDate(date);
      await reload();
      return created;
    },
    [reload],
  );

  const closeDay = useCallback(async () => {
    if (!day) return;
    await ledgerDayService.setStatus(day.id, 'closed');
    await reload();
  }, [day, reload]);

  const openingBalance = day?.opening_balance ?? 0;

  return {
    businessDate,
    setBusinessDate,
    day,
    days,
    openingBalance,
    isDayStarted: day !== null,
    isLoading: loading,
    loading,
    error,
    startDay,
    closeDay,
    reload,
  };
}
