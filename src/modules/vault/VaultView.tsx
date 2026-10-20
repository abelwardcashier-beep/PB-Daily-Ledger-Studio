import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArchiveBoxIcon,
  ArrowTopRightOnSquareIcon,
  BanknotesIcon,
  ShieldCheckIcon,
  TrashIcon,
  ArrowDownCircleIcon,
  ArrowUpCircleIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline';
import type { VaultTransaction, VaultTxType } from '../../core/types';
import type { useTransactions } from '../../hooks/useTransactions';
import type { useVault } from '../../hooks/useVault';
import { formatCurrency, formatDate } from '../../utils/format';
import { vaultToRows, exportWorkbook } from '../../utils/exportXlsx';
import { Button } from '../shared/Button';
import { Card, StatCard } from '../shared/Card';
import { VAULT_TYPE_LABELS, VaultTransferForm } from './VaultTransferForm';

type TxHook = ReturnType<typeof useTransactions>;
type VaultHook = ReturnType<typeof useVault>;

interface VaultViewProps {
  businessDate: string;
  openingBalance: number;
  tx: TxHook;
  vault: VaultHook;
  notify: (kind: 'success' | 'error', msg: string) => void;
}

const TYPE_META: Record<VaultTxType, { icon: typeof ArrowDownCircleIcon; tone: string }> = {
  deposit: { icon: ArrowDownCircleIcon, tone: 'text-gilded bg-gilded-tint' },
  withdrawal: { icon: ArrowUpCircleIcon, tone: 'text-lagoon bg-lagoon-tint' },
  internal_transfer: { icon: ArrowsRightLeftIcon, tone: 'text-primary bg-primary-tint' },
};

export function VaultView({ businessDate, openingBalance, tx, vault, notify }: VaultViewProps) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const drawerBalance = openingBalance + tx.summary.netCash + vault.drawerVaultEffect;
  const totalPosition = drawerBalance + vault.vaultBalance;

  const handleRecord = async (type: VaultTxType, amount: number, note: string | null) => {
    try {
      await vault.recordMovement({ business_date: businessDate, type, amount, note });
      notify('success', `${VAULT_TYPE_LABELS[type].split('(')[0].trim()} recorded`);
    } catch (e) {
      notify('error', e instanceof Error ? e.message : 'Failed to record movement');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await vault.removeMovement(id);
      notify('success', 'Movement removed');
    } catch (e) {
      notify('error', e instanceof Error ? e.message : 'Failed to remove movement');
    } finally {
      setConfirmId(null);
    }
  };

  const handleExport = () => {
    exportWorkbook({
      fileName: `PB-Vault-${businessDate}`,
      sheets: [{ name: 'Vault Movements', rows: vaultToRows(vault.movements) }],
    });
    notify('success', 'Vault log exported (.xlsx)');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Safe Vault Balance" value={formatCurrency(vault.vaultBalance)} tone="gilded" icon={<ShieldCheckIcon className="h-5 w-5" />} hint="All-time deposits − withdrawals" />
        <StatCard label="Drawer (Cash-in-Hand)" value={formatCurrency(drawerBalance)} tone="income" icon={<BanknotesIcon className="h-5 w-5" />} hint={`Opening ${formatCurrency(openingBalance)}`} />
        <StatCard label="Total Cash Position" value={formatCurrency(totalPosition)} tone="primary" icon={<ArchiveBoxIcon className="h-5 w-5" />} hint="Drawer + Safe combined" />
      </div>

      {/* Drawer -> Safe visual */}
      <Card title="Cash Flow Between Drawer & Safe" subtitle="Deposits move cash out of the till into the vault" padded={false}>
        <div className="p-5 pt-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div className="rounded-lg border border-border-subtle bg-bg-app p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Drawer</p>
            <p className="mt-1 text-xl font-bold text-ink tabular-nums">{formatCurrency(drawerBalance)}</p>
          </div>
          <div className="flex justify-center">
            <div className="flex items-center gap-2 rounded-full bg-primary-tint px-4 py-2">
              <ArrowUpCircleIcon className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold text-primary-deep uppercase tracking-wide">Transfers</span>
              <ArrowDownCircleIcon className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="rounded-lg border border-gilded/40 bg-gilded-tint p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-gilded">Safe Vault</p>
            <p className="mt-1 text-xl font-bold text-gilded-deep tabular-nums">{formatCurrency(vault.vaultBalance)}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <Card title="New Vault Movement" subtitle="Internal transfer & safe deposits">
          <VaultTransferForm businessDate={businessDate} onRecord={handleRecord} />
        </Card>

        <Card
          className="lg:col-span-2"
          title="Vault Audit Trail"
          subtitle={`${vault.movements.length} movements on record`}
          padded={false}
          action={
            <Button variant="secondary" size="sm" onClick={handleExport} icon={<ArrowTopRightOnSquareIcon className="h-4 w-4" />}>
              Export Log
            </Button>
          }
        >
          <ul className="divide-y divide-border-subtle max-h-[480px] overflow-y-auto">
            <AnimatePresence initial={false}>
              {vault.movements.length === 0 && (
                <li className="p-8 text-center text-sm text-ink-faint">No vault movements yet — record a deposit to begin.</li>
              )}
              {[...vault.movements]
                .reverse()
                .map((m: VaultTransaction) => {
                  const meta = TYPE_META[m.type];
                  const Icon = meta.icon;
                  return (
                    <motion.li
                      key={m.id}
                      layout
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-bg-hover/60 transition-colors"
                    >
                      <span className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center ${meta.tone}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-ink truncate">{VAULT_TYPE_LABELS[m.type].split('(')[0]}</p>
                        <p className="text-xs text-ink-faint truncate">
                          {formatDate(m.business_date)}
                          {m.note ? ` · ${m.note}` : ''}
                        </p>
                      </div>
                      <span className={`text-sm font-bold tabular-nums ${m.type === 'deposit' ? 'text-gilded' : m.type === 'withdrawal' ? 'text-lagoon' : 'text-primary'}`}>
                        {formatCurrency(m.amount)}
                      </span>
                      {confirmId === m.id ? (
                        <span className="flex items-center gap-1">
                          <Button size="sm" variant="danger" onClick={() => handleDelete(m.id)}>
                            Confirm
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)}>
                            No
                          </Button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setConfirmId(m.id)}
                          className="p-1.5 rounded-md text-ink-faint hover:text-expense hover:bg-expense-tint transition-colors"
                          aria-label="Delete movement"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </motion.li>
                  );
                })}
            </AnimatePresence>
          </ul>
        </Card>
      </div>
    </div>
  );
}
