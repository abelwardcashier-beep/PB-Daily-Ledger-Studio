/**
 * XLSX export utilities — pure mapping from domain models to spreadsheet rows,
 * plus a browser-download trigger. No business logic lives here.
 */
import * as XLSX from 'xlsx';
import type { Transaction } from '../core/types';
import { formatDate } from './format';

/** Clean column headers used across transaction exports. */
export interface TransactionSheetRow {
  Date: string;
  Type: string;
  Category: string;
  Description: string;
  Amount: number;
  Staff: string;
}

/** Map a single `Transaction` domain object to a flat, null-safe sheet row. */
export function mapTransactionToRow(t: Transaction): TransactionSheetRow {
  return {
    Date: t.business_date ? formatDate(t.business_date) : '',
    Type: t.kind === 'cash_in' ? 'Cash In' : 'Cash Out',
    Category: t.category ?? 'Uncategorized',
    Description: t.description ?? '',
    Amount: Number.isFinite(t.amount) ? t.amount : 0,
    Staff: t.staff ?? '',
  };
}

/** Map a list of transactions to sheet rows (empty/null-safe). */
export function transactionsToSheetRows(
  transactions: readonly Transaction[] | null | undefined,
): TransactionSheetRow[] {
  if (!transactions || transactions.length === 0) return [];
  return transactions.map(mapTransactionToRow);
}

/**
 * Trigger the browser download of a generated workbook.
 * Falls back gracefully when `document` is unavailable (SSR/tests).
 */
export function downloadWorkbook(wb: XLSX.WorkBook, filename: string): void {
  const name = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  if (typeof document === 'undefined') return;
  XLSX.writeFile(wb, name);
}

/**
 * Export transactions to an Excel (.xlsx) file and trigger the download.
 * Creates a "Transactions" worksheet with clean headers:
 * Date · Type · Category · Description · Amount · Staff.
 */
export function exportTransactionsToExcel(
  transactions: readonly Transaction[] | null | undefined,
  filename: string,
): void {
  const rows = transactionsToSheetRows(transactions);
  const ws = XLSX.utils.json_to_sheet(rows, {
    header: ['Date', 'Type', 'Category', 'Description', 'Amount', 'Staff'],
  });

  // Reasonable auto column widths.
  ws['!cols'] = [
    { wch: 14 }, // Date
    { wch: 10 }, // Type
    { wch: 16 }, // Category
    { wch: 40 }, // Description
    { wch: 14 }, // Amount
    { wch: 12 }, // Staff
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
  downloadWorkbook(wb, filename || 'PB-Ledger-Export');
}
