import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLongRightIcon } from '@heroicons/react/24/outline';
import type { VaultTxType } from '../../core/types';
import { formatDate } from '../../utils/format';
import { Button } from '../shared/Button';
import { Field, NumberInput, Select, TextInput } from '../shared/Inputs';

export const VAULT_TYPE_LABELS: Record<VaultTxType, string> = {
  deposit: 'Deposit into Safe (Drawer → Safe)',
  withdrawal: 'Withdraw from Safe (Safe → Drawer)',
  internal_transfer: 'Internal Transfer (branch / audit trail)',
};

interface VaultTransferFormProps {
  businessDate: string;
  disabled?: boolean;
  onRecord: (type: VaultTxType, amount: number, note: string | null) => Promise<void>;
}

export function VaultTransferForm({ businessDate, disabled, onRecord }: VaultTransferFormProps) {
  const [type, setType] = useState<VaultTxType>('deposit');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const value = parseFloat(amount);
    if (!Number.isFinite(value) || value <= 0) return;
    setSaving(true);
    try {
      await onRecord(type, Math.round(value * 100) / 100, note.trim() || null);
      setAmount('');
      setNote('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Movement Type" htmlFor="vault-type" required>
        <Select id="vault-type" value={type} onChange={(e) => setType(e.target.value as VaultTxType)}>
          {(Object.keys(VAULT_TYPE_LABELS) as VaultTxType[]).map((t) => (
            <option key={t} value={t}>
              {VAULT_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Amount (Rs.)" htmlFor="vault-amount" required hint={`Posting to ${formatDate(businessDate)}`}>
        <NumberInput id="vault-amount" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </Field>

      <Field label="Note" htmlFor="vault-note" hint="Who authorised it? Seal / bag number etc.">
        <TextInput id="vault-note" placeholder="e.g. Evening collection — 2 bags sealed" value={note} onChange={(e) => setNote(e.target.value)} maxLength={140} />
      </Field>

      <Button
        type="submit"
        className="w-full"
        size="lg"
        loading={saving}
        disabled={disabled || !amount}
        icon={<ArrowLongRightIcon className="h-4 w-4" />}
      >
        Record Movement
      </Button>
    </form>
  );
}
