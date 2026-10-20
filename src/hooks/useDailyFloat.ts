import { useCallback, useEffect, useState } from 'react';
import { TABLE_LEDGER_DAYS } from '../core/constants';
import { ledgerDayService } from '../services/ledgerDayService';
import { useRealtimeTable } from './useRealtimeTable';

export interface UseDailyFloatResult {
  /** Opening cash float for the selected date (0 before the day is started). */
  openingBalance: number;
  /** Whether a ledger session row exists for the selected date. */
  isStarted: boolean;
  isLoading: boolean;
  /** Alias of `isLoading` kept for consistency with the other data hooks. */
  loading: boolean;
  error: string | null;
  /** Create (or update) the opening float for the selected date. */
  setOpeningBalance: (amount: number) => Promise<void>;
  reload: () => Promise<void>;
}

/**
 * Fetches and manages the opening cash float ("daily float") for the
 * currently selected business date. Subscribes to the `ledger_days` table so
 * the float refreshes instantly when another device starts or edits the day.
 */
export function useDailyFloat(businessDate: string): UseDailyFloatResult {
  const [openingBalance, setBalance] = useState<number>(0);
  const [isStarted, setIsStarted] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyDay = useCallback((date: string) => {
    return ledgerDayService
      .findByDate(date)
      .then((day) => {
        setBalance(day?.opening_balance ?? 0);
        setIsStarted(day !== null);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load daily float'));
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const day = await ledgerDayService.findByDate(businessDate);
      setBalance(day?.opening_balance ?? 0);
      setIsStarted(day !== null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load daily float');
    } finally {
      setLoading(false);
    }
  }, [businessDate]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Realtime listener — silently refresh the float on any ledger_days change.
  const handleRealtimeChange = useCallback(() => {
    if (!isStarted && openingBalance === 0) return;
    void applyDay(businessDate);
  }, [applyDay, businessDate, isStarted, openingBalance]);

  useRealtimeTable({ table: TABLE_LEDGER_DAYS, channelName: 'ledger-days-realtime', onChange: handleRealtimeChange });

  const setOpeningBalance = useCallback(
    async (amount: number) => {
      setError(null);
      try {
        const day = await ledgerDayService.create({ business_date: businessDate, opening_balance: amount });
        setBalance(day.opening_balance);
        setIsStarted(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to save the opening float');
        throw e;
      }
    },
    [businessDate],
  );

  return {
    openingBalance,
    setOpeningBalance,
    isStarted,
    isLoading: loading,
    loading,
    error,
    reload,
  };
}
