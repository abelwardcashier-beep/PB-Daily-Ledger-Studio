/**
 * Pure PKR currency formatting utilities.
 * Strictly typed, side-effect free, and defensive against null/undefined/NaN input.
 */

const CURRENCY_SYMBOL = 'Rs.';

const pkrFormatter = new Intl.NumberFormat('en-PK', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/**
 * Format a number into a clean PKR string, e.g. `1234567` → `"Rs. 1,234,567"`.
 * Handles edge cases: `null`, `undefined`, `NaN`, and non-finite values render as `Rs. 0`.
 * Negative amounts keep a leading sign: `-1500` → `"-Rs. 1,500"`.
 */
export function formatPKR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return `${CURRENCY_SYMBOL} 0`;
  const value = Number(amount);
  if (!Number.isFinite(value)) return `${CURRENCY_SYMBOL} 0`;
  if (value === 0) return `${CURRENCY_SYMBOL} 0`;

  const sign = value < 0 ? '-' : '';
  return `${sign}${CURRENCY_SYMBOL} ${pkrFormatter.format(Math.abs(value))}`;
}

/**
 * Alias kept for consistency with the rest of the app's formatting layer.
 * Identical behaviour to {@link formatPKR}.
 */
export const formatCurrency = formatPKR;

/**
 * Compact form for chart axes / tight spaces: `12500` → `"Rs. 12.5k"`, `2_400_000` → `"Rs. 2.4M"`.
 */
export function formatPKRCompact(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return `${CURRENCY_SYMBOL} 0`;
  const value = Number(amount);
  if (!Number.isFinite(value)) return `${CURRENCY_SYMBOL} 0`;

  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}${CURRENCY_SYMBOL} ${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${CURRENCY_SYMBOL} ${(abs / 1_000).toFixed(1)}k`;
  return `${sign}${CURRENCY_SYMBOL} ${Math.round(abs)}`;
}
