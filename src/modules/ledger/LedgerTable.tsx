import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowDownCircleIcon,
  ArrowUpCircleIcon,
} from '@heroicons/react/24/outline';
import type { Transaction, TxKind } from '../../core/types';
import { CATEGORY_STYLES } from '../../core/constants';
import { formatCurrency } from '../../utils/format';
import { TextInput } from '../shared/Inputs';

type Filter = 'all' | TxKind;

interface LedgerTableProps {
  transactions: Transaction[];
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
}

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'cash_in', label: 'Cash In' },
  { key: 'cash_out', label: 'Cash Out' },
];

export function LedgerTable({ transactions, onEdit, onDelete }: LedgerTableProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions
      .filter((t) => filter === 'all' || t.kind === filter)
      .filter(
        (t) =>
          !q ||
          t.category.toLowerCase().includes(q) ||
          (t.description ?? '').toLowerCase().includes(q) ||
          (t.reference ?? '').toLowerCase().includes(q) ||
          String(t.amount).includes(q),
      )
      .slice()
      .reverse(); // newest first
  }, [transactions, filter, query]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex rounded-lg bg-slate-100 p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`relative rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === f.key ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {filter === f.key && (
                <motion.span layoutId="tx-filter-pill" className="absolute inset-0 rounded-md bg-white shadow-sm" />
              )}
              <span className="relative">{f.label}</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 sm:max-w-xs sm:ml-auto">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <TextInput
            className="pl-9"
            placeholder="Search amount, category, note…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search transactions"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
              <th className="py-2.5 pr-3 font-semibold">Type</th>
              <th className="py-2.5 pr-3 font-semibold">Category</th>
              <th className="py-2.5 pr-3 font-semibold hidden md:table-cell">Description</th>
              <th className="py-2.5 pr-3 font-semibold text-right">Amount</th>
              <th className="py-2.5 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <AnimatePresence initial={false}>
              {rows.map((t) => {
                const style = CATEGORY_STYLES[t.category];
                return (
                  <motion.tr
                    key={t.id}
                    layout
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.18 }}
                    className="group hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-3 pr-3">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                          t.kind === 'cash_in' ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {t.kind === 'cash_in' ? (
                          <ArrowDownCircleIcon className="h-4 w-4" />
                        ) : (
                          <ArrowUpCircleIcon className="h-4 w-4" />
                        )}
                        {t.kind === 'cash_in' ? 'In' : 'Out'}
                      </span>
                    </td>
                    <td className="py-3 pr-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${style.badge}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                        {t.category}
                      </span>
                    </td>
                    <td className="py-3 pr-3 hidden md:table-cell text-slate-600 max-w-56 truncate" title={t.description ?? ''}>
                      {t.description ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td
                      className={`py-3 pr-3 text-right font-bold tabular-nums ${
                        t.kind === 'cash_in' ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {t.kind === 'cash_in' ? '+' : '−'}
                      {formatCurrency(t.amount)}
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => onEdit(t)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        aria-label="Edit transaction"
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDelete(t.id)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        aria-label="Delete transaction"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-sm text-slate-400">
                  No entries match your filters yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
