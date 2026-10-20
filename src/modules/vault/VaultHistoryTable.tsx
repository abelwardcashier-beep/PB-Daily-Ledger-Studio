import { AnimatePresence, motion } from 'motion/react';
import { ArrowDownCircleIcon, ArrowUpCircleIcon, ArrowsRightLeftIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { VaultTransaction, VaultTxType } from '../../core/types';
import { formatCurrency, formatDate } from '../../utils/format';
import { Button } from '../shared/Button';

const TYPE_META: Record<VaultTxType, { label: string; icon: typeof ArrowDownCircleIcon; badge: string }> = {
  deposit: {
    label: 'Deposit',
    icon: ArrowDownCircleIcon,
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  },
  withdrawal: {
    label: 'Withdrawal',
    icon: ArrowUpCircleIcon,
    badge: 'bg-rose-50 text-rose-700 ring-rose-200',
  },
  internal_transfer: {
    label: 'Internal Transfer',
    icon: ArrowsRightLeftIcon,
    badge: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  },
};

export interface VaultHistoryTableProps {
  movements: VaultTransaction[];
  onDelete?: (id: string) => void;
}

/** Presentational audit-trail table of all vault deposits & withdrawals. */
export function VaultHistoryTable({ movements, onDelete }: VaultHistoryTableProps) {
  const ordered = [...movements].reverse();

  if (ordered.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm font-semibold text-slate-600">No vault movements yet</p>
        <p className="text-xs text-slate-400 mt-1">Deposits and withdrawals into the safe appear here.</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-400">
              <th className="px-5 py-2.5 font-semibold">Date</th>
              <th className="px-3 py-2.5 font-semibold">Type</th>
              <th className="px-3 py-2.5 font-semibold">Description</th>
              <th className="px-3 py-2.5 font-semibold text-right">Amount</th>
              <th className="px-5 py-2.5 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {ordered.map((m) => {
                const meta = TYPE_META[m.type];
                const Icon = meta.icon;
                return (
                  <motion.tr
                    key={m.id}
                    layout
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="px-5 py-3 whitespace-nowrap text-slate-600 tabular-nums">{formatDate(m.business_date)}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${meta.badge}`}>
                        <Icon className="h-3.5 w-3.5" />
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 max-w-[260px] truncate text-slate-600" title={m.note ?? undefined}>
                      {m.note ?? <span className="text-slate-400">—</span>}
                    </td>
                    <td
                      className={`px-3 py-3 whitespace-nowrap text-right font-bold tabular-nums ${
                        m.type === 'deposit' ? 'text-emerald-600' : m.type === 'withdrawal' ? 'text-rose-600' : 'text-indigo-600'
                      }`}
                    >
                      {m.type === 'deposit' ? '+' : m.type === 'withdrawal' ? '−' : '⇄'} {formatCurrency(m.amount)}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-right">
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="Delete movement"
                          className="text-slate-400 hover:text-rose-600"
                          onClick={() => onDelete(m.id)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <ul className="md:hidden divide-y divide-slate-100">
        {ordered.map((m) => {
          const meta = TYPE_META[m.type];
          const Icon = meta.icon;
          return (
            <li key={m.id} className="flex items-center gap-3 px-5 py-3">
              <span className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center ring-1 ring-inset ${meta.badge}`}>
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800 truncate">{meta.label}</p>
                <p className="text-xs text-slate-400 truncate">
                  {formatDate(m.business_date)} · {m.note ?? 'No description'}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p
                  className={`text-sm font-bold tabular-nums ${
                    m.type === 'deposit' ? 'text-emerald-600' : m.type === 'withdrawal' ? 'text-rose-600' : 'text-indigo-600'
                  }`}
                >
                  {formatCurrency(m.amount)}
                </p>
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Delete movement"
                    className="text-slate-400 hover:text-rose-600"
                    onClick={() => onDelete(m.id)}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
