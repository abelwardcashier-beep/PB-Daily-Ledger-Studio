/**
 * Supabase-generated database types for PB-Daily-Ledger-Studio.
 *
 * Regenerate a fresh copy with:
 *   npx supabase gen types typescript --project-id <your-project-id> > src/core/database.types.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      ledger_transactions: {
        Row: {
          id: string;
          business_date: string;
          kind: string;
          category: string | null;
          amount: number;
          description: string | null;
          reference: string | null;
          is_internal_transfer: boolean | null;
          staff: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          business_date: string;
          kind: string;
          category?: string | null;
          amount: number;
          description?: string | null;
          reference?: string | null;
          is_internal_transfer?: boolean | null;
          staff?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          business_date?: string;
          kind?: string;
          category?: string | null;
          amount?: number;
          description?: string | null;
          reference?: string | null;
          is_internal_transfer?: boolean | null;
          staff?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      vault_transactions: {
        Row: {
          id: string;
          business_date: string;
          type: string;
          amount: number;
          note: string | null;
          deposit_type: string | null;
          staff: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          business_date: string;
          type: string;
          amount: number;
          note?: string | null;
          deposit_type?: string | null;
          staff?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          business_date?: string;
          type?: string;
          amount?: number;
          note?: string | null;
          deposit_type?: string | null;
          staff?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      ledger_days: {
        Row: {
          id: string;
          business_date: string;
          opening_balance: number;
          status: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          business_date: string;
          opening_balance: number;
          status?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          business_date?: string;
          opening_balance?: number;
          status?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
