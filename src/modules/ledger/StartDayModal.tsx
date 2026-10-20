import { useState } from 'react';
import type { FormEvent } from 'react';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';
import { todayIso } from '../../utils/format';
import { formatCurrency } from '../../utils/format';
import { Button } from '../shared/Button';
import { Modal } from '../shared/Modal';
import { Field, NumberInput, TextInput } from '../shared/Inputs';

interface StartDayModalProps {
  open: boolean;
  onClose: () => void;
  onStart: (date: string, openingBalance: number) => Promise<void>;
}

/** Opens a new business day with an opening cash balance in the drawer. */
export function StartDayModal({ open, onClose, onStart }: StartDayModalProps) {
  const [date, setDate] = useState(todayIso());
  const [balance, setBalance] = useState('0');
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const value = parseFloat(balance);
    if (!Number.isFinite(value) || value < 0) return;
    setSaving(true);
    try {
      void label; // reserved for future day-note support
      await onStart(date, Math.round(value * 100) / 100);
      setBalance('0');
      setLabel('');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Start New Day"
      description="Record the opening cash available in the drawer before trading begins."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Business Date" htmlFor="day-date" required>
          <TextInput id="day-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <Field
          label="Opening Balance (Rs.)"
          htmlFor="day-balance"
          hint={`Current float: ${formatCurrency(parseFloat(balance) || 0)}`}
          required
        >
          <NumberInput id="day-balance" value={balance} onChange={(e) => setBalance(e.target.value)} min={0} required />
        </Field>
        <Field label="Day Note" htmlFor="day-note" hint="Optional — e.g. holiday stock, bank float pickup">
          <TextInput id="day-note" placeholder="Note…" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={140} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving} icon={<CalendarDaysIcon className="h-4 w-4" />}>
            Start Day
          </Button>
        </div>
      </form>
    </Modal>
  );
}
