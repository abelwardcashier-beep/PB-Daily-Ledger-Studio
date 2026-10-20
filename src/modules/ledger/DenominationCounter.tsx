import { useMemo, useState } from 'react';
import { ArrowDownTrayIcon, TrashIcon } from '@heroicons/react/24/outline';
import { DENOMINATIONS } from '../../core/constants';
import { formatCurrency, formatNumber } from '../../utils/format';
import { Button } from '../shared/Button';
import { Card } from '../shared/Card';
import { NumberInput } from '../shared/Inputs';

interface DenominationCounterProps {
  expectedTotal: number;
  onAdoptAsDrawerCount?: (counted: number) => void;
}

/** Physical cash count by PKR note denomination, reconciled against the book total. */
export function DenominationCounter({ expectedTotal, onAdoptAsDrawerCount }: DenominationCounterProps) {
  const [counts, setCounts] = useState<Record<number, number>>(() =>
    Object.fromEntries(DENOMINATIONS.map((d) => [d, 0])),
  );

  const counted = useMemo(
    () => DENOMINATIONS.reduce((acc, d) => acc + d * (counts[d] ?? 0), 0),
    [counts],
  );
  const variance = counted - expectedTotal;

  const setCount = (denom: number, value: string) => {
    const n = Math.max(0, Math.floor(parseFloat(value) || 0));
    setCounts((prev) => ({ ...prev, [denom]: n }));
  };

  const reset = () => setCounts(Object.fromEntries(DENOMINATIONS.map((d) => [d, 0])));

  return (
    <Card
      title="Denomination Counter"
      subtitle="Physical cash verification"
      action={
        <Button variant="ghost" size="sm" onClick={reset} icon={<TrashIcon className="h-4 w-4" />}>
          Reset
        </Button>
      }
    >
      <div className="space-y-3">
        {DENOMINATIONS.map((denom) => (
          <div key={denom} className="flex items-center gap-3">
            <span className="w-16 shrink-0 rounded-md bg-bg-subtle px-2 py-1 text-center text-xs font-bold text-ink-soft tabular-nums">
              {formatNumber(denom)}
            </span>
            <NumberInput
              className="w-24 text-center"
              value={counts[denom] === 0 ? '' : String(counts[denom])}
              placeholder="0"
              onChange={(e) => setCount(denom, e.target.value)}
              aria-label={`Count of ${denom} notes`}
            />
            <span className="ml-auto text-sm font-semibold text-ink-soft tabular-nums">
              {formatCurrency(denom * (counts[denom] ?? 0))}
            </span>
          </div>
        ))}

        <div className="rounded-lg bg-bg-app border border-border-subtle p-3 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-ink-soft">Counted Cash</span>
            <span className="font-bold text-ink tabular-nums">{formatCurrency(counted)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-ink-soft">Book Balance</span>
            <span className="font-semibold text-ink-soft tabular-nums">{formatCurrency(expectedTotal)}</span>
          </div>
          <div className="flex justify-between text-sm border-t border-border-subtle pt-1.5">
            <span className="text-ink-soft">Variance</span>
            <span
              className={`font-bold tabular-nums ${
                variance === 0 ? 'text-income' : variance > 0 ? 'text-gilded' : 'text-expense'
              }`}
            >
              {variance === 0 ? 'Balanced ✓' : `${variance > 0 ? '+' : ''}${formatCurrency(variance)}`}
            </span>
          </div>
        </div>

        {onAdoptAsDrawerCount && counted > 0 && (
          <Button
            variant="secondary"
            className="w-full"
            size="sm"
            icon={<ArrowDownTrayIcon className="h-4 w-4" />}
            onClick={() => onAdoptAsDrawerCount(counted)}
          >
            Log variance as adjustment
          </Button>
        )}
      </div>
    </Card>
  );
}
