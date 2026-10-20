import { useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../core/supabase';

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE';

interface UseRealtimeTableOptions {
  /** Table name to listen on (must be enabled for Realtime in Supabase). */
  table: string;
  /** Called whenever an INSERT / UPDATE / DELETE lands on the table. */
  onChange: (event: RealtimeEvent) => void;
  /** Stable channel id so multiple hooks don't collide. */
  channelName?: string;
}

/**
 * Subscribes to Postgres Changes on a Supabase table and invokes `onChange`
 * with the event type. No-op when Supabase is not configured (the local
 * storage fallback updates state optimistically instead).
 *
 * `onChange` should be memoised (`useCallback`) — it is re-subscribed when it
 * changes. Errors are surfaced via `console.warn` so realtime failures never
 * break the UI.
 */
export function useRealtimeTable({
  table,
  onChange,
  channelName = `${table}-realtime`,
}: UseRealtimeTableOptions): void {
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const client = supabase;

    const channel = client
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload: { eventType: unknown }) => {
          const eventType = String(payload.eventType);
          if (eventType === 'INSERT' || eventType === 'UPDATE' || eventType === 'DELETE') {
            onChange(eventType);
          }
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          // eslint-disable-next-line no-console
          console.warn(`[realtime] channel "${channelName}" status: ${status}`);
        }
      });

    return () => {
      void client.removeChannel(channel);
    };
  }, [table, channelName, onChange]);
}
