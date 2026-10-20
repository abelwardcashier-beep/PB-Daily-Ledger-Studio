import { useState } from 'react';
import type { FormEvent } from 'react';
import { BanknotesIcon, PlusCircleIcon } from '@heroicons/react/24/outline';
import type { StaffMember, VaultDepositType } from '../../core/types';
import { STAFF_MEMBERS } from '../../core/types';
import type { NewVaultInput } from '../../services/vaultService';
import { formatDate } from '../../utils/format';
import { Button } from '../shared/Button';
import { Field, NumberInput, Select, TextInput } from '../shared/Inputs';

export const DEPOSIT_TYPE_LABELS: Record<VaultDepositType, string> = {
  committee: 'Committee',
  capital: 'Capital',
  bank_withdrawal: 'Bank Withdrawal',
  cash_deposit: 'Cash Deposit (Drawer → Safe)',
};

const DEPOSIT_TYPES = Object.keys(DEPOSIT_TYPE_LABELS) as VaultDepositType[];

export interface VaultDepositFormProps {
  businessDate: string;
  disabled?: boolean;
  /** Hook mutation — this component only collects input and calls it. */
  onAddDeposit: (input: NewVaultInput) => Promise<unknown>;
  onSubmitted?: () => void;
}

/** Form to add a new vault deposit (Committee / Capital / Bank Withdrawal / Drawer transfer). */
export function VaultDepositForm({ businessDate, disabled, onAddDeposit, onSubmitted }: VaultDepositFormProps) {
  const [depositType, setDepositType] = useState<VaultDepositType>('committee');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [staff, setStaff] = useState<'' | StaffMember>('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const value = parseFloat(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setFormError('Enter an amount greater than zero.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await onAddDeposit({
        business_date: businessDate,
        type: 'deposit',
        amount: Math.round(value * 100) / 100,
        note: note.trim() || null,
        deposit_type: depositType,
        staff: staff || null,
      });
      setAmount('');
      setNote('');
      setStaff('');
      onSubmitted?.();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to record the deposit.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Deposit Source" htmlFor="vault-deposit-type" required>
        <Select
          id="vault-deposit-type"
          value={depositType}
          onChange={(e) => setDepositType(e.target.value as VaultDepositType)}
        >
          {DEPOSIT_TYPES.map((t) => (
            <option key={t} value={t}>
              {DEPOSIT_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Amount (Rs.)"
        htmlFor="vault-deposit-amount"
        required
        hint={`Posting to ${formatDate(businessDate)}`}
        error={formError ?? undefined}
      >
        <NumberInput
          id="vault-deposit-amount"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          invalid={formError !== null}
          required
        />
      </Field>

      <Field label="Description / Note" htmlFor="vault-deposit-note" hint="e.g. Committee collection round #14">
        <TextInput
          id="vault-deposit-note"
          placeholder="What is this money for?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={140}
        />
      </Field>

      <Field label="Staff Member" htmlFor="vault-deposit-staff" hint="Who deposited it into the safe?">
        <Select
          id="vault-deposit-staff"
          value={staff}
          onChange={(e) => setStaff(e.target.value as '' | StaffMember)}
        >
          <option value="">— Unassigned —</option>
          {STAFF_MEMBERS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </Field>

      <Button
        type="submit"
        className="w-full"
        size="lg"
        loading={submitting}
        disabled={disabled || !amount}
        icon={<PlusCircleIcon className="h-4 w-4" />}
      >
        Add Vault Deposit
      </Button>

      <p className="flex items-center gap-1.5 text-[11px] text-ink-faint">
        <BanknotesIcon className="h-3.5 w-3.5" />
        Deposits increase the safe running balance instantly via Supabase Realtime.
      </p>
    </form>
  );
}
