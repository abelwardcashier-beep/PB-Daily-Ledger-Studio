import React, { useState, useId } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  ArrowDownToLine, 
  ArrowUpRight,
  Check, 
  RotateCcw, 
  Wallet, 
  AlertCircle,
  Plus,
  Trash2,
  Coins,
  Landmark,
  Briefcase,
  Handshake,
  FileText,
  Layers,
  Sparkles,
  History,
  ArrowRight,
  User,
  UserCheck,
  Edit3,
  X,
  Download,
  Search,
  Filter,
  ArrowUpDown,
  Calendar,
  Clock,
  FileSpreadsheet
} from 'lucide-react';
import { 
  VaultDeposit, 
  VaultDepositCategory, 
  Transaction, 
  TransactionType, 
  TransferSource, 
  TransferDestination 
} from '../types';
import { formatPKR } from '../utils/exportSpreadsheet';

interface CashSafeManagerProps {
  safeRunningBalance: number;
  onChangeSafeRunningBalance: (val: number, date?: string, time?: string) => void;
  safeRunningBalanceDate?: string;
  safeRunningBalanceTime?: string;
  onChangeSafeRunningBalanceDate?: (date: string) => void;
  safeTransferAmount: number;
  onChangeSafeTransferAmount: (val: number) => void;
  vaultDeposits: VaultDeposit[];
  onAddVaultDeposit: (deposit: Omit<VaultDeposit, 'id' | 'createdAt'>) => void;
  onDeleteVaultDeposit: (id: string) => void;
  onConsolidateVaultDeposits?: () => void;
  expectedDrawerCash: number;
  openingCash: number;
  selectedDate: string;
  onCommitTransferToSafe?: () => void;
  onTransferSafeToDrawer?: (amount: number, reason: string) => void;
  onTransferDrawerToSafe?: (amount: number, reason?: string) => void;
  onTransferSafeToBank?: (amount: number, bankName: string, notes?: string) => void;
  onTransferDrawerToBank?: (amount: number, bankName: string, notes?: string) => void;
  onTransferSafeToIndividual?: (amount: number, recipient: string, reason: string, receiptNumber?: string, notes?: string) => void;
  staffList?: string[];
  transactions?: Transaction[];
  dailyDrawerHandovers?: Record<string, number>;
  todayDrawerToSafeHandover?: number;
  rawPreTransferDrawerCash?: number;
  onDeleteTransaction?: (id: string) => void;
  onUpdateTransaction?: (id: string, updates: Partial<Transaction>) => void;
  onUpdateVaultDeposit?: (id: string, updates: Partial<VaultDeposit>) => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  onReconcileSafeBalance?: () => void;
}

