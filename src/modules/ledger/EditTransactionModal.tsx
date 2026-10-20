import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { StaffMember, Transaction, TxCategory } from '../../core/types';
import { CASH_IN_CATEGORIES, CASH_OUT_CATEGORIES, STAFF_MEMBERS } from '../../core/types';
import type { NewTransactionInput } from '../../services/transactionService';
import { Button } from '../shared/Button';
import { Modal } from '../shared/Modal';
import { Field, NumberInput, Select, TextInput } from '../shared/Inputs';

interface EditTransactionModalProps {
  transaction: Transaction | null;
  onClose: () => void;
  onSave: (id: string, patch: Partial<NewTransactionInput>) => Promise<void>;
}

export function EditTransactionModal({ transaction, onClose, onSave }: EditTransactionModalProps) {
  const [category, setCategory] = useState<TxCategory>('Other');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [staff, setStaff] = useState<'' | StaffMember>('');
  const [internal, setInternal] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (transaction) {
      setCategory(transaction.category);
      setAmount(String(transaction.amount));
      setDescription(transaction.description ?? '');
      setReference(transaction.reference ?? '');
      setStaff(transaction.staff ?? '');
      setInternal(transaction.is_internal_transfer);
    }
  }, [transaction]);

  const categories = transaction?.kind === 'cash_in' ? CASH_IN_CATEGORIES : CASH_OUT_CATEGORIES;

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!transaction) return;
    const value = parseFloat(amount);
    if (!Number.isFinite(value) || value <= 0) return;
    setSaving(true);
    try {
      await onSave(transaction.id, {
        category,
        amount: Math.round(value * 100) / 100,
        description: description.trim() || null,
        reference: reference.trim() || null,
        is_internal_transfer: internal,
        staff: staff || null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={transaction !== null}
      onClose={onClose}
      title="Edit Entry"
      description={transaction ? `${transaction.kind === 'cash_in' ? 'Cash In' : 'Cash Out'} · ${transaction.business_date}` : undefined}
    >
      <form onSubmit={handleSave} className="space-y-4">
        <Field label="Amount (Rs.)" htmlFor="edit-amount" required>
          <NumberInput id="edit-amount" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </Field>
        <Field label="Category" htmlFor="edit-category" required>
          <Select id="edit-category" value={category} onChange={(e) => setCategory(e.target.value as TxCategory)}>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Description" htmlFor="edit-description">
          <TextInput id="edit-description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={140} />
        </Field>
        <Field label="Reference" htmlFor="edit-reference">
          <TextInput id="edit-reference" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={40} />
        </Field>

        <Field label="Staff Member" htmlFor="edit-staff">
          <Select id="edit-staff" value={staff} onChange={(e) => setStaff(e.target.value as "" | StaffMember)}>
            <option value="">— Unassigned —</option>
            {STAFF_MEMBERS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>

        <label
          htmlFor="edit-internal"
          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
            internal ? 'border-primary/40 bg-primary-tint/60' : 'border-border-subtle bg-bg-card hover:bg-bg-app'
          }`}
        >
          <input
            id="edit-internal"
            type="checkbox"
            checked={internal}
            onChange={(e) => setInternal(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border-default text-primary focus:ring-primary"
          />
          <span className="text-sm">
            <span className="font-semibold text-ink-soft">Internal transfer to the safe?</span>
            <span className="block text-xs text-ink-soft mt-0.5">
              Excluded from Gross Sales &amp; Operating Expenses.
            </span>
          </span>
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
