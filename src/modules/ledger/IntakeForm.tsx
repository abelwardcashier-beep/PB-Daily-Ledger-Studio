import { useState } from 'react';
import type { FormEvent } from 'react';
import { PlusIcon, ArrowDownCircleIcon, ArrowUpCircleIcon } from '@heroicons/react/24/outline';
import type { StaffMember, TxCategory, TxKind } from '../../core/types';
import { CASH_IN_CATEGORIES, CASH_OUT_CATEGORIES, STAFF_MEMBERS } from '../../core/types';
import type { NewTransactionInput } from '../../services/transactionService';
import { Button } from '../shared/Button';
import { Card } from '../shared/Card';
import { Field, NumberInput, Select, TextInput } from '../shared/Inputs';

interface IntakeFormProps {
  businessDate: string;
  disabled?: boolean;
  onSubmit: (input: NewTransactionInput) => Promise<void>;
}

/** Quick-entry form for Cash-in / Cash-out ledger rows. */
export function IntakeForm({ businessDate, disabled, onSubmit }: IntakeFormProps) {
  const [kind, setKind] = useState<TxKind>('cash_in');
  const [category, setCategory] = useState<TxCategory>('Gross Sales');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [staff, setStaff] = useState<'' | StaffMember>('');
  const [internal, setInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const categories = kind === 'cash_in' ? CASH_IN_CATEGORIES : CASH_OUT_CATEGORIES;

  const switchKind = (next: TxKind) => {
    setKind(next);
    setCategory(next === 'cash_in' ? 'Gross Sales' : 'Rent');
    if (next === 'cash_out') setInternal(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const value = parseFloat(amount);
    if (!Number.isFinite(value) || value <= 0) return;
    setSubmitting(true);
    try {
      await onSubmit({
        business_date: businessDate,
        kind,
        category,
        amount: Math.round(value * 100) / 100,
        description: description.trim() || null,
        reference: reference.trim() || null,
        is_internal_transfer: internal,
        staff: staff || null,
      });
      setAmount('');
      setDescription('');
      setReference('');
      setStaff('');
      setInternal(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card title="New Entry" subtitle={`Posting to ${businessDate}`} padded={false}>
      <form onSubmit={handleSubmit} className="p-5 pt-4 space-y-4">
        {/* Kind toggle */}
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => switchKind('cash_in')}
            className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-semibold transition-all ${
              kind === 'cash_in' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ArrowDownCircleIcon className="h-4 w-4" /> Cash In
          </button>
          <button
            type="button"
            onClick={() => switchKind('cash_out')}
            className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-semibold transition-all ${
              kind === 'cash_out' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ArrowUpCircleIcon className="h-4 w-4" /> Cash Out
          </button>
        </div>

        <Field label="Amount (Rs.)" htmlFor="tx-amount" required>
          <NumberInput
            id="tx-amount"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
            required
          />
        </Field>

        <Field label="Category" htmlFor="tx-category" required>
          <Select id="tx-category" value={category} onChange={(e) => setCategory(e.target.value as TxCategory)}>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Description" htmlFor="tx-description" hint="Optional note for this entry">
          <TextInput
            id="tx-description"
            placeholder={kind === 'cash_in' ? 'e.g. Counter sales batch #3' : 'e.g. Shop rent October'}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={140}
          />
        </Field>

        <Field label="Reference" htmlFor="tx-reference" hint="Invoice / voucher number (optional)">
          <TextInput
            id="tx-reference"
            placeholder="INV-0001"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            maxLength={40}
          />
        </Field>

        <Field label="Staff Member" htmlFor="tx-staff" hint="Who handled this cash?">
          <Select id="tx-staff" value={staff} onChange={(e) => setStaff(e.target.value as "" | StaffMember)}>
            <option value="">— Unassigned —</option>
            {STAFF_MEMBERS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>

        {/* Internal-transfer checkbox — excluded from Gross Sales / Expenses KPIs */}
        <label
          htmlFor="tx-internal"
          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
            internal ? 'border-indigo-300 bg-indigo-50/60' : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <input
            id="tx-internal"
            type="checkbox"
            checked={internal}
            onChange={(e) => setInternal(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm">
            <span className="font-semibold text-slate-700">Internal transfer to the safe?</span>
            <span className="block text-xs text-slate-500 mt-0.5">
              Moving drawer cash into the vault. Excluded from Gross Sales &amp; Operating Expenses.
            </span>
          </span>
        </label>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          variant={kind === 'cash_in' ? 'success' : 'danger'}
          loading={submitting}
          disabled={disabled || !amount}
          icon={<PlusIcon className="h-4 w-4" />}
        >
          Record {kind === 'cash_in' ? 'Cash In' : 'Cash Out'}
        </Button>
      </form>
    </Card>
  );
}
