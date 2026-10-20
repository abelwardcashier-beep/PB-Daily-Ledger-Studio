import { CalendarDaysIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { StaffMember, TxCategory } from '../../core/types';
import { STAFF_MEMBERS } from '../../core/types';
import { Button } from '../shared/Button';
import { Select } from '../shared/Inputs';

export type LedgerKindFilter = 'all' | 'cash_in' | 'cash_out';

export interface TransactionFilters {
  kind: LedgerKindFilter;
  category: '' | TxCategory;
  staff: '' | StaffMember;
}

export interface TransactionFilterBarProps {
  /** Currently selected business date (yyyy-MM-dd). */
  businessDate: string;
  onDateChange: (date: string) => void;
  filters: TransactionFilters;
  onFiltersChange: (filters: TransactionFilters) => void;
  /** Distinct categories present in the loaded data. */
  availableCategories: TxCategory[];
  /** Distinct staff members present in the loaded data. */
  availableStaff: StaffMember[];
  onExport: () => void;
  exportDisabled?: boolean;
}

const KIND_OPTIONS: Array<{ value: LedgerKindFilter; label: string }> = [
  { value: 'all', label: 'All Types' },
  { value: 'cash_in', label: 'Cash In' },
  { value: 'cash_out', label: 'Cash Out' },
];

/** Presentational filter strip — all filtering happens in the parent via `onFiltersChange`. */
export function TransactionFilterBar({
  businessDate,
  onDateChange,
  filters,
  onFiltersChange,
  availableCategories,
  availableStaff,
  onExport,
  exportDisabled,
}: TransactionFilterBarProps) {
  const hasActiveFilters = filters.kind !== 'all' || filters.category !== '' || filters.staff !== '';

  return (
    <div className="flex flex-wrap items-end gap-3">
      {/* Date picker */}
      <label className="inline-flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-card px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/40">
        <CalendarDaysIcon className="h-4 w-4 text-ink-faint" />
        <input
          type="date"
          value={businessDate}
          onChange={(e) => e.target.value && onDateChange(e.target.value)}
          className="bg-transparent text-xs font-semibold text-ink-soft tabular-nums focus:outline-none"
          aria-label="Filter by date"
        />
      </label>

      {/* Type */}
      <Select
        aria-label="Filter by type"
        className="w-auto min-w-[120px] text-xs"
        value={filters.kind}
        onChange={(e) => onFiltersChange({ ...filters, kind: e.target.value as LedgerKindFilter })}
      >
        {KIND_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>

      {/* Category */}
      <Select
        aria-label="Filter by category"
        className="w-auto min-w-[140px] text-xs"
        value={filters.category}
        invalid={false}
        onChange={(e) => onFiltersChange({ ...filters, category: e.target.value as '' | TxCategory })}
      >
        <option value="">All Categories</option>
        {availableCategories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </Select>

      {/* Staff */}
      <Select
        aria-label="Filter by staff"
        className="w-auto min-w-[120px] text-xs"
        value={filters.staff}
        onChange={(e) => onFiltersChange({ ...filters, staff: e.target.value as '' | StaffMember })}
      >
        <option value="">All Staff</option>
        {(availableStaff.length > 0 ? availableStaff : [...STAFF_MEMBERS]).map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </Select>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          icon={<XMarkIcon className="h-4 w-4" />}
          onClick={() => onFiltersChange({ kind: 'all', category: '', staff: '' })}
        >
          Clear
        </Button>
      )}

      <Button
        variant="secondary"
        size="sm"
        className="ml-auto"
        icon={<FunnelIcon className="h-4 w-4 text-primary" />}
        disabled={exportDisabled}
        onClick={onExport}
      >
        Export to Excel
      </Button>
    </div>
  );
}
