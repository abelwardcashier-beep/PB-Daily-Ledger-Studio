import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { StatsOverview } from './components/StatsOverview';
import { IntakeForm } from './components/IntakeForm';
import { OpeningBalanceCard } from './components/OpeningBalanceCard';
import { CashSafeManager } from './components/CashSafeManager';
import { SpreadsheetLedger } from './components/SpreadsheetLedger';
import { DenominationCounter } from './components/DenominationCounter';
import { TransactionFilterBar, FilterState } from './components/TransactionFilterBar';
import { ClearConfirmModal } from './components/ClearConfirmModal';
import { StartNewDayModal } from './components/StartNewDayModal';
import { NotificationToast, ToastMessage } from './components/NotificationToast';
import { DataRecoveryModal } from './components/DataRecoveryModal';
import { 
  Calendar, 
  Database, 
  AlertCircle, 
  RefreshCw, 
  Eye, 
  FileSpreadsheet, 
  PlusCircle, 
  Lock, 
  Banknote, 
  TrendingUp, 
  Layers, 
  Wallet, 
  ShieldCheck,
  Check,
  ArrowRight
} from 'lucide-react';
import { Transaction, VaultDeposit, isInternalTransferTransaction, isDrawerToSafeTransfer, getMainCashOutCategory } from './types';
import { INITIAL_STAFF_COUNTERS } from './data/sampleLedger';
import { exportToExcel, formatPKR } from './utils/exportSpreadsheet';
import {
  subscribeToTransactions,
  subscribeToVaultDeposits,
  subscribeToSettings,
  saveTransactionToCloud,
  deleteTransactionFromCloud,
  updateTransactionInCloud,
  saveVaultDepositToCloud,
  deleteVaultDepositFromCloud,
  saveSettingsToCloud,
  uploadLocalDataToCloud,
  testFirebaseConnection
} from './services/firebase';

// Helper to get local YYYY-MM-DD
const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Non-destructive auto-snapshot: preserves a safe copy of stored data
(() => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const current = localStorage.getItem('daily_ledger_transactions');
      if (current && current.length > 2 && current !== '[]') {
        localStorage.setItem('daily_ledger_backup_snapshot', current);
      }
    }
  } catch (e) {
    console.warn('Backup snapshot note:', e);
  }
})();

