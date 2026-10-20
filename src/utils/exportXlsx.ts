import * as XLSX from 'xlsx';
import type { SpreadsheetRow, Transaction, VaultTransaction } from '../core/types';
import { formatDate } from './format';

interface ExportOptions {
  fileName: string;
  sheets: Array<{ name: string; rows: SpreadsheetRow[] }>;
}

/** Generic multi-sheet XLSX writer. */
export function exportWorkbook({ fileName, sheets }: ExportOptions): void {
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const ws = XLSX.utils.json_to_sheet(sheet.rows);
    // Reasonable column widths
    const first = sheet.rows[0];
    if (first) {
      ws['!cols'] = Object.keys(first).map((key) => ({
        wch: Math.max(key.length + 2, ...sheet.rows.map((r) => String(r[key] ?? '').length + 2)),
      }));
    }
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
  }
  XLSX.writeFile(wb, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`);
}

/** Cash-in / cash-out ledger tab. */
export function transactionsToRows(transactions: Transaction[]): SpreadsheetRow[] {
  return transactions.map((t, i) => ({
    '#': i + 1,
    Date: formatDate(t.business_date),
    Type: t.kind === 'cash_in' ? 'Cash In' : 'Cash Out',
    Category: t.category,
    Amount: t.amount,
    Description: t.description ?? '',
    Reference: t.reference ?? '',
    'Internal Transfer': t.is_internal_transfer ? 'Yes' : 'No',
    Staff: t.staff ?? '',
  }));
}

/** Vault movements tab. */
export function vaultToRows(movements: VaultTransaction[]): SpreadsheetRow[] {
  return movements.map((m, i) => ({
    '#': i + 1,
    Date: formatDate(m.business_date),
    Type: m.type === 'deposit' ? 'Vault Deposit' : m.type === 'withdrawal' ? 'Vault Withdrawal' : 'Internal Transfer',
    'Deposit Type': m.deposit_type ?? '',
    Amount: m.amount,
    Note: m.note ?? '',
    Staff: m.staff ?? '',
  }));
}

/** Summary tab computed from the day's numbers. */
export function summaryRows(data: Array<[string, number | string]>): SpreadsheetRow[] {
  return data.map(([label, value]) => ({ Metric: label, Value: value }));
}

/** One-click full workbook export for a business day. */
export function exportDailyLedger(params: {
  businessDate: string;
  transactions: Transaction[];
  vaultMovements: VaultTransaction[];
  openingBalance: number;
  grossSales: number;
  totalCashIn: number;
  totalCashOut: number;
  drawerBalance: number;
  vaultBalance: number;
}): void {
  const { businessDate } = params;
  exportWorkbook({
    fileName: `PB-Ledger-${businessDate}`,
    sheets: [
      {
        name: 'Summary',
        rows: summaryRows([
          ['Business Date', formatDate(businessDate)],
          ['Opening Balance', params.openingBalance],
          ['Gross Sales', params.grossSales],
          ['Total Cash In', params.totalCashIn],
          ['Total Cash Out', params.totalCashOut],
          ['Drawer Balance', params.drawerBalance],
          ['Vault Balance', params.vaultBalance],
          ['Total Cash Position', params.drawerBalance + params.vaultBalance],
        ]),
      },
      { name: 'Cash Ledger', rows: transactionsToRows(params.transactions) },
      { name: 'Vault Movements', rows: vaultToRows(params.vaultMovements) },
    ],
  });
}
