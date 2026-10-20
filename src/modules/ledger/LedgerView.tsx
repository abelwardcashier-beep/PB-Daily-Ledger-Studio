import { useMemo, useState } from 'react';
import {
  ArrowTopRightOnSquareIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  ArrowDownCircleIcon,
  ArrowUpCircleIcon,
} from '@heroicons/react/24/outline';
import type { Transaction } from '../../core/types';
import type { useTransactions } from '../../hooks/useTransactions';
import type { useVault } from '../../hooks/useVault';
import { formatCurrency } from '../../utils/format';
import { exportTransactionsToExcel } from '../../utils/exportSpreadsheet';
import { exportDailyLedger, transactionsToRows, exportWorkbook } from '../../utils/exportXlsx';
import { Button } from '../shared/Button';
import { Card, StatCard } from '../shared/Card';
import { IntakeForm } from './IntakeForm';
import { LedgerTable } from './LedgerTable';
import { TransactionFilterBar, type TransactionFilters } from './TransactionFilterBar';
import { EditTransactionModal } from './EditTransactionModal';
import { DenominationCounter } from './DenominationCounter';

type TxHook = ReturnType<typeof useTransactions>;
type VaultHook = ReturnType<typeof useVault>;

interface LedgerViewProps {
  businessDate: string;
  openingBalance: number;
  isDayStarted: boolean;
  tx: TxHook;
  vault: VaultHook;
  onStartDay: () => void;
  notify: (kind: 'success' | 'error', msg: string) => void;
}

const EMPTY_FILTERS: TransactionFilters = { kind: 'all', category: '', staff: '' };

