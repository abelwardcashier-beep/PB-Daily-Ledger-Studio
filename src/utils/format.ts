import { format, parseISO } from 'date-fns';
import { CURRENCY_LOCALE, CURRENCY_SYMBOL } from '../core/constants';

const numberFormatter = new Intl.NumberFormat(CURRENCY_LOCALE, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** `Rs. 125,000` */
export function formatCurrency(value: number): string {
  const sign = value < 0 ? '-' : '';
  return `${sign}${CURRENCY_SYMBOL} ${numberFormatter.format(Math.abs(value))}`;
}

/** Compact form for chart axes: `Rs. 12.5k` */
export function formatCurrencyCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${CURRENCY_SYMBOL} ${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${CURRENCY_SYMBOL} ${(value / 1_000).toFixed(1)}k`;
  return `${CURRENCY_SYMBOL} ${Math.round(value)}`;
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/** `2026-10-19` -> `19 Oct 2026` */
export function formatDate(isoDate: string): string {
  try {
    return format(parseISO(isoDate), 'dd MMM yyyy');
  } catch {
    return isoDate;
  }
}

/** `2026-10-19` -> `19 Oct` */
export function formatShortDate(isoDate: string): string {
  try {
    return format(parseISO(isoDate), 'dd MMM');
  } catch {
    return isoDate;
  }
}

/** Today in yyyy-MM-dd (local time). */
export function todayIso(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function clampNonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}
