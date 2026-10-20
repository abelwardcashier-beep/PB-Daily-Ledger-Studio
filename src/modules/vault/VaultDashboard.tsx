import { motion } from 'motion/react';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import { StatCard } from '../shared';
import { formatCurrency } from '../../utils/format';

export interface VaultDashboardProps {
  /** Safe running balance from `useVault` (all-time deposits − withdrawals). */
  safeBalance: number;
}

/**
 * Presentational hero card for the safe vault.
 * Displays the current safe running balance prominently — no target comparisons.
 */
export function VaultDashboard({ safeBalance }: VaultDashboardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <StatCard
        label="Safe Running Balance"
        value={formatCurrency(safeBalance)}
        icon={<ShieldCheckIcon className="h-6 w-6" />}
        tone="indigo"
      />
    </motion.div>
  );
}
