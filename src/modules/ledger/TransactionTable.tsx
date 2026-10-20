import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { Transaction } from '../../core/types';
import { CATEGORY_STYLES } from '../../core/constants';
import { formatCurrency, formatDate } from '../../utils/format';
import { Button } from '../shared/Button';

export interface TransactionTableProps {
  transactions: Transaction[];
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (id: string) => void;
}

/** Coloured cash-in / cash-out badge. */
function KindBadge({ transaction }: { transaction: Transaction }) {
  const isIn = transaction.kind === 'cash_in';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${
        isIn ? 'bg-income-tint text-income-deep ring-income/30' : 'bg-expense-tint text-expense-deep ring-expense/30'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isIn ? 'bg-income' : 'bg-expense'}`} />
      {isIn ? 'Cash In' : 'Cash Out'}
    </span>
  );
}

/** Responsive, presentational ledger table for the selected business date. */
export function TransactionTable({ transactions, onEdit, onDelete }: TransactionTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm font-semibold text-ink-soft">No entries yet</p>
        <p className="text-xs text-ink-faint mt-1">Recorded transactions for the selected date appear here.</p>
      </div>
    );
  }

  return (
    <>
      {/* ── Desktop table ─────────────────────────────────── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-left text-[11px] uppercase tracking-wide text-ink-faint">
              <th className="px-5 py-2.5 font-semibold">Date</th>
              <th className="px-3 py-2.5 font-semibold">Type</th>
              <th className="px-3 py-2.5 font-semibold">Category</th>
              <th className="px-3 py-2.5 font-semibold">Description</th>
              <th className="px-3 py-2.5 font-semibold text-right">Amount</th>
              <th className="px-3 py-2.5 font-semibold">Staff</th>
              <th className="px-5 py-2.5 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => {
              const style = CATEGORY_STYLES[t.category];
              return (
                <tr key={t.id} className="border-b border-border-subtle last:border-0 hover:bg-bg-hover/60 transition-colors">
                  <td className="px-5 py-3 whitespace-nowrap text-ink-soft tabular-nums">{formatDate(t.business_date)}</td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="flex flex-col items-start gap-1">
                      <KindBadge transaction={t} />
                      {t.is_internal_transfer && (
                        <span className="inline-flex items-center rounded-full bg-primary-tint px-2 py-0.5 text-[10px] font-semibold text-primary ring-1 ring-inset ring-primary/30">
                          Internal Transfer
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${style.badge}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                      {t.category}
                    </span>
                  </td>
                  <td className="px-3 py-3 max-w-[220px] truncate text-ink-soft" title={t.description ?? undefined}>
                    {t.description ?? <span className="text-ink-faint">—</span>}
                  </td>
                  <td
                    className={`px-3 py-3 whitespace-nowrap text-right font-bold tabular-nums ${
                      t.kind === 'cash_in' ? 'text-income' : 'text-expense'
                    }`}
                  >
                    {t.kind === 'cash_in' ? '+' : '−'} {formatCurrency(t.amount)}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-ink-soft">
                    {t.staff ?? <span className="text-ink-faint">—</span>}
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-right">
                    <div className="inline-flex gap-1">
                      {onEdit && (
                        <Button variant="ghost" size="sm" aria-label="Edit entry" onClick={() => onEdit(t)}>
                          <PencilSquareIcon className="h-4 w-4" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="Delete entry"
                          className="text-ink-faint hover:text-expense"
                          onClick={() => onDelete(t.id)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Mobile cards ──────────────────────────────────── */}
      <ul className="md:hidden divide-y divide-border-subtle">
        {transactions.map((t) => (
          <li key={t.id} className="px-5 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <KindBadge transaction={t} />
                  {t.is_internal_transfer && (
                    <span className="inline-flex items-center rounded-full bg-primary-tint px-2 py-0.5 text-[10px] font-semibold text-primary ring-1 ring-inset ring-primary/30">
                      Internal
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-ink-soft truncate">
                  {t.category} · {formatDate(t.business_date)} · {t.staff ?? 'Unassigned'}
                </p>
                {t.description && <p className="text-xs text-ink-faint truncate">{t.description}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className={`text-sm font-bold tabular-nums ${t.kind === 'cash_in' ? 'text-income' : 'text-expense'}`}>
                  {formatCurrency(t.amount)}
                </p>
                <div className="mt-1 inline-flex gap-1">
                  {onEdit && (
                    <Button variant="ghost" size="sm" aria-label="Edit entry" onClick={() => onEdit(t)}>
                      <PencilSquareIcon className="h-4 w-4" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Delete entry"
                      className="text-ink-faint hover:text-expense"
                      onClick={() => onDelete(t.id)}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
