/**
 * Minimal localStorage-backed table store used as an offline fallback when
 * Supabase credentials are not configured. Mirrors the subset of the
 * PostgREST-ish API our service layer needs.
 */

type Row = { id: string; created_at?: string } & Record<string, unknown>;

const PREFIX = 'pb-ledger:';

function readTable<T extends Row>(table: string): T[] {
  try {
    const raw = localStorage.getItem(PREFIX + table);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeTable<T extends Row>(table: string, rows: T[]): void {
  localStorage.setItem(PREFIX + table, JSON.stringify(rows));
}

export function uid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const localStore = {
  list<T extends Row>(table: string, where?: Partial<Record<keyof T, unknown>>): T[] {
    const rows = readTable<T>(table);
    if (!where) return rows.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    return rows
      .filter((r) => Object.entries(where).every(([k, v]) => v === undefined || r[k] === v))
      .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  },

  insert<T extends Row>(table: string, values: Omit<T, 'id' | 'created_at'> & Partial<Pick<T, 'id' | 'created_at'>>): T {
    const rows = readTable<T>(table);
    const row = {
      ...values,
      id: values.id ?? uid(),
      created_at: values.created_at ?? new Date().toISOString(),
    } as T;
    rows.push(row);
    writeTable(table, rows);
    return row;
  },

  update<T extends Row>(table: string, id: string, patch: Partial<T>): T | null {
    const rows = readTable<T>(table);
    const idx = rows.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    rows[idx] = { ...rows[idx], ...patch, id } as T;
    writeTable(table, rows);
    return rows[idx];
  },

  remove(table: string, id: string): void {
    writeTable(
      table,
      readTable<Row>(table).filter((r) => r.id !== id),
    );
  },

  clear(table: string): void {
    localStorage.removeItem(PREFIX + table);
  },
};