export function LedgerView({ businessDate, openingBalance, isDayStarted, tx, vault, onStartDay, notify }: LedgerViewProps) {
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [filters, setFilters] = useState<TransactionFilters>(EMPTY_FILTERS);
  const drawerBalance = openingBalance + tx.summary.netCash + vault.drawerVaultEffect;

  // Presentation-only filtering of hook data (no business rules here).
  const filteredTransactions = useMemo(
    () =>
      tx.transactions.filter((t) => {
        if (filters.kind !== 'all' && t.kind !== filters.kind) return false;
        if (filters.category !== '' && t.category !== filters.category) return false;
        if (filters.staff !== '' && t.staff !== filters.staff) return false;
        return true;
      }),
    [tx.transactions, filters],
  );

  const availableCategories = useMemo(
    () => Array.from(new Set(tx.transactions.map((t) => t.category))),
    [tx.transactions],
  );

  const availableStaff = useMemo(
    () => Array.from(new Set(tx.transactions.map((t) => t.staff).filter((s): s is NonNullable<typeof s> => s !== null))),
    [tx.transactions],
  );

  const handleExportExcel = () => {
    exportTransactionsToExcel(filteredTransactions, `PB-Transactions-${businessDate}`);
    notify('success', 'Transactions exported (.xlsx)');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this ledger entry? This cannot be undone.')) return;
    try {
      await tx.deleteTransaction(id);
      notify('success', 'Entry deleted');
    } catch (e) {
      notify('error', e instanceof Error ? e.message : 'Failed to delete entry');
    }
  };

  const handleExport = () => {
    exportDailyLedger({
      businessDate,
      transactions: tx.transactions,
      vaultMovements: vault.todaysMovements,
      openingBalance,
      grossSales: tx.summary.grossSales,
      totalCashIn: tx.summary.totalCashIn,
      totalCashOut: tx.summary.totalCashOut,
      drawerBalance,
      vaultBalance: vault.vaultBalance,
    });
    notify('success', 'Workbook downloaded (.xlsx)');
  };

  const handleQuickExport = () => {
    exportWorkbook({
      fileName: `PB-Cash-Ledger-${businessDate}`,
      sheets: [{ name: 'Cash Ledger', rows: transactionsToRows(tx.transactions) }],
    });
  };

  if (!isDayStarted) {
    return (
      <Card className="max-w-lg mx-auto mt-10 text-center" padded>
        <div className="py-8">
          <div className="mx-auto h-14 w-14 rounded-xl bg-indigo-50 flex items-center justify-center mb-4">
            <CalendarDaysIcon className="h-7 w-7 text-indigo-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Day not started</h2>
          <p className="text-sm text-slate-500 mt-1.5 max-w-xs mx-auto">
            Start <span className="font-semibold text-slate-700">{businessDate}</span> with an opening cash balance to begin posting entries.
          </p>
          <Button className="mt-6" size="lg" icon={<CalendarDaysIcon className="h-4 w-4" />} onClick={onStartDay}>
            Start New Day
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Gross Sales" value={formatCurrency(tx.summary.grossSales)} tone="emerald" icon={<ClipboardDocumentListIcon className="h-5 w-5" />} hint={`${tx.transactions.filter((t) => t.category === 'Gross Sales').length} sales entries`} />
        <StatCard label="Total Cash In" value={formatCurrency(tx.summary.totalCashIn)} tone="sky" icon={<ArrowDownCircleIcon className="h-5 w-5" />} />
        <StatCard label="Total Cash Out" value={formatCurrency(tx.summary.totalCashOut)} tone="rose" icon={<ArrowUpCircleIcon className="h-5 w-5" />} hint={`Expenses at ${(tx.summary.expenseRatio * 100).toFixed(0)}% of inflow`} />
        <StatCard label="Drawer Balance" value={formatCurrency(drawerBalance)} tone="amber" icon={<BanknotesIcon className="h-5 w-5" />} hint={`Opening ${formatCurrency(openingBalance)}`} />
      </div>

      {/* Form + counter / table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="space-y-6">
          <IntakeForm
            businessDate={businessDate}
            onSubmit={async (input) => {
              try {
                await tx.addTransaction(input);
                notify('success', `${input.kind === 'cash_in' ? 'Cash-in' : 'Cash-out'} recorded`);
              } catch (e) {
                notify('error', e instanceof Error ? e.message : 'Failed to save entry');
              }
            }}
          />
          <DenominationCounter expectedTotal={drawerBalance} />
        </div>

        <Card
          className="lg:col-span-2"
          title="Today's Cash Ledger"
          subtitle={`${filteredTransactions.length} of ${tx.transactions.length} entries · ${businessDate}`}
          padded={false}
          action={
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={handleQuickExport} icon={<ArrowTopRightOnSquareIcon className="h-4 w-4" />}>
                Quick XLSX
              </Button>
              <Button variant="primary" size="sm" onClick={handleExport} icon={<ArrowTopRightOnSquareIcon className="h-4 w-4" />}>
                Full Workbook
              </Button>
            </div>
          }
        >
          <div className="border-b border-slate-200 px-5 py-3">
            <TransactionFilterBar
              businessDate={businessDate}
              onDateChange={() => undefined} /* date is owned by the app shell / hooks */
              filters={filters}
              onFiltersChange={setFilters}
              availableCategories={availableCategories}
              availableStaff={availableStaff}
              onExport={handleExportExcel}
              exportDisabled={filteredTransactions.length === 0}
            />
          </div>
          <div className="p-5 pt-4">
            {tx.loading ? (
              <div className="py-16 text-center text-sm text-slate-400 animate-pulse">Loading ledger…</div>
            ) : (
              <LedgerTable transactions={filteredTransactions} onEdit={setEditing} onDelete={handleDelete} />
            )}
          </div>
        </Card>
      </div>

      <EditTransactionModal
        transaction={editing}
        onClose={() => setEditing(null)}
        onSave={async (id, patch) => {
          try {
            await tx.editTransaction(id, patch);
            notify('success', 'Entry updated');
          } catch (e) {
            notify('error', e instanceof Error ? e.message : 'Failed to update entry');
            throw e;
          }
        }}
      />
    </div>
  );
}