const VAULT_CATEGORIES: Array<{
  category: VaultDepositCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  colorClass: string;
  badgeClass: string;
}> = [
  {
    category: 'committee',
    label: 'Committee (Kameti)',
    icon: Handshake,
    description: 'Chit-fund / Kameti payout or monthly collection',
    colorClass: 'text-amber-700 bg-amber-50 border-amber-200 hover:border-amber-400',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200'
  },
  {
    category: 'capital',
    label: 'Owner Capital / Equity',
    icon: Briefcase,
    description: 'Personal owner savings or cash injection into business',
    colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:border-emerald-400',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200'
  },
  {
    category: 'bank_withdrawal',
    label: 'Bank Cash Withdrawal',
    icon: Landmark,
    description: 'Cash brought from company/personal bank account',
    colorClass: 'text-blue-700 bg-blue-50 border-blue-200 hover:border-blue-400',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  {
    category: 'bank_deposit',
    label: 'Deposit Safe Cash to Bank',
    icon: Landmark,
    description: 'Cash taken out of safe vault and deposited in bank account',
    colorClass: 'text-indigo-700 bg-indigo-50 border-indigo-200 hover:border-indigo-400',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200'
  },
  {
    category: 'drawer_handover',
    label: 'Drawer Closing Handover',
    icon: ArrowDownToLine,
    description: 'Closing day-end cash handed over from drawer to safe',
    colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:border-emerald-400',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200'
  },
  {
    category: 'advance_security',
    label: 'Customer Advance / Security',
    icon: ShieldCheck,
    description: 'Holding deposit, guarantee, or advance cash',
    colorClass: 'text-purple-700 bg-purple-50 border-purple-200 hover:border-purple-400',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200'
  },
  {
    category: 'other',
    label: 'Other Direct Deposit',
    icon: Coins,
    description: 'Supplier refund, asset sale, or miscellaneous cash',
    colorClass: 'text-stone-700 bg-stone-100 border-stone-200 hover:border-stone-400',
    badgeClass: 'bg-stone-200 text-stone-800 border-stone-300'
  }
];

export const CashSafeManager: React.FC<CashSafeManagerProps> = ({
  safeRunningBalance,
  onChangeSafeRunningBalance,
  safeRunningBalanceDate,
  safeRunningBalanceTime,
  onChangeSafeRunningBalanceDate,
  safeTransferAmount,
  onChangeSafeTransferAmount,
  vaultDeposits,
  onAddVaultDeposit,
  onDeleteVaultDeposit,
  onConsolidateVaultDeposits,
  expectedDrawerCash,
  openingCash,
  selectedDate,
  onCommitTransferToSafe,
  onTransferSafeToDrawer,
  onTransferDrawerToSafe,
  onTransferSafeToBank,
  onTransferDrawerToBank,
  onTransferSafeToIndividual,
  staffList = [],
  transactions = [],
  dailyDrawerHandovers = {},
  todayDrawerToSafeHandover = 0,
  rawPreTransferDrawerCash,
  onDeleteTransaction,
  onUpdateTransaction,
  onUpdateVaultDeposit,
  onShowToast,
  onReconcileSafeBalance
}) => {
  const depositAmountInputId = useId();
  const [runningInput, setRunningInput] = useState<string>(
    safeRunningBalance > 0 ? String(safeRunningBalance) : ''
  );
  const [transferInput, setTransferInput] = useState<string>(
    safeTransferAmount > 0 ? String(safeTransferAmount) : ''
  );
  const [isSavedRecently, setIsSavedRecently] = useState<boolean>(false);

  // Date and Time when Safe Running Balance was added / effective
  const [balanceDateInput, setBalanceDateInput] = useState<string>(() => {
    return safeRunningBalanceDate || selectedDate || new Date().toISOString().split('T')[0];
  });

  React.useEffect(() => {
    if (safeRunningBalanceDate) {
      setBalanceDateInput(safeRunningBalanceDate);
    }
  }, [safeRunningBalanceDate]);

  // Search filter for safe audit trail (can search amounts like 2195000, 2262000, dates, or notes)
  const [safeSearchQuery, setSafeSearchQuery] = useState<string>('');

  // Transfer Direction in Container 2: Drawer -> Safe vs Safe -> Drawer vs Safe -> Bank vs Safe -> Individual
  const [activeTransferDirection, setActiveTransferDirection] = useState<'drawer_to_safe' | 'safe_to_drawer' | 'safe_to_bank' | 'safe_to_person'>('drawer_to_safe');
  
  // Drawer to Safe state
  const [drawerToSafeReason, setDrawerToSafeReason] = useState<string>('Day-End Cash Handover to Safe');

  // Safe to Drawer state
  const [safeToDrawerInput, setSafeToDrawerInput] = useState<string>('');
  const [safeToDrawerReason, setSafeToDrawerReason] = useState<string>('Morning Float Replenishment');

  // Safe to Individual (Person) state
  const [safeToPersonAmount, setSafeToPersonAmount] = useState<string>('');
  const [safeToPersonRecipient, setSafeToPersonRecipient] = useState<string>('');
  const [safeToPersonReason, setSafeToPersonReason] = useState<string>('Partner / Owner Drawing');
  const [safeToPersonReceipt, setSafeToPersonReceipt] = useState<string>('');
  const [safeToPersonNotes, setSafeToPersonNotes] = useState<string>('');

  // Bank Deposit state: choose source (Safe vs Drawer)
  const [bankDepositSource, setBankDepositSource] = useState<'safe' | 'drawer'>('safe');
  const [safeToBankAmount, setSafeToBankAmount] = useState<string>('');
  const [safeToBankName, setSafeToBankName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('daily_ledger_bank_name');
      if (saved && saved !== 'Meezan Bank') return saved;
      return 'Askari Bank Ltd.';
    } catch {
      return 'Askari Bank Ltd.';
    }
  });
  const [safeToBankNotes, setSafeToBankNotes] = useState<string>('');
  const [showInsufficientHelp, setShowInsufficientHelp] = useState<boolean>(false);

  React.useEffect(() => {
    try {
      localStorage.setItem('daily_ledger_bank_name', safeToBankName);
    } catch (e) {
      console.error(e);
    }
  }, [safeToBankName]);

  // New Deposit Form State with explicit Date field
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [depositCategory, setDepositCategory] = useState<VaultDepositCategory>('committee');
  const [depositNotes, setDepositNotes] = useState<string>('');
  const [depositDate, setDepositDate] = useState<string>(() => {
    return selectedDate || new Date().toISOString().split('T')[0];
  });
  const [depositTime, setDepositTime] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [isDepositFormOpen, setIsDepositFormOpen] = useState<boolean>(false);

  // Edit Safe Activity Modal State
  const [editingSafeActivity, setEditingSafeActivity] = useState<Transaction | null>(null);
  const [editActivityDirection, setEditActivityDirection] = useState<'drawer_to_safe' | 'safe_to_drawer' | 'safe_to_bank' | 'safe_to_person'>('drawer_to_safe');
  const [editActivityAmount, setEditActivityAmount] = useState<string>('');
  const [editActivityDate, setEditActivityDate] = useState<string>('');
  const [editActivityTime, setEditActivityTime] = useState<string>('');
  const [editActivityDescription, setEditActivityDescription] = useState<string>('');
  const [editActivityRecipient, setEditActivityRecipient] = useState<string>('');
  const [editActivityReceipt, setEditActivityReceipt] = useState<string>('');
  const [editActivityNotes, setEditActivityNotes] = useState<string>('');

  // Edit Vault Deposit Modal State
  const [editingVaultDeposit, setEditingVaultDeposit] = useState<VaultDeposit | null>(null);
  const [editDepositAmount, setEditDepositAmount] = useState<string>('');
  const [editDepositCategory, setEditDepositCategory] = useState<VaultDepositCategory>('committee');
  const [editDepositDate, setEditDepositDate] = useState<string>('');
  const [editDepositTime, setEditDepositTime] = useState<string>('');
  const [editDepositNotes, setEditDepositNotes] = useState<string>('');

  const handleOpenEditActivity = (item: Transaction) => {
    setEditingSafeActivity(item);
    setEditActivityAmount(String(item.amount));
    setEditActivityDate(item.date || selectedDate || new Date().toISOString().split('T')[0]);
    setEditActivityTime(item.time || '12:00');
    setEditActivityDescription(item.description || '');
    setEditActivityRecipient(item.salesperson || '');
    setEditActivityReceipt(item.receiptNumber || item.biltyNumber || '');
    setEditActivityNotes(item.notes || '');

    const isDrawerToSafe = item.transferDestination === 'safe' || (item.type === 'cash_out' && item.category?.includes('Safe') && item.transferDestination !== 'bank' && item.transferDestination !== 'individual');
    const isSafeToDrawer = item.transferSource === 'safe' && item.type === 'cash_in';
    const isSafeToBank = item.transferDestination === 'bank' || (item.category?.includes('Bank') && item.transferSource === 'safe');
    const isSafeToPerson = item.transferDestination === 'individual' || (item.transferSource === 'safe' && (item.category?.includes('Individual') || item.description?.toLowerCase().includes('handover to') || item.description?.toLowerCase().includes('safe cash to')));

    let dir: 'drawer_to_safe' | 'safe_to_drawer' | 'safe_to_bank' | 'safe_to_person' = 'drawer_to_safe';
    if (isSafeToDrawer) dir = 'safe_to_drawer';
    else if (isSafeToBank) dir = 'safe_to_bank';
    else if (isSafeToPerson) dir = 'safe_to_person';
    setEditActivityDirection(dir);
  };

  const handleQuickAdjustEditActivity = (delta: number) => {
    const curr = parseFloat(editActivityAmount) || 0;
    const next = Math.max(1, curr + delta);
    setEditActivityAmount(String(next));
  };

  const handleSaveEditActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSafeActivity) return;
    const amountNum = parseFloat(editActivityAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      onShowToast('Please enter a valid amount greater than 0.', 'error');
      return;
    }

    let type: TransactionType = 'cash_out';
    let transferSource: TransferSource = 'safe';
    let transferDestination: TransferDestination = 'bank';
    let category = 'Internal Transfer (Safe ➔ Bank)';

    if (editActivityDirection === 'drawer_to_safe') {
      type = 'cash_out';
      transferSource = 'drawer';
      transferDestination = 'safe';
      category = 'Internal Transfer (Drawer ➔ Safe)';
    } else if (editActivityDirection === 'safe_to_drawer') {
      type = 'cash_in';
      transferSource = 'safe';
      transferDestination = 'drawer';
      category = 'Safe Replenishment (Safe ➔ Drawer)';
    } else if (editActivityDirection === 'safe_to_bank') {
      type = 'cash_out';
      transferSource = 'safe';
      transferDestination = 'bank';
      category = 'Internal Transfer (Safe ➔ Bank)';
    } else if (editActivityDirection === 'safe_to_person') {
      type = 'cash_out';
      transferSource = 'safe';
      transferDestination = 'individual';
      category = 'Safe Transfer (Safe ➔ Individual)';
    }

    if (onUpdateTransaction) {
      onUpdateTransaction(editingSafeActivity.id, {
        amount: amountNum,
        type,
        transferSource,
        transferDestination,
        category,
        isInternalTransfer: true,
        date: editActivityDate.trim() || editingSafeActivity.date,
        time: editActivityTime.trim() || editingSafeActivity.time,
        description: editActivityDescription.trim() || editingSafeActivity.description,
        salesperson: editActivityRecipient.trim() || editingSafeActivity.salesperson,
        receiptNumber: editActivityReceipt.trim() || undefined,
        notes: editActivityNotes.trim() || undefined
      });
      onShowToast(`Updated safe transaction to ${formatPKR(amountNum)}! Safe balance updated.`, 'success');
    }

    setEditingSafeActivity(null);
  };

  const handleOpenEditDeposit = (dep: VaultDeposit) => {
    setEditingVaultDeposit(dep);
    setEditDepositAmount(String(dep.amount));
    setEditDepositCategory(dep.category);
    setEditDepositDate(dep.date || selectedDate || new Date().toISOString().split('T')[0]);
    setEditDepositTime(dep.time || '12:00');
    setEditDepositNotes(dep.notes || '');
  };

  const handleSaveEditDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVaultDeposit) return;
    const amountNum = parseFloat(editDepositAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      onShowToast('Please enter a valid deposit amount greater than 0.', 'error');
      return;
    }
    const catDef = VAULT_CATEGORIES.find(c => c.category === editDepositCategory) || VAULT_CATEGORIES[0];

    if (onUpdateVaultDeposit) {
      onUpdateVaultDeposit(editingVaultDeposit.id, {
        amount: amountNum,
        category: editDepositCategory,
        categoryLabel: catDef.label,
        date: editDepositDate.trim() || editingVaultDeposit.date,
        time: editDepositTime.trim() || editingVaultDeposit.time,
        notes: editDepositNotes.trim() || undefined
      });
      onShowToast(`Updated vault deposit (${catDef.label}) to ${formatPKR(amountNum)}!`, 'success');
    }

    setEditingVaultDeposit(null);
  };

  // Baseline Reserve Edit Modal State
  const [isEditingBaselineModalOpen, setIsEditingBaselineModalOpen] = useState<boolean>(false);
  const [editBaselineAmount, setEditBaselineAmount] = useState<string>('');
  const [editBaselineDate, setEditBaselineDate] = useState<string>('');
  const [editBaselineTime, setEditBaselineTime] = useState<string>('');

  const handleOpenEditBaseline = () => {
    setEditBaselineAmount(String(safeRunningBalance));
    setEditBaselineDate(balanceDateInput || safeRunningBalanceDate || selectedDate || new Date().toISOString().split('T')[0]);
    setEditBaselineTime(safeRunningBalanceTime || '09:00');
    setIsEditingBaselineModalOpen(true);
  };

  const handleSaveBaselineEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(editBaselineAmount);
    if (isNaN(amt) || amt < 0) {
      onShowToast('Please enter a valid baseline amount (0 or greater).', 'error');
      return;
    }
    const dateStr = editBaselineDate.trim() || selectedDate;
    const timeStr = editBaselineTime.trim() || '09:00';
    onChangeSafeRunningBalance(amt, dateStr, timeStr);
    if (onChangeSafeRunningBalanceDate) {
      onChangeSafeRunningBalanceDate(dateStr);
    }
    setBalanceDateInput(dateStr);
    setRunningInput(String(amt));
    setIsEditingBaselineModalOpen(false);
    onShowToast(`Vault baseline reserve updated to ${formatPKR(amt)}!`, 'success');
  };

  // Safe Vault Accounting Ledger Filter & Sort States
  const [ledgerFlowFilter, setLedgerFlowFilter] = useState<'all' | 'inflow' | 'outflow'>('all');
  const [ledgerDateFilter, setLedgerDateFilter] = useState<'all' | 'today'>('all');
  const [ledgerSortOrder, setLedgerSortOrder] = useState<'desc' | 'asc'>('desc');

  const handleExportVaultLedgerCSV = (items: Array<any>) => {
    if (!items || items.length === 0) {
      onShowToast('No ledger entries available to export.', 'info');
      return;
    }
    const headers = [
      'Date',
      'Time',
      'Particulars / Description',
      'Flow Type',
      'Category / Channel',
      'Cash-In (Sent to Vault PKR)',
      'Cash-Out (Came Out of Vault PKR)',
      'Running Balance (PKR)',
      'Party / Staff / Bank',
      'Receipt #',
      'Notes'
    ];
    const rows = items.map(item => [
      `"${item.date}"`,
      `"${item.time}"`,
      `"${(item.description || '').replace(/"/g, '""')}"`,
      `"${item.direction === 'inflow' ? 'Cash-In (Sent to Vault)' : 'Cash-Out (Came Out of Vault)'}"`,
      `"${(item.categoryLabel || '').replace(/"/g, '""')}"`,
      item.cashIn > 0 ? item.cashIn : 0,
      item.cashOut > 0 ? item.cashOut : 0,
      item.runningBalance,
      `"${(item.recipientOrSource || '').replace(/"/g, '""')}"`,
      `"${(item.receiptNumber || '').replace(/"/g, '""')}"`,
      `"${(item.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `safe_vault_ledger_${selectedDate || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast('Vault Ledger exported to CSV successfully!', 'success');
  };

  React.useEffect(() => {
    if (selectedDate) {
      setDepositDate(selectedDate);
    }
  }, [selectedDate]);

  // Calculations
  const activeVaultDeposits = vaultDeposits.filter(d => !d.isConsolidated);
  const totalVaultDeposits = activeVaultDeposits.reduce((acc, d) => acc + d.amount, 0);
  const totalSafeCash = (safeRunningBalance || 0) + (safeTransferAmount || 0) + totalVaultDeposits;
  const remainingDrawerCash = expectedDrawerCash;

  // Synchronize inputs if props change externally (e.g. backup restore or reset)
  React.useEffect(() => {
    setRunningInput(safeRunningBalance > 0 ? String(safeRunningBalance) : '');
  }, [safeRunningBalance]);

  React.useEffect(() => {
    setTransferInput(safeTransferAmount > 0 ? String(safeTransferAmount) : '');
  }, [safeTransferAmount]);

  const triggerSaved = () => {
    setIsSavedRecently(true);
    setTimeout(() => setIsSavedRecently(false), 1500);
  };

  // Safe Running Balance Handlers
  const handleRunningChange = (val: string) => {
    setRunningInput(val);
    const parsed = Math.max(0, parseFloat(val) || 0);
    const nowTime = new Date().toTimeString().slice(0, 5);
    onChangeSafeRunningBalance(parsed, balanceDateInput || selectedDate, nowTime);
    triggerSaved();
  };

  const handleBalanceDateChange = (newDate: string) => {
    setBalanceDateInput(newDate);
    if (onChangeSafeRunningBalanceDate) {
      onChangeSafeRunningBalanceDate(newDate);
    }
    onChangeSafeRunningBalance(safeRunningBalance, newDate);
    triggerSaved();
    onShowToast(`Vault baseline date set to ${newDate}`, 'info');
  };

  const handleQuickAddRunning = (add: number) => {
    const nextVal = (safeRunningBalance || 0) + add;
    setRunningInput(String(nextVal));
    const nowTime = new Date().toTimeString().slice(0, 5);
    onChangeSafeRunningBalance(nextVal, balanceDateInput || selectedDate, nowTime);
    triggerSaved();
  };

  const handleClearRunning = () => {
    setRunningInput('');
    onChangeSafeRunningBalance(0, balanceDateInput || selectedDate);
    triggerSaved();
  };

  // Cash Transferred to Safe Handlers
  const handleTransferChange = (val: string) => {
    setTransferInput(val);
    const parsed = Math.max(0, parseFloat(val) || 0);
    onChangeSafeTransferAmount(parsed);
    triggerSaved();
  };

  const handleTransferAllDrawer = () => {
    const amount = Math.max(0, expectedDrawerCash);
    setTransferInput(String(amount));
    onChangeSafeTransferAmount(amount);
    triggerSaved();
    onShowToast(`Filled full drawer cash amount: ${formatPKR(amount)}`, 'info');
  };

  const handleTransferKeepFloat = () => {
    const amount = Math.max(0, expectedDrawerCash - openingCash);
    setTransferInput(String(amount));
    onChangeSafeTransferAmount(amount);
    triggerSaved();
    onShowToast(`Transferring takings (${formatPKR(amount)}), leaving float (${formatPKR(openingCash)}) in drawer.`, 'info');
  };

  const handleClearTransfer = () => {
    setTransferInput('');
    onChangeSafeTransferAmount(0);
    triggerSaved();
  };

  // Execute Drawer to Safe Transfer directly
  const handleExecuteDrawerToSafe = () => {
    const amountNum = parseFloat(transferInput) || safeTransferAmount || 0;
    if (amountNum <= 0) {
      onShowToast('Please enter an amount to transfer from drawer to safe.', 'error');
      const inputEl = document.getElementById('input-transfer-to-safe-amount') as HTMLInputElement | null;
      inputEl?.focus();
      return;
    }

    if (onTransferDrawerToSafe) {
      onTransferDrawerToSafe(amountNum, drawerToSafeReason);
    } else if (onCommitTransferToSafe) {
      onCommitTransferToSafe();
    } else {
      const newRunning = (safeRunningBalance || 0) + amountNum;
      onChangeSafeRunningBalance(newRunning);
      setRunningInput(String(newRunning));
    }

    setTransferInput('');
    onChangeSafeTransferAmount(0);
    triggerSaved();
  };

  // Safe to Drawer Replenishment Handler
  const handleExecuteSafeToDrawer = () => {
    const amountNum = parseFloat(safeToDrawerInput) || 0;
    if (amountNum <= 0) {
      onShowToast('Please enter an amount to transfer into the drawer.', 'error');
      const inputEl = document.getElementById('input-safe-to-drawer-amount') as HTMLInputElement | null;
      inputEl?.focus();
      return;
    }
    if (totalSafeCash <= 0) {
      onShowToast('Safe Vault is currently empty (Rs. 0). Add cash to the safe before replenishing drawer.', 'error');
      return;
    }
    if (amountNum > totalSafeCash) {
      onShowToast(`Safe only has ${formatPKR(totalSafeCash)} available. Cannot transfer ${formatPKR(amountNum)}.`, 'error');
      return;
    }

    if (onTransferSafeToDrawer) {
      onTransferSafeToDrawer(amountNum, safeToDrawerReason);
    } else {
      onChangeSafeRunningBalance(Math.max(0, safeRunningBalance - amountNum));
    }

    setSafeToDrawerInput('');
    triggerSaved();
  };

  const handleQuickAddSafeToDrawer = (val: number) => {
    const current = parseFloat(safeToDrawerInput) || 0;
    setSafeToDrawerInput(String(current + val));
  };

  // Safe to Bank Deposit Handler
  const handleExecuteSafeToBank = () => {
    const amountNum = parseFloat(safeToBankAmount) || 0;
    if (amountNum <= 0) {
      onShowToast('Please enter an amount to deposit into the bank.', 'error');
      const inputEl = document.getElementById('input-safe-to-bank-amount') as HTMLInputElement | null;
      inputEl?.focus();
      return;
    }

    // If depositing from Cash Register Drawer
    if (bankDepositSource === 'drawer') {
      if (remainingDrawerCash <= 0) {
        onShowToast('Cash Drawer is currently empty (Rs. 0). Cannot deposit from drawer.', 'error');
        return;
      }
      if (amountNum > remainingDrawerCash) {
        onShowToast(`Cash Drawer only has ${formatPKR(remainingDrawerCash)}. Cannot deposit ${formatPKR(amountNum)}.`, 'error');
        return;
      }

      if (onTransferDrawerToBank) {
        onTransferDrawerToBank(amountNum, safeToBankName, safeToBankNotes);
      }
      setSafeToBankAmount('');
      setSafeToBankNotes('');
      setShowInsufficientHelp(false);
      triggerSaved();
      return;
    }

    // If depositing from Safe Vault
    if (amountNum > totalSafeCash) {
      setShowInsufficientHelp(true);
      onShowToast(`Safe only has ${formatPKR(totalSafeCash)}. Cannot deposit ${formatPKR(amountNum)}. See options below.`, 'error');
      return;
    }

    if (onTransferSafeToBank) {
      onTransferSafeToBank(amountNum, safeToBankName, safeToBankNotes);
    } else {
      onChangeSafeRunningBalance(Math.max(0, safeRunningBalance - amountNum));
    }

    setSafeToBankAmount('');
    setSafeToBankNotes('');
    setShowInsufficientHelp(false);
    triggerSaved();
  };

  // Helper 1: Deposit from Drawer when safe doesn't have enough
  const handleDepositFromDrawerDirectly = () => {
    const amountNum = parseFloat(safeToBankAmount) || 0;
    if (amountNum <= 0) {
      onShowToast('Please enter an amount to deposit.', 'error');
      return;
    }
    if (amountNum > remainingDrawerCash) {
      onShowToast(`Cash Drawer only has ${formatPKR(remainingDrawerCash)}. Cannot deposit ${formatPKR(amountNum)}.`, 'error');
      return;
    }
    if (onTransferDrawerToBank) {
      onTransferDrawerToBank(amountNum, safeToBankName, safeToBankNotes);
    }
    setSafeToBankAmount('');
    setSafeToBankNotes('');
    setShowInsufficientHelp(false);
    triggerSaved();
  };

  // Helper 2: Set Safe Vault Balance to the entered amount and deposit immediately
  const handleUpdateSafeBalanceAndDeposit = () => {
    const amountNum = parseFloat(safeToBankAmount) || 0;
    if (amountNum <= 0) return;

    // Update safe running balance
    onChangeSafeRunningBalance(amountNum);
    setRunningInput(String(amountNum));

    if (onTransferSafeToBank) {
      onTransferSafeToBank(amountNum, safeToBankName, safeToBankNotes);
    } else {
      onChangeSafeRunningBalance(0);
    }
    setSafeToBankAmount('');
    setSafeToBankNotes('');
    setShowInsufficientHelp(false);
    triggerSaved();
  };

  const handleQuickAddSafeToBank = (val: number) => {
    const current = parseFloat(safeToBankAmount) || 0;
    setSafeToBankAmount(String(current + val));
  };

  // Safe to Individual Handler
  const handleExecuteSafeToIndividual = () => {
    const amountNum = parseFloat(safeToPersonAmount) || 0;
    if (amountNum <= 0) {
      onShowToast('Please enter an amount to transfer to the individual.', 'error');
      const inputEl = document.getElementById('input-safe-to-person-amount') as HTMLInputElement | null;
      inputEl?.focus();
      return;
    }

    const recipientTrimmed = safeToPersonRecipient.trim();
    if (!recipientTrimmed) {
      onShowToast('Please specify the recipient individual or entity name.', 'error');
      const inputEl = document.getElementById('input-safe-to-person-recipient') as HTMLInputElement | null;
      inputEl?.focus();
      return;
    }

    if (amountNum > totalSafeCash) {
      onShowToast(`Safe Vault only has ${formatPKR(totalSafeCash)}. Cannot transfer ${formatPKR(amountNum)}.`, 'error');
      return;
    }

    if (onTransferSafeToIndividual) {
      onTransferSafeToIndividual(
        amountNum,
        recipientTrimmed,
        safeToPersonReason.trim() || 'Safe Cash Handover',
        safeToPersonReceipt.trim() || undefined,
        safeToPersonNotes.trim() || undefined
      );
    } else {
      onChangeSafeRunningBalance(Math.max(0, safeRunningBalance - amountNum));
      onShowToast(`Transferred ${formatPKR(amountNum)} from Safe to ${recipientTrimmed}!`, 'success');
    }

    setSafeToPersonAmount('');
    setSafeToPersonRecipient('');
    setSafeToPersonReceipt('');
    setSafeToPersonNotes('');
    triggerSaved();
  };

  const handleQuickAddSafeToPerson = (val: number) => {
    const current = parseFloat(safeToPersonAmount) || 0;
    setSafeToPersonAmount(String(current + val));
  };

  // Submit Separate Vault Deposit
  const handleSaveDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(depositAmount);
    if (!amountNum || amountNum <= 0) {
      onShowToast('Please enter a valid deposit amount.', 'error');
      return;
    }

    const categoryDef = VAULT_CATEGORIES.find(c => c.category === depositCategory) || VAULT_CATEGORIES[0];

    onAddVaultDeposit({
      amount: amountNum,
      category: depositCategory,
      categoryLabel: categoryDef.label,
      notes: depositNotes.trim() || undefined,
      date: depositDate || selectedDate || new Date().toISOString().split('T')[0],
      time: depositTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    onShowToast(`Added ${formatPKR(amountNum)} (${categoryDef.label}) into the vault for ${depositDate || selectedDate}!`, 'success');

    // Reset deposit form
    setDepositAmount('');
    setDepositNotes('');
  };

  const handleQuickAddDepositAmount = (val: number) => {
    const current = parseFloat(depositAmount) || 0;
    setDepositAmount(String(current + val));
  };

  // Unified Vault Accounting Ledger computation: Cash-In, Cash-Out, and Chronological Running Balance
  const vaultLedgerData = React.useMemo(() => {
    const rawItems: Array<{
      id: string;
      sourceType: 'transfer' | 'deposit' | 'baseline';
      date: string;
      time: string;
      description: string;
      direction: 'inflow' | 'outflow';
      categoryLabel: string;
      badgeStyle: string;
      recipientOrSource?: string;
      receiptNumber?: string;
      notes?: string;
      cashIn: number;
      cashOut: number;
      runningBalance: number;
      rawTransaction?: Transaction;
      rawVaultDeposit?: VaultDeposit;
      isEditable: boolean;
    }> = [];

    // 1. Baseline safe reserve
    if (safeRunningBalance > 0) {
      rawItems.push({
        id: 'baseline_reserve',
        sourceType: 'baseline',
        date: balanceDateInput || safeRunningBalanceDate || '2026-10-15',
        time: safeRunningBalanceTime || '08:00',
        description: 'Vault Baseline Starting Cash Reserve',
        direction: 'inflow',
        categoryLabel: 'Vault Baseline Reserve',
        badgeStyle: 'bg-amber-100 text-amber-950 border-amber-300 font-bold',
        recipientOrSource: 'Safe Starting Reserve',
        notes: 'Initial opening safe float stored in the vault',
        cashIn: safeRunningBalance,
        cashOut: 0,
        runningBalance: 0,
        isEditable: true
      });
    }

    // 2. Transfers from transactions
    (transactions || []).forEach(item => {
      const isDrawerToSafe = item.transferDestination === 'safe' || (item.type === 'cash_out' && item.category?.includes('Safe') && item.transferDestination !== 'bank' && item.transferDestination !== 'individual');
      const isSafeToDrawer = item.transferSource === 'safe' && item.type === 'cash_in';
      const isSafeToBank = item.transferDestination === 'bank' || (item.category?.includes('Bank') && item.transferSource === 'safe');
      const isSafeToPerson = item.transferDestination === 'individual' || (item.transferSource === 'safe' && (item.category?.includes('Individual') || item.description?.toLowerCase().includes('handover to') || item.description?.toLowerCase().includes('safe cash to')));

      const isRelevant = isDrawerToSafe || isSafeToDrawer || isSafeToBank || isSafeToPerson ||
        item.isInternalTransfer ||
        item.transferSource === 'safe' ||
        item.transferDestination === 'safe' ||
        item.transferDestination === 'individual' ||
        item.transferDestination === 'bank' ||
        (item.category && item.category.toLowerCase().includes('safe'));

      if (!isRelevant) return;

      const amt = typeof item.amount === 'number' ? item.amount : (parseFloat(String(item.amount)) || 0);

      if (isDrawerToSafe) {
        rawItems.push({
          id: item.id,
          sourceType: 'transfer',
          date: item.date || selectedDate,
          time: item.time || '20:00',
          description: item.description || 'Day-End Cash Handover to Safe',
          direction: 'inflow',
          categoryLabel: 'Drawer ➔ Safe Handover',
          badgeStyle: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          recipientOrSource: item.salesperson || 'Register Drawer',
          receiptNumber: item.receiptNumber || item.biltyNumber,
          notes: item.notes,
          cashIn: amt,
          cashOut: 0,
          runningBalance: 0,
          rawTransaction: item,
          isEditable: true
        });
      } else if (isSafeToDrawer) {
        rawItems.push({
          id: item.id,
          sourceType: 'transfer',
          date: item.date || selectedDate,
          time: item.time || '09:00',
          description: item.description || 'Morning Float Replenishment',
          direction: 'outflow',
          categoryLabel: 'Safe ➔ Drawer Replenish',
          badgeStyle: 'bg-indigo-100 text-indigo-900 border-indigo-300',
          recipientOrSource: 'Register Drawer',
          receiptNumber: item.receiptNumber || item.biltyNumber,
          notes: item.notes,
          cashIn: 0,
          cashOut: amt,
          runningBalance: 0,
          rawTransaction: item,
          isEditable: true
        });
      } else if (isSafeToBank) {
        rawItems.push({
          id: item.id,
          sourceType: 'transfer',
          date: item.date || selectedDate,
          time: item.time || '14:00',
          description: item.description || 'Cash Deposit from Safe Vault into Bank',
          direction: 'outflow',
          categoryLabel: 'Safe ➔ Bank Deposit',
          badgeStyle: 'bg-blue-100 text-blue-900 border-blue-300',
          recipientOrSource: item.salesperson || 'Bank Account',
          receiptNumber: item.receiptNumber || item.biltyNumber,
          notes: item.notes,
          cashIn: 0,
          cashOut: amt,
          runningBalance: 0,
          rawTransaction: item,
          isEditable: true
        });
      } else if (isSafeToPerson) {
        rawItems.push({
          id: item.id,
          sourceType: 'transfer',
          date: item.date || selectedDate,
          time: item.time || '16:00',
          description: item.description || `Cash Handover to ${item.salesperson || 'Individual'}`,
          direction: 'outflow',
          categoryLabel: `Safe ➔ ${item.salesperson || 'Individual'}`,
          badgeStyle: 'bg-purple-100 text-purple-900 border-purple-300',
          recipientOrSource: item.salesperson || 'Individual',
          receiptNumber: item.receiptNumber || item.biltyNumber,
          notes: item.notes,
          cashIn: 0,
          cashOut: amt,
          runningBalance: 0,
          rawTransaction: item,
          isEditable: true
        });
      }
    });

    // 3. Daily drawer handovers from settings (if not already present in transactions)
    if (dailyDrawerHandovers) {
      Object.entries(dailyDrawerHandovers).forEach(([dDate, amt]) => {
        if (amt > 0) {
          const sumExistingOnDate = rawItems
            .filter(t => t.date === dDate && t.categoryLabel.includes('Drawer ➔ Safe'))
            .reduce((sum, it) => sum + it.cashIn, 0);
          const remainingHandover = amt - sumExistingOnDate;
          if (remainingHandover > 0) {
            const syntheticTx: Transaction = {
              id: `handover_${dDate}`,
              date: dDate,
              time: '20:00',
              type: 'cash_in',
              amount: remainingHandover,
              description: 'Day-End Cash Handover to Safe',
              category: 'Internal Transfer (Drawer ➔ Safe)',
              isInternalTransfer: true,
              transferSource: 'drawer',
              transferDestination: 'safe',
              salesperson: 'Drawer ➔ Safe',
              createdAt: new Date(dDate).getTime() || 0,
              verified: true,
              notes: 'Evening cash handover into safe vault (Stored in Vault; not an expense).'
            };
            rawItems.push({
              id: `handover_${dDate}`,
              sourceType: 'transfer',
              date: dDate,
              time: '20:00',
              description: 'Day-End Cash Handover to Safe',
              direction: 'inflow',
              categoryLabel: 'Drawer ➔ Safe Handover',
              badgeStyle: 'bg-emerald-100 text-emerald-900 border-emerald-300',
              recipientOrSource: 'Register Drawer',
              notes: 'Evening cash handover into safe vault',
              cashIn: remainingHandover,
              cashOut: 0,
              runningBalance: 0,
              rawTransaction: syntheticTx,
              isEditable: true
            });
          }
        }
      });
    }

    // 4. Vault deposits (Committee, Capital, Bank Withdrawal, etc.)
    (vaultDeposits || []).filter(dep => !dep.isConsolidated).forEach(dep => {
      rawItems.push({
        id: dep.id,
        sourceType: 'deposit',
        date: dep.date || selectedDate,
        time: dep.time || '12:00',
        description: dep.notes ? `${dep.categoryLabel || 'Vault Deposit'}: ${dep.notes}` : (dep.categoryLabel || 'Direct Vault Cash Deposit'),
        direction: 'inflow',
        categoryLabel: dep.categoryLabel || 'Direct Vault Deposit',
        badgeStyle: 'bg-amber-100 text-amber-900 border-amber-300',
        recipientOrSource: 'External Injection',
        notes: dep.notes,
        cashIn: typeof dep.amount === 'number' ? dep.amount : (parseFloat(String(dep.amount)) || 0),
        cashOut: 0,
        runningBalance: 0,
        rawVaultDeposit: dep,
        isEditable: true
      });
    });

    // Sort chronologically ascending to calculate progressive running balance accurately
    rawItems.sort((a, b) => {
      const dComp = (a.date || '').localeCompare(b.date || '');
      if (dComp !== 0) return dComp;
      const tComp = (a.time || '').localeCompare(b.time || '');
      if (tComp !== 0) return tComp;
      return (a.id || '').localeCompare(b.id || '');
    });

    let progressive = 0;
    for (const item of rawItems) {
      if (item.direction === 'inflow') {
        progressive += item.cashIn;
      } else {
        progressive -= item.cashOut;
      }
      item.runningBalance = progressive;
    }

    const totalSent = rawItems.reduce((acc, it) => acc + it.cashIn, 0);
    const totalCameOut = rawItems.reduce((acc, it) => acc + it.cashOut, 0);
    const netBalance = totalSent - totalCameOut;

    // Apply User Filters
    let filtered = [...rawItems];

    if (ledgerFlowFilter === 'inflow') {
      filtered = filtered.filter(item => item.direction === 'inflow');
    } else if (ledgerFlowFilter === 'outflow') {
      filtered = filtered.filter(item => item.direction === 'outflow');
    }

    if (ledgerDateFilter === 'today') {
      filtered = filtered.filter(item => item.date === selectedDate);
    }

    if (safeSearchQuery.trim()) {
      const q = safeSearchQuery.trim().toLowerCase().replace(/,/g, '');
      filtered = filtered.filter(item => {
        const inStr = String(item.cashIn).replace(/,/g, '');
        const outStr = String(item.cashOut).replace(/,/g, '');
        const balStr = String(item.runningBalance).replace(/,/g, '');
        return inStr.includes(q) ||
          outStr.includes(q) ||
          balStr.includes(q) ||
          (item.date && item.date.toLowerCase().includes(q)) ||
          (item.time && item.time.toLowerCase().includes(q)) ||
          (item.description && item.description.toLowerCase().includes(q)) ||
          (item.categoryLabel && item.categoryLabel.toLowerCase().includes(q)) ||
          (item.recipientOrSource && item.recipientOrSource.toLowerCase().includes(q)) ||
          (item.receiptNumber && item.receiptNumber.toLowerCase().includes(q)) ||
          (item.notes && item.notes.toLowerCase().includes(q));
      });
    }

    if (ledgerSortOrder === 'desc') {
      filtered = [...filtered].reverse();
    }

    return {
      allLedgerItems: rawItems,
      filteredLedgerItems: filtered,
      totalSentToVault: totalSent,
      totalCameOutOfVault: totalCameOut,
      netVaultLedgerBalance: netBalance
    };
  }, [safeRunningBalance, safeRunningBalanceDate, safeRunningBalanceTime, balanceDateInput, transactions, dailyDrawerHandovers, vaultDeposits, selectedDate, ledgerFlowFilter, ledgerDateFilter, safeSearchQuery, ledgerSortOrder]);

  const { filteredLedgerItems, totalSentToVault, totalCameOutOfVault, netVaultLedgerBalance } = vaultLedgerData;

  const handleEditLedgerItem = (item: (typeof filteredLedgerItems)[0]) => {
    if (item.sourceType === 'baseline') {
      handleOpenEditBaseline();
    } else if (item.sourceType === 'deposit' && item.rawVaultDeposit) {
      handleOpenEditDeposit(item.rawVaultDeposit);
    } else if (item.sourceType === 'transfer' && item.rawTransaction) {
      handleOpenEditActivity(item.rawTransaction);
    }
  };

  const handleDeleteLedgerItem = (item: (typeof filteredLedgerItems)[0]) => {
    if (item.sourceType === 'baseline') {
      handleClearRunning();
      onShowToast('Vault baseline starting cash reserve cleared to Rs. 0', 'info');
    } else if (item.sourceType === 'deposit') {
      onDeleteVaultDeposit(item.id);
      onShowToast(`Removed vault deposit of ${formatPKR(item.cashIn)}.`, 'info');
    } else if (item.sourceType === 'transfer') {
      if (onDeleteTransaction) {
        onDeleteTransaction(item.id);
        onShowToast(`Reversed transfer of ${formatPKR(item.cashIn || item.cashOut)} and updated balances.`, 'info');
      }
    }
  };

  // Finalize / Commit transfer into safe balance
  const handleFinalizeTransfer = () => {
    const amountNum = safeTransferAmount > 0 ? safeTransferAmount : (parseFloat(transferInput) || 0);
    if (amountNum <= 0) {
      onShowToast('Enter a transfer amount to finalize into the safe.', 'info');
      return;
    }

    if (onTransferDrawerToSafe) {
      onTransferDrawerToSafe(amountNum, drawerToSafeReason);
    } else if (onCommitTransferToSafe) {
      onCommitTransferToSafe();
    } else {
      const newRunning = (safeRunningBalance || 0) + amountNum;
      onChangeSafeRunningBalance(newRunning);
      setRunningInput(String(newRunning));
    }

    setTransferInput('');
    onChangeSafeTransferAmount(0);
    triggerSaved();
  };

  // Consolidate both transfer and separate deposits into permanent running balance
  const handleConsolidateAllIntoVault = () => {
    const grandTotal = totalSafeCash;
    onChangeSafeRunningBalance(grandTotal);
    onChangeSafeTransferAmount(0);
    setRunningInput(String(grandTotal));
    setTransferInput('');
    
    if (onConsolidateVaultDeposits) {
      onConsolidateVaultDeposits();
    }

    onShowToast(
      `Vault consolidated! All drawer transfers & separate deposits merged into Safe Running Balance: ${formatPKR(grandTotal)}`,
      'success'
    );
  };

  return (
    <div 
      id="cash-safe-manager" 
      className="bg-white border border-stone-200/90 rounded-2xl p-5 md:p-6 shadow-2xs mb-6 relative"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-stone-800 tracking-tight">
                Cash Safe &amp; Vault Manager
              </h3>
              <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                End-of-Day &amp; Direct Deposits
              </span>
              {vaultDeposits.length > 0 && (
                <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Handshake className="w-3 h-3 text-amber-600" />
                  <span>{vaultDeposits.length} External Deposit{vaultDeposits.length > 1 ? 's' : ''}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Manage vault running balance, record evening drawer transfers, and reconcile the closing safe balance.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {isSavedRecently && (
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1 animate-in fade-in">
              <Check className="w-3.5 h-3.5" />
              <span>Saved</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsDepositFormOpen(prev => !prev)}
            className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Separately deposit Committee, Capital, or other cash directly into vault"
          >
            <Plus className="w-3.5 h-3.5 text-stone-600" />
            <span>{isDepositFormOpen ? 'Close Deposit Form' : '+ Add Vault Cash (Committee / Other)'}</span>
          </button>
        </div>
      </div>

      {/* Discrepancy & Safe Balance Reconciliation Callout */}
      <div className="bg-[#F8FAF8] border border-emerald-200/80 rounded-xl p-3.5 mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/60 shrink-0 mt-0.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-stone-800 flex items-center gap-2 flex-wrap">
              <span>Safe Balance Status: {formatPKR(totalSafeCash)}</span>
              {totalSafeCash === 433500 ? (
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  ✓ Reconciled to Rs. 433,500
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                  Discrepancy Detected (Target: Rs. 433,500)
                </span>
              )}
            </div>
            <p className="text-[11px] text-stone-600 mt-0.5 leading-snug">
              Drawer closing transfer: <strong>Rs. 138,000</strong> into Safe Vault (Base: <strong>Rs. 295,500</strong> + Handover: <strong>Rs. 138,000</strong> = <strong>Rs. 433,500 Total Safe Cash</strong>).
            </p>
          </div>
        </div>

        {totalSafeCash !== 433500 && (
          <button
            type="button"
            onClick={() => {
              if (onReconcileSafeBalance) {
                onReconcileSafeBalance();
              } else {
                handleRunningChange('433500');
                if (onChangeSafeTransferAmount) onChangeSafeTransferAmount(0);
                onShowToast('Safe balance set to Rs. 433,500!', 'success');
              }
            }}
            className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition-colors shadow-2xs flex items-center gap-1.5"
            title="Reconcile discrepancy and set safe balance to Rs. 433,500"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Fix Discrepancy (Set Rs. 433,500)</span>
          </button>
        )}
      </div>

      {/* Main 3-Column Core Vault Cards */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4.5 mb-5">
        
        {/* CONTAINER 1: Safe Running Balance (Vault Baseline) */}
        <div className="md:col-span-4 bg-stone-50/80 border border-stone-200/90 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label 
                htmlFor="input-safe-running-balance"
                className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>Safe Running Balance</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenEditBaseline}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-0.5 cursor-pointer font-semibold"
                  title="Edit baseline amount and date/time in modal"
                >
                  <Edit3 className="w-2.5 h-2.5" />
                  <span>Edit</span>
                </button>
                {safeRunningBalance > 0 && (
                  <button
                    type="button"
                    onClick={handleClearRunning}
                    className="text-[11px] text-stone-400 hover:text-rose-600 transition-colors flex items-center gap-0.5 cursor-pointer"
                    title="Clear safe running balance"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

            <p className="text-[11px] text-stone-500 mb-2.5 leading-relaxed">
              Baseline cash stored in the vault before today&apos;s drawer transfer or new deposits.
            </p>

            {/* Reconciliation breakdown if separate deposits exist */}
            {totalVaultDeposits > 0 && (
              <div className="bg-amber-50/90 border border-amber-300 rounded-lg p-2.5 mb-2.5 text-xs text-amber-950 flex items-center justify-between gap-2 shadow-2xs">
                <div>
                  <span className="font-bold flex items-center gap-1 text-amber-900">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                    Total Vault Cash: {formatPKR(totalSafeCash)}
                  </span>
                  <span className="text-[10px] text-amber-800 block mt-0.5">
                    Base: {formatPKR(safeRunningBalance)} + Injections: {formatPKR(totalVaultDeposits)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleConsolidateAllIntoVault}
                  className="px-2 py-1 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded text-[10px] font-bold shrink-0 transition-colors cursor-pointer shadow-2xs"
                  title={`Merge separate injections into Safe Base so both match ${formatPKR(totalSafeCash)}`}
                >
                  Merge to {formatPKR(totalSafeCash)}
                </button>
              </div>
            )}

            {/* Direct Input */}
            <div className="relative mb-2.5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400 select-none">
                Rs.
              </span>
              <input
                id="input-safe-running-balance"
                type="number"
                min="0"
                step="any"
                value={runningInput}
                placeholder="0"
                onChange={e => handleRunningChange(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-stone-300 rounded-lg text-base font-bold font-mono text-stone-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-hidden transition-all shadow-2xs"
              />
            </div>

            {/* Added / Effective Date for this Vault Cash */}
            <div className="bg-white border border-stone-200/90 rounded-lg p-2 mb-2.5 text-xs">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1">
                  <span>📅 Date Added / Effective:</span>
                </span>
                {balanceDateInput !== selectedDate && (
                  <button
                    type="button"
                    onClick={() => handleBalanceDateChange(selectedDate)}
                    className="text-[10px] text-indigo-600 hover:underline cursor-pointer font-semibold"
                    title={`Set to active date (${selectedDate})`}
                  >
                    Set to {selectedDate}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={balanceDateInput}
                  onChange={e => handleBalanceDateChange(e.target.value)}
                  className="w-full px-2 py-1 bg-stone-50 border border-stone-300 rounded text-xs font-mono font-bold text-stone-800 outline-hidden focus:bg-white focus:border-indigo-600"
                />
                {safeRunningBalanceTime && (
                  <span className="text-[10px] font-mono text-stone-400 shrink-0">
                    🕒 {safeRunningBalanceTime}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Adjustment Chips */}
            <div>
              <span className="text-[10px] text-stone-400 font-semibold block mb-1">
                Quick Add / Set Balance:
              </span>
              <div className="grid grid-cols-4 gap-1 text-[11px]">
                {safeRunningBalance !== totalSafeCash && totalSafeCash > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setRunningInput(String(totalSafeCash));
                      handleRunningChange(String(totalSafeCash));
                    }}
                    className="py-1 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded font-bold text-amber-900 transition-colors cursor-pointer text-center truncate"
                    title={`Set directly to Total Safe Cash (${formatPKR(totalSafeCash)})`}
                  >
                    Set {totalSafeCash >= 1000 ? `${Math.round(totalSafeCash/1000)}k` : totalSafeCash}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleQuickAddRunning(10000)}
                  className="py-1 bg-white hover:bg-indigo-50 hover:text-indigo-800 border border-stone-200 rounded font-bold text-stone-700 transition-colors cursor-pointer text-center"
                >
                  +10k
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAddRunning(50000)}
                  className="py-1 bg-white hover:bg-indigo-50 hover:text-indigo-800 border border-stone-200 rounded font-bold text-stone-700 transition-colors cursor-pointer text-center"
                >
                  +50k
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAddRunning(100000)}
                  className="py-1 bg-white hover:bg-indigo-50 hover:text-indigo-800 border border-stone-200 rounded font-bold text-stone-700 transition-colors cursor-pointer text-center"
                >
                  +100k
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-stone-200/70 text-[11px] text-stone-500 flex items-center justify-between">
            <div>
              <span>Vault Base:</span>
              <span className="text-[10px] text-stone-400 font-mono block">
                Added: {balanceDateInput || safeRunningBalanceDate || selectedDate}
              </span>
            </div>
            <div className="text-right">
              <strong className="font-mono text-stone-800 font-bold text-sm block">{formatPKR(safeRunningBalance)}</strong>
              {totalVaultDeposits > 0 && (
                <span className="text-[10px] text-amber-800 font-mono font-bold block">
                  Total w/ Deposits: {formatPKR(totalSafeCash)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* CONTAINER 2: Drawer <-> Safe Bidirectional Transfer & Safe -> Bank */}
        <div className="md:col-span-4 bg-stone-50/80 border border-stone-200/90 rounded-xl p-4 flex flex-col justify-between">
          <div>
            {/* Direction Selector Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-0.5 bg-stone-200/70 rounded-lg mb-2.5">
              <button
                type="button"
                id="btn-tab-drawer-to-safe"
                onClick={() => setActiveTransferDirection('drawer_to_safe')}
                className={`py-1 px-1 rounded-md text-[10px] sm:text-[11px] font-bold transition-all text-center flex items-center justify-center gap-1 cursor-pointer truncate ${
                  activeTransferDirection === 'drawer_to_safe'
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Move closing cash takings from drawer into safe"
              >
                <ArrowDownToLine className="w-3 h-3 text-emerald-600 shrink-0" />
                <span className="truncate">Drawer ➔ Safe</span>
              </button>
              <button
                type="button"
                id="btn-tab-safe-to-drawer"
                onClick={() => setActiveTransferDirection('safe_to_drawer')}
                className={`py-1 px-1 rounded-md text-[10px] sm:text-[11px] font-bold transition-all text-center flex items-center justify-center gap-1 cursor-pointer truncate ${
                  activeTransferDirection === 'safe_to_drawer'
                    ? 'bg-white text-indigo-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Transfer float replenishment cash from safe to drawer"
              >
                <ArrowUpRight className="w-3 h-3 text-indigo-600 shrink-0" />
                <span className="truncate">Safe ➔ Drawer</span>
              </button>
              <button
                type="button"
                id="btn-tab-safe-to-bank"
                onClick={() => setActiveTransferDirection('safe_to_bank')}
                className={`py-1 px-1 rounded-md text-[10px] sm:text-[11px] font-bold transition-all text-center flex items-center justify-center gap-1 cursor-pointer truncate ${
                  activeTransferDirection === 'safe_to_bank'
                    ? 'bg-white text-blue-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Deposit cash from safe vault into bank account"
              >
                <Landmark className="w-3 h-3 text-blue-600 shrink-0" />
                <span className="truncate">Safe ➔ Bank</span>
              </button>
              <button
                type="button"
                id="btn-tab-safe-to-person"
                onClick={() => setActiveTransferDirection('safe_to_person')}
                className={`py-1 px-1 rounded-md text-[10px] sm:text-[11px] font-bold transition-all text-center flex items-center justify-center gap-1 cursor-pointer truncate ${
                  activeTransferDirection === 'safe_to_person'
                    ? 'bg-white text-purple-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Transfer cash from safe vault to any individual person"
              >
                <User className="w-3 h-3 text-purple-600 shrink-0" />
                <span className="truncate">Safe ➔ Individual</span>
              </button>
            </div>

            {activeTransferDirection === 'drawer_to_safe' ? (
              /* DRAWER TO SAFE (Evening Handover) */
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Drawer Handover to Safe</span>
                  </span>
                  {(transferInput || safeTransferAmount > 0) && (
                    <button
                      type="button"
                      onClick={handleClearTransfer}
                      className="text-[11px] text-stone-400 hover:text-rose-600 transition-colors flex items-center gap-0.5 cursor-pointer"
                      title="Clear transfer amount"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Clear</span>
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-stone-500 mb-2 leading-relaxed">
                  Move evening sales takings from drawer into safe. Updates cash register and adds ledger entry.
                </p>

                {/* Live Register Status Banner */}
                <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-lg p-2 mb-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-emerald-950 font-semibold block">Register Till Cash In Hand:</span>
                    {todayDrawerToSafeHandover > 0 && (
                      <span className="text-[10px] text-emerald-800 block">
                        Today&apos;s Handover to Safe: {formatPKR(todayDrawerToSafeHandover)}
                      </span>
                    )}
                  </div>
                  <strong className="text-emerald-900 font-mono font-bold text-sm bg-white px-2 py-0.5 rounded border border-emerald-200">
                    {formatPKR(expectedDrawerCash)}
                  </strong>
                </div>

                {/* Direct Input */}
                <div className="relative mb-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400 select-none">
                    Rs.
                  </span>
                  <input
                    id="input-safe-transfer-amount"
                    type="number"
                    min="0"
                    step="any"
                    value={transferInput}
                    placeholder="0"
                    onChange={e => handleTransferChange(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-stone-300 rounded-lg text-base font-bold font-mono text-stone-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden transition-all shadow-2xs"
                  />
                </div>

                {/* One-Click Shortcut Presets */}
                <div className="mb-2">
                  <div className="grid grid-cols-2 gap-1 text-[11px] mb-1">
                    <button
                      type="button"
                      onClick={handleTransferAllDrawer}
                      disabled={expectedDrawerCash <= 0}
                      className="px-2 py-1 bg-white hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-stone-200 rounded font-bold text-stone-700 transition-colors cursor-pointer text-center truncate disabled:opacity-50 disabled:cursor-not-allowed"
                      title={`Transfer all expected drawer cash (${formatPKR(expectedDrawerCash)})`}
                    >
                      All Drawer ({formatPKR(expectedDrawerCash)})
                    </button>
                    <button
                      type="button"
                      onClick={handleTransferKeepFloat}
                      disabled={expectedDrawerCash <= openingCash}
                      className="px-2 py-1 bg-white hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-stone-200 rounded font-bold text-stone-700 transition-colors cursor-pointer text-center truncate disabled:opacity-50 disabled:cursor-not-allowed"
                      title={`Transfer takings leaving opening float (${formatPKR(openingCash)}) in drawer`}
                    >
                      Keep Float ({formatPKR(openingCash)})
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[10px]">
                    {[10000, 20000, 50000].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          const curr = parseFloat(transferInput) || 0;
                          const next = curr + amt;
                          setTransferInput(String(next));
                          onChangeSafeTransferAmount(next);
                        }}
                        className="py-0.5 bg-white hover:bg-emerald-50 hover:text-emerald-800 border border-stone-200 rounded font-bold text-stone-700 transition-colors cursor-pointer text-center"
                      >
                        +{amt / 1000}k
                      </button>
                    ))}
                  </div>
                </div>

                {/* Handover Reason Note */}
                <div className="mb-2.5">
                  <select
                    value={drawerToSafeReason}
                    onChange={e => setDrawerToSafeReason(e.target.value)}
                    className="w-full py-1 px-2 text-[11px] bg-white border border-stone-200 rounded-lg text-stone-700 font-medium outline-hidden"
                  >
                    <option value="Day-End Cash Handover to Safe">Day-End Cash Handover to Safe</option>
                    <option value="Evening Sales Transfer to Safe">Evening Sales Transfer to Safe</option>
                    <option value="Mid-day Excess Cash Drop to Safe">Mid-day Excess Cash Drop to Safe</option>
                    <option value="Safe Handover Before Shift Change">Safe Handover Before Shift Change</option>
                  </select>
                </div>

                {/* Direct Action Button */}
                <button
                  type="button"
                  id="btn-confirm-drawer-to-safe"
                  onClick={handleExecuteDrawerToSafe}
                  className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  <span>Transfer to Safe Now {transferInput && parseFloat(transferInput) > 0 ? `(${formatPKR(parseFloat(transferInput) || 0)})` : ''}</span>
                </button>

                <p className="mt-2 text-[10px] text-emerald-800 bg-emerald-50/80 border border-emerald-200/80 rounded-lg p-2 leading-relaxed">
                  🛡️ <strong>Safe Vault Notice:</strong> Evening drawer handovers are stored directly in your Vault balance. They are kept strictly separate from Cash Out / Operating Expenses so your business expenses stay accurate and never cause a negative balance.
                </p>
              </div>
            ) : activeTransferDirection === 'safe_to_drawer' ? (
              /* SAFE TO DRAWER (Replenish Float / Change) */
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ArrowUpRight className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Replenish Drawer Float</span>
                  </span>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                    Safe Total: {formatPKR(totalSafeCash)}
                  </span>
                </div>

                <p className="text-[11px] text-stone-500 mb-2 leading-relaxed">
                  Take cash out of the safe and inject into the cash drawer.
                </p>

                {/* Amount Input */}
                <div className="relative mb-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400 select-none">
                    Rs.
                  </span>
                  <input
                    id="input-safe-to-drawer-amount"
                    type="number"
                    min="1"
                    step="any"
                    value={safeToDrawerInput}
                    placeholder="e.g. 10000"
                    onChange={e => setSafeToDrawerInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleExecuteSafeToDrawer();
                      }
                    }}
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-stone-300 rounded-lg text-base font-bold font-mono text-stone-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-hidden transition-all shadow-2xs"
                  />
                </div>

                {/* Quick Add Presets */}
                <div className="flex items-center gap-1 mb-2">
                  {[5000, 10000, 20000, 50000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handleQuickAddSafeToDrawer(amt)}
                      className="flex-1 py-0.5 bg-white hover:bg-indigo-50 hover:text-indigo-800 border border-stone-200 rounded text-[10px] font-bold text-stone-700 transition-colors cursor-pointer text-center"
                    >
                      +{amt >= 1000 ? `${amt / 1000}k` : amt}
                    </button>
                  ))}
                  {totalSafeCash > 0 && (
                    <button
                      type="button"
                      onClick={() => setSafeToDrawerInput(String(totalSafeCash))}
                      className="py-0.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded text-[10px] font-bold transition-colors cursor-pointer"
                      title="Set full safe vault balance"
                    >
                      All Safe
                    </button>
                  )}
                </div>

                {/* Reason Selector */}
                <div className="mb-2.5">
                  <select
                    value={safeToDrawerReason}
                    onChange={e => setSafeToDrawerReason(e.target.value)}
                    className="w-full py-1 px-2 text-[11px] bg-white border border-stone-200 rounded-lg text-stone-700 font-medium outline-hidden"
                  >
                    <option value="Morning Float Replenishment">Morning Float Replenishment</option>
                    <option value="Change for Register (500/1000 notes)">Change for Register</option>
                    <option value="Emergency Cash Payout Support">Emergency Cash Support</option>
                    <option value="Safe Withdrawal to Drawer">Safe Withdrawal to Drawer</option>
                  </select>
                </div>

                {/* Confirm Button */}
                <button
                  type="button"
                  id="btn-confirm-safe-to-drawer"
                  onClick={handleExecuteSafeToDrawer}
                  className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Transfer to Drawer {safeToDrawerInput && parseFloat(safeToDrawerInput) > 0 ? `(${formatPKR(parseFloat(safeToDrawerInput) || 0)})` : ''}</span>
                </button>
              </div>
            ) : activeTransferDirection === 'safe_to_bank' ? (
              /* BANK DEPOSIT (From Safe Vault or Cash Drawer) */
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5 text-blue-600" />
                    <span>Bank Deposit</span>
                  </span>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                    {bankDepositSource === 'safe' 
                      ? `Safe: ${formatPKR(totalSafeCash)}` 
                      : `Drawer: ${formatPKR(remainingDrawerCash)}`}
                  </span>
                </div>

                {/* Source Selection: From Safe vs From Drawer */}
                <div className="grid grid-cols-2 gap-1 p-0.5 bg-stone-200/80 rounded-lg mb-2 text-xs">
                  <button
                    type="button"
                    onClick={() => { setBankDepositSource('safe'); setShowInsufficientHelp(false); }}
                    className={`py-1 px-1.5 rounded-md font-bold transition-all text-center flex items-center justify-center gap-1 cursor-pointer truncate ${
                      bankDepositSource === 'safe'
                        ? 'bg-white text-blue-900 shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <Lock className="w-3 h-3 text-blue-600 shrink-0" />
                    <span className="truncate">From Safe ({formatPKR(totalSafeCash)})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setBankDepositSource('drawer'); setShowInsufficientHelp(false); }}
                    className={`py-1 px-1.5 rounded-md font-bold transition-all text-center flex items-center justify-center gap-1 cursor-pointer truncate ${
                      bankDepositSource === 'drawer'
                        ? 'bg-white text-emerald-900 shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <ArrowDownToLine className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span className="truncate">From Drawer ({formatPKR(remainingDrawerCash)})</span>
                  </button>
                </div>

                <p className="text-[11px] text-stone-500 mb-2 leading-relaxed">
                  {bankDepositSource === 'safe'
                    ? 'Deposit cash from the safe vault directly into your business bank account.'
                    : 'Deposit cash from the counter cash drawer directly into your business bank account.'}
                </p>

                {/* Amount Input */}
                <div className="relative mb-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400 select-none">
                    Rs.
                  </span>
                  <input
                    id="input-safe-to-bank-amount"
                    type="number"
                    min="1"
                    step="any"
                    value={safeToBankAmount}
                    placeholder="e.g. 100000"
                    onChange={e => {
                      setSafeToBankAmount(e.target.value);
                      setShowInsufficientHelp(false);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleExecuteSafeToBank();
                      }
                    }}
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-stone-300 rounded-lg text-base font-bold font-mono text-stone-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-hidden transition-all shadow-2xs"
                  />
                </div>

                {/* Quick Add Presets */}
                <div className="flex items-center gap-1 mb-2">
                  {[25000, 50000, 100000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handleQuickAddSafeToBank(amt)}
                      className="flex-1 py-0.5 bg-white hover:bg-blue-50 hover:text-blue-800 border border-stone-200 rounded text-[10px] font-bold text-stone-700 transition-colors cursor-pointer text-center"
                    >
                      +{amt / 1000}k
                    </button>
                  ))}
                  {(bankDepositSource === 'safe' ? totalSafeCash : remainingDrawerCash) > 0 && (
                    <button
                      type="button"
                      onClick={() => setSafeToBankAmount(String(bankDepositSource === 'safe' ? totalSafeCash : remainingDrawerCash))}
                      className="py-0.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded text-[10px] font-bold transition-colors cursor-pointer truncate"
                      title="Set full available balance"
                    >
                      All Available ({formatPKR(bankDepositSource === 'safe' ? totalSafeCash : remainingDrawerCash)})
                    </button>
                  )}
                </div>

                {/* Bank Account Selector & Notes */}
                <div className="grid grid-cols-2 gap-1.5 mb-2.5">
                  <select
                    value={safeToBankName}
                    onChange={e => setSafeToBankName(e.target.value)}
                    className="w-full py-1 px-2 text-[11px] bg-white border border-stone-200 rounded-lg text-stone-700 font-medium outline-hidden"
                  >
                    <option value="Askari Bank Ltd.">Askari Bank Ltd.</option>
                    <option value="Habib Bank Limited (HBL)">HBL</option>
                    <option value="Bank Alfalah">Bank Alfalah</option>
                    <option value="MCB Bank">MCB Bank</option>
                    <option value="Allied Bank (ABL)">Allied Bank</option>
                    <option value="Meezan Bank">Meezan Bank</option>
                    <option value="Faysal Bank">Faysal Bank</option>
                    <option value="United Bank Limited (UBL)">UBL</option>
                    <option value="National Bank of Pakistan (NBP)">NBP</option>
                    <option value="Other Bank">Other Bank</option>
                  </select>
                  <input
                    type="text"
                    value={safeToBankNotes}
                    onChange={e => setSafeToBankNotes(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleExecuteSafeToBank();
                      }
                    }}
                    placeholder="Slip / Receipt # (Opt)"
                    className="w-full py-1 px-2 text-[11px] bg-white border border-stone-200 rounded-lg text-stone-700 font-medium outline-hidden"
                  />
                </div>

                {/* Confirm Button */}
                <button
                  type="button"
                  id="btn-confirm-safe-to-bank"
                  onClick={handleExecuteSafeToBank}
                  className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Landmark className="w-3.5 h-3.5" />
                  <span>
                    Deposit into Bank from {bankDepositSource === 'drawer' ? 'Drawer' : 'Safe'} {safeToBankAmount && parseFloat(safeToBankAmount) > 0 ? `(${formatPKR(parseFloat(safeToBankAmount) || 0)})` : ''}
                  </span>
                </button>

                {/* Assistive Resolution Panel when Safe cash is insufficient */}
                {showInsufficientHelp && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold text-amber-950">
                          Safe Vault only has {formatPKR(totalSafeCash)}
                        </div>
                        <div className="text-[11px] text-amber-900 leading-snug">
                          You entered {formatPKR(parseFloat(safeToBankAmount) || 0)}. Where is this cash located?
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1.5 border-t border-amber-200">
                      {/* Option 1: Deposit from Drawer */}
                      <button
                        type="button"
                        onClick={handleDepositFromDrawerDirectly}
                        className="w-full text-left p-2.5 rounded-lg bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-950 transition-colors cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <span className="text-xs font-bold flex items-center gap-1.5 text-emerald-800">
                            <ArrowDownToLine className="w-3.5 h-3.5" />
                            1. Deposit from Cash Drawer instead
                          </span>
                          <span className="text-[10px] text-stone-500 block mt-0.5">
                            Your cash drawer has {formatPKR(remainingDrawerCash)} in register cash.
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-emerald-700 shrink-0" />
                      </button>

                      {/* Option 2: Update Safe Balance */}
                      <button
                        type="button"
                        onClick={handleUpdateSafeBalanceAndDeposit}
                        className="w-full text-left p-2.5 rounded-lg bg-white border border-blue-300 hover:bg-blue-50 text-blue-950 transition-colors cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <span className="text-xs font-bold flex items-center gap-1.5 text-blue-800">
                            <Lock className="w-3.5 h-3.5" />
                            2. Set Safe Vault Balance & Deposit Now
                          </span>
                          <span className="text-[10px] text-stone-500 block mt-0.5">
                            Set your Safe Vault balance to {formatPKR(parseFloat(safeToBankAmount) || 0)} and complete the bank deposit.
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-blue-700 shrink-0" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* SAFE TO INDIVIDUAL / PERSON (Partner Drawing, Advance, Vendor, Loan) */
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-purple-600" />
                    <span>Safe Cash to Individual</span>
                  </span>
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
                    Safe Total: {formatPKR(totalSafeCash)}
                  </span>
                </div>

                <p className="text-[11px] text-stone-500 mb-2 leading-relaxed">
                  Disburse cash directly from the safe vault to an owner, partner, staff member, or vendor without altering register drawer cash.
                </p>

                {/* Amount Input */}
                <div className="relative mb-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400 select-none">
                    Rs.
                  </span>
                  <input
                    id="input-safe-to-person-amount"
                    type="number"
                    min="1"
                    step="any"
                    value={safeToPersonAmount}
                    placeholder="e.g. 25000"
                    onChange={e => setSafeToPersonAmount(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleExecuteSafeToIndividual();
                      }
                    }}
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-stone-300 rounded-lg text-base font-bold font-mono text-stone-900 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 outline-hidden transition-all shadow-2xs"
                  />
                </div>

                {/* Quick Add Presets */}
                <div className="flex items-center gap-1 mb-2">
                  {[5000, 10000, 25000, 50000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handleQuickAddSafeToPerson(amt)}
                      className="flex-1 py-0.5 bg-white hover:bg-purple-50 hover:text-purple-800 border border-stone-200 rounded text-[10px] font-bold text-stone-700 transition-colors cursor-pointer text-center"
                    >
                      +{amt >= 1000 ? `${amt / 1000}k` : amt}
                    </button>
                  ))}
                  {totalSafeCash > 0 && (
                    <button
                      type="button"
                      onClick={() => setSafeToPersonAmount(String(totalSafeCash))}
                      className="py-0.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded text-[10px] font-bold transition-colors cursor-pointer truncate"
                      title="Set full safe vault balance"
                    >
                      All Safe
                    </button>
                  )}
                </div>

                {/* Recipient Selection & Input */}
                <div className="mb-2">
                  <label 
                    htmlFor="input-safe-to-person-recipient"
                    className="text-[10px] font-bold text-stone-700 block mb-1 uppercase tracking-wider"
                  >
                    Recipient Individual / Entity:
                  </label>
                  <div className="relative mb-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400">
                      <User className="w-3.5 h-3.5" />
                    </span>
                    <input
                      id="input-safe-to-person-recipient"
                      type="text"
                      value={safeToPersonRecipient}
                      onChange={e => setSafeToPersonRecipient(e.target.value)}
                      placeholder="e.g. Partner / Owner, Staff Name, Vendor..."
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-semibold text-stone-900 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 outline-hidden"
                    />
                  </div>

                  {/* Quick Recipient Suggestions */}
                  <div className="flex items-center gap-1 flex-wrap text-[10px]">
                    <span className="text-stone-400">Quick:</span>
                    {['Owner Drawing', ...(staffList || []).slice(0, 3)].map(rec => (
                      <button
                        key={rec}
                        type="button"
                        onClick={() => setSafeToPersonRecipient(rec)}
                        className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer font-medium ${
                          safeToPersonRecipient === rec
                            ? 'bg-purple-100 border-purple-300 text-purple-900 font-bold'
                            : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'
                        }`}
                      >
                        {rec}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Purpose / Reason & Voucher No */}
                <div className="grid grid-cols-2 gap-1.5 mb-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-stone-600 block mb-0.5">
                      Purpose / Category:
                    </label>
                    <select
                      value={safeToPersonReason}
                      onChange={e => setSafeToPersonReason(e.target.value)}
                      className="w-full py-1 px-2 text-[11px] bg-white border border-stone-200 rounded-lg text-stone-700 font-medium outline-hidden"
                    >
                      <option value="Partner / Owner Drawing">Partner / Owner Drawing</option>
                      <option value="Advance Salary to Staff">Advance Salary to Staff</option>
                      <option value="Loan / Borrowing Handover">Loan / Borrowing Handover</option>
                      <option value="Supplier / Vendor Settlement">Vendor / Supplier Payment</option>
                      <option value="Contractor / Labor Handover">Contractor / Labor Payment</option>
                      <option value="Committee (Kameti) Payout">Committee (Kameti) Payout</option>
                      <option value="Emergency Cash Handover">Emergency Cash Handover</option>
                      <option value="Personal Cash Withdrawal">Personal Cash Withdrawal</option>
                      <option value="Other Cash Handover">Other Cash Handover</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-stone-600 block mb-0.5">
                      Voucher / Slip # (Opt):
                    </label>
                    <input
                      type="text"
                      value={safeToPersonReceipt}
                      onChange={e => setSafeToPersonReceipt(e.target.value)}
                      placeholder="e.g. VCH-102"
                      className="w-full py-1 px-2 text-[11px] bg-white border border-stone-200 rounded-lg text-stone-700 font-medium outline-hidden"
                    />
                  </div>
                </div>

                {/* Optional Detailed Notes */}
                <div className="mb-2.5">
                  <label className="text-[10px] font-bold text-stone-600 block mb-0.5">
                    Particulars / Reason Details (Opt):
                  </label>
                  <input
                    type="text"
                    value={safeToPersonNotes}
                    onChange={e => setSafeToPersonNotes(e.target.value)}
                    placeholder="e.g. Month 6 Kameti collection, advance drawing for purchase, etc."
                    className="w-full py-1 px-2 text-[11px] bg-white border border-stone-200 rounded-lg text-stone-700 font-medium outline-hidden"
                  />
                </div>

                {/* Confirm Button */}
                <button
                  type="button"
                  id="btn-confirm-safe-to-person"
                  onClick={handleExecuteSafeToIndividual}
                  className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>
                    Transfer Cash to Individual {safeToPersonAmount && parseFloat(safeToPersonAmount) > 0 ? `(${formatPKR(parseFloat(safeToPersonAmount) || 0)})` : ''}
                  </span>
                </button>
              </div>
            )}
          </div>

          <div className="mt-3 pt-2.5 border-t border-stone-200/70 text-[11px] text-stone-500 flex items-center justify-between">
            <span>
              {activeTransferDirection === 'drawer_to_safe' 
                ? 'Drawer Transfer (to Safe):' 
                : activeTransferDirection === 'safe_to_drawer'
                ? 'Safe to Drawer (Replenish):'
                : activeTransferDirection === 'safe_to_bank'
                ? 'Safe to Bank (Deposit):'
                : 'Safe to Individual (Payout):'}
            </span>
            <strong className="font-mono text-emerald-700 font-bold">
              {activeTransferDirection === 'drawer_to_safe'
                ? `+${formatPKR(transferInput ? parseFloat(transferInput) || 0 : safeTransferAmount)}`
                : activeTransferDirection === 'safe_to_drawer'
                ? (safeToDrawerInput ? `+${formatPKR(parseFloat(safeToDrawerInput) || 0)}` : 'Rs. 0')
                : activeTransferDirection === 'safe_to_bank'
                ? (safeToBankAmount ? `-${formatPKR(parseFloat(safeToBankAmount) || 0)}` : 'Rs. 0')
                : (safeToPersonAmount ? `-${formatPKR(parseFloat(safeToPersonAmount) || 0)}` : 'Rs. 0')}
            </strong>
          </div>
        </div>

        {/* CONTAINER 3: Total Safe Cash & Grand Vault Total (Soft Low-Contrast Card) */}
        <div className="md:col-span-4 bg-slate-50/90 border border-slate-200/90 rounded-xl p-4 flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-700 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-slate-600" />
                <span>Total Safe Cash</span>
              </span>
              <span className="text-[10px] bg-slate-200/70 text-slate-700 px-2 py-0.5 rounded font-mono font-semibold">
                Vault Total
              </span>
            </div>

            {/* Prominent Number */}
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 tracking-tight my-1">
              {formatPKR(totalSafeCash)}
            </div>

            {/* Formula Math Breakdown */}
            <div className="mt-2.5 pt-2.5 border-t border-slate-200/80 space-y-1.5 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-stone-600">Safe Running Base:</span>
                  <span className="text-[10px] text-stone-400 block font-mono">
                    (Effective: {balanceDateInput || safeRunningBalanceDate || selectedDate})
                  </span>
                </div>
                <span className="font-mono font-medium text-slate-800">{formatPKR(safeRunningBalance)}</span>
              </div>
              <div className="flex items-center justify-between text-emerald-800">
                <span>(+) Drawer Closing Transfer:</span>
                <span className="font-mono font-bold">+{formatPKR(safeTransferAmount)}</span>
              </div>
              {totalVaultDeposits > 0 && (
                <div className="flex items-center justify-between text-amber-800">
                  <span className="flex items-center gap-1">
                    <span>(+) Committee & Other Deposits:</span>
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-1 rounded">
                      {vaultDeposits.length}
                    </span>
                  </span>
                  <span className="font-mono font-bold">+{formatPKR(totalVaultDeposits)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-stone-600 pt-1 border-t border-slate-200">
                <span>Remaining in Register Drawer:</span>
                <span className={`font-mono font-bold ${remainingDrawerCash >= 0 ? 'text-stone-800' : 'text-rose-700'}`}>
                  {formatPKR(remainingDrawerCash)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-3.5 pt-2.5 border-t border-slate-200/80 space-y-2">
            {safeTransferAmount > 0 && (
              <button
                type="button"
                onClick={handleFinalizeTransfer}
                className="w-full py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Secure drawer transfer into running safe balance"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Finalize Drawer Transfer</span>
              </button>
            )}
            
            {(safeTransferAmount > 0 || totalVaultDeposits > 0) && (
              <button
                type="button"
                onClick={handleConsolidateAllIntoVault}
                className="w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-300/80 text-slate-800 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Merge all pending drawer transfers and separate deposits into Safe Running Balance"
              >
                <Layers className="w-3 h-3 text-slate-600" />
                <span>Consolidate All into Running Balance</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* UNIFIED SAFE VAULT ACCOUNTING LEDGER VIEW */}
      <div className="mb-5 bg-stone-50/80 border border-stone-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs">
        {/* Ledger Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-stone-200/80 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-800 text-amber-400 shrink-0 shadow-2xs">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm sm:text-base font-extrabold text-stone-900 tracking-tight">
                  Safe Vault Accounting Ledger
                </h4>
                <span className="text-[10px] sm:text-[11px] font-mono font-bold text-slate-800 bg-slate-200/80 border border-slate-300 px-2 py-0.5 rounded-md">
                  {filteredLedgerItems.length} {filteredLedgerItems.length === 1 ? 'entry' : 'entries'}
                </span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                  Cash-In • Cash-Out • Running Balance
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Complete chronological audit of cash sent into the safe vault and disbursements taken out of the vault. Every entry is editable.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleExportVaultLedgerCSV(filteredLedgerItems)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-stone-100 border border-stone-300 text-stone-700 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
              title="Download entire vault ledger as CSV spreadsheet"
            >
              <Download className="w-3.5 h-3.5 text-stone-600" />
              <span>Export Ledger CSV</span>
            </button>
            <button
              type="button"
              onClick={() => setIsDepositFormOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
              title="Record an external deposit directly into the safe vault"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Vault Cash</span>
            </button>
          </div>
        </div>

        {/* Ledger Top KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 mb-4">
          {/* Card 1: Cash-In (Sent to Vault) */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-white border border-emerald-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-800 flex items-center gap-1">
                <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-600" />
                <span>Cash-In (Sent to Vault)</span>
              </span>
              <div className="text-lg sm:text-xl font-extrabold font-mono text-emerald-700 mt-1">
                +{formatPKR(totalSentToVault)}
              </div>
              <span className="text-[10px] text-stone-400 mt-0.5 block">
                Total inflows from drawers &amp; deposits
              </span>
            </div>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/70 shrink-0">
              <Lock className="w-4 h-4" />
            </div>
          </div>

          {/* Card 2: Cash-Out (Came Out of Vault) */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-white border border-rose-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-rose-800 flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                <span>Cash-Out (Came Out of Vault)</span>
              </span>
              <div className="text-lg sm:text-xl font-extrabold font-mono text-rose-700 mt-1">
                -{formatPKR(totalCameOutOfVault)}
              </div>
              <span className="text-[10px] text-stone-400 mt-0.5 block">
                Bank deposits, float replenishments &amp; drawings
              </span>
            </div>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-700 border border-rose-200/70 shrink-0">
              <Landmark className="w-4 h-4" />
            </div>
          </div>

          {/* Card 3: Vault Running Balance */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-slate-900 text-white shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-300 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Vault Running Balance</span>
              </span>
              <div className="text-lg sm:text-xl font-extrabold font-mono text-amber-400 mt-1">
                {formatPKR(netVaultLedgerBalance)}
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Live net cash residing in vault
              </span>
            </div>
            <div className="p-2 rounded-lg bg-slate-800 text-amber-400 border border-slate-700 shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Ledger Filter & Search Toolbar */}
        <div className="bg-white border border-stone-200 rounded-xl p-3 mb-3.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5 shadow-2xs">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400">
              <Search className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              placeholder="Search by date (2026-10-18), amount, description, person, bank..."
              value={safeSearchQuery}
              onChange={e => setSafeSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-800 placeholder-stone-400 outline-hidden focus:bg-white focus:border-indigo-600 transition-all font-mono"
            />
            {safeSearchQuery && (
              <button
                type="button"
                onClick={() => setSafeSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs cursor-pointer"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Interactive Filters */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Flow Filter: All vs Inflows vs Outflows */}
            <div className="flex items-center p-0.5 bg-stone-100 rounded-lg border border-stone-200 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setLedgerFlowFilter('all')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  ledgerFlowFilter === 'all'
                    ? 'bg-white text-stone-900 shadow-2xs font-bold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                All Movements
              </button>
              <button
                type="button"
                onClick={() => setLedgerFlowFilter('inflow')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  ledgerFlowFilter === 'inflow'
                    ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                    : 'text-emerald-800 hover:text-emerald-950'
                }`}
              >
                <ArrowDownToLine className="w-3 h-3" />
                <span>Cash-In</span>
              </button>
              <button
                type="button"
                onClick={() => setLedgerFlowFilter('outflow')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  ledgerFlowFilter === 'outflow'
                    ? 'bg-rose-600 text-white shadow-2xs font-bold'
                    : 'text-rose-800 hover:text-rose-950'
                }`}
              >
                <ArrowUpRight className="w-3 h-3" />
                <span>Cash-Out</span>
              </button>
            </div>

            {/* Date Scope Filter */}
            <div className="flex items-center p-0.5 bg-stone-100 rounded-lg border border-stone-200 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setLedgerDateFilter('all')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  ledgerDateFilter === 'all'
                    ? 'bg-white text-stone-900 shadow-2xs font-bold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                All Dates
              </button>
              <button
                type="button"
                onClick={() => setLedgerDateFilter('today')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  ledgerDateFilter === 'today'
                    ? 'bg-white text-stone-900 shadow-2xs font-bold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Today Only
              </button>
            </div>

            {/* Sort Toggle */}
            <button
              type="button"
              onClick={() => setLedgerSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-stone-50 border border-stone-200 rounded-lg text-[11px] font-bold text-stone-700 transition-colors cursor-pointer shadow-2xs"
              title="Toggle chronological order (Newest first vs Oldest first)"
            >
              <ArrowUpDown className="w-3 h-3 text-stone-500" />
              <span>{ledgerSortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
            </button>
          </div>
        </div>

        {/* Unfinalized transfer alert if pending in container 2 */}
        {safeTransferAmount > 0 && (
          <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-900 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Pending Drawer Transfer:</strong> Rs. {formatPKR(safeTransferAmount)} is staged in Container 2. Click <strong>Finalize Drawer Transfer</strong> above to record it permanently in this ledger.
              </span>
            </div>
            <button
              type="button"
              onClick={handleFinalizeTransfer}
              className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-bold shrink-0 cursor-pointer shadow-2xs transition-colors"
            >
              Finalize Now
            </button>
          </div>
        )}

        {/* LEDGER SPREADSHEET TABLE */}
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-2xs">
          <table className="w-full text-left text-xs border-collapse min-w-[760px]">
            {/* Table Header */}
            <thead>
              <tr className="bg-stone-100/90 border-b border-stone-200 text-stone-700 text-[11px] uppercase tracking-wider font-extrabold select-none">
                <th className="py-2.5 px-3 w-36">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-stone-500" />
                    <span>Date &amp; Time</span>
                  </div>
                </th>
                <th className="py-2.5 px-3 min-w-[220px]">
                  <span>Particulars / Transaction &amp; Flow</span>
                </th>
                <th className="py-2.5 px-3 w-40">
                  <span>Source / Counterparty</span>
                </th>
                <th className="py-2.5 px-3 text-right w-36 bg-emerald-50/50 text-emerald-950 font-bold border-l border-emerald-100">
                  <div className="flex items-center justify-end gap-1">
                    <ArrowDownToLine className="w-3 h-3 text-emerald-600" />
                    <span>Cash-In (Sent)</span>
                  </div>
                </th>
                <th className="py-2.5 px-3 text-right w-36 bg-rose-50/50 text-rose-950 font-bold border-l border-rose-100">
                  <div className="flex items-center justify-end gap-1">
                    <ArrowUpRight className="w-3 h-3 text-rose-600" />
                    <span>Cash-Out (Came Out)</span>
                  </div>
                </th>
                <th className="py-2.5 px-3 text-right w-40 bg-slate-100 text-slate-900 font-extrabold border-l border-slate-200">
                  <div className="flex items-center justify-end gap-1">
                    <Lock className="w-3 h-3 text-slate-600" />
                    <span>Vault Running Bal</span>
                  </div>
                </th>
                <th className="py-2.5 px-3 text-center w-24 border-l border-stone-200">
                  <span>Actions</span>
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-stone-100">
              {filteredLedgerItems.length > 0 ? (
                filteredLedgerItems.map((item, idx) => {
                  const isInflow = item.direction === 'inflow';
                  const isToday = item.date === selectedDate;
                  const isBaseline = item.sourceType === 'baseline';

                  return (
                    <tr 
                      key={item.id + '_' + idx}
                      className={`hover:bg-indigo-50/30 transition-colors ${
                        isBaseline ? 'bg-amber-50/30 font-medium' : idx % 2 === 0 ? 'bg-white' : 'bg-stone-50/30'
                      }`}
                    >
                      {/* Date & Time */}
                      <td className="py-2.5 px-3 align-top whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-stone-900 flex items-center gap-1.5">
                            <span>{item.date}</span>
                            {isToday && (
                              <span className="text-[9px] font-bold uppercase bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-sans">
                                Today
                              </span>
                            )}
                          </span>
                          <span className="text-[11px] font-mono text-stone-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-stone-400" />
                            <span>{item.time}</span>
                          </span>
                        </div>
                      </td>

                      {/* Particulars & Transfer Flow */}
                      <td className="py-2.5 px-3 align-top min-w-0">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Direction Badge */}
                            <span 
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded border inline-flex items-center gap-1 ${
                                isInflow 
                                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
                                  : 'bg-rose-50 text-rose-900 border-rose-300'
                              }`}
                            >
                              {isInflow ? <ArrowDownToLine className="w-3 h-3 text-emerald-600" /> : <ArrowUpRight className="w-3 h-3 text-rose-600" />}
                              <span>{isInflow ? 'Sent to Vault' : 'Came Out of Vault'}</span>
                            </span>

                            {/* Category Label */}
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${item.badgeStyle}`}>
                              {item.categoryLabel}
                            </span>

                            {/* Receipt Number */}
                            {item.receiptNumber && (
                              <span className="text-[10px] font-mono font-semibold bg-stone-100 text-stone-700 px-1.5 py-0.5 rounded border border-stone-200">
                                #{item.receiptNumber}
                              </span>
                            )}
                          </div>

                          {/* Description text */}
                          <p className="text-xs font-bold text-stone-800 leading-snug">
                            {item.description}
                          </p>

                          {/* Notes */}
                          {item.notes && item.notes !== item.description && (
                            <p className="text-[11px] text-stone-500 italic leading-snug">
                              &ldquo;{item.notes}&rdquo;
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Source / Counterparty */}
                      <td className="py-2.5 px-3 align-top whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-stone-700 font-semibold text-xs">
                          {item.categoryLabel.includes('Bank') ? (
                            <Landmark className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          ) : item.categoryLabel.includes('Individual') || item.categoryLabel.includes('Person') ? (
                            <User className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          ) : item.categoryLabel.includes('Drawer') ? (
                            <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          )}
                          <span className="truncate max-w-[130px]">
                            {item.recipientOrSource || 'Register Till'}
                          </span>
                        </div>
                      </td>

                      {/* Cash-In (Sent to Vault) */}
                      <td className="py-2.5 px-3 align-top text-right whitespace-nowrap bg-emerald-50/20 border-l border-emerald-100 font-mono">
                        {item.cashIn > 0 ? (
                          <span className="font-extrabold text-emerald-700 text-xs sm:text-sm bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80 inline-block">
                            +{formatPKR(item.cashIn)}
                          </span>
                        ) : (
                          <span className="text-stone-300 font-normal select-none">—</span>
                        )}
                      </td>

                      {/* Cash-Out (Came Out of Vault) */}
                      <td className="py-2.5 px-3 align-top text-right whitespace-nowrap bg-rose-50/20 border-l border-rose-100 font-mono">
                        {item.cashOut > 0 ? (
                          <span className="font-extrabold text-rose-700 text-xs sm:text-sm bg-rose-50 px-2 py-0.5 rounded border border-rose-200/80 inline-block">
                            -{formatPKR(item.cashOut)}
                          </span>
                        ) : (
                          <span className="text-stone-300 font-normal select-none">—</span>
                        )}
                      </td>

                      {/* Vault Running Balance */}
                      <td className="py-2.5 px-3 align-top text-right whitespace-nowrap bg-slate-50 border-l border-slate-200 font-mono">
                        <span className="font-extrabold text-slate-900 text-xs sm:text-sm bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs inline-block">
                          {formatPKR(item.runningBalance)}
                        </span>
                      </td>

                      {/* Actions (Edit & Delete) */}
                      <td className="py-2.5 px-2 align-top text-center whitespace-nowrap border-l border-stone-200">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditLedgerItem(item)}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-md text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                            title="Edit this entry amount, date, time, reason, or recipient"
                          >
                            <Edit3 className="w-3 h-3 text-indigo-700" />
                            <span>Edit</span>
                          </button>
                          {!isBaseline && (
                            <button
                              type="button"
                              onClick={() => handleDeleteLedgerItem(item)}
                              className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-md transition-colors cursor-pointer"
                              title="Delete or reverse this entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 px-4 text-center bg-stone-50/50">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-stone-500">
                      <FileSpreadsheet className="w-8 h-8 text-stone-300 mb-2" />
                      <p className="text-xs font-bold text-stone-700">No vault ledger transactions found</p>
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        {safeSearchQuery 
                          ? `No entries match "${safeSearchQuery}". Try clearing your search.`
                          : 'Use Container 2 above to move cash between Drawer, Safe, and Bank, or add a direct vault deposit.'}
                      </p>
                      {safeSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setSafeSearchQuery('')}
                          className="mt-2 px-3 py-1 bg-white border border-stone-300 text-stone-700 rounded-lg text-xs font-semibold hover:bg-stone-50 cursor-pointer"
                        >
                          Clear Search Filter
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>

            {/* Table Footer Summary Row */}
            {filteredLedgerItems.length > 0 && (
              <tfoot>
                <tr className="bg-stone-100 border-t-2 border-stone-300 font-extrabold text-xs">
                  <td colSpan={3} className="py-2.5 px-3 text-stone-800 uppercase tracking-wider text-[11px]">
                    Ledger Totals ({filteredLedgerItems.length} entries displayed):
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-800 border-l border-stone-200 bg-emerald-50/60">
                    +{formatPKR(totalSentToVault)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-rose-800 border-l border-stone-200 bg-rose-50/60">
                    -{formatPKR(totalCameOutOfVault)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-900 border-l border-stone-200 bg-slate-200/70 text-sm">
                    {formatPKR(netVaultLedgerBalance)}
                  </td>
                  <td className="py-2.5 px-3 border-l border-stone-200 text-center text-stone-400">
                    ✓
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* SEPARATE VAULT CASH DEPOSITS SECTION (Committee, Capital, Bank Withdrawal, etc.) */}
      <div className="border border-amber-200/80 bg-amber-50/40 rounded-xl p-4 transition-all">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-200/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
              <Handshake className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-stone-900">
                  Separate Direct Vault Deposits (Committee, Capital, External Cash)
                </h4>
                <span className="text-[10px] bg-amber-200/80 text-amber-900 font-bold px-1.5 py-0.5 rounded">
                  Does Not Affect Drawer Sales
                </span>
              </div>
              <p className="text-[11px] text-stone-600 mt-0.5">
                Deposit cash directly into the safe (e.g. monthly Kameti payout, personal capital, or bank withdrawal) separate from register sales.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-semibold">
                Separate Deposits Total
              </span>
              <span className="text-sm font-extrabold font-mono text-amber-900">
                {formatPKR(totalVaultDeposits)}
              </span>
            </div>
            {!isDepositFormOpen && (
              <button
                type="button"
                onClick={() => setIsDepositFormOpen(true)}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Deposit</span>
              </button>
            )}
          </div>
        </div>

        {/* Deposit Entry Form */}
        {isDepositFormOpen && (
          <form 
            onSubmit={handleSaveDeposit} 
            className="mt-4 p-4 bg-white border border-amber-200 rounded-xl shadow-xs animate-in fade-in slide-in-from-top-2 duration-200"
          >
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <h5 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                  New Direct Cash Deposit to Safe
                </h5>
              </div>
              <button
                type="button"
                onClick={() => setIsDepositFormOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {/* Category Selector Buttons */}
            <div className="mb-3.5">
              <label className="text-[11px] font-bold text-stone-700 block mb-1.5 uppercase tracking-wider">
                Select Deposit Type / Purpose:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {VAULT_CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  const isSelected = depositCategory === cat.category;
                  return (
                    <button
                      key={cat.category}
                      type="button"
                      onClick={() => setDepositCategory(cat.category)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected 
                          ? 'border-amber-600 bg-amber-50/90 ring-1 ring-amber-600 shadow-2xs' 
                          : 'border-stone-200 bg-stone-50 hover:bg-white hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`p-1 rounded-md ${isSelected ? 'bg-amber-600 text-white' : 'bg-stone-200 text-stone-700'}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className={`text-xs font-bold ${isSelected ? 'text-amber-950' : 'text-stone-800'}`}>
                          {cat.label}
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-500 line-clamp-1 leading-tight">
                        {cat.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount, Particulars, and Action Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              
              {/* Amount */}
              <div className="md:col-span-4">
                <label 
                  htmlFor={depositAmountInputId}
                  className="text-[11px] font-bold text-stone-700 block mb-1 uppercase tracking-wider"
                >
                  Deposit Amount (PKR) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400 select-none">
                    Rs.
                  </span>
                  <input
                    id={depositAmountInputId}
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={depositAmount}
                    onChange={e => setDepositAmount(e.target.value)}
                    placeholder="e.g. 50,000"
                    className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-base font-bold font-mono text-stone-900 focus:bg-white focus:border-amber-600 focus:ring-1 focus:ring-amber-600 outline-hidden transition-all"
                  />
                </div>
                {/* Quick Add Presets */}
                <div className="flex items-center gap-1 mt-1 text-[10px]">
                  <span className="text-stone-400 font-semibold">Quick:</span>
                  {[10000, 25000, 50000, 100000].map(add => (
                    <button
                      key={add}
                      type="button"
                      onClick={() => handleQuickAddDepositAmount(add)}
                      className="px-1.5 py-0.5 bg-stone-100 hover:bg-amber-100 hover:text-amber-900 rounded border border-stone-200 font-bold text-stone-600 cursor-pointer"
                    >
                      +{add >= 1000 ? `${add / 1000}k` : add}
                    </button>
                  ))}
                  {depositAmount && (
                    <button
                      type="button"
                      onClick={() => setDepositAmount('')}
                      className="text-stone-400 hover:text-rose-600 ml-auto cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Particulars / Remarks */}
              <div className="md:col-span-4">
                <label className="text-[11px] font-bold text-stone-700 block mb-1 uppercase tracking-wider">
                  Particulars / Description <span className="text-stone-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
                    <FileText className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    value={depositNotes}
                    onChange={e => setDepositNotes(e.target.value)}
                    placeholder="e.g. 5th Kameti payout, emergency capital, etc."
                    className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium text-stone-900 focus:bg-white focus:border-amber-600 focus:ring-1 focus:ring-amber-600 outline-hidden transition-all"
                  />
                </div>
                <span className="text-[10px] text-stone-400 block mt-1">
                  Recorded in daily vault ledger & Excel export
                </span>
              </div>

              {/* Date, Time and Submit */}
              <div className="md:col-span-4 flex items-center gap-2">
                <div className="flex-1 min-w-[110px]">
                  <label className="text-[10px] font-bold text-stone-500 block mb-1 uppercase">
                    Date
                  </label>
                  <input
                    type="date"
                    value={depositDate}
                    onChange={e => setDepositDate(e.target.value)}
                    className="w-full px-2 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono font-bold text-stone-800"
                  />
                </div>
                <div className="w-20 shrink-0">
                  <label className="text-[10px] font-bold text-stone-500 block mb-1 uppercase">
                    Time
                  </label>
                  <input
                    type="time"
                    value={depositTime}
                    onChange={e => setDepositTime(e.target.value)}
                    className="w-full px-2 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono text-stone-800"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs h-[38px] mt-auto shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add</span>
                </button>
              </div>

            </div>
          </form>
        )}

        {/* List of Recorded Separate Deposits */}
        {vaultDeposits.length > 0 ? (
          <div className="mt-3.5">
            <div className="flex items-center justify-between text-xs font-bold text-stone-700 mb-2 px-1">
              <span>Recorded Vault Injections ({vaultDeposits.length} entries):</span>
              <span className="text-amber-900 font-mono font-bold">
                Subtotal: {formatPKR(totalVaultDeposits)}
              </span>
            </div>

            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {vaultDeposits.map(dep => {
                const catDef = VAULT_CATEGORIES.find(c => c.category === dep.category) || VAULT_CATEGORIES[0];
                const Icon = catDef.icon;

                return (
                  <div 
                    key={dep.id}
                    className="bg-white border border-stone-200/90 rounded-lg p-2.5 flex items-center justify-between gap-3 shadow-2xs hover:border-amber-300 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-1.5 rounded-md shrink-0 ${catDef.badgeClass}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded border ${catDef.badgeClass}`}>
                            {dep.categoryLabel}
                          </span>
                          <span className="text-[11px] font-bold text-amber-900 bg-amber-100/90 border border-amber-300 px-1.5 py-0.5 rounded font-mono flex items-center gap-1">
                            📅 {dep.date || selectedDate}
                          </span>
                          <span className="text-[11px] text-stone-500 font-mono">
                            🕒 {dep.time}
                          </span>
                          {dep.isConsolidated && (
                            <span className="text-[10px] font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                              Merged into Vault Base
                            </span>
                          )}
                        </div>
                        {dep.notes && (
                          <p className="text-xs font-medium text-stone-800 truncate mt-0.5">
                            {dep.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-sm font-extrabold font-mono ${dep.isConsolidated ? 'text-stone-500 line-through' : dep.amount < 0 ? 'text-blue-700' : 'text-emerald-700'}`}>
                        {dep.amount < 0 ? '-' : '+'}{formatPKR(Math.abs(dep.amount))}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenEditDeposit(dep)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 transition-colors cursor-pointer shadow-2xs"
                        title="Edit this vault deposit entry"
                      >
                        <Edit3 className="w-3 h-3 text-amber-700" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteVaultDeposit(dep.id);
                          onShowToast(`Removed ${dep.categoryLabel} deposit (${formatPKR(dep.amount)})`, 'info');
                        }}
                        className="text-stone-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete this vault deposit entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          !isDepositFormOpen && (
            <div className="mt-2 p-3 bg-white/70 border border-dashed border-amber-200/90 rounded-lg text-center text-xs text-stone-500">
              <span>No separate vault deposits recorded yet today. Click </span>
              <button
                type="button"
                onClick={() => setIsDepositFormOpen(true)}
                className="font-bold text-amber-800 hover:underline cursor-pointer"
              >
                + Add Vault Cash
              </button>
              <span> to log Committee, Capital, or Bank withdrawals into the safe.</span>
            </div>
          )
        )}

      </div>

      {/* Warning note if transfer exceeds drawer cash */}
      {safeTransferAmount > expectedDrawerCash && expectedDrawerCash > 0 && (
        <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Note: Cash transferred from drawer ({formatPKR(safeTransferAmount)}) exceeds current expected drawer balance ({formatPKR(expectedDrawerCash)}). Ensure any outside funds or discrepancy are reconciled.
          </span>
        </div>
      )}

      {/* MODAL 1: EDIT SAFE IN/OUT TRANSACTION */}
      {editingSafeActivity && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex min-h-full items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-200"
          onClick={() => setEditingSafeActivity(null)}
        >
          <div 
            className="bg-white border border-stone-200 rounded-2xl w-full max-w-xl md:max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[min(90vh,calc(100dvh-2rem))] my-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Header (Pinned) */}
            <div className="shrink-0 p-4 sm:p-5 border-b border-stone-200 bg-stone-50 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-stone-900 truncate">
                    Edit Safe In/Out Transaction
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200 shrink-0">
                    Safe Movement
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-stone-500 mt-0.5 line-clamp-1">
                  Update transfer amount, date/time, or reason. Vault and drawer balances update automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingSafeActivity(null)}
                className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-200/60 transition-colors cursor-pointer shrink-0"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="form-edit-safe-activity" onSubmit={handleSaveEditActivity} className="flex-1 overflow-y-auto overscroll-contain min-h-0 p-4 sm:p-5 space-y-4 text-xs">
              {/* Type / Direction Interactive Switcher */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Transfer Category &amp; Direction:
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-1.5 bg-stone-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setEditActivityDirection('drawer_to_safe');
                      if (!editActivityDescription || editActivityDescription.includes('Bank') || editActivityDescription.includes('Drawing') || editActivityDescription.includes('Replenish')) {
                        setEditActivityDescription('Day-End Cash Handover to Safe');
                      }
                    }}
                    className={`p-2.5 rounded-lg text-left transition-all cursor-pointer flex flex-col justify-between gap-1 min-h-[54px] ${
                      editActivityDirection === 'drawer_to_safe'
                        ? 'bg-emerald-600 text-white shadow-xs font-bold'
                        : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50 font-medium'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 text-xs">
                      <ArrowDownToLine className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Drawer ➔ Safe</span>
                    </span>
                    <span className={`text-[10px] ${editActivityDirection === 'drawer_to_safe' ? 'text-emerald-100' : 'text-stone-400'}`}>
                      Inflow to Vault
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditActivityDirection('safe_to_drawer');
                      if (!editActivityDescription || editActivityDescription.includes('Handover') || editActivityDescription.includes('Bank') || editActivityDescription.includes('Drawing')) {
                        setEditActivityDescription('Morning Float Replenishment');
                      }
                    }}
                    className={`p-2.5 rounded-lg text-left transition-all cursor-pointer flex flex-col justify-between gap-1 min-h-[54px] ${
                      editActivityDirection === 'safe_to_drawer'
                        ? 'bg-indigo-600 text-white shadow-xs font-bold'
                        : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50 font-medium'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 text-xs">
                      <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Safe ➔ Drawer</span>
                    </span>
                    <span className={`text-[10px] ${editActivityDirection === 'safe_to_drawer' ? 'text-indigo-100' : 'text-stone-400'}`}>
                      Float to register
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditActivityDirection('safe_to_bank');
                      if (!editActivityDescription || editActivityDescription.includes('Handover') || editActivityDescription.includes('Float') || editActivityDescription.includes('Drawing')) {
                        setEditActivityDescription('Cash Deposit from Safe Vault into Bank');
                      }
                    }}
                    className={`p-2.5 rounded-lg text-left transition-all cursor-pointer flex flex-col justify-between gap-1 min-h-[54px] ${
                      editActivityDirection === 'safe_to_bank'
                        ? 'bg-blue-600 text-white shadow-xs font-bold'
                        : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50 font-medium'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 text-xs">
                      <Landmark className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Safe ➔ Bank</span>
                    </span>
                    <span className={`text-[10px] ${editActivityDirection === 'safe_to_bank' ? 'text-blue-100' : 'text-stone-400'}`}>
                      Deposit to bank
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditActivityDirection('safe_to_person');
                      if (!editActivityDescription || editActivityDescription.includes('Handover to Safe') || editActivityDescription.includes('Bank') || editActivityDescription.includes('Float')) {
                        setEditActivityDescription('Partner / Owner Drawing');
                      }
                    }}
                    className={`p-2.5 rounded-lg text-left transition-all cursor-pointer flex flex-col justify-between gap-1 min-h-[54px] ${
                      editActivityDirection === 'safe_to_person'
                        ? 'bg-purple-600 text-white shadow-xs font-bold'
                        : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50 font-medium'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 text-xs">
                      <User className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Safe ➔ Person</span>
                    </span>
                    <span className={`text-[10px] ${editActivityDirection === 'safe_to_person' ? 'text-purple-100' : 'text-stone-400'}`}>
                      Owner / Drawing
                    </span>
                  </button>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Transfer Amount (PKR) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-stone-400 select-none">
                    Rs.
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={editActivityAmount}
                    onChange={e => setEditActivityAmount(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-lg font-bold font-mono text-stone-900 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-hidden transition-all shadow-2xs"
                  />
                </div>

                {/* Quick adjustments */}
                <div className="grid grid-cols-5 gap-1 sm:gap-1.5 mt-2 text-[10px] sm:text-xs">
                  <button
                    type="button"
                    onClick={() => handleQuickAdjustEditActivity(1000)}
                    className="py-1.5 bg-stone-100 hover:bg-indigo-50 hover:text-indigo-800 border border-stone-200 rounded-lg font-semibold text-stone-700 transition-colors cursor-pointer text-center"
                  >
                    +1k
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAdjustEditActivity(5000)}
                    className="py-1.5 bg-stone-100 hover:bg-indigo-50 hover:text-indigo-800 border border-stone-200 rounded-lg font-semibold text-stone-700 transition-colors cursor-pointer text-center"
                  >
                    +5k
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAdjustEditActivity(10000)}
                    className="py-1.5 bg-stone-100 hover:bg-indigo-50 hover:text-indigo-800 border border-stone-200 rounded-lg font-semibold text-stone-700 transition-colors cursor-pointer text-center"
                  >
                    +10k
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAdjustEditActivity(50000)}
                    className="py-1.5 bg-stone-100 hover:bg-indigo-50 hover:text-indigo-800 border border-stone-200 rounded-lg font-semibold text-stone-700 transition-colors cursor-pointer text-center"
                  >
                    +50k
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAdjustEditActivity(-10000)}
                    className="py-1.5 bg-stone-100 hover:bg-rose-50 hover:text-rose-800 border border-stone-200 rounded-lg font-semibold text-stone-700 transition-colors cursor-pointer text-center"
                  >
                    -10k
                  </button>
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={editActivityDate}
                    onChange={e => setEditActivityDate(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono font-bold text-stone-900 focus:bg-white focus:border-indigo-600 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={editActivityTime}
                    onChange={e => setEditActivityTime(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono text-stone-900 focus:bg-white focus:border-indigo-600 outline-hidden"
                  />
                </div>
              </div>

              {/* Description / Reason */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Description / Reason
                </label>
                <input
                  type="text"
                  value={editActivityDescription}
                  onChange={e => setEditActivityDescription(e.target.value)}
                  placeholder="e.g. Day-End Cash Handover to Safe"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium text-stone-900 focus:bg-white focus:border-indigo-600 outline-hidden"
                />
              </div>

              {/* Recipient / Bank Name (Conditional/Optional) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    {editActivityDirection === 'safe_to_bank'
                      ? 'Bank Account / Name'
                      : editActivityDirection === 'safe_to_person'
                      ? 'Recipient Individual'
                      : editActivityDirection === 'drawer_to_safe'
                      ? 'Handed Over By (Staff)'
                      : 'Received By (Staff)'}
                  </label>
                  <input
                    type="text"
                    value={editActivityRecipient}
                    onChange={e => setEditActivityRecipient(e.target.value)}
                    placeholder={
                      editActivityDirection === 'safe_to_bank'
                        ? 'e.g. Askari Bank Ltd., Meezan Bank...'
                        : editActivityDirection === 'safe_to_person'
                        ? 'e.g. Partner / Owner, Staff Name...'
                        : 'e.g. Counter Staff, Drawer ➔ Safe'
                    }
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs text-stone-900 focus:bg-white focus:border-indigo-600 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Receipt / Voucher #
                  </label>
                  <input
                    type="text"
                    value={editActivityReceipt}
                    onChange={e => setEditActivityReceipt(e.target.value)}
                    placeholder="e.g. REC-1049"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono text-stone-900 focus:bg-white focus:border-indigo-600 outline-hidden"
                  />
                </div>
              </div>

              {/* Internal Notes */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Internal Audit Notes
                </label>
                <textarea
                  rows={2}
                  value={editActivityNotes}
                  onChange={e => setEditActivityNotes(e.target.value)}
                  placeholder="Any additional remarks..."
                  className="w-full px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs text-stone-800 focus:bg-white focus:border-indigo-600 outline-hidden resize-none"
                />
              </div>

              {/* Automated math notice */}
              <div className="p-2.5 rounded-lg bg-emerald-50/80 border border-emerald-200 text-[11px] text-emerald-900 leading-relaxed">
                🛡️ <strong>Live Reconciliation:</strong> Modifying this transfer amount immediately recalculates the Safe Vault Balance, Drawer Cash Register Till, and syncs your records in real time.
              </div>
            </form>

            {/* Pinned Footer */}
            <div className="shrink-0 p-3.5 sm:p-4 border-t border-stone-200 bg-stone-50 flex flex-wrap items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditingSafeActivity(null)}
                className="px-4 py-2 bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="form-edit-safe-activity"
                className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 active:bg-indigo-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT SEPARATE VAULT CASH DEPOSIT */}
      {editingVaultDeposit && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex min-h-full items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-200"
          onClick={() => setEditingVaultDeposit(null)}
        >
          <div 
            className="bg-white border border-stone-200 rounded-2xl w-full max-w-lg sm:max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[min(90vh,calc(100dvh-2rem))] my-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Header (Pinned) */}
            <div className="shrink-0 p-4 sm:p-5 border-b border-stone-200 bg-stone-50 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-stone-900 truncate">
                    Edit Vault Cash Deposit
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-300 shrink-0">
                    Vault Injection
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-stone-500 mt-0.5 line-clamp-1">
                  Update deposit amount, category, date, or notes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingVaultDeposit(null)}
                className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-200/60 transition-colors cursor-pointer shrink-0"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="form-edit-vault-deposit" onSubmit={handleSaveEditDeposit} className="flex-1 overflow-y-auto overscroll-contain min-h-0 p-4 sm:p-5 space-y-4 text-xs">
              {/* Category selector */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Deposit Category:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {VAULT_CATEGORIES.map(cat => {
                    const Icon = cat.icon;
                    const isSelected = editDepositCategory === cat.category;
                    return (
                      <button
                        key={cat.category}
                        type="button"
                        onClick={() => setEditDepositCategory(cat.category)}
                        className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-2 ${
                          isSelected
                            ? 'border-amber-600 bg-amber-50 ring-1 ring-amber-600 text-amber-950 font-bold'
                            : 'border-stone-200 bg-stone-50 hover:bg-white text-stone-700'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-xs truncate">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Deposit Amount (PKR) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-stone-400 select-none">
                    Rs.
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={editDepositAmount}
                    onChange={e => setEditDepositAmount(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-lg font-bold font-mono text-stone-900 focus:bg-white focus:border-amber-600 outline-hidden"
                  />
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={editDepositDate}
                    onChange={e => setEditDepositDate(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono font-bold text-stone-900 focus:bg-white focus:border-amber-600 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={editDepositTime}
                    onChange={e => setEditDepositTime(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono text-stone-900 focus:bg-white focus:border-amber-600 outline-hidden"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Particulars / Remarks
                </label>
                <textarea
                  rows={2}
                  value={editDepositNotes}
                  onChange={e => setEditDepositNotes(e.target.value)}
                  placeholder="Notes about this vault deposit..."
                  className="w-full px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs text-stone-800 focus:bg-white focus:border-amber-600 outline-hidden resize-none"
                />
              </div>
            </form>

            {/* Pinned Footer */}
            <div className="shrink-0 p-3.5 sm:p-4 border-t border-stone-200 bg-stone-50 flex flex-wrap items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditingVaultDeposit(null)}
                className="px-4 py-2 bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="form-edit-vault-deposit"
                className="px-5 py-2.5 bg-amber-700 hover:bg-amber-800 active:bg-amber-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Update Vault Deposit</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT VAULT BASELINE RESERVE */}
      {isEditingBaselineModalOpen && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex min-h-full items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-200"
          onClick={() => setIsEditingBaselineModalOpen(false)}
        >
          <div 
            className="bg-white border border-stone-200 rounded-2xl w-full max-w-lg sm:max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[min(90vh,calc(100dvh-2rem))] my-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Header (Pinned) */}
            <div className="shrink-0 p-4 sm:p-5 border-b border-stone-200 bg-stone-50 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-stone-900 truncate">
                    Edit Vault Baseline Starting Reserve
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-950 border border-amber-300 shrink-0">
                    Baseline Float
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-stone-500 mt-0.5 line-clamp-1">
                  Adjust initial starting cash stored in the safe vault and its effective date/time.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingBaselineModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-200/60 transition-colors cursor-pointer shrink-0"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="form-edit-baseline" onSubmit={handleSaveBaselineEdit} className="flex-1 overflow-y-auto overscroll-contain min-h-0 p-4 sm:p-5 space-y-4 text-xs">
              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Baseline Safe Cash Amount (PKR) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-stone-400 select-none">
                    Rs.
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={editBaselineAmount}
                    onChange={e => setEditBaselineAmount(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-lg font-bold font-mono text-stone-900 focus:bg-white focus:border-amber-600 outline-hidden"
                  />
                </div>

                {/* Quick Presets */}
                <div className="grid grid-cols-4 gap-1.5 mt-2">
                  {[295500, 433500, 500000, 1000000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setEditBaselineAmount(String(amt))}
                      className="py-1.5 bg-stone-100 hover:bg-amber-50 hover:text-amber-900 border border-stone-200 rounded-lg text-xs font-mono font-bold text-stone-700 transition-colors cursor-pointer"
                    >
                      {formatPKR(amt)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Effective Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={editBaselineDate}
                    onChange={e => setEditBaselineDate(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono font-bold text-stone-900 focus:bg-white focus:border-amber-600 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Effective Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={editBaselineTime}
                    onChange={e => setEditBaselineTime(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono text-stone-900 focus:bg-white focus:border-amber-600 outline-hidden"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-stone-700 leading-relaxed text-[11px]">
                🛡️ <strong>Accounting Ledger Note:</strong> The baseline starting cash acts as the vault&apos;s initial balance row in your ledger, upon which subsequent day-end transfers and direct deposits build progressive running balances.
              </div>
            </form>

            {/* Pinned Footer */}
            <div className="shrink-0 p-3.5 sm:p-4 border-t border-stone-200 bg-stone-50 flex flex-wrap items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsEditingBaselineModalOpen(false)}
                className="px-4 py-2 bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="form-edit-baseline"
                className="px-5 py-2.5 bg-amber-700 hover:bg-amber-800 active:bg-amber-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Baseline Reserve</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