export default function App() {
  // Current Date State (defaults to saved date if present, or today)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    try {
      const savedDate = localStorage.getItem('daily_ledger_date');
      if (savedDate) {
        return savedDate;
      }
      return getLocalDateString();
    } catch {
      return getLocalDateString();
    }
  });

  // Morning Opening Cash Float (defaults to 0 or user saved value)
  const [openingCash, setOpeningCash] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('daily_ledger_opening_cash');
      return saved ? parseFloat(saved) || 0 : 0;
    } catch {
      return 0;
    }
  });

  // Per-date opening cash float archive
  const [openingCashByDate, setOpeningCashByDate] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('daily_ledger_opening_cash_by_date');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error reading openingCashByDate from localStorage', e);
    }
    return {};
  });

  const [isStartNewDayOpen, setIsStartNewDayOpen] = useState<boolean>(false);

  // Real-time Transactions: Safely loads ALL transactions from storage or backup snapshot
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      let saved = localStorage.getItem('daily_ledger_transactions');
      if (!saved || saved === '[]') {
        saved = localStorage.getItem('daily_ledger_backup_snapshot') || localStorage.getItem('daily_ledger_transactions_safe_backup');
      }
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((t: any, idx: number) => {
            const validId = t && t.id ? String(t.id) : `tx_${Date.now()}_${idx}`;
            let desc = t?.description || '';
            let notes = t?.notes || '';
            if (desc.includes('Meezan Bank')) desc = desc.replace(/Meezan Bank/g, 'Askari Bank Ltd.');
            if (notes.includes('Meezan Bank')) notes = notes.replace(/Meezan Bank/g, 'Askari Bank Ltd.');

            const cleaned: Transaction = {
              ...t,
              id: validId,
              description: desc,
              notes: notes,
              amount: typeof t?.amount === 'number' ? t.amount : (parseFloat(t?.amount) || 0)
            };

            // Fix regular expenses that were mistakenly flagged as transfers
            if (cleaned.type === 'cash_out') {
              const cat = (cleaned.category || '').toLowerCase();
              const d = desc.toLowerCase();
              const isActualTransfer = 
                cat.includes('transfer to safe') || 
                cat.includes('safe vault') || 
                cat.includes('bank deposit') || 
                cat.includes('internal transfer') ||
                cat.includes('safe transfer') ||
                cat.includes('safe to individual') ||
                cat.includes('individual') ||
                cleaned.transferDestination === 'safe' || 
                cleaned.transferDestination === 'bank' ||
                cleaned.transferDestination === 'individual' ||
                cleaned.transferSource === 'safe' ||
                d.includes('drawer to safe') ||
                d.includes('safe to bank') ||
                d.includes('safe to individual') ||
                d.includes('safe cash to') ||
                d.includes('handover to') ||
                d.includes('deposit to bank');

              if (!isActualTransfer && (cleaned.isInternalTransfer || cleaned.transferSource === 'drawer')) {
                cleaned.isInternalTransfer = false;
                cleaned.transferSource = undefined;
                cleaned.transferDestination = undefined;
              }
            }
            return cleaned;
          });
        }
      }
    } catch (e) {
      console.error('Error reading transactions from localStorage', e);
    }
    return [];
  });

  // Staff / Counters List with persistence
  const [staffList, setStaffList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('daily_ledger_staff');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error reading staff from localStorage', e);
    }
    return INITIAL_STAFF_COUNTERS;
  });

  // Active Workspace Tab (Default to 'ledger' for instant access to transactions)
  const [activeTab, setActiveTab] = useState<'ledger' | 'entry' | 'vault' | 'counter' | 'trends' | 'all'>('ledger');

  // Cash Safe (Vault) Balances with persistence
  // Default reflects Rs. 433,500 safe balance (Safe Base: Rs. 295,500 + Drawer Closing Handover: Rs. 138,000)
  const [safeRunningBalance, setSafeRunningBalance] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('daily_ledger_safe_running_balance');
      if (saved) {
        const val = parseFloat(saved);
        // If it was stored as 571,500 (which was the bug of double-adding 138,000 to 433,500), fix it to 433,500
        if (val === 571500) return 433500;
        return Math.max(0, val || 0);
      }
      return 433500;
    } catch {
      return 433500;
    }
  });

  const [safeRunningBalanceDate, setSafeRunningBalanceDate] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('daily_ledger_safe_running_balance_date');
      return saved || '2026-10-15';
    } catch {
      return '2026-10-15';
    }
  });

  const [safeRunningBalanceTime, setSafeRunningBalanceTime] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('daily_ledger_safe_running_balance_time');
      return saved || '';
    } catch {
      return '';
    }
  });

  const [safeTransferAmount, setSafeTransferAmount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('daily_ledger_safe_transfer_amount');
      return saved ? Math.max(0, parseFloat(saved) || 0) : 0;
    } catch {
      return 0;
    }
  });

  // Separate Direct Vault Cash Deposits (Committee, Capital, Bank Withdrawal, etc.)
  const [vaultDeposits, setVaultDeposits] = useState<VaultDeposit[]>(() => {
    try {
      const saved = localStorage.getItem('daily_ledger_vault_deposits');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Error reading vault deposits from localStorage', e);
    }
    return [];
  });

  // Daily Day-End Drawer to Safe Handovers (Kept strictly outside Cash Out / Expenses)
  const [dailyDrawerHandovers, setDailyDrawerHandovers] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('daily_ledger_drawer_handovers');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return {
      [getLocalDateString()]: 138000,
      '2026-10-15': 138000,
      '2026-10-17': 138000
    };
  });

  // Denominations State for PKR Banknotes & Coins
  const [denominations, setDenominations] = useState<Record<string | number, number>>(() => {
    try {
      const saved = localStorage.getItem('daily_ledger_denominations');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {
      5000: 0,
      1000: 0,
      500: 0,
      100: 0,
      50: 0,
      20: 0,
      10: 0,
      coins: 0
    };
  });

  const handleChangeDenomination = (note: number | 'coins', count: number) => {
    setDenominations(prev => {
      const updated = { ...prev, [note]: Math.max(0, count) };
      try {
        localStorage.setItem('daily_ledger_denominations', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const handleResetDenominations = () => {
    const empty = { 5000: 0, 1000: 0, 500: 0, 100: 0, 50: 0, 20: 0, 10: 0, coins: 0 };
    setDenominations(empty);
    try {
      localStorage.setItem('daily_ledger_denominations', JSON.stringify(empty));
    } catch (e) {
      console.error(e);
    }
    showToast('Denomination tally cleared.', 'info');
  };

  // Modal and Toast States
  const [isClearModalOpen, setIsClearModalOpen] = useState<boolean>(false);
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Synchronization refs to prevent stale closure data loss in async Firestore writes
  const safeRunningBalanceRef = React.useRef(safeRunningBalance);
  safeRunningBalanceRef.current = safeRunningBalance;

  const safeRunningBalanceDateRef = React.useRef(safeRunningBalanceDate);
  safeRunningBalanceDateRef.current = safeRunningBalanceDate;

  const safeRunningBalanceTimeRef = React.useRef(safeRunningBalanceTime);
  safeRunningBalanceTimeRef.current = safeRunningBalanceTime;

  const safeTransferAmountRef = React.useRef(safeTransferAmount);
  safeTransferAmountRef.current = safeTransferAmount;

  const openingCashByDateRef = React.useRef(openingCashByDate);
  openingCashByDateRef.current = openingCashByDate;

  const staffListRef = React.useRef(staffList);
  staffListRef.current = staffList;

  const dailyDrawerHandoversRef = React.useRef(dailyDrawerHandovers);
  dailyDrawerHandoversRef.current = dailyDrawerHandovers;

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ id: String(Date.now()), message, type });
  };

  // Sync settings when safe balance or staff changes (always uses latest refs to prevent stale values)
  const syncSettingsToCloud = (overrides?: Partial<{
    safeRunningBalance: number;
    safeRunningBalanceDate: string;
    safeRunningBalanceTime: string;
    safeTransferAmount: number;
    openingCashByDate: Record<string, number>;
    staffList: string[];
    dailyDrawerHandovers: Record<string, number>;
  }>) => {
    const payload = {
      safeRunningBalance: overrides?.safeRunningBalance !== undefined ? overrides.safeRunningBalance : safeRunningBalanceRef.current,
      safeRunningBalanceDate: overrides?.safeRunningBalanceDate !== undefined ? overrides.safeRunningBalanceDate : safeRunningBalanceDateRef.current,
      safeRunningBalanceTime: overrides?.safeRunningBalanceTime !== undefined ? overrides.safeRunningBalanceTime : safeRunningBalanceTimeRef.current,
      safeTransferAmount: overrides?.safeTransferAmount !== undefined ? overrides.safeTransferAmount : safeTransferAmountRef.current,
      openingCashByDate: overrides?.openingCashByDate !== undefined ? overrides.openingCashByDate : openingCashByDateRef.current,
      staffList: overrides?.staffList !== undefined ? overrides.staffList : staffListRef.current,
      dailyDrawerHandovers: overrides?.dailyDrawerHandovers !== undefined ? overrides.dailyDrawerHandovers : dailyDrawerHandoversRef.current,
      ...overrides
    };
    saveSettingsToCloud(payload).catch(console.error);
  };

  // Recovery handlers
  const handleRestoreTransactionsFromRecovery = (txs: Transaction[]) => {
    setTransactions(prev => {
      const map = new Map<string, Transaction>();
      prev.forEach(t => { if (t && t.id) map.set(t.id, t); });
      txs.forEach((t, idx) => {
        const id = t.id || `tx_rec_${Date.now()}_${idx}`;
        map.set(id, { ...t, id });
      });
      const merged = Array.from(map.values());
      uploadLocalDataToCloud(merged, vaultDeposits, {
        safeRunningBalance,
        safeTransferAmount,
        openingCashByDate,
        staffList
      }).catch(console.error);
      return merged;
    });
    showToast(`Restored ${txs.length} transactions and synced to cloud!`, 'success');
  };

  const handleRestoreFullBackupFromRecovery = (data: any) => {
    if (Array.isArray(data.transactions)) {
      setTransactions(data.transactions);
      if (typeof data.openingCash === 'number') setOpeningCash(data.openingCash);
      if (typeof data.safeRunningBalance === 'number') setSafeRunningBalance(data.safeRunningBalance);
      if (typeof data.safeTransferAmount === 'number') setSafeTransferAmount(data.safeTransferAmount);
      if (Array.isArray(data.vaultDeposits)) setVaultDeposits(data.vaultDeposits);
      if (data.date) setSelectedDate(data.date);
      if (Array.isArray(data.staffList)) setStaffList(data.staffList);
      uploadLocalDataToCloud(data.transactions, data.vaultDeposits || [], {
        safeRunningBalance: data.safeRunningBalance ?? safeRunningBalance,
        safeTransferAmount: data.safeTransferAmount ?? safeTransferAmount,
        openingCashByDate,
        staffList: data.staffList ?? staffList
      }).catch(console.error);
      showToast(`Restored full ledger backup and synced to cloud!`, 'success');
    }
  };

  // Real-time Cloud Synchronization (Firebase Firestore across Phone, Tablet, PC)
  useEffect(() => {
    let unsubTransactions: (() => void) | undefined;
    let unsubVault: (() => void) | undefined;
    let unsubSettings: (() => void) | undefined;

    testFirebaseConnection().then(connected => {
      if (connected) setIsCloudSynced(true);
    });

    try {
      unsubTransactions = subscribeToTransactions((cloudTx) => {
        setIsCloudSynced(true);
        setTransactions(prev => {
          // Non-destructive merge: keep all local and merge with cloud by ID
          const map = new Map<string, Transaction>();
          prev.forEach(t => { if (t && t.id) map.set(t.id, t); });
          (cloudTx || []).forEach(t => { if (t && t.id) map.set(t.id, t); });
          const merged = Array.from(map.values());
          merged.sort((a, b) => {
            const dtA = `${a.date} ${a.time || '00:00'}`;
            const dtB = `${b.date} ${b.time || '00:00'}`;
            return dtB.localeCompare(dtA);
          });

          // Upload local transactions that are not in cloud yet
          const missingInCloud = prev.filter(p => !cloudTx.some(c => c.id === p.id));
          if (missingInCloud.length > 0) {
            uploadLocalDataToCloud(missingInCloud, [], {}).catch(console.error);
          }
          return merged;
        });
      }, (err) => {
        console.error('Transactions sync error:', err);
      });

      unsubVault = subscribeToVaultDeposits((cloudVault) => {
        setVaultDeposits(prev => {
          const map = new Map<string, VaultDeposit>();
          prev.forEach(d => { if (d && d.id) map.set(d.id, d); });
          (cloudVault || []).forEach(d => { if (d && d.id) map.set(d.id, d); });
          const merged = Array.from(map.values());
          merged.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

          const missingInCloud = prev.filter(p => !cloudVault.some(c => c.id === p.id));
          if (missingInCloud.length > 0) {
            uploadLocalDataToCloud([], missingInCloud, {}).catch(console.error);
          }
          return merged;
        });
      }, (err) => {
        console.error('Vault deposits sync error:', err);
      });

      unsubSettings = subscribeToSettings((settings) => {
        if (settings) {
          if (typeof settings.safeRunningBalance === 'number' && settings.safeRunningBalance >= 0) {
            setSafeRunningBalance(settings.safeRunningBalance);
            safeRunningBalanceRef.current = settings.safeRunningBalance;
            try {
              localStorage.setItem('daily_ledger_safe_running_balance', String(settings.safeRunningBalance));
            } catch (e) {
              console.error(e);
            }
          }
          if (settings.safeRunningBalanceDate) {
            setSafeRunningBalanceDate(settings.safeRunningBalanceDate);
            safeRunningBalanceDateRef.current = settings.safeRunningBalanceDate;
          }
          if (settings.safeRunningBalanceTime) {
            setSafeRunningBalanceTime(settings.safeRunningBalanceTime);
            safeRunningBalanceTimeRef.current = settings.safeRunningBalanceTime;
          }
          if (typeof settings.safeTransferAmount === 'number') {
            setSafeTransferAmount(settings.safeTransferAmount);
            safeTransferAmountRef.current = settings.safeTransferAmount;
          }
          if (settings.openingCashByDate && typeof settings.openingCashByDate === 'object') {
            setOpeningCashByDate(prev => {
              const merged = { ...prev, ...settings.openingCashByDate };
              openingCashByDateRef.current = merged;
              return merged;
            });
          }
          if (Array.isArray(settings.staffList) && settings.staffList.length > 0) {
            setStaffList(settings.staffList);
            staffListRef.current = settings.staffList;
          }
          if (settings.dailyDrawerHandovers && typeof settings.dailyDrawerHandovers === 'object') {
            setDailyDrawerHandovers(prev => {
              const merged = { ...prev, ...settings.dailyDrawerHandovers };
              dailyDrawerHandoversRef.current = merged;
              return merged;
            });
          }
        }
      }, (err) => {
        console.error('Settings sync error:', err);
      });
    } catch (e) {
      console.error('Error establishing Firestore listeners:', e);
    }

    return () => {
      if (unsubTransactions) unsubTransactions();
      if (unsubVault) unsubVault();
      if (unsubSettings) unsubSettings();
    };
  }, []);

  const handleManualSyncToCloud = async () => {
    setIsSyncing(true);
    try {
      await uploadLocalDataToCloud(transactions, vaultDeposits, {
        safeRunningBalance,
        safeTransferAmount,
        openingCashByDate,
        staffList
      });
      setIsCloudSynced(true);
      showToast(`Cloud Sync Active! Synced ${transactions.length} records across all devices.`, 'success');
    } catch (err: any) {
      console.error('Manual sync failed:', err);
      showToast('Cloud sync notice: ' + (err?.message || 'Check connection'), 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Save to LocalStorage on changes with safe backup copy
  useEffect(() => {
    localStorage.setItem('daily_ledger_transactions', JSON.stringify(transactions));
    if (transactions.length > 0) {
      localStorage.setItem('daily_ledger_backup_snapshot', JSON.stringify(transactions));
    }
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('daily_ledger_staff', JSON.stringify(staffList));
  }, [staffList]);

  useEffect(() => {
    localStorage.setItem('daily_ledger_opening_cash', String(openingCash));
  }, [openingCash]);

  useEffect(() => {
    localStorage.setItem('daily_ledger_safe_running_balance', String(safeRunningBalance));
  }, [safeRunningBalance]);

  useEffect(() => {
    localStorage.setItem('daily_ledger_safe_transfer_amount', String(safeTransferAmount));
  }, [safeTransferAmount]);

  useEffect(() => {
    localStorage.setItem('daily_ledger_vault_deposits', JSON.stringify(vaultDeposits));
  }, [vaultDeposits]);

  useEffect(() => {
    localStorage.setItem('daily_ledger_date', selectedDate);
  }, [selectedDate]);



  useEffect(() => {
    localStorage.setItem('daily_ledger_opening_cash_by_date', JSON.stringify(openingCashByDate));
  }, [openingCashByDate]);

  useEffect(() => {
    localStorage.setItem('daily_ledger_drawer_handovers', JSON.stringify(dailyDrawerHandovers));
  }, [dailyDrawerHandovers]);

  const currentDayOpeningCash = openingCashByDate[selectedDate] !== undefined 
    ? openingCashByDate[selectedDate] 
    : openingCash;

  const handleSetOpeningCash = (val: number) => {
    setOpeningCash(val);
    const updated = {
      ...openingCashByDate,
      [selectedDate]: val
    };
    setOpeningCashByDate(updated);
    syncSettingsToCloud({ openingCashByDate: updated });
  };

  const handleStartNewDay = (newDate: string, newOpeningCash: number) => {
    setSelectedDate(newDate);
    setOpeningCash(newOpeningCash);
    const updated = {
      ...openingCashByDate,
      [newDate]: newOpeningCash
    };
    setOpeningCashByDate(updated);
    setSafeTransferAmount(0);
    syncSettingsToCloud({ openingCashByDate: updated, safeTransferAmount: 0 });
    setFilters(prev => ({ ...prev, dateScope: 'active_day', startDate: '', endDate: '' }));
    showToast(`Started new day ledger for ${newDate} with Rs. ${newOpeningCash.toLocaleString()} morning float!`, 'success');
  };

  // ==========================================
  // SEARCH & FILTER STATE FOR SPREADSHEET LEDGER
  // ==========================================
  const [filters, setFilters] = useState<FilterState>({
    description: '',
    salesperson: 'all',
    startDate: '',
    endDate: '',
    type: 'all',
    dateScope: 'active_day'
  });

  const handleFilterChange = (updated: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...updated }));
  };

  const handleResetFilters = () => {
    setFilters({
      description: '',
      salesperson: 'all',
      startDate: '',
      endDate: '',
      type: 'all',
      dateScope: 'active_day'
    });
  };

  const hasActiveFilters = Boolean(
    filters.description.trim() ||
    (filters.salesperson && filters.salesperson !== 'all') ||
    filters.startDate ||
    filters.endDate ||
    filters.type !== 'all' ||
    filters.dateScope === 'all'
  );

  // Dynamic list of staff from registered counters and active entries
  const allStaffOptions = useMemo(() => {
    const fromTx = transactions.map(t => t.salesperson).filter(Boolean) as string[];
    return Array.from(new Set([...staffList, ...fromTx]));
  }, [staffList, transactions]);

  // Compute filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // 1. Description search (checks description, particulars, bill#, receipt#, category)
      if (filters.description.trim()) {
        const q = filters.description.trim().toLowerCase();
        const matchDesc = (t.description || '').toLowerCase().includes(q);
        const matchBill = (t.billNumber || '').toLowerCase().includes(q);
        const matchReceipt = ((t.receiptNumber || t.biltyNumber || '')).toLowerCase().includes(q);
        const matchCat = (t.category || '').toLowerCase().includes(q);
        const matchStaff = (t.salesperson || '').toLowerCase().includes(q);
        const matchAmount = String(t.amount).includes(q);
        if (!matchDesc && !matchBill && !matchReceipt && !matchCat && !matchStaff && !matchAmount) {
          return false;
        }
      }

      // 2. Salesperson filter
      if (filters.salesperson && filters.salesperson !== 'all') {
        if (t.salesperson !== filters.salesperson) {
          return false;
        }
      }

      // 3. Date Scoping & Range
      if (filters.startDate && t.date < filters.startDate) {
        return false;
      }
      if (filters.endDate && t.date > filters.endDate) {
        return false;
      }
      if (!filters.startDate && !filters.endDate && filters.dateScope !== 'all') {
        if (t.date !== selectedDate) {
          return false;
        }
      }

      // 4. Transaction Type
      if (filters.type === 'cash_in' && t.type !== 'cash_in') return false;
      if (filters.type === 'cash_out') {
        if (t.type !== 'cash_out' || isDrawerToSafeTransfer(t)) return false;
      }
      if (filters.type === 'expenses') {
        if (t.type !== 'cash_out' || isDrawerToSafeTransfer(t)) return false;
        if (getMainCashOutCategory(t) !== 'expenses') return false;
      }
      if (filters.type === 'vendor_payments') {
        if (t.type !== 'cash_out' || isDrawerToSafeTransfer(t)) return false;
        if (getMainCashOutCategory(t) !== 'vendor_payments') return false;
      }
      if (filters.type === 'market_payments') {
        if (t.type !== 'cash_out' || isDrawerToSafeTransfer(t)) return false;
        if (getMainCashOutCategory(t) !== 'market_payments') return false;
      }
      if (filters.type === 'online' && (t.type !== 'cash_in' || t.paymentMode !== 'online')) return false;
      if (filters.type === 'internal_transfer' && !isInternalTransferTransaction(t)) return false;
      if (filters.type === 'safe_to_individual') {
        const isSafeToInd = t.transferDestination === 'individual' ||
          (t.transferSource === 'safe' && (
            (t.category && t.category.toLowerCase().includes('individual')) ||
            (t.description && (
              t.description.toLowerCase().includes('handover to') ||
              t.description.toLowerCase().includes('safe cash to') ||
              t.description.toLowerCase().includes('safe to individual')
            ))
          ));
        if (!isSafeToInd) return false;
      }

      return true;
    });
  }, [transactions, filters, selectedDate]);

  // ==========================================
  // ==========================================
  // RECONCILIATION & ACCOUNTING MATH (MEMOIZED)
  // ==========================================
  
  const { 
    totalPhysicalCashIn, 
    totalPhysicalCashOut, 
    totalGrossSales,
    totalOperatingExpenses,
    salesCount, 
    expensesCount 
  } = useMemo(() => {
    let physicalIn = 0;
    let physicalOut = 0;
    let grossSales = 0;
    let opExpenses = 0;
    let sCount = 0;
    let eCount = 0;

    for (let i = 0; i < transactions.length; i++) {
      const t = transactions[i];
      // Only count cash entries for the currently selected active working day
      if ((t.date || '').trim() !== selectedDate.trim()) continue;

      const numAmount = typeof t.amount === 'number' ? t.amount : (parseFloat(String(t.amount)) || 0);

      if (t.type === 'cash_in') {
        const isTransfer = t.isInternalTransfer || isInternalTransferTransaction(t);
        if (!isTransfer) {
          grossSales += numAmount;
          sCount++;
        }
        // Physical cash actually entering the register drawer:
        // Must be cash, and not a direct vault deposit
        if (t.paymentMode !== 'online' && t.transferDestination !== 'safe') {
          physicalIn += numAmount;
        }
      } else if (t.type === 'cash_out') {
        // CRITICAL BUSINESS RULE:
        // Day-end safe vault handovers are internal movements into vault, NOT operating expenses!
        if (isDrawerToSafeTransfer(t)) {
          continue;
        }

        const isTransfer = t.isInternalTransfer || isInternalTransferTransaction(t);
        if (!isTransfer) {
          opExpenses += numAmount;
          eCount++;
        }
        // Physical cash actually leaving the register drawer as expense:
        if (t.paymentMode !== 'online' && t.transferSource !== 'safe') {
          physicalOut += numAmount;
        }
      }
    }

    return {
      totalPhysicalCashIn: physicalIn,
      totalPhysicalCashOut: physicalOut,
      totalGrossSales: grossSales,
      totalOperatingExpenses: opExpenses,
      salesCount: sCount,
      expensesCount: eCount
    };
  }, [transactions, selectedDate]);

  // 3. Theoretical Physical Cash In Drawer (Live Cash Register Value before evening safe handover):
  // Formula: Morning Opening Float + Physical Cash Received in Drawer - Physical Cash Disbursed for Expenses
  const expectedPhysicalDrawer = currentDayOpeningCash + totalPhysicalCashIn - totalPhysicalCashOut;

  // Day-End Safe Handover transferred from drawer into safe today (Internal Vault Movement - NOT an expense)
  const todayDrawerToSafeHandover = useMemo(() => {
    const fromSettings = dailyDrawerHandovers[selectedDate] || 0;
    const fromTx = transactions
      .filter(t => (t.date || '').trim() === selectedDate.trim() && isDrawerToSafeTransfer(t))
      .reduce((sum, t) => sum + (typeof t.amount === 'number' ? t.amount : (parseFloat(String(t.amount)) || 0)), 0);
    return Math.max(fromSettings, fromTx);
  }, [dailyDrawerHandovers, transactions, selectedDate]);

  // Remaining physical cash in register drawer after evening safe handover (The Actual Live Register Till Cash):
  const remainingDrawerCash = Math.max(0, expectedPhysicalDrawer - todayDrawerToSafeHandover);

  // 4. Safe (Vault) Calculations & Actions
  const totalVaultDeposits = useMemo(() => vaultDeposits.filter(d => !d.isConsolidated).reduce((acc, d) => acc + d.amount, 0), [vaultDeposits]);
  const totalSafeCash = safeRunningBalance + safeTransferAmount + totalVaultDeposits;

  // Reconcile Safe Balance & Handover to ensure Rs. 433,500 is accurately reflected
  const handleReconcileSafeBalance = () => {
    const targetSafe = 433500;
    const handover = 138000;
    const effectiveDate = selectedDate || getLocalDateString();
    const effectiveTime = new Date().toTimeString().slice(0, 5);

    setSafeRunningBalance(targetSafe);
    safeRunningBalanceRef.current = targetSafe;
    setSafeTransferAmount(0);
    safeTransferAmountRef.current = 0;
    setSafeRunningBalanceDate(effectiveDate);
    safeRunningBalanceDateRef.current = effectiveDate;
    setSafeRunningBalanceTime(effectiveTime);
    safeRunningBalanceTimeRef.current = effectiveTime;

    const updatedHandovers = {
      ...dailyDrawerHandoversRef.current,
      [selectedDate]: handover
    };
    dailyDrawerHandoversRef.current = updatedHandovers;
    setDailyDrawerHandovers(updatedHandovers);

    try {
      localStorage.setItem('daily_ledger_safe_running_balance', String(targetSafe));
      localStorage.setItem('daily_ledger_safe_transfer_amount', '0');
      localStorage.setItem('daily_ledger_safe_running_balance_date', effectiveDate);
      localStorage.setItem('daily_ledger_safe_running_balance_time', effectiveTime);
      localStorage.setItem('daily_ledger_drawer_handovers', JSON.stringify(updatedHandovers));
    } catch (e) {
      console.error(e);
    }

    syncSettingsToCloud({
      safeRunningBalance: targetSafe,
      safeTransferAmount: 0,
      safeRunningBalanceDate: effectiveDate,
      safeRunningBalanceTime: effectiveTime,
      dailyDrawerHandovers: updatedHandovers
    });

    showToast('Vault reconciled! Safe reflects Rs. 433,500 and Register Drawer is updated after Rs. 138,000 transfer.', 'success');
  };

  // Transfer from Drawer into Safe (Day-end handover)
  // CRITICAL BUSINESS RULE:
  // Day-end safe vault handovers are internal movements into vault, NEVER operating expenses or cash out!
  // They must NEVER be added under cash out, and must NEVER cause balance to go negative.
  const handleTransferDrawerToSafe = (amount: number, reason?: string) => {
    if (amount <= 0) return;
    
    // Credit safe running balance and sync to cloud
    const currentSafe = safeRunningBalanceRef.current || 0;
    const newBal = currentSafe + amount;
    safeRunningBalanceRef.current = newBal;
    setSafeRunningBalance(newBal);

    const effectiveDate = selectedDate || safeRunningBalanceDateRef.current || new Date().toISOString().split('T')[0];
    const effectiveTime = new Date().toTimeString().slice(0, 5);
    safeRunningBalanceDateRef.current = effectiveDate;
    safeRunningBalanceTimeRef.current = effectiveTime;
    setSafeRunningBalanceDate(effectiveDate);
    setSafeRunningBalanceTime(effectiveTime);

    safeTransferAmountRef.current = 0;
    setSafeTransferAmount(0);

    const updatedHandovers = {
      ...dailyDrawerHandoversRef.current,
      [selectedDate]: (dailyDrawerHandoversRef.current[selectedDate] || 0) + amount
    };
    dailyDrawerHandoversRef.current = updatedHandovers;
    setDailyDrawerHandovers(updatedHandovers);

    try {
      localStorage.setItem('daily_ledger_safe_running_balance', String(newBal));
      localStorage.setItem('daily_ledger_safe_running_balance_date', effectiveDate);
      localStorage.setItem('daily_ledger_safe_running_balance_time', effectiveTime);
      localStorage.setItem('daily_ledger_drawer_handovers', JSON.stringify(updatedHandovers));
    } catch (e) {
      console.error(e);
    }

    syncSettingsToCloud({ 
      safeRunningBalance: newBal, 
      safeRunningBalanceDate: effectiveDate,
      safeRunningBalanceTime: effectiveTime,
      safeTransferAmount: 0,
      dailyDrawerHandovers: updatedHandovers
    });

    showToast(`Transferred Rs. ${amount.toLocaleString()} into Safe Vault! Register Drawer cash updated immediately.`, 'success');
  };

  const handleCommitTransferToSafe = () => {
    if (safeTransferAmount > 0) {
      handleTransferDrawerToSafe(safeTransferAmount, 'Day-end cash transfer from drawer to safe');
    }
  };

  // Safe to Bank Deposit Action (Cash leaves safe vault into bank)
  const handleTransferSafeToBank = (amount: number, bankName: string, notes?: string) => {
    if (amount <= 0) return;
    const totalVault = vaultDeposits.reduce((acc, d) => acc + d.amount, 0);
    const totalSafeAvailable = (safeRunningBalance || 0) + (safeTransferAmount || 0) + totalVault;

    if (amount > totalSafeAvailable) {
      showToast(`Cannot deposit Rs. ${amount.toLocaleString()}: Safe balance is only Rs. ${totalSafeAvailable.toLocaleString()}`, 'error');
      return;
    }

    // Deduct smartly across safe funds
    if (amount <= safeRunningBalance) {
      const newBal = safeRunningBalance - amount;
      handleSetSafeRunningBalance(newBal);
    } else {
      const remainingAfterRunning = amount - safeRunningBalance;
      handleSetSafeRunningBalance(0);
      if (remainingAfterRunning <= safeTransferAmount) {
        const nextTransfer = Math.max(0, safeTransferAmount - remainingAfterRunning);
        setSafeTransferAmount(nextTransfer);
        syncSettingsToCloud({ safeRunningBalance: 0, safeTransferAmount: nextTransfer });
      } else {
        const remainingAfterTransfer = remainingAfterRunning - safeTransferAmount;
        setSafeTransferAmount(0);
        syncSettingsToCloud({ safeRunningBalance: 0, safeTransferAmount: 0 });
        if (remainingAfterTransfer > 0 && vaultDeposits.length > 0) {
          setVaultDeposits(prev => {
            let rem = remainingAfterTransfer;
            const updated: VaultDeposit[] = [];
            for (const d of prev) {
              if (rem <= 0) {
                updated.push(d);
              } else if (d.amount <= rem) {
                rem -= d.amount;
              } else {
                updated.push({ ...d, amount: d.amount - rem });
                rem = 0;
              }
            }
            return updated;
          });
        }
      }
    }

    const desc = `Cash Deposit from Safe Vault into ${bankName}`;

    // Record as visible transaction in ledger
    const newTx: Omit<Transaction, 'id' | 'createdAt'> = {
      date: selectedDate,
      time: new Date().toTimeString().slice(0, 5),
      type: 'cash_out',
      amount,
      paymentMode: 'online', // Marked as online so physical drawer register is untouched
      isInternalTransfer: true,
      transferSource: 'safe',
      transferDestination: 'bank',
      category: 'Internal Transfer (Safe ➔ Bank)',
      description: desc,
      salesperson: 'Safe Vault',
      receiptNumber: notes?.trim() || undefined,
      biltyNumber: notes?.trim() || undefined,
      verified: true,
      notes: notes?.trim() || `Cash deposited from Safe Vault into ${bankName}`
    };

    handleAddTransaction(newTx, true /* skipSafeAdjustment */);
    showToast(`Deposited Rs. ${amount.toLocaleString()} into ${bankName}! Recorded in ledger.`, 'success');
  };

  // Safe to Individual Cash Transfer (Cash leaves safe vault into an individual person)
  const handleTransferSafeToIndividual = (
    amount: number, 
    recipient: string, 
    reason: string, 
    receiptNumber?: string, 
    notes?: string
  ) => {
    if (amount <= 0) return;
    const totalVault = vaultDeposits.reduce((acc, d) => acc + d.amount, 0);
    const totalSafeAvailable = (safeRunningBalance || 0) + (safeTransferAmount || 0) + totalVault;

    if (amount > totalSafeAvailable) {
      showToast(`Cannot transfer Rs. ${amount.toLocaleString()}: Safe balance is only Rs. ${totalSafeAvailable.toLocaleString()}`, 'error');
      return;
    }

    const cleanRecipient = recipient.trim() || 'Individual';
    const cleanReason = reason.trim() || 'Cash Handover from Safe';

    // Deduct smartly across safe funds
    if (amount <= safeRunningBalance) {
      const newBal = safeRunningBalance - amount;
      handleSetSafeRunningBalance(newBal);
    } else {
      const remainingAfterRunning = amount - safeRunningBalance;
      handleSetSafeRunningBalance(0);
      if (remainingAfterRunning <= safeTransferAmount) {
        const nextTransfer = Math.max(0, safeTransferAmount - remainingAfterRunning);
        setSafeTransferAmount(nextTransfer);
        syncSettingsToCloud({ safeRunningBalance: 0, safeTransferAmount: nextTransfer });
      } else {
        const remainingAfterTransfer = remainingAfterRunning - safeTransferAmount;
        setSafeTransferAmount(0);
        syncSettingsToCloud({ safeRunningBalance: 0, safeTransferAmount: 0 });
        if (remainingAfterTransfer > 0 && vaultDeposits.length > 0) {
          setVaultDeposits(prev => {
            let rem = remainingAfterTransfer;
            const updated: VaultDeposit[] = [];
            for (const d of prev) {
              if (rem <= 0) {
                updated.push(d);
              } else if (d.amount <= rem) {
                rem -= d.amount;
              } else {
                updated.push({ ...d, amount: d.amount - rem });
                rem = 0;
              }
            }
            return updated;
          });
        }
      }
    }

    const desc = `Cash Handover to ${cleanRecipient} (${cleanReason})`;

    // Record as visible transaction in ledger
    const newTx: Omit<Transaction, 'id' | 'createdAt'> = {
      date: selectedDate,
      time: new Date().toTimeString().slice(0, 5),
      type: 'cash_out',
      amount,
      paymentMode: 'online', // Marked as online so physical drawer register float is untouched
      isInternalTransfer: true,
      transferSource: 'safe',
      transferDestination: 'individual',
      category: 'Safe Transfer (Safe ➔ Individual)',
      description: desc,
      salesperson: cleanRecipient,
      receiptNumber: receiptNumber?.trim() || undefined,
      biltyNumber: receiptNumber?.trim() || undefined,
      verified: true,
      notes: notes?.trim() || `Cash transferred from Safe Vault to ${cleanRecipient} for ${cleanReason}`
    };

    handleAddTransaction(newTx, true /* skipSafeAdjustment */);
    showToast(`Transferred Rs. ${amount.toLocaleString()} from Safe to ${cleanRecipient}! Recorded in ledger.`, 'success');
  };

  // Safe to Drawer Replenishment Action (Cash leaves safe vault into register drawer)
  const handleTransferSafeToDrawer = (amount: number, reason?: string) => {
    if (amount <= 0) return;
    const totalVault = vaultDeposits.reduce((acc, d) => acc + d.amount, 0);
    const totalSafeAvailable = (safeRunningBalance || 0) + (safeTransferAmount || 0) + totalVault;

    if (amount > totalSafeAvailable) {
      showToast(`Cannot transfer Rs. ${amount.toLocaleString()}: Safe balance is only Rs. ${totalSafeAvailable.toLocaleString()}`, 'error');
      return;
    }

    // Deduct smartly across safe funds
    if (amount <= safeRunningBalance) {
      const newBal = safeRunningBalance - amount;
      handleSetSafeRunningBalance(newBal);
    } else {
      const remainingAfterRunning = amount - safeRunningBalance;
      handleSetSafeRunningBalance(0);
      if (remainingAfterRunning <= safeTransferAmount) {
        const nextTransfer = Math.max(0, safeTransferAmount - remainingAfterRunning);
        setSafeTransferAmount(nextTransfer);
        syncSettingsToCloud({ safeRunningBalance: 0, safeTransferAmount: nextTransfer });
      } else {
        const remainingAfterTransfer = remainingAfterRunning - safeTransferAmount;
        setSafeTransferAmount(0);
        syncSettingsToCloud({ safeRunningBalance: 0, safeTransferAmount: 0 });
        if (remainingAfterTransfer > 0 && vaultDeposits.length > 0) {
          setVaultDeposits(prev => {
            let rem = remainingAfterTransfer;
            const updated: VaultDeposit[] = [];
            for (const d of prev) {
              if (rem <= 0) {
                updated.push(d);
              } else if (d.amount <= rem) {
                rem -= d.amount;
              } else {
                updated.push({ ...d, amount: d.amount - rem });
                rem = 0;
              }
            }
            return updated;
          });
        }
      }
    }

    const desc = reason?.trim() || 'Cash Transfer from Safe to Drawer (Float Replenishment)';

    const newTx: Omit<Transaction, 'id' | 'createdAt'> = {
      date: selectedDate,
      time: new Date().toTimeString().slice(0, 5),
      type: 'cash_in',
      amount,
      paymentMode: 'cash',
      isInternalTransfer: true,
      transferSource: 'safe',
      transferDestination: 'drawer',
      category: 'Internal Transfer (Safe ➔ Drawer)',
      description: desc,
      salesperson: 'Safe Vault',
      verified: true,
      notes: 'Internal cash transfer from Safe to replenish drawer float.'
    };

    handleAddTransaction(newTx, true /* skipSafeAdjustment */);
    showToast(`Transferred Rs. ${amount.toLocaleString()} from Safe into Cash Drawer!`, 'success');
  };

  // Drawer to Bank Deposit Action (Cash leaves register drawer directly into bank)
  const handleTransferDrawerToBank = (amount: number, bankName: string, notes?: string) => {
    if (amount <= 0) return;
    if (amount > expectedPhysicalDrawer) {
      showToast(`Cannot deposit Rs. ${amount.toLocaleString()}: Drawer cash is only Rs. ${expectedPhysicalDrawer.toLocaleString()}`, 'error');
      return;
    }

    const desc = `Cash Deposit from Drawer into ${bankName}`;

    const newTx: Omit<Transaction, 'id' | 'createdAt'> = {
      date: selectedDate,
      time: new Date().toTimeString().slice(0, 5),
      type: 'cash_out',
      amount,
      paymentMode: 'cash', // Physical cash leaving the drawer
      isInternalTransfer: true,
      transferSource: 'drawer',
      transferDestination: 'bank',
      category: 'Bank Deposit (From Drawer)',
      description: desc,
      salesperson: 'Drawer ➔ Bank',
      receiptNumber: notes?.trim() || undefined,
      biltyNumber: notes?.trim() || undefined,
      verified: true,
      notes: notes?.trim() || `Cash deposited directly from cash register drawer into ${bankName}`
    };

    handleAddTransaction(newTx, true /* skipSafeAdjustment */);
    showToast(`Deposited Rs. ${amount.toLocaleString()} from Drawer into ${bankName}! Cash register updated.`, 'success');
  };

  const handleDeductFromSafe = (amount: number): boolean => {
    if (amount <= 0) return false;
    const totalVault = vaultDeposits.reduce((acc, d) => acc + d.amount, 0);
    const totalSafeAvailable = (safeRunningBalance || 0) + (safeTransferAmount || 0) + totalVault;
    if (amount > totalSafeAvailable) {
      showToast(`Cannot deduct Rs. ${amount.toLocaleString()}: Safe balance is only Rs. ${totalSafeAvailable.toLocaleString()}`, 'error');
      return false;
    }

    if (amount <= safeRunningBalance) {
      const newBal = safeRunningBalance - amount;
      setSafeRunningBalance(newBal);
      syncSettingsToCloud({ safeRunningBalance: newBal });
    } else {
      const remainingAfterRunning = amount - safeRunningBalance;
      setSafeRunningBalance(0);
      if (remainingAfterRunning <= safeTransferAmount) {
        const newTransfer = Math.max(0, safeTransferAmount - remainingAfterRunning);
        setSafeTransferAmount(newTransfer);
        syncSettingsToCloud({ safeRunningBalance: 0, safeTransferAmount: newTransfer });
      } else {
        const remainingAfterTransfer = remainingAfterRunning - safeTransferAmount;
        setSafeTransferAmount(0);
        if (remainingAfterTransfer > 0 && vaultDeposits.length > 0) {
          setVaultDeposits(prev => {
            let rem = remainingAfterTransfer;
            const updated: VaultDeposit[] = [];
            for (const d of prev) {
              if (rem <= 0) {
                updated.push(d);
              } else if (d.amount <= rem) {
                rem -= d.amount;
              } else {
                updated.push({ ...d, amount: d.amount - rem });
                rem = 0;
              }
            }
            return updated;
          });
        }
        syncSettingsToCloud({ safeRunningBalance: 0, safeTransferAmount: 0 });
      }
    }
    return true;
  };

  const handleAddVaultDeposit = (deposit: Omit<VaultDeposit, 'id' | 'createdAt'>) => {
    const newDep: VaultDeposit = {
      ...deposit,
      id: 'vdep_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      createdAt: Date.now()
    };
    setVaultDeposits(prev => [newDep, ...prev]);
    saveVaultDepositToCloud(newDep);
  };

  const handleDeleteVaultDeposit = (id: string) => {
    setVaultDeposits(prev => prev.filter(d => d.id !== id));
    deleteVaultDepositFromCloud(id);
  };

  const handleSetSafeRunningBalance = (val: number, date?: string, time?: string) => {
    const effectiveDate = date || safeRunningBalanceDateRef.current || selectedDate || new Date().toISOString().split('T')[0];
    const effectiveTime = time || safeRunningBalanceTimeRef.current || new Date().toTimeString().slice(0, 5);
    safeRunningBalanceRef.current = val;
    safeRunningBalanceDateRef.current = effectiveDate;
    safeRunningBalanceTimeRef.current = effectiveTime;
    setSafeRunningBalance(val);
    setSafeRunningBalanceDate(effectiveDate);
    setSafeRunningBalanceTime(effectiveTime);
    try {
      localStorage.setItem('daily_ledger_safe_running_balance', String(val));
      localStorage.setItem('daily_ledger_safe_running_balance_date', effectiveDate);
      localStorage.setItem('daily_ledger_safe_running_balance_time', effectiveTime);
    } catch (e) {
      console.error(e);
    }
    syncSettingsToCloud({
      safeRunningBalance: val,
      safeRunningBalanceDate: effectiveDate,
      safeRunningBalanceTime: effectiveTime
    });
  };

  const handleSetSafeRunningBalanceDate = (date: string) => {
    setSafeRunningBalanceDate(date);
    try {
      localStorage.setItem('daily_ledger_safe_running_balance_date', date);
    } catch (e) {
      console.error(e);
    }
    syncSettingsToCloud({ safeRunningBalanceDate: date });
  };

  const handleConsolidateVaultDeposits = () => {
    // Preserve vault deposits history by marking them as consolidated instead of deleting
    const now = Date.now();
    setVaultDeposits(prev => {
      const updated = prev.map(d => ({
        ...d,
        isConsolidated: true,
        consolidatedAt: d.consolidatedAt || now
      }));
      try {
        localStorage.setItem('daily_ledger_vault_deposits', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      updated.forEach(d => saveVaultDepositToCloud(d));
      return updated;
    });
    const effectiveDate = selectedDate || new Date().toISOString().split('T')[0];
    const effectiveTime = new Date().toTimeString().slice(0, 5);
    setSafeRunningBalanceDate(effectiveDate);
    setSafeRunningBalanceTime(effectiveTime);
    try {
      localStorage.setItem('daily_ledger_safe_running_balance_date', effectiveDate);
      localStorage.setItem('daily_ledger_safe_running_balance_time', effectiveTime);
    } catch (e) {
      console.error(e);
    }
    syncSettingsToCloud({
      safeRunningBalanceDate: effectiveDate,
      safeRunningBalanceTime: effectiveTime
    });
  };

  // Ledger Handlers
  const handleAddTransaction = (newTx: Omit<Transaction, 'id' | 'createdAt'>, skipSafeAdjustment = false) => {
    const txWithMeta: Transaction = {
      ...newTx,
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      createdAt: Date.now()
    };
    setTransactions(prev => [txWithMeta, ...prev]);
    saveTransactionToCloud(txWithMeta);

    // If new staff salesperson is provided and not in staffList, add it automatically
    if (txWithMeta.salesperson && !staffList.includes(txWithMeta.salesperson) && !txWithMeta.isInternalTransfer) {
      const updatedStaff = [...staffList, txWithMeta.salesperson!];
      setStaffList(updatedStaff);
      syncSettingsToCloud({ staffList: updatedStaff });
    }

    // If this is a transfer added via intake form without explicit handler:
    if (!skipSafeAdjustment) {
      if (txWithMeta.type === 'cash_out') {
        const isSafeToIndividual = txWithMeta.transferDestination === 'individual' ||
          (txWithMeta.transferSource === 'safe' && (
            (txWithMeta.category && txWithMeta.category.toLowerCase().includes('individual')) ||
            (txWithMeta.description && (
              txWithMeta.description.toLowerCase().includes('handover to') ||
              txWithMeta.description.toLowerCase().includes('safe cash to') ||
              txWithMeta.description.toLowerCase().includes('safe to individual')
            ))
          ));

        const isSafeToBank = txWithMeta.transferSource === 'safe' && txWithMeta.transferDestination === 'bank';

        const isDrawerToSafe = !isSafeToIndividual && !isSafeToBank && (
          txWithMeta.transferDestination === 'safe' ||
          (txWithMeta.category && (
            txWithMeta.category.includes('Transfer to Safe') ||
            txWithMeta.category.includes('Drawer ➔ Safe')
          )) ||
          (txWithMeta.description && txWithMeta.description.toLowerCase().includes('drawer to safe'))
        );

        if (isSafeToIndividual && txWithMeta.transferSource === 'safe') {
          // Outflow from safe to individual: deduct from safe
          const newSafe = Math.max(0, safeRunningBalance - txWithMeta.amount);
          setSafeRunningBalance(newSafe);
          syncSettingsToCloud({ safeRunningBalance: newSafe });
        } else if (isDrawerToSafe) {
          // Inflow from drawer into safe: credit safe
          const newSafe = safeRunningBalance + txWithMeta.amount;
          setSafeRunningBalance(newSafe);
          safeRunningBalanceRef.current = newSafe;
          const targetDate = txWithMeta.date || selectedDate;
          const updatedHandovers = {
            ...dailyDrawerHandoversRef.current,
            [targetDate]: (dailyDrawerHandoversRef.current[targetDate] || 0) + txWithMeta.amount
          };
          dailyDrawerHandoversRef.current = updatedHandovers;
          setDailyDrawerHandovers(updatedHandovers);
          try {
            localStorage.setItem('daily_ledger_safe_running_balance', String(newSafe));
            localStorage.setItem('daily_ledger_drawer_handovers', JSON.stringify(updatedHandovers));
          } catch (e) {
            console.error(e);
          }
          syncSettingsToCloud({ safeRunningBalance: newSafe, dailyDrawerHandovers: updatedHandovers });
        }
      }
    }
  };

  const handleDeleteTransaction = (id: string) => {
    // 0. Synthetic drawer-to-safe handover deletion
    if (id.startsWith('handover_')) {
      const targetDate = id.replace('handover_', '');
      const amt = dailyDrawerHandoversRef.current[targetDate] || 0;
      const newSafe = Math.max(0, (safeRunningBalanceRef.current || 0) - amt);
      safeRunningBalanceRef.current = newSafe;
      setSafeRunningBalance(newSafe);

      const copy = { ...dailyDrawerHandoversRef.current };
      delete copy[targetDate];
      dailyDrawerHandoversRef.current = copy;
      setDailyDrawerHandovers(copy);

      try {
        localStorage.setItem('daily_ledger_safe_running_balance', String(newSafe));
        localStorage.setItem('daily_ledger_drawer_handovers', JSON.stringify(copy));
      } catch (e) {
        console.error(e);
      }
      syncSettingsToCloud({ safeRunningBalance: newSafe, dailyDrawerHandovers: copy });
      showToast(`Removed safe handover for ${targetDate} (${formatPKR(amt)}). Register cash and safe balance restored.`, 'info');
      return;
    }

    const tx = transactions.find(t => t.id === id);
    if (tx && (tx.isInternalTransfer || isInternalTransferTransaction(tx))) {
      // 1. Safe to Individual being removed: return disbursed cash back into safe
      if (
        tx.type === 'cash_out' &&
        (tx.transferDestination === 'individual' ||
         tx.category?.toLowerCase().includes('individual') ||
         tx.description.toLowerCase().includes('handover to') ||
         tx.description.toLowerCase().includes('safe cash to') ||
         tx.description.toLowerCase().includes('safe to individual')) &&
        tx.transferSource === 'safe'
      ) {
        const newSafe = safeRunningBalance + tx.amount;
        setSafeRunningBalance(newSafe);
        syncSettingsToCloud({ safeRunningBalance: newSafe });
      }
      // 2. Safe to Bank being removed: return cash back into safe
      else if (
        tx.type === 'cash_out' &&
        (tx.transferDestination === 'bank' || tx.description.toLowerCase().includes('bank')) &&
        tx.transferSource === 'safe'
      ) {
        const newSafe = safeRunningBalance + tx.amount;
        setSafeRunningBalance(newSafe);
        syncSettingsToCloud({ safeRunningBalance: newSafe });
      }
      // 3. Safe to Drawer replenishment being removed: return cash back into safe
      else if (
        tx.type === 'cash_in' &&
        (tx.transferSource === 'safe' || tx.description.toLowerCase().includes('safe to drawer'))
      ) {
        const newSafe = safeRunningBalance + tx.amount;
        setSafeRunningBalance(newSafe);
        syncSettingsToCloud({ safeRunningBalance: newSafe });
      }
      // 4. Drawer to Safe handover being removed: take cash back out of safe into drawer
      else if (
        tx.type === 'cash_out' &&
        (tx.transferDestination === 'safe' ||
         tx.category?.includes('Transfer to Safe') ||
         tx.category?.includes('Drawer ➔ Safe') ||
         tx.description.toLowerCase().includes('drawer to safe'))
      ) {
        const newSafe = Math.max(0, safeRunningBalance - tx.amount);
        setSafeRunningBalance(newSafe);
        safeRunningBalanceRef.current = newSafe;
        const targetDate = tx.date || selectedDate;
        const updatedHandovers = {
          ...dailyDrawerHandoversRef.current,
          [targetDate]: Math.max(0, (dailyDrawerHandoversRef.current[targetDate] || 0) - tx.amount)
        };
        dailyDrawerHandoversRef.current = updatedHandovers;
        setDailyDrawerHandovers(updatedHandovers);
        try {
          localStorage.setItem('daily_ledger_safe_running_balance', String(newSafe));
          localStorage.setItem('daily_ledger_drawer_handovers', JSON.stringify(updatedHandovers));
        } catch (e) {
          console.error(e);
        }
        syncSettingsToCloud({ safeRunningBalance: newSafe, dailyDrawerHandovers: updatedHandovers });
      }
    }
    setTransactions(prev => prev.filter(t => t.id !== id));
    deleteTransactionFromCloud(id);
  };

  const handleUpdateTransaction = (id: string, updates: Partial<Transaction>) => {
    // 1. Check if this is a synthetic daily drawer handover
    if (id.startsWith('handover_')) {
      const targetDate = id.replace('handover_', '');
      const oldAmt = dailyDrawerHandoversRef.current[targetDate] || 0;
      const newAmt = updates.amount !== undefined ? updates.amount : oldAmt;
      const diff = newAmt - oldAmt;

      const newSafe = Math.max(0, (safeRunningBalanceRef.current || 0) + diff);
      safeRunningBalanceRef.current = newSafe;
      setSafeRunningBalance(newSafe);

      const targetDateAfterUpdate = updates.date && updates.date !== targetDate ? updates.date : targetDate;
      let updatedHandovers: Record<string, number>;
      if (targetDateAfterUpdate !== targetDate) {
        const copy = { ...dailyDrawerHandoversRef.current };
        delete copy[targetDate];
        copy[targetDateAfterUpdate] = (copy[targetDateAfterUpdate] || 0) + newAmt;
        updatedHandovers = copy;
      } else {
        updatedHandovers = {
          ...dailyDrawerHandoversRef.current,
          [targetDate]: newAmt
        };
      }
      dailyDrawerHandoversRef.current = updatedHandovers;
      setDailyDrawerHandovers(updatedHandovers);

      try {
        localStorage.setItem('daily_ledger_safe_running_balance', String(newSafe));
        localStorage.setItem('daily_ledger_drawer_handovers', JSON.stringify(updatedHandovers));
      } catch (e) {
        console.error(e);
      }

      syncSettingsToCloud({
        safeRunningBalance: newSafe,
        dailyDrawerHandovers: updatedHandovers
      });

      showToast(`Safe handover for ${targetDateAfterUpdate} updated to ${formatPKR(newAmt)}! Safe balance and register cash updated.`, 'success');
      return;
    }

    const oldTx = transactions.find(t => t.id === id);
    if (oldTx && updates.amount !== undefined && updates.amount !== oldTx.amount) {
      const diff = updates.amount - oldTx.amount;
      if (oldTx.isInternalTransfer || isInternalTransferTransaction(oldTx)) {
        // Safe to Individual: amount increased means more cash taken from safe
        if (
          oldTx.type === 'cash_out' &&
          (oldTx.transferDestination === 'individual' ||
           oldTx.category?.toLowerCase().includes('individual') ||
           oldTx.description.toLowerCase().includes('safe cash to') ||
           oldTx.description.toLowerCase().includes('safe to individual')) &&
          oldTx.transferSource === 'safe'
        ) {
          const newSafe = Math.max(0, (safeRunningBalanceRef.current || 0) - diff);
          safeRunningBalanceRef.current = newSafe;
          setSafeRunningBalance(newSafe);
          try {
            localStorage.setItem('daily_ledger_safe_running_balance', String(newSafe));
          } catch (e) {
            console.error(e);
          }
          syncSettingsToCloud({ safeRunningBalance: newSafe });
        }
        // Safe to Bank: amount increased means more cash taken from safe into bank
        else if (
          oldTx.type === 'cash_out' &&
          (oldTx.transferDestination === 'bank' || oldTx.description.toLowerCase().includes('bank')) &&
          oldTx.transferSource === 'safe'
        ) {
          const newSafe = Math.max(0, (safeRunningBalanceRef.current || 0) - diff);
          safeRunningBalanceRef.current = newSafe;
          setSafeRunningBalance(newSafe);
          try {
            localStorage.setItem('daily_ledger_safe_running_balance', String(newSafe));
          } catch (e) {
            console.error(e);
          }
          syncSettingsToCloud({ safeRunningBalance: newSafe });
        }
        // Drawer to Safe: amount increased means more cash went into safe
        else if (
          oldTx.type === 'cash_out' &&
          (oldTx.transferDestination === 'safe' ||
           oldTx.category?.includes('Transfer to Safe') ||
           oldTx.category?.includes('Drawer ➔ Safe') ||
           oldTx.description.toLowerCase().includes('drawer to safe'))
        ) {
          const newSafe = Math.max(0, (safeRunningBalanceRef.current || 0) + diff);
          safeRunningBalanceRef.current = newSafe;
          setSafeRunningBalance(newSafe);

          const targetDate = updates.date || oldTx.date || selectedDate;
          const updatedHandovers = {
            ...dailyDrawerHandoversRef.current,
            [targetDate]: Math.max(0, (dailyDrawerHandoversRef.current[targetDate] || 0) + diff)
          };
          dailyDrawerHandoversRef.current = updatedHandovers;
          setDailyDrawerHandovers(updatedHandovers);

          try {
            localStorage.setItem('daily_ledger_safe_running_balance', String(newSafe));
            localStorage.setItem('daily_ledger_drawer_handovers', JSON.stringify(updatedHandovers));
          } catch (e) {
            console.error(e);
          }
          syncSettingsToCloud({ safeRunningBalance: newSafe, dailyDrawerHandovers: updatedHandovers });
        }
        // Safe to Drawer: amount increased means more cash taken from safe
        else if (
          oldTx.type === 'cash_in' &&
          (oldTx.transferSource === 'safe' || oldTx.description.toLowerCase().includes('safe to drawer'))
        ) {
          const newSafe = Math.max(0, (safeRunningBalanceRef.current || 0) - diff);
          safeRunningBalanceRef.current = newSafe;
          setSafeRunningBalance(newSafe);
          try {
            localStorage.setItem('daily_ledger_safe_running_balance', String(newSafe));
          } catch (e) {
            console.error(e);
          }
          syncSettingsToCloud({ safeRunningBalance: newSafe });
        }
      }
    }

    setTransactions(prev =>
      prev.map(t => (t.id === id ? { ...t, ...updates } : t))
    );
    updateTransactionInCloud(id, updates);
    showToast('Safe transaction updated successfully! Safe balance and register cash refreshed.', 'success');
  };

  const handleUpdateVaultDeposit = (id: string, updates: Partial<VaultDeposit>) => {
    setVaultDeposits(prev => {
      const updated = prev.map(d => (d.id === id ? { ...d, ...updates } : d));
      try {
        localStorage.setItem('daily_ledger_vault_deposits', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      const targetDeposit = updated.find(d => d.id === id);
      if (targetDeposit) {
        saveVaultDepositToCloud(targetDeposit);
      }
      return updated;
    });
    showToast('Vault cash deposit updated successfully.', 'success');
  };

  // Populate sample 7-day past transactions for instant trend visualization
  const handleLoadSampleHistory = () => {
    const today = new Date();
    const demoTx: Transaction[] = [];
    const sampleStaff = ['Abdullah', 'Ishtiaq', 'Ilyas', 'Tayab Electric'];

    for (let dayOffset = 6; dayOffset >= 1; dayOffset--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dayOffset, 12, 0, 0);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;

      const staff1 = sampleStaff[(dayOffset * 2) % sampleStaff.length];
      const staff2 = sampleStaff[(dayOffset * 2 + 1) % sampleStaff.length];
      const saleAmount1 = 15000 + (dayOffset * 3800);
      const saleAmount2 = 22000 + (dayOffset * 4500);

      demoTx.push({
        id: `tx_demo_${Date.now()}_${dayOffset}_1`,
        date: dateStr,
        time: '11:30',
        type: 'cash_in',
        amount: saleAmount1,
        salesperson: staff1,
        paymentMode: 'cash',
        billNumber: String(3000 + dayOffset * 10 + 1),
        description: `${staff1} Counter Sales`,
        createdAt: Date.now() - dayOffset * 86400000
      });

      demoTx.push({
        id: `tx_demo_${Date.now()}_${dayOffset}_2`,
        date: dateStr,
        time: '15:45',
        type: 'cash_in',
        amount: saleAmount2,
        salesperson: staff2,
        paymentMode: dayOffset % 2 === 0 ? 'online' : 'cash',
        billNumber: String(3000 + dayOffset * 10 + 2),
        description: `${staff2} Counter Sales`,
        createdAt: Date.now() - dayOffset * 86400000 + 3600000
      });

      const expAmount = 2500 + (dayOffset * 900);
      const expCategory = dayOffset % 3 === 0 ? 'Freight & Cargo' : dayOffset % 3 === 1 ? 'Office & Refreshment' : 'Fuel & Travel';
      demoTx.push({
        id: `tx_demo_${Date.now()}_${dayOffset}_3`,
        date: dateStr,
        time: '14:15',
        type: 'cash_out',
        amount: expAmount,
        category: expCategory,
        paymentMode: 'cash',
        description: `${expCategory} daily disbursement`,
        verified: true,
        createdAt: Date.now() - dayOffset * 86400000 + 7200000
      });
    }

    setTransactions(prev => [...demoTx, ...prev]);
    showToast('Loaded 7-day past transaction history! Trend chart updated.', 'success');
  };

  const handleToggleVerified = (id: string) => {
    setTransactions(prev =>
      prev.map(t => (t.id === id ? { ...t, verified: !t.verified } : t))
    );
  };

  const handleAddStaff = (name: string) => {
    if (!staffList.includes(name)) {
      setStaffList(prev => [...prev, name]);
    }
  };

  // Open modal for clear confirmation
  const handleOpenClearModal = () => {
    setIsClearModalOpen(true);
  };

  // Clear everything for a fresh real-time day / shift
  const handleClearEverything = () => {
    setTransactions([]);
    setOpeningCash(0);
    setSafeTransferAmount(0);
    setVaultDeposits([]);
    setSelectedDate(getLocalDateString());
    localStorage.removeItem('daily_ledger_transactions');
    localStorage.removeItem('daily_ledger_opening_cash');
    localStorage.removeItem('daily_ledger_safe_transfer_amount');
    localStorage.removeItem('daily_ledger_vault_deposits');
    showToast('Ledger cleared completely for a fresh shift!', 'success');
  };

  // Clear only transaction records
  const handleClearTransactionsOnly = () => {
    setTransactions([]);
    localStorage.removeItem('daily_ledger_transactions');
    showToast('All transaction records cleared.', 'success');
  };

  // Reset opening balance float
  const handleResetOpeningOnly = () => {
    setOpeningCash(0);
    localStorage.removeItem('daily_ledger_opening_cash');
    showToast('Opening balance float reset to Rs. 0.', 'success');
  };

  // Download Multi-Tab Excel Spreadsheet (.xlsx)
  const handleExportExcel = () => {
    const exportSet = hasActiveFilters ? filteredTransactions : transactions;
    exportToExcel(
      exportSet, 
      selectedDate, 
      remainingDrawerCash, 
      openingCash, 
      undefined, 
      {
        safeRunningBalance,
        safeTransferAmount,
        totalSafeCash,
        vaultDepositsTotal: totalVaultDeposits,
        vaultDeposits
      }
    );
    showToast(
      hasActiveFilters
        ? `Excel (.xlsx) downloaded with ${exportSet.length} filtered entries.`
        : 'Excel workbook (.xlsx) downloaded successfully.',
      'success'
    );
  };

  // Download Permanent JSON Backup
  const handleBackupJson = () => {
    const backupData = {
      version: '3.3',
      exportedAt: new Date().toISOString(),
      date: selectedDate,
      openingCash,
      safeRunningBalance,
      safeTransferAmount,
      vaultDeposits,
      transactions,
      staffList
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ledger_Backup_${selectedDate}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
    showToast(`Ledger backup saved: Ledger_Backup_${selectedDate}.json`, 'success');
  };

  // Restore from JSON Backup
  const handleRestoreJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text);
        if (Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
          if (typeof data.openingCash === 'number') setOpeningCash(data.openingCash);
          if (typeof data.safeRunningBalance === 'number') setSafeRunningBalance(data.safeRunningBalance);
          if (typeof data.safeTransferAmount === 'number') setSafeTransferAmount(data.safeTransferAmount);
          if (Array.isArray(data.vaultDeposits)) setVaultDeposits(data.vaultDeposits);
          if (data.date) setSelectedDate(data.date);
          if (Array.isArray(data.staffList)) setStaffList(data.staffList);
          showToast(`Successfully restored ledger backup from ${file.name}! (${data.transactions.length} entries)`, 'success');
        } else {
          showToast('Invalid backup file structure.', 'error');
        }
      } catch (err: any) {
        showToast('Could not read backup file: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-stone-100/70 text-stone-900 font-sans antialiased pb-12">
      {/* Header */}
      <Header
        selectedDate={selectedDate}
        onChangeDate={setSelectedDate}
        onClearAll={handleOpenClearModal}
        onExportExcel={handleExportExcel}
        onBackupJson={handleBackupJson}
        onRestoreJson={handleRestoreJson}
        onOpenStartNewDay={() => setIsStartNewDayOpen(true)}
        isCloudSynced={isCloudSynced}
        isSyncing={isSyncing}
        onManualSyncToCloud={handleManualSyncToCloud}
        onOpenRecovery={() => setIsRecoveryModalOpen(true)}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-5">
        {/* Soft, Low-Contrast Live Status Ribbon */}
        <section aria-label="Cash status summary" className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {/* Card 1: Live Register Till Cash */}
          <div 
            onClick={() => setActiveTab('vault')}
            className="bg-white border border-stone-200/90 rounded-xl p-3.5 shadow-2xs hover:border-emerald-300 transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between text-xs text-stone-500 font-medium mb-1">
              <span className="flex items-center gap-1.5 text-stone-700">
                <Wallet className="w-3.5 h-3.5 text-emerald-700" />
                <span>Register Till Cash</span>
              </span>
              <span className="text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold border border-emerald-200">
                Live In Hand
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-900 tracking-tight">
              {formatPKR(remainingDrawerCash)}
            </div>
            <div className="text-[11px] text-stone-500 mt-1 flex items-center justify-between">
              <span>{todayDrawerToSafeHandover > 0 ? `Safe Handover: -${formatPKR(todayDrawerToSafeHandover)}` : `Float: ${formatPKR(currentDayOpeningCash)}`}</span>
              <span className="text-stone-400 group-hover:text-emerald-700 font-medium">Manage ➔</span>
            </div>
          </div>

          {/* Card 2: Safe Vault Total */}
          <div 
            onClick={() => setActiveTab('vault')}
            className="bg-white border border-stone-200/90 rounded-xl p-3.5 shadow-2xs hover:border-slate-300 transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between text-xs text-stone-500 font-medium mb-1">
              <span className="flex items-center gap-1.5 text-stone-700">
                <Lock className="w-3.5 h-3.5 text-slate-700" />
                <span>Safe Vault Total</span>
              </span>
              {totalSafeCash === 433500 ? (
                <span className="text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold border border-emerald-200">
                  ✓ Rs. 433,500
                </span>
              ) : (
                <span className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded font-semibold border border-amber-200">
                  Fix Balance
                </span>
              )}
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-slate-800 tracking-tight">
              {formatPKR(totalSafeCash)}
            </div>
            <div className="text-[11px] text-stone-500 mt-1 flex items-center justify-between">
              <span>{totalSafeCash === 433500 ? 'Reconciled closing balance' : 'Target: Rs. 433,500'}</span>
              <span className="text-stone-400 group-hover:text-slate-700 font-medium">Vault ➔</span>
            </div>
          </div>

          {/* Card 3: Today's Gross Sales */}
          <div 
            onClick={() => setActiveTab('ledger')}
            className="bg-white border border-stone-200/90 rounded-xl p-3.5 shadow-2xs hover:border-emerald-300 transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between text-xs text-stone-500 font-medium mb-1">
              <span className="flex items-center gap-1.5 text-stone-700">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
                <span>Today&apos;s Gross Sales</span>
              </span>
              <span className="text-[10px] text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded font-semibold">
                {transactions.filter(t => (t.date || '').trim() === selectedDate.trim() && t.type === 'cash_in' && !t.isInternalTransfer).length} sales
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-stone-900 tracking-tight">
              {formatPKR(totalGrossSales)}
            </div>
            <div className="text-[11px] text-stone-500 mt-1 flex items-center justify-between">
              <span>{transactions.filter(t => (t.date || '').trim() === selectedDate.trim()).length} total records today</span>
              <span className="text-stone-400 group-hover:text-stone-700 font-medium">Ledger ➔</span>
            </div>
          </div>

          {/* Card 4: Today's Operating Expenses */}
          <div 
            onClick={() => setActiveTab('ledger')}
            className="bg-white border border-stone-200/90 rounded-xl p-3.5 shadow-2xs hover:border-amber-300 transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between text-xs text-stone-500 font-medium mb-1">
              <span className="flex items-center gap-1.5 text-stone-700">
                <ArrowRight className="w-3.5 h-3.5 text-amber-700" />
                <span>Operating Expenses</span>
              </span>
              <span className="text-[10px] text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded font-semibold">
                Shop Outflows
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-stone-800 tracking-tight">
              {formatPKR(totalOperatingExpenses)}
            </div>
            <div className="text-[11px] text-stone-500 mt-1 flex items-center justify-between">
              <span className={totalGrossSales - totalOperatingExpenses >= 0 ? 'text-emerald-800 font-semibold' : 'text-rose-700 font-semibold'}>
                Net Flow: {totalGrossSales - totalOperatingExpenses >= 0 ? '+' : ''}{formatPKR(totalGrossSales - totalOperatingExpenses)}
              </span>
              <span className="text-stone-400 group-hover:text-stone-700 font-medium">View ➔</span>
            </div>
          </div>
        </section>

        {/* Soft, Low-Contrast Tab Navigation Bar */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 mb-5 border-b border-stone-200/90 scrollbar-none">
          <nav aria-label="Workspace tabs" className="inline-flex items-center p-1 bg-stone-200/60 rounded-xl gap-1 text-xs font-semibold text-stone-700">
            <button
              type="button"
              onClick={() => setActiveTab('ledger')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'ledger'
                  ? 'bg-white text-stone-900 shadow-2xs font-bold'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Daily Ledger &amp; Sales</span>
              <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-stone-100 text-stone-600">
                {filteredTransactions.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('entry')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'entry'
                  ? 'bg-white text-stone-900 shadow-2xs font-bold'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
              }`}
            >
              <PlusCircle className="w-4 h-4 text-emerald-700" />
              <span>New Entry &amp; Float</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('vault')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'vault'
                  ? 'bg-white text-stone-900 shadow-2xs font-bold'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
              }`}
            >
              <Lock className="w-4 h-4 text-slate-700" />
              <span>Safe Vault &amp; Transfers</span>
              <span className={`ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                totalSafeCash === 433500 
                  ? 'bg-emerald-50 text-emerald-800' 
                  : 'bg-amber-100 text-amber-900'
              }`}>
                {totalSafeCash === 433500 ? '433.5k' : 'Fix'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('counter')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'counter'
                  ? 'bg-white text-stone-900 shadow-2xs font-bold'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
              }`}
            >
              <Banknote className="w-4 h-4 text-emerald-700" />
              <span>Cash Denomination Slip</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('trends')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'trends'
                  ? 'bg-white text-stone-900 shadow-2xs font-bold'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-slate-700" />
              <span>Flow &amp; Trends</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white text-stone-900 shadow-2xs font-bold'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
              }`}
              title="Show all panels on one dashboard"
            >
              <Layers className="w-4 h-4 text-stone-600" />
              <span>All-in-One View</span>
            </button>
          </nav>

          <div className="flex items-center gap-2">
            {activeTab !== 'entry' && (
              <button
                type="button"
                onClick={() => setActiveTab('entry')}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Add Transaction</span>
              </button>
            )}
          </div>
        </div>

        {/* TAB VIEW 1: Daily Ledger & Sales Table */}
        {(activeTab === 'ledger' || activeTab === 'all') && (
          <div className="space-y-4 mb-6 animate-in fade-in">
            {/* Helpful Data Notification Banner if entries exist on other dates */}
            {filteredTransactions.length === 0 && transactions.length > 0 && (
              <div className="p-4 bg-amber-50/80 border border-amber-300 rounded-xl shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-200/60 border border-amber-300 flex items-center justify-center text-amber-900 shrink-0">
                    <Database className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-950">
                      No records displayed for active date ({selectedDate}), but {transactions.length} record{transactions.length === 1 ? '' : 's'} exist in your ledger!
                    </h4>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Dates found with entries: <strong>{Array.from(new Set(transactions.map(t => t.date))).filter(Boolean).join(', ')}</strong>
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {transactions[0]?.date && transactions[0].date !== selectedDate && (
                    <button
                      type="button"
                      onClick={() => setSelectedDate(transactions[0].date)}
                      className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                    >
                      📅 Jump to {transactions[0].date}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setFilters(prev => ({ ...prev, dateScope: 'all', startDate: '', endDate: '' }))}
                    className="px-3 py-1.5 bg-stone-700 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                  >
                    👁️ View All Dates ({transactions.length} Entries)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRecoveryModalOpen(true)}
                    className="px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-50 text-amber-950 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    🛠️ Data Recovery
                  </button>
                </div>
              </div>
            )}

            {/* Search & Filter Bar above SpreadsheetLedger */}
            <TransactionFilterBar
              filters={filters}
              onFilterChange={handleFilterChange}
              onResetFilters={handleResetFilters}
              staffList={allStaffOptions}
              totalTransactionsCount={transactions.length}
              filteredTransactionsCount={filteredTransactions.length}
              selectedDate={selectedDate}
              onOpenStartNewDay={() => setIsStartNewDayOpen(true)}
            />

            {/* Core Real-Time Spreadsheet Ledger View */}
            <SpreadsheetLedger
              transactions={filteredTransactions}
              totalAllCount={transactions.length}
              isFiltered={hasActiveFilters}
              onResetFilters={handleResetFilters}
              onDeleteTransaction={handleDeleteTransaction}
              onToggleVerified={handleToggleVerified}
              onUpdateTransaction={handleUpdateTransaction}
              selectedDate={selectedDate}
              dateRangeText={
                filters.startDate && filters.endDate
                  ? `${filters.startDate} to ${filters.endDate}`
                  : filters.startDate
                  ? `From ${filters.startDate}`
                  : filters.endDate
                  ? `Up to ${filters.endDate}`
                  : filters.dateScope === 'all'
                  ? 'All Recorded Dates'
                  : undefined
              }
              onChangeDate={setSelectedDate}
              staffList={allStaffOptions}
              drawerCashInHand={remainingDrawerCash}
              openingCash={currentDayOpeningCash}
            />
          </div>
        )}

        {/* TAB VIEW 2: New Transaction & Morning Opening Float */}
        {(activeTab === 'entry' || activeTab === 'all') && (
          <div className="space-y-5 mb-6 animate-in fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Data Intake Form */}
              <div className="lg:col-span-8">
                <IntakeForm
                  onAddTransaction={handleAddTransaction}
                  staffList={staffList}
                  onAddStaff={handleAddStaff}
                  selectedDate={selectedDate}
                  cashInCount={salesCount}
                  cashOutCount={expensesCount}
                  safeRunningBalance={totalSafeCash}
                  onDeductFromSafe={handleDeductFromSafe}
                  onTransferSafeToIndividual={handleTransferSafeToIndividual}
                />
              </div>

              {/* Direct Opening Balance Slot */}
              <div className="lg:col-span-4">
                <OpeningBalanceCard
                  openingCash={currentDayOpeningCash}
                  onChangeOpeningCash={handleSetOpeningCash}
                  todayCashIn={totalPhysicalCashIn}
                  todayCashOut={totalPhysicalCashOut}
                  expectedDrawerCash={remainingDrawerCash}
                  rawPreTransferDrawerCash={expectedPhysicalDrawer}
                  todayDrawerToSafeHandover={todayDrawerToSafeHandover}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB VIEW 3: Cash Safe & Vault Manager Area */}
        {(activeTab === 'vault' || activeTab === 'all') && (
          <div className="mb-6 animate-in fade-in">
            <CashSafeManager
              safeRunningBalance={safeRunningBalance}
              onChangeSafeRunningBalance={handleSetSafeRunningBalance}
              safeRunningBalanceDate={safeRunningBalanceDate}
              safeRunningBalanceTime={safeRunningBalanceTime}
              onChangeSafeRunningBalanceDate={handleSetSafeRunningBalanceDate}
              safeTransferAmount={safeTransferAmount}
              onChangeSafeTransferAmount={setSafeTransferAmount}
              vaultDeposits={vaultDeposits}
              onAddVaultDeposit={handleAddVaultDeposit}
              onDeleteVaultDeposit={handleDeleteVaultDeposit}
              onConsolidateVaultDeposits={handleConsolidateVaultDeposits}
              expectedDrawerCash={remainingDrawerCash}
              rawPreTransferDrawerCash={expectedPhysicalDrawer}
              todayDrawerToSafeHandover={todayDrawerToSafeHandover}
              openingCash={currentDayOpeningCash}
              selectedDate={selectedDate}
              onCommitTransferToSafe={handleCommitTransferToSafe}
              onTransferDrawerToSafe={handleTransferDrawerToSafe}
              onTransferSafeToDrawer={handleTransferSafeToDrawer}
              onTransferSafeToBank={handleTransferSafeToBank}
              onTransferDrawerToBank={handleTransferDrawerToBank}
              onTransferSafeToIndividual={handleTransferSafeToIndividual}
              staffList={allStaffOptions}
              transactions={transactions}
              dailyDrawerHandovers={dailyDrawerHandovers}
              onDeleteTransaction={handleDeleteTransaction}
              onUpdateTransaction={handleUpdateTransaction}
              onUpdateVaultDeposit={handleUpdateVaultDeposit}
              onShowToast={showToast}
              onReconcileSafeBalance={handleReconcileSafeBalance}
            />
          </div>
        )}

        {/* TAB VIEW 4: Denomination Counter Slip */}
        {(activeTab === 'counter' || activeTab === 'all') && (
          <div className="mb-6 animate-in fade-in">
            <DenominationCounter
              denominations={denominations}
              onChangeDenomination={handleChangeDenomination}
              onReset={handleResetDenominations}
              expectedDrawerCash={remainingDrawerCash}
              openingCash={currentDayOpeningCash}
              onChangeOpeningCash={handleSetOpeningCash}
            />
          </div>
        )}

        {/* TAB VIEW 5: Flow & Analytics Trends */}
        {(activeTab === 'trends' || activeTab === 'all') && (
          <div className="mb-6 animate-in fade-in">
            <StatsOverview
              transactions={transactions}
              openingCash={currentDayOpeningCash}
              onChangeOpeningCash={handleSetOpeningCash}
              selectedDate={selectedDate}
              totalSafeCash={totalSafeCash}
              expectedDrawerCash={remainingDrawerCash}
              rawPreTransferDrawerCash={expectedPhysicalDrawer}
              todayDrawerToSafeHandover={todayDrawerToSafeHandover}
              safeTransferAmount={safeTransferAmount}
              onChangeDate={setSelectedDate}
              onLoadSampleHistory={handleLoadSampleHistory}
            />
          </div>
        )}
      </main>

      {/* Start New Day Rollover Modal */}
      <StartNewDayModal
        isOpen={isStartNewDayOpen}
        onClose={() => setIsStartNewDayOpen(false)}
        currentDate={selectedDate}
        closingDrawerCash={remainingDrawerCash}
        safeRunningBalance={safeRunningBalance}
        onStartNewDay={handleStartNewDay}
      />

      {/* In-App Clear Confirmation Modal */}
      <ClearConfirmModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onClearEverything={handleClearEverything}
        onClearTransactionsOnly={handleClearTransactionsOnly}
        onResetOpeningOnly={handleResetOpeningOnly}
        transactionCount={transactions.length}
        openingCash={currentDayOpeningCash}
        onOpenStartNewDay={() => setIsStartNewDayOpen(true)}
      />

      {/* Comprehensive Data Recovery & Storage Diagnostics Modal */}
      <DataRecoveryModal
        isOpen={isRecoveryModalOpen}
        onClose={() => setIsRecoveryModalOpen(false)}
        transactions={transactions}
        vaultDeposits={vaultDeposits}
        safeRunningBalance={safeRunningBalance}
        safeTransferAmount={safeTransferAmount}
        openingCash={currentDayOpeningCash}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        onViewAllDates={() => setFilters(prev => ({ ...prev, dateScope: 'all', startDate: '', endDate: '' }))}
        onRestoreTransactions={handleRestoreTransactionsFromRecovery}
        onRestoreFullBackup={handleRestoreFullBackupFromRecovery}
        onManualSyncToCloud={handleManualSyncToCloud}
        isCloudSynced={isCloudSynced}
        isSyncing={isSyncing}
      />

      {/* Non-blocking Notification Toast */}
      <NotificationToast
        toast={toast}
        onDismiss={() => setToast(null)}
      />
    </div>
  );
}
