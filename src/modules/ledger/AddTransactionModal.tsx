import { useState } from 'react';
import type { FormEvent } from 'react';
import { PlusCircleIcon } from '@heroicons/react/24/outline';
import type { StaffMember, TxCategory, TxKind } from '../../core/types';
import { CASH_IN_CATEGORIES, CASH_OUT_CATEGORIES, STAFF_MEMBERS } from '../../core/types';
import type { NewTransactionInput } from '../../services/transactionService';
import { Button } from '../shared/Button';
import { Modal } from '../shared/Modal';
import { Field, NumberInput, Select, TextInput } from '../shared/Inputs';

export interface AddTransactionModalProps {
  open: boolean;
  onClose: () => void;
  /** Business date the entry will be posted to. */
  businessDate: string;
  /** Hook mutation — the component only calls it and reports success/failure upward. */
  onSubmit: (input: NewTransactionInput) => Promise<unknown>;
  onSubmitted?: () => void;
}

/** Modal form for creating a new cash-in / cash-out ledger entry. */
export function AddTransactionModal({ open, onClose, businessDate, onSubmit, onSubmitted }: AddTransactionModalProps) {
  const [kind, setKind] = useState<TxKind>('cash_in');
  const [category, setCategory] = useState<TxCategory>('Gross Sales');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [staff, setStaff] = useState<'' | StaffMember>('');
  const [internal, setInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const categories = kind === 'cash_in' ? CASH_IN_CATEGORIES : CASH_OUT_CATEGORIES;

  const switchKind = (next: TxKind) => {
    setKind(next);
    setCategory(next === 'cash_in' ? 'Gross Sales' : 'Rent');
    if (next === 'cash_out') setInternal(false);
  };

  const reset = () => {
    setAmount('');
    setDescription('');
    setStaff('');
    setInternal(false);
    setFormError(null);
  };

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
      await onSubmit({
        business_date: businessDate,
        kind,
        category,
        amount: Math.round(value * 100) / 100,
        description: description.trim() || null,
        reference: null,
        is_internal_transfer: internal,
        staff: staff || null,
      });
      reset();
      onSubmitted?.();
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save the entry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="New Ledger Entry"
      description={`Posting to ${businessDate}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type toggle */}
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-bg-subtle p-1">
          <button
            type="button"
            onClick={() => switchKind('cash_in')}
            className={`rounded-md py-2 text-sm font-semibold transition-all ${
              kind === 'cash_in' ? 'bg-bg-card text-income shadow-sm' : 'text-ink-soft hover:text-ink'
            }`}
          >
            Cash In
          </button>
          <button
            type="button"
            onClick={() => switchKind('cash_out')}
            className={`rounded-md py-2 text-sm font-semibold transition-all ${
              kind === 'cash_out' ? 'bg-bg-card text-expense shadow-sm' : 'text-ink-soft hover:text-ink'
            }`}
          >
            Cash Out
          </button>
        </div>

        <Field label="Amount (Rs.)" htmlFor="add-tx-amount" required error={formError ?? undefined}>
          <NumberInput
            id="add-tx-amount"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            invalid={formError !== null}
            autoFocus
            required
          />
        </Field>

        <Field label="Category" htmlFor="add-tx-category" required>
          <Select
            id="add-tx-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as TxCategory)}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Description" htmlFor="add-tx-description" hint="Optional note for this entry">
          <TextInput
            id="add-tx-description"
            placeholder={kind === 'cash_in' ? 'e.g. Counter sales batch #3' : 'e.g. Shop rent October'}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={140}
          />
        </Field>

        <Field label="Staff Member" htmlFor="add-tx-staff" hint="Who handled this cash?">
          <Select
            id="add-tx-staff"
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

        {/* Internal transfer checkbox */}
        <label
          htmlFor="add-tx-internal"
          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
            internal ? 'border-primary/40 bg-primary-tint/60' : 'border-border-subtle bg-bg-card hover:bg-bg-app'
          }`}
        >
          <input
            id="add-tx-internal"
            type="checkbox"
            checked={internal}
            onChange={(e) => setInternal(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border-default text-primary focus:ring-primary"
          />
          <span className="text-sm">
            <span className="font-semibold text-ink-soft">Is this an internal transfer to the safe?</span>
            <span className="block text-xs text-ink-soft mt-0.5">
              Excluded from Gross Sales &amp; Operating Expenses metrics.
            </span>
          </span>
        </label>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={submitting}
            icon={<PlusCircleIcon className="h-4 w-4" />}
            variant={kind === 'cash_in' ? 'success' : 'danger'}
          >
            Record Entry
          </Button>
        </div>
      </form>
    </Modal>
  );
}
