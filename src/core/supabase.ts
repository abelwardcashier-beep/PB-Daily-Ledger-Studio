import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

/**
 * Supabase client factory.
 *
 * Credentials are read from Vite env vars:
 *   VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
 *
 * If they are missing or left as placeholders, `isSupabaseConfigured` is false
 * and every service transparently falls back to a local-storage adapter so the
 * studio remains fully functional offline / during development.
 */
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';

const looksLikePlaceholder = (value: string) => value.startsWith('YOUR_') || value === '' || value.includes('placeholder');

export const isSupabaseConfigured: boolean =
  /^https?:\/\/.+/i.test(url) && !looksLikePlaceholder(url) && !looksLikePlaceholder(anonKey);

export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(url, anonKey, { auth: { persistSession: true } })
  : null;

if (!isSupabaseConfigured && import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.info(`[PB-Daily-Ledger-Studio] Supabase not configured – using local storage fallback.
Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env to enable the cloud backend.`);
}
