import { motion } from 'motion/react';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import { formatCurrency } from '../../utils/format';

export interface VaultDashboardProps {
  /** Current safe running balance from `useVault` (all-time deposits − withdrawals). */
  safeRunningBalance: number;
}

/**
 * Clean, simple display of the money currently in the vault.
 * Shows ONLY the current safe running balance formatted as PKR —
 * no target comparisons, no warning badges, no success badges, and no fix buttons.
 */
export function VaultDashboard({ safeRunningBalance }: VaultDashboardProps) {
  return (
    <motion.section
      aria-label="Safe vault balance"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-md)]"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--primary-light)] text-[var(--primary)]">
          <ShieldCheckIcon className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="text-sm font-medium uppercase tracking-wide text-[var(--text-secondary)]">
          Money in Vault
        </p>
      </div>
      <p className="mt-4 font-display text-3xl font-semibold tabular-nums text-[var(--text-primary)] sm:text-4xl">
        {formatCurrency(safeRunningBalance)}
      </p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        Current safe running balance · PKR
      </p>
    </motion.section>
  );
}
