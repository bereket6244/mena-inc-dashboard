import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Customer, BankAccount, Purchase, ExpenseCategory, PaperStock, EmployeeUser, BankAccountAdjustment, AuditLogEntry, Loan } from '../types';
import { parseFractionOrExpression, cleanLeadingZeros } from '../utils';
import SearchableSelect from './SearchableSelect';
import { TableToolbar } from './shared/TabLayout';
import AppToast, { AppToastType } from './shared/AppToast';
import { 
  TrendingUp, 
  DollarSign, 
  UserCheck, 
  PieChart as PieIcon, 
  Users, 
  BarChart, 
  Terminal,
  Building,
  CreditCard,
  Banknote,
  Plus,
  Trash2,
  Lock,
  Edit2,
  X,
  Check,
  Calendar,
  Filter,
  RefreshCw,
  Download,
  ChevronDown,
  ChevronRight,
  Search,
  ArrowUpDown,
  FileText,
  ShoppingBag,
  Activity
} from 'lucide-react';

interface PerformanceTabProps {
  customers: Customer[];
  bankAccounts: BankAccount[];
  onAddBankAccount: (account: BankAccount) => void;
  onUpdateBankAccount: (account: BankAccount) => void;
  onDeleteBankAccount: (idOrIds: string | string[]) => void;
  purchases?: Purchase[];
  loans?: Loan[];
  categories?: ExpenseCategory[];
  paperStocks?: PaperStock[];
  currentUser?: EmployeeUser | null;
  highlightedSearchResult?: { type: string; id: string } | null;
  onNavigateFromSummary?: (target: 'customers' | 'customers-debt' | 'purchases') => void;
  onAuditLog?: (entry: Omit<AuditLogEntry, 'id' | 'performedBy' | 'performedAt'> & Partial<Pick<AuditLogEntry, 'performedBy' | 'performedAt'>>) => void;
}

export default function PerformanceTab({ 
  customers, 
  bankAccounts,
  onAddBankAccount,
  onUpdateBankAccount,
  onDeleteBankAccount,
  purchases = [],
  loans = [],
  categories = [],
  paperStocks = [],
  currentUser = null,
  highlightedSearchResult = null,
  onNavigateFromSummary,
  onAuditLog
}: PerformanceTabProps) {
  const formatMockupValue = (val: number) => {
    if (val === 0) return '0';
    if (val % 1 !== 0) {
      return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return val.toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  const copyTextToClipboard = async (value: string) => {
    try {
      await navigator.clipboard?.writeText(value);
    } catch (_) {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  };

  const CopyableAmount = ({
    value,
    className = '',
    currency,
    displayValue,
    copyValue,
    copyId,
    minimumFractionDigits = 1,
    maximumFractionDigits = 2,
  }: {
    value: number;
    className?: string;
    currency?: string;
    displayValue?: string;
    copyValue?: string;
    copyId?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }) => {
    const formatted = value.toLocaleString(undefined, { minimumFractionDigits, maximumFractionDigits });
    const visibleValue = displayValue || formatted;
    const resolvedCopyId = copyId || `${visibleValue}-${currency || 'amount'}`;
    return (
      <span className="inline-flex items-center gap-1 align-baseline">
        <span
          role="button"
          tabIndex={0}
          onClick={(event) => {
            event.stopPropagation();
            copyTextToClipboard(copyValue || visibleValue);
            showCopiedAmountIndicator(resolvedCopyId);
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            event.stopPropagation();
            copyTextToClipboard(copyValue || visibleValue);
            showCopiedAmountIndicator(resolvedCopyId);
          }}
          className={`text-left rounded-sm focus:outline-none ${className}`}
          title="Copy number"
        >
          {visibleValue}{currency ? <span className="text-[10px] font-semibold"> {currency}</span> : null}
        </span>
        {copiedAmountId === resolvedCopyId && (
          <span className="shrink-0 rounded border border-[#71b536]/40 bg-[#112918] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#71b536] shadow-sm">
            Copied
          </span>
        )}
      </span>
    );
  };

  // New Bank dynamic form states
  const [bankName, setBankName] = useState('');
  const [bankNumber, setBankNumber] = useState('');
  const [bankInitial, setBankInitial] = useState<string>('');
  const [bankCurrency, setBankCurrency] = useState('ETB');
  const [customCurrencies, setCustomCurrencies] = useState<string[]>([]);
  const [isAddingBank, setIsAddingBank] = useState(false);
  const [bankError, setBankError] = useState('');
  const [bankToastMessage, setBankToastMessage] = useState<string | null>(null);
  const [bankToastType, setBankToastType] = useState<AppToastType>('success');

  // Inline editing variables
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editNumber, setEditNumber] = useState('');
  const [editCurrency, setEditCurrency] = useState('ETB');
  const [adjustingBank, setAdjustingBank] = useState<BankAccount | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract'>('add');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');

  // Deletion tracking state
  const [deletingBankId, setDeletingBankId] = useState<string | null>(null);

  // Multi-selection state for payment methods/bank accounts
  const [selectedBankIds, setSelectedBankIds] = useState<string[]>([]);
  const bankLongPressTimerRef = useRef<number | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Redesign States
  const [selectedCurrency, setSelectedCurrency] = useState('ETB');
  const [showAllCurrencies, setShowAllCurrencies] = useState(false);
  const [showAllAccounts, setShowAllAccounts] = useState(false);
  const [activeMenuBankId, setActiveMenuBankId] = useState<string | null>(null);
  const [copiedAmountId, setCopiedAmountId] = useState<string | null>(null);
  const copiedAmountTimerRef = useRef<number | null>(null);

  function showCopiedAmountIndicator(copyId: string) {
    setCopiedAmountId(copyId);
    if (copiedAmountTimerRef.current) {
      window.clearTimeout(copiedAmountTimerRef.current);
    }
    copiedAmountTimerRef.current = window.setTimeout(() => {
      setCopiedAmountId(null);
      copiedAmountTimerRef.current = null;
    }, 1200);
  }

  const showBankToast = (message: string, type: AppToastType = 'success') => {
    setBankToastMessage(message);
    setBankToastType(type);
    window.setTimeout(() => setBankToastMessage(null), 3000);
  };

  const clearBankLongPressTimer = () => {
    if (bankLongPressTimerRef.current !== null) {
      window.clearTimeout(bankLongPressTimerRef.current);
      bankLongPressTimerRef.current = null;
    }
  };

  const toggleBankSelection = (bankId: string) => {
    setSelectedBankIds(prev => (
      prev.includes(bankId)
        ? prev.filter(id => id !== bankId)
        : [...prev, bankId]
    ));
  };

  const startBankLongPress = (bankId: string, event: React.TouchEvent) => {
    const target = event.target as HTMLElement;
    if (target.closest('button, input, select, textarea, a, [role="button"]')) return;
    clearBankLongPressTimer();
    bankLongPressTimerRef.current = window.setTimeout(() => {
      toggleBankSelection(bankId);
      bankLongPressTimerRef.current = null;
    }, 520);
  };

  const handleBankCardClick = (bankId: string, event: React.MouseEvent) => {
    if (selectedBankIds.length === 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('button, input, select, textarea, a, [role="button"]')) return;
    toggleBankSelection(bankId);
  };

  const getBankCurrentBalance = (bank: BankAccount) => {
    const advancesForBank = customers
      .filter(c => c.paymentMethodId === bank.id || (!c.paymentMethodId && bank.id === 'b1'))
      .reduce((sum, c) => sum + Number(c.advancePayment || 0), 0);

    const completedRemainingForBank = customers
      .filter(c => !!c.deliveryDate && (c.bankRemainingId === bank.id || (!c.bankRemainingId && bank.id === 'b1' && c.paymentMethodId === bank.id)))
      .reduce((sum, c) => {
        const base = c.quantity * c.unitPrice;
        const vat = c.isVatAdded ? base * 0.15 : 0;
        const totalInvoice = base + vat;
        const remaining = totalInvoice - c.advancePayment;
        return sum + Math.max(0, remaining);
      }, 0);

    const purchasesOutOfBank = purchases
      .filter(p => p.paymentMethodId === bank.id)
      .reduce((sum, p) => sum + Number(p.totalPrice || 0), 0);

    return bank.initialBalance + advancesForBank + completedRemainingForBank - purchasesOutOfBank + getLoanCashMovementForBank(bank.id);
  };

  const getLoanCashMovementForBank = (bankId: string) => loans.reduce((sum, loan) => {
    const principal = Number(loan.principalAmount || 0);
    const loanStartsInBank = loan.paymentMethodId === bankId
      ? (loan.type === 'given' ? -principal : principal)
      : 0;
    const repaymentsForBank = (loan.payments || [])
      .filter(payment => payment.paymentMethodId === bankId)
      .reduce((paymentSum, payment) => {
        const amount = Number(payment.amount || 0);
        return paymentSum + (loan.type === 'given' ? amount : -amount);
      }, 0);
    return sum + loanStartsInBank + repaymentsForBank;
  }, 0);

  // Filter States (previously missing)
  const [summarySearch, setSummarySearch] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [summaryStartDate, setSummaryStartDate] = useState('');
  const [summaryEndDate, setSummaryEndDate] = useState('');
  const [summaryCurrency, setSummaryCurrency] = useState('All');
  const [summaryAccount, setSummaryAccount] = useState('All');
  const [summaryEmployee, setSummaryEmployee] = useState('All');
  const [collapsedCurrencies, setCollapsedCurrencies] = useState<Record<string, boolean>>({});
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(true);
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchWrapperRef = useRef<HTMLDivElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchExpanded) {
      searchInputRef.current?.focus();
      mobileSearchInputRef.current?.focus();
    }
  }, [isSearchExpanded]);

  useEffect(() => {
    if (highlightedSearchResult?.type !== 'bank' || !highlightedSearchResult.id) return;
    setShowAllAccounts(true);
    setSummarySearch('');
  }, [highlightedSearchResult]);

  useEffect(() => {
    const handleFocusSearch = (event: Event) => {
      const requestedTab = (event as CustomEvent)?.detail?.tab;
      if (requestedTab && requestedTab !== 'performance') return;
      setIsSearchExpanded(true);
      window.setTimeout(() => {
        const desktopVisible = searchInputRef.current && window.getComputedStyle(searchInputRef.current).display !== 'none';
        if (desktopVisible) {
          searchInputRef.current?.focus();
        } else {
          mobileSearchInputRef.current?.focus();
        }
      }, 0);
    };
    window.addEventListener('mena:focus-search', handleFocusSearch);
    return () => window.removeEventListener('mena:focus-search', handleFocusSearch);
  }, []);

  useEffect(() => {
    return () => {
      if (copiedAmountTimerRef.current) {
        window.clearTimeout(copiedAmountTimerRef.current);
      }
      clearBankLongPressTimer();
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        if (!summarySearch) {
          setIsSearchExpanded(false);
        }
      }
      if (mobileSearchWrapperRef.current && !mobileSearchWrapperRef.current.contains(e.target as Node)) {
        if (!summarySearch) {
          setIsSearchExpanded(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSearchExpanded, summarySearch]);

  // Helper to resolve currency of a BankAccount ID
  const getBankCurrency = (id?: string) => {
    if (!id) return 'ETB';
    const found = bankAccounts.find(b => b.id === id);
    return found?.currency || 'ETB';
  };

  const applyDatePreset = (preset: 'all' | 'thisMonth' | 'last30' | 'thisYear') => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    if (preset === 'all') {
      setSummaryStartDate('');
      setSummaryEndDate('');
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      const tzOffset = firstDay.getTimezoneOffset() * 60000;
      const firstDayLocal = new Date(firstDay.getTime() - tzOffset).toISOString().split('T')[0];
      const lastDayLocal = new Date(lastDay.getTime() - tzOffset).toISOString().split('T')[0];
      
      setSummaryStartDate(firstDayLocal);
      setSummaryEndDate(lastDayLocal);
    } else if (preset === 'last30') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      
      const tzOffset = thirtyDaysAgo.getTimezoneOffset() * 60000;
      const thirtyDaysAgoStr = new Date(thirtyDaysAgo.getTime() - tzOffset).toISOString().split('T')[0];
      
      setSummaryStartDate(thirtyDaysAgoStr);
      setSummaryEndDate(todayStr);
    } else if (preset === 'thisYear') {
      const firstDay = new Date(today.getFullYear(), 0, 1);
      const lastDay = new Date(today.getFullYear(), 11, 31);
      
      const tzOffset = firstDay.getTimezoneOffset() * 60000;
      const firstDayLocal = new Date(firstDay.getTime() - tzOffset).toISOString().split('T')[0];
      const lastDayLocal = new Date(lastDay.getTime() - tzOffset).toISOString().split('T')[0];
      
      setSummaryStartDate(firstDayLocal);
      setSummaryEndDate(lastDayLocal);
    }
  };

  // Dynamic filtering of purchases for aggregate analysis
  const filteredPurchasesForInterval = purchases.filter(p => {
    const pCurr = getBankCurrency(p.paymentMethodId);
    if (summaryCurrency !== 'All' && pCurr !== summaryCurrency) return false;
    if (summaryAccount !== 'All' && p.paymentMethodId !== summaryAccount) return false;
    if (summaryEmployee !== 'All' && p.recordedBy !== summaryEmployee && p.purchasedBy !== summaryEmployee) return false;
    if (summaryStartDate && p.purchaseDate < summaryStartDate) return false;
    if (summaryEndDate && p.purchaseDate > summaryEndDate) return false;
    if (summarySearch) {
      const searchLower = summarySearch.toLowerCase();
      const itemMatch = p.itemOrService?.toLowerCase().includes(searchLower);
      const catMatch = p.expenseCategory?.toLowerCase().includes(searchLower);
      const noteMatch = p.notesOrDescription?.toLowerCase().includes(searchLower);
      const recordedMatch = p.recordedBy?.toLowerCase().includes(searchLower);
      if (!itemMatch && !catMatch && !noteMatch && !recordedMatch) return false;
    }
    return true;
  });

  const filteredExpenseSum = filteredPurchasesForInterval.reduce((sum, p) => sum + Number(p.totalPrice || 0), 0);

  const loanMatchesSummarySearch = (loan: Loan) => {
    if (!summarySearch) return true;
    const searchLower = summarySearch.toLowerCase();
    return Boolean(
      loan.personName?.toLowerCase().includes(searchLower) ||
      loan.phone?.toLowerCase().includes(searchLower) ||
      loan.notes?.toLowerCase().includes(searchLower) ||
      loan.recordedBy?.toLowerCase().includes(searchLower)
    );
  };

  const loanPrincipalMatchesSummaryFilters = (loan: Loan) => {
    const loanCurrency = getBankCurrency(loan.paymentMethodId);
    if (summaryCurrency !== 'All' && loanCurrency !== summaryCurrency) return false;
    if (summaryAccount !== 'All' && loan.paymentMethodId !== summaryAccount) return false;
    if (summaryEmployee !== 'All' && loan.recordedBy !== summaryEmployee) return false;
    if (summaryStartDate && (!loan.loanDate || loan.loanDate < summaryStartDate)) return false;
    if (summaryEndDate && (!loan.loanDate || loan.loanDate > summaryEndDate)) return false;
    if (!loanMatchesSummarySearch(loan)) return false;
    return true;
  };

  const loanPaymentMatchesSummaryFilters = (loan: Loan, payment: NonNullable<Loan['payments']>[number]) => {
    const paymentCurrency = getBankCurrency(payment.paymentMethodId);
    if (summaryCurrency !== 'All' && paymentCurrency !== summaryCurrency) return false;
    if (summaryAccount !== 'All' && payment.paymentMethodId !== summaryAccount) return false;
    if (summaryEmployee !== 'All' && payment.recordedBy !== summaryEmployee) return false;
    if (summaryStartDate && (!payment.paymentDate || payment.paymentDate < summaryStartDate)) return false;
    if (summaryEndDate && (!payment.paymentDate || payment.paymentDate > summaryEndDate)) return false;
    if (!loanMatchesSummarySearch(loan)) return false;
    return true;
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName.trim()) {
      setBankError('Account Name/Bank identifier is required.');
      showBankToast('Account name is required.', 'error');
      return;
    }
    const cleanInitial = Math.max(0, parseFractionOrExpression(bankInitial));
    
    const newAcct: BankAccount = {
      id: 'b_' + Date.now().toString(),
      name: bankName.trim(),
      accountNumber: bankNumber.trim() || undefined,
      initialBalance: cleanInitial,
      currency: bankCurrency
    };
    
    onAddBankAccount(newAcct);
    setBankName('');
    setBankNumber('');
    setBankInitial('');
    setBankCurrency('ETB');
    setIsAddingBank(false);
    setBankError('');
    showBankToast('Bank account added successfully.');
  };

  const startEditing = (b: BankAccount) => {
    setEditingBankId(b.id);
    setEditName(b.name);
    setEditNumber(b.accountNumber || '');
    setEditCurrency(b.currency || 'ETB');
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) return;
    const existing = bankAccounts.find(account => account.id === id);
    if (!existing) return;

    onUpdateBankAccount({
      ...existing,
      id,
      name: editName.trim(),
      accountNumber: editNumber.trim() || undefined,
      initialBalance: existing.initialBalance,
      currency: editCurrency
    });
    setEditingBankId(null);
    showBankToast('Bank account updated successfully.');
  };

  const openAdjustmentModal = (bank: BankAccount, type: 'add' | 'subtract' = 'add') => {
    setAdjustingBank(bank);
    setAdjustmentType(type);
    setAdjustmentAmount('');
    setAdjustmentReason('');
    setActiveMenuBankId(null);
  };

  const handleConfirmBalanceAdjustment = async () => {
    if (!adjustingBank) return;
    const amount = Math.max(0, parseFractionOrExpression(adjustmentAmount));
    const reason = adjustmentReason.trim();
    if (amount <= 0) {
      showBankToast('Enter an adjustment amount greater than zero.', 'error');
      return;
    }
    if (!reason) {
      showBankToast('Adjustment reason is required.', 'error');
      return;
    }

    const previousInitialBalance = Number(adjustingBank.initialBalance || 0);
    const newInitialBalance = adjustmentType === 'add'
      ? previousInitialBalance + amount
      : Math.max(0, previousInitialBalance - amount);

    const updatedAccount: BankAccount = {
      ...adjustingBank,
      initialBalance: newInitialBalance
    };

    const adjustmentRecord: BankAccountAdjustment = {
      id: `baa_${Date.now()}`,
      bankAccountId: adjustingBank.id,
      bankAccountName: adjustingBank.name,
      adjustmentType,
      amount,
      previousInitialBalance,
      newInitialBalance,
      reason,
      editedBy: currentUser?.name || currentUser?.username || 'unknown',
      editedAt: new Date().toISOString()
    };

    onUpdateBankAccount(updatedAccount);
    try {
      const { saveBankAccountAdjustmentDoc } = await import('../lib/dbService');
      await saveBankAccountAdjustmentDoc(adjustmentRecord);
    } catch (_) {}
    onAuditLog?.({
      eventType: 'bank_adjustment',
      entityType: 'bank_account',
      entityId: adjustingBank.id,
      entityLabel: adjustingBank.name,
      action: `${adjustmentType === 'add' ? 'Added to' : 'Subtracted from'} bank account ${adjustingBank.name}`,
      performedBy: adjustmentRecord.editedBy,
      performedAt: adjustmentRecord.editedAt,
      details: {
        adjustmentType,
        amount,
        previousInitialBalance,
        newInitialBalance,
        reason
      }
    });
    setAdjustingBank(null);
    setAdjustmentAmount('');
    setAdjustmentReason('');
    showBankToast(`Balance ${adjustmentType === 'add' ? 'increased' : 'decreased'} successfully.`);
  };

  const handleConfirmBulkDelete = () => {
    onDeleteBankAccount(selectedBankIds);
    setSelectedBankIds([]);
    setShowBulkDeleteConfirm(false);
  };

  useEffect(() => {
    const isPerformanceShortcut = (event: Event) => (event as CustomEvent)?.detail?.tab === 'performance';
    const shortcutsBlocked = Boolean(showBulkDeleteConfirm || adjustingBank || deletingBankId || editingBankId || isAddingBank);
    const handleNewRecord = (event: Event) => {
      if (!isPerformanceShortcut(event) || shortcutsBlocked) return;
      setIsAddingBank(true);
    };
    const handleSelectAllVisible = (event: Event) => {
      if (!isPerformanceShortcut(event) || shortcutsBlocked) return;
      setSelectedBankIds(bankAccounts
        .filter(bank => !bank.isDeleted && (showAllAccounts || (bank.currency || 'ETB') === selectedCurrency))
        .map(bank => bank.id));
    };
    const handleDeleteSelected = (event: Event) => {
      if (!isPerformanceShortcut(event) || shortcutsBlocked || selectedBankIds.length === 0) return;
      setShowBulkDeleteConfirm(true);
    };
    const handleCopySelected = async (event: Event) => {
      if (!isPerformanceShortcut(event) || shortcutsBlocked || selectedBankIds.length === 0) return;
      const selectedAmounts = bankAccounts
        .filter(bank => selectedBankIds.includes(bank.id))
        .map(bank => formatMockupValue(getBankCurrentBalance(bank)));
      if (selectedAmounts.length === 0) return;
      await copyTextToClipboard(selectedAmounts.join('\n'));
      showBankToast(selectedAmounts.length === 1 ? 'Amount copied.' : 'Selected amounts copied.');
    };

    window.addEventListener('mena:new-record', handleNewRecord);
    window.addEventListener('mena:select-all-visible', handleSelectAllVisible);
    window.addEventListener('mena:delete-selected', handleDeleteSelected);
    window.addEventListener('mena:copy-selected', handleCopySelected);
    return () => {
      window.removeEventListener('mena:new-record', handleNewRecord);
      window.removeEventListener('mena:select-all-visible', handleSelectAllVisible);
      window.removeEventListener('mena:delete-selected', handleDeleteSelected);
      window.removeEventListener('mena:copy-selected', handleCopySelected);
    };
  }, [showBulkDeleteConfirm, adjustingBank, deletingBankId, editingBankId, isAddingBank, bankAccounts, customers, purchases, showAllAccounts, selectedCurrency, selectedBankIds]);

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;

      if (event.key === 'Escape') {
        if (showBulkDeleteConfirm) {
          event.preventDefault();
          setShowBulkDeleteConfirm(false);
        } else if (adjustingBank) {
          event.preventDefault();
          setAdjustingBank(null);
        } else if (deletingBankId) {
          event.preventDefault();
          setDeletingBankId(null);
        } else if (editingBankId) {
          event.preventDefault();
          setEditingBankId(null);
        } else if (isAddingBank) {
          event.preventDefault();
          setIsAddingBank(false);
        }
      }

      if (event.key === 'Enter' && !(event.target instanceof HTMLTextAreaElement)) {
        if (showBulkDeleteConfirm) {
          event.preventDefault();
          handleConfirmBulkDelete();
        } else if (adjustingBank) {
          event.preventDefault();
          handleConfirmBalanceAdjustment();
        } else if (deletingBankId) {
          event.preventDefault();
          onDeleteBankAccount(deletingBankId);
          setDeletingBankId(null);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showBulkDeleteConfirm, adjustingBank, adjustmentAmount, adjustmentReason, adjustmentType, deletingBankId, editingBankId, isAddingBank, selectedBankIds]);

  // Dynamic filtering of customers for interval analysis
  const filteredCustomersForInterval = customers.filter(c => {
    const cCurr = getBankCurrency(c.paymentMethodId || c.bankRemainingId);
    if (summaryCurrency !== 'All' && cCurr !== summaryCurrency) return false;
    if (summaryAccount !== 'All' && c.paymentMethodId !== summaryAccount && c.bankRemainingId !== summaryAccount) return false;
    if (summaryEmployee !== 'All' && c.orderTakenBy !== summaryEmployee) return false;
    
    const orderDate = c.advancePaymentDate || c.deliveryDate || '';
    if (summaryStartDate && (!orderDate || orderDate < summaryStartDate)) return false;
    if (summaryEndDate && (!orderDate || orderDate > summaryEndDate)) return false;
    if (summarySearch) {
      const searchLower = summarySearch.toLowerCase();
      const nameMatch = c.clientName?.toLowerCase().includes(searchLower);
      const productMatch = c.productType?.toLowerCase().includes(searchLower);
      const empMatch = c.orderTakenBy?.toLowerCase().includes(searchLower);
      if (!nameMatch && !productMatch && !empMatch) return false;
    }
    return true;
  });

  // 1. Total Gross Orders grouped by currency (Customer products are estimated in currency of Advance Payment Account, falling back to ETB)
  const grossByCurrency: Record<string, number> = {};
  filteredCustomersForInterval.forEach(c => {
    const curr = getBankCurrency(c.paymentMethodId || c.bankRemainingId);
    const val = c.quantity * c.unitPrice;
    grossByCurrency[curr] = (grossByCurrency[curr] || 0) + val;
  });

  // 2. Outgoing supplier material expenses & purchases grouped by payment account currency
  const spentByCurrency: Record<string, number> = {};
  filteredPurchasesForInterval.forEach(p => {
    const curr = getBankCurrency(p.paymentMethodId);
    const val = Number(p.totalPrice || 0);
    spentByCurrency[curr] = (spentByCurrency[curr] || 0) + val;
  });

  const loanGivenByCurrency: Record<string, number> = {};
  const loanReceivedByCurrency: Record<string, number> = {};
  const loanCashMovementByCurrency: Record<string, number> = {};
  loans.forEach(loan => {
    if (loanPrincipalMatchesSummaryFilters(loan)) {
      const curr = getBankCurrency(loan.paymentMethodId);
      const principal = Number(loan.principalAmount || 0);
      if (loan.type === 'given') {
        loanGivenByCurrency[curr] = (loanGivenByCurrency[curr] || 0) + principal;
        loanCashMovementByCurrency[curr] = (loanCashMovementByCurrency[curr] || 0) - principal;
      } else {
        loanReceivedByCurrency[curr] = (loanReceivedByCurrency[curr] || 0) + principal;
        loanCashMovementByCurrency[curr] = (loanCashMovementByCurrency[curr] || 0) + principal;
      }
    }

    (loan.payments || []).forEach(payment => {
      if (!loanPaymentMatchesSummaryFilters(loan, payment)) return;
      const curr = getBankCurrency(payment.paymentMethodId);
      const amount = Number(payment.amount || 0);
      loanCashMovementByCurrency[curr] = (loanCashMovementByCurrency[curr] || 0) + (loan.type === 'given' ? amount : -amount);
    });
  });

  // 3. Collected cash in-hand grouped by currency (inflow - outflow per currency)
  const inflowByCurrency: Record<string, number> = {};
  filteredCustomersForInterval.forEach(c => {
    // Advance payment inflow
    const advCurr = getBankCurrency(c.paymentMethodId);
    const advVal = Number(c.advancePayment || 0);
    inflowByCurrency[advCurr] = (inflowByCurrency[advCurr] || 0) + advVal;

    // Remaining payment inflow
    if (c.deliveryDate && c.bankRemainingId) {
      const remCurr = getBankCurrency(c.bankRemainingId);
      const base = c.quantity * c.unitPrice;
      const vat = c.isVatAdded ? base * 0.15 : 0;
      const invoice = base + vat;
      const remVal = Math.max(0, invoice - c.advancePayment);
      inflowByCurrency[remCurr] = (inflowByCurrency[remCurr] || 0) + remVal;
    }
  });

  // Unique currencies across all datasets
  const allCurrencies = Array.from(new Set([
    ...bankAccounts.map(b => b.currency || 'ETB'),
    ...Object.keys(grossByCurrency),
    ...Object.keys(spentByCurrency),
    ...Object.keys(inflowByCurrency),
    ...Object.keys(loanGivenByCurrency),
    ...Object.keys(loanReceivedByCurrency),
    ...Object.keys(loanCashMovementByCurrency),
    'ETB'
  ]));

  const newAccountCurrencies = Array.from(new Set([
    'ETB', 'USD', 'EUR', 'GBP', 'AED',
    ...allCurrencies,
    ...customCurrencies
  ]));

  const formatGroupedAmounts = (grouped: Record<string, number>) => {
    const items = Object.entries(grouped)
      .filter(([_, val]) => val !== 0)
      .map(([curr, val]) => `${val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} ${curr}`);
    return items.length > 0 ? items.join(' | ') : '0.0 ETB';
  };

  const formatGroupedCollectedCash = () => {
    const items = allCurrencies.map(curr => {
      const inflow = inflowByCurrency[curr] || 0;
      const spent = spentByCurrency[curr] || 0;
      const loanMovement = loanCashMovementByCurrency[curr] || 0;
      const balance = inflow - spent + loanMovement;
      return { curr, balance };
    }).filter(item => item.balance !== 0 || item.curr === 'ETB');

    return items.map(item => `${item.balance.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} ${item.curr}`).join(' | ');
  };

  // 4. Total Outstanding Debt grouped by final payment method currency
  const debtByCurrency: Record<string, number> = {};
  filteredCustomersForInterval.forEach(c => {
    if (c.deliveryDate && c.bankRemainingId) return;
    const curr = getBankCurrency(c.bankRemainingId || c.paymentMethodId);
    const base = c.quantity * c.unitPrice;
    const vat = c.isVatAdded ? base * 0.15 : 0;
    const invoice = base + vat;
    const remaining = Math.max(0, invoice - c.advancePayment);
    debtByCurrency[curr] = (debtByCurrency[curr] || 0) + remaining;
  });


  // --- EMPLOYEE LEADERBOARD (QUERY E) ---
  // GROUP BY E (Order Taken By)
  const employeeDataMap: Record<string, { count: number; gross: number }> = {};
  customers.forEach(c => {
    const emp = c.orderTakenBy || 'Unknown';
    const grossVal = c.quantity * c.unitPrice;
    if (!employeeDataMap[emp]) {
      employeeDataMap[emp] = { count: 0, gross: 0 };
    }
    employeeDataMap[emp].count += 1;
    employeeDataMap[emp].gross += grossVal;
  });

  const employeeLeaderboard = Object.entries(employeeDataMap).map(([name, data]) => ({
    name,
    completed: data.count,
    totalGross: data.gross
  })).sort((a, b) => b.totalGross - a.totalGross);

  const allEmployees = Array.from(new Set(customers.map(c => c.orderTakenBy).filter(Boolean))).sort();

  // --- MARKETING PERFORMANCE (QUERY D) ---
  // GROUP BY D (Acquisition Source) ORDER BY SUM(X) DESC
  const marketingDataMap: Record<string, { count: number; revenue: number }> = {};
  customers.forEach(c => {
    const channel = c.acquisitionSource || 'Unknown';
    const revenueVal = c.quantity * c.unitPrice;
    if (!marketingDataMap[channel]) {
      marketingDataMap[channel] = { count: 0, revenue: 0 };
    }
    marketingDataMap[channel].count += 1;
    marketingDataMap[channel].revenue += revenueVal;
  });

  const marketingPerformance = Object.entries(marketingDataMap).map(([channel, data]) => ({
    channel,
    totalLeads: data.count,
    totalRevenue: data.revenue
  })).sort((a, b) => b.totalRevenue - a.totalRevenue); // descending sequence for tables

  const maxRevenueChannel = Math.max(...marketingPerformance.map(m => m.totalRevenue), 1);
  const maxEmployeeGross = Math.max(...employeeLeaderboard.map(e => e.totalGross), 1);

  return (
    <div className="space-y-5 bg-[#FAF7F0] text-[#111111] rounded-md p-2 sm:p-4" id="performance-tab-pnl">
      <AppToast message={bankToastMessage} type={bankToastType} />

      {/* ========================================== */}
      {/* MOBILE LAYOUT                              */}
      {/* ========================================== */}
      <div className="block md:hidden space-y-3.5 text-[#111111]">
        {/* Mobile Top Section & Control Area */}
        <div className="flex flex-col gap-1.5 py-1">
          {/* Row 1 */}
          <div className="flex items-center justify-between w-full h-10">
            {/* Currency Selector (No dropdown arrow/chevron, text centered) */}
            <div className="relative">
              <select
                value={selectedCurrency}
                onChange={(e) => {
                  setSelectedCurrency(e.target.value);
                  setShowAllCurrencies(false);
                }}
                style={{ textAlign: 'center', textAlignLast: 'center' }}
                className="appearance-none bg-[#FAF8F2] border border-[#E7E3D4] text-black text-xs font-bold font-sans rounded-[8px] py-2 px-3 text-center shadow-xs focus:outline-none focus:border-[#ee317b]"
              >
                {newAccountCurrencies.map(curr => (
                  <option key={curr} value={curr}>
                    {curr}
                  </option>
                ))}
              </select>
            </div>

            {/* Search & Filter Controls on Right */}
            <div ref={mobileSearchWrapperRef} className="flex items-center gap-2">
              <AnimatePresence initial={false} mode="wait">
                {!(isSearchExpanded || summarySearch) ? (
                  <motion.div
                    key="icons-normal"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    {/* Search Icon (Visually same as desktop) */}
                    <button
                      type="button"
                      onClick={() => setIsSearchExpanded(true)}
                      className="flex items-center justify-center p-1.5 rounded text-gray-300 hover:bg-[#181818] transition-colors cursor-pointer"
                      title="Search database"
                    >
                      <Search className="w-3.5 h-3.5" />
                    </button>

                    {/* Filter Icon Popover (Visually same as desktop) */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowFilterPopover(!showFilterPopover)}
                        className={`flex items-center justify-center p-1.5 rounded text-stone-600 hover:bg-[#dfdccf]/35 hover:text-black transition-colors cursor-pointer ${
                          (summaryStartDate || summaryEndDate || summaryAccount !== 'All' || summaryEmployee !== 'All')
                            ? 'text-[#ee317b]'
                            : ''
                        }`}
                        title="Filters"
                      >
                        <Filter className="w-3.5 h-3.5" />
                      </button>

                      {showFilterPopover && (
                        <>
                          <div className="fixed inset-0 z-40 bg-black/10" onClick={() => setShowFilterPopover(false)} />
                          <div className="absolute right-0 mt-2 w-72 bg-white border border-[#E7E3D4] rounded-lg shadow-lg z-50 p-4 text-xs font-sans text-black animate-fadeIn">
                            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                              <span className="font-bold text-stone-500 uppercase tracking-wider">Filters</span>
                              {(summaryStartDate || summaryEndDate || summaryAccount !== 'All' || summaryEmployee !== 'All') && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSummaryStartDate('');
                                    setSummaryEndDate('');
                                    setSummaryAccount('All');
                                    setSummaryEmployee('All');
                                  }}
                                  className="text-[#ee317b] font-bold"
                                >
                                  Clear All
                                </button>
                              )}
                            </div>
                            
                            <div className="mt-3 space-y-3">
                              <div className="space-y-1">
                                <label className="block text-[10px] text-stone-500 uppercase font-semibold">User</label>
                                <select
                                  value={summaryEmployee}
                                  onChange={(e) => setSummaryEmployee(e.target.value)}
                                  className="w-full bg-[#FAF8F2] border border-[#E7E3D4] rounded-md p-1.5 text-xs text-black"
                                >
                                  <option value="All">All Users</option>
                                  {allEmployees.map(emp => (
                                    <option key={emp} value={emp}>{emp}</option>
                                  ))}
                                </select>
                              </div>

                              <div className="space-y-1">
                                <label className="block text-[10px] text-stone-500 uppercase font-semibold">Account</label>
                                <select
                                  value={summaryAccount}
                                  onChange={(e) => setSummaryAccount(e.target.value)}
                                  className="w-full bg-[#FAF8F2] border border-[#E7E3D4] rounded-md p-1.5 text-xs text-black"
                                >
                                  <option value="All">All Accounts</option>
                                  {bankAccounts
                                    .filter(b => b.currency === selectedCurrency)
                                    .map(b => (
                                      <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                              </div>

                              <div className="space-y-1">
                                <label className="block text-[10px] text-stone-500 uppercase font-semibold">Date Range</label>
                                <div className="grid grid-cols-2 gap-2">
                                  <input
                                    type="date"
                                    value={summaryStartDate}
                                    onChange={(e) => setSummaryStartDate(e.target.value)}
                                    className="bg-[#FAF8F2] border border-[#E7E3D4] rounded-md p-1.5 text-xs text-black"
                                  />
                                  <input
                                    type="date"
                                    value={summaryEndDate}
                                    onChange={(e) => setSummaryEndDate(e.target.value)}
                                    className="bg-[#FAF8F2] border border-[#E7E3D4] rounded-md p-1.5 text-xs text-black"
                                  />
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-1.5 pt-1">
                                <button
                                  type="button"
                                  onClick={() => applyDatePreset('all')}
                                  className="px-2 py-1 text-[10px] bg-[#FAF8F2] border border-[#E7E3D4] rounded"
                                >
                                  All
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyDatePreset('thisMonth')}
                                  className="px-2 py-1 text-[10px] bg-[#FAF8F2] border border-[#E7E3D4] rounded"
                                >
                                  This Month
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyDatePreset('last30')}
                                  className="px-2 py-1 text-[10px] bg-[#FAF8F2] border border-[#E7E3D4] rounded"
                                >
                                  Last 30
                                </button>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="search-input-wrapper"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 280, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 250 }}
                    className="relative flex items-center bg-transparent overflow-hidden"
                  >
                    <div className="flex items-center justify-center w-7 h-7 rounded-md bg-[#252525] text-gray-400 mr-1 flex-shrink-0">
                      <Search className="h-3.5 w-3.5" />
                    </div>
                    <input
                      ref={mobileSearchInputRef}
                      type="text"
                      placeholder="Type to search..."
                      value={summarySearch}
                      onChange={(e) => setSummarySearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setIsSearchExpanded(false);
                        }
                      }}
                      className="bg-transparent text-[11px] text-white border-none outline-none focus:outline-none focus:ring-0 no-focus-outline shadow-none p-0 m-0 font-sans w-full pl-0.5"
                    />
                    {summarySearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setSummarySearch('');
                          setIsSearchExpanded(false);
                        }}
                        className="ml-1 text-gray-500 hover:text-white transition-colors focus:outline-none flex-shrink-0"
                        title="Clear search"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Row 2: View All Currencies directly under currency button */}
          <div className="flex items-center justify-start mt-0.5">
            <button
              type="button"
              onClick={() => setShowAllCurrencies(!showAllCurrencies)}
              className="flex items-center gap-1 text-xs font-semibold text-stone-500 hover:text-[#ee317b] transition-colors cursor-pointer"
            >
              <span>{showAllCurrencies ? `Collapse to ${selectedCurrency}` : `View all currencies (${newAccountCurrencies.length})`}</span>
              {showAllCurrencies ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Mobile Financial Summary */}
        <div className="space-y-4">
          <div className="border-b border-[#E7E3D4] pb-1">
            <h3 className="font-sans font-bold text-black uppercase tracking-wider text-sm">
              Financial Summary
            </h3>
          </div>
          {newAccountCurrencies
            .filter(curr => showAllCurrencies || curr === selectedCurrency)
            .map(curr => {
              const gross = grossByCurrency[curr] || 0;
              const spent = spentByCurrency[curr] || 0;
              const inflow = inflowByCurrency[curr] || 0;
              const income = inflow;
              const loanGiven = loanGivenByCurrency[curr] || 0;
              const loanReceived = loanReceivedByCurrency[curr] || 0;
              const loanMovement = loanCashMovementByCurrency[curr] || 0;
              const cash = inflow - spent + loanMovement;
              const debt = debtByCurrency[curr] || 0;
              const isCollapsed = !!collapsedCurrencies[curr];

              if (gross === 0 && spent === 0 && income === 0 && cash === 0 && debt === 0 && loanGiven === 0 && loanReceived === 0 && curr !== 'ETB' && curr !== selectedCurrency) {
                return null;
              }

              return (
                <div key={curr} className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-500 tracking-wide">
                      {curr} Currency
                    </span>
                    <button
                      type="button"
                      onClick={() => setCollapsedCurrencies(prev => ({ ...prev, [curr]: !prev[curr] }))}
                      className="text-stone-400 hover:text-black"
                    >
                      {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {!isCollapsed && (
                    <div className="grid grid-cols-1 gap-3">
                      <button type="button" onClick={() => onNavigateFromSummary?.('customers')} className="relative overflow-hidden bg-[#EEF8EF] border border-[#A7C8AE] rounded-[10px] p-4 text-left cursor-pointer hover:border-[#166534] transition-colors">
                        <ShoppingBag className="absolute -right-2 top-3 w-16 h-16 text-[#166534] opacity-10" />
                        <span className="text-[10px] font-sans font-bold uppercase text-[#6B6258] tracking-wider">Total Gross Orders</span>
                        <p className="mt-2 text-xl font-sans font-extrabold leading-tight text-[#111111] break-all">
                          <CopyableAmount value={gross} currency={curr} className="text-[#111111]" />
                        </p>
                        <p className="mt-1 text-[11px] text-[#6B6258]">All order value for this currency.</p>
                      </button>

                      <button type="button" onClick={() => onNavigateFromSummary?.('customers')} className="relative overflow-hidden bg-[#EEF8EF] border border-[#A7C8AE] rounded-[10px] p-4 text-left cursor-pointer hover:border-[#166534] transition-colors">
                        <DollarSign className="absolute -right-2 top-3 w-16 h-16 text-[#166534] opacity-10" />
                        <span className="text-[10px] font-sans font-bold uppercase text-[#6B6258] tracking-wider">Income</span>
                        <p className="mt-2 text-xl font-sans font-extrabold leading-tight text-[#166534] break-all">
                          <CopyableAmount value={income} currency={curr} className="text-[#166534]" />
                        </p>
                        <p className="mt-1 text-[11px] text-[#6B6258]">Received customer payments.</p>
                      </button>

                      <button 
                        type="button" 
                        onClick={() => onNavigateFromSummary?.('customers')} 
                        className={`relative overflow-hidden rounded-[10px] p-4 text-left cursor-pointer transition-colors ${
                          cash >= 0 
                            ? 'bg-[#EEF8EF] border border-[#A7C8AE] hover:border-[#166534]' 
                            : 'bg-[#FFF0F6] border border-[#E5D8C5] border-l-4 border-l-[#EC2F78] hover:border-[#EC2F78]'
                        }`}
                      >
                        <Activity className={`absolute -right-2 top-3 w-16 h-16 opacity-10 ${cash >= 0 ? 'text-[#166534]' : 'text-[#EC2F78]'}`} />
                        <span className="text-[10px] font-sans font-bold uppercase text-[#6B6258] tracking-wider">Net Cash Position</span>
                        <p className={`mt-2 text-xl font-sans font-extrabold leading-tight break-all ${cash >= 0 ? 'text-[#166534]' : 'text-[#EC2F78]'}`}>
                          <CopyableAmount value={cash} currency={curr} className={cash >= 0 ? 'text-[#166534]' : 'text-[#EC2F78]'} />
                        </p>
                        <p className="mt-1 text-[11px] text-[#6B6258]">Income less expenses plus loan movement.</p>
                      </button>

                      <button type="button" onClick={() => onNavigateFromSummary?.('customers-debt')} className="bg-[#FFF8E7] border border-[#E5D8C5] border-l-4 border-l-[#A16207] rounded-[10px] p-4 text-left cursor-pointer hover:border-l-[#854D0E] transition-colors">
                        <span className="text-[10px] font-sans font-bold uppercase text-[#6B6258] tracking-wider">Total Outstanding Debt</span>
                        <p className="mt-2 text-xl font-sans font-extrabold leading-tight text-[#A16207] break-all">
                          <CopyableAmount value={debt} currency={curr} className="text-[#A16207]" />
                        </p>
                        <p className="mt-1 text-[11px] text-[#6B6258]">Unpaid balances still owed by customers.</p>
                      </button>

                      <button type="button" onClick={() => onNavigateFromSummary?.('purchases')} className="bg-[#FFF0F6] border border-[#E5D8C5] border-l-4 border-l-[#EC2F78] rounded-[10px] p-4 text-left cursor-pointer hover:border-l-[#BE185D] transition-colors">
                        <span className="text-[10px] font-sans font-bold uppercase text-[#6B6258] tracking-wider">Total Spent Expenses</span>
                        <p className="mt-2 text-xl font-sans font-extrabold leading-tight text-[#EC2F78] break-all">
                          <CopyableAmount value={spent} currency={curr} className="text-[#EC2F78]" />
                        </p>
                        <p className="mt-1 text-[11px] text-[#6B6258]">Purchases and operating expenses.</p>
                      </button>

                      <button type="button" onClick={() => onNavigateFromSummary?.('purchases')} className="bg-[#FFFCF7] border border-[#E5D8C5] rounded-[10px] p-4 text-left cursor-pointer hover:border-[#CDBEA8] transition-colors">
                        <span className="text-[10px] font-sans font-bold uppercase text-[#6B6258] tracking-wider">Loans Summary</span>
                        <div className="mt-3 space-y-2 text-xs">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[#6B6258]">Loan Given</span>
                            <CopyableAmount value={loanGiven} currency={curr} className="text-[#EC2F78] font-bold" />
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[#6B6258]">Loan Received</span>
                            <CopyableAmount value={loanReceived} currency={curr} className="text-[#166534] font-bold" />
                          </div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* Mobile Payment Accounts Section */}
        <div className="space-y-4 pt-2">
          <div className="border-b border-[#E7E3D4] pb-1">
            <h3 className="font-sans font-bold text-black uppercase tracking-wider text-sm">
              Payment Accounts
            </h3>
          </div>

          <div className="flex gap-2 w-full">
            <button
              type="button"
              onClick={() => setShowAllAccounts(!showAllAccounts)}
              className="flex-1 px-3 py-2.5 bg-[#111111] hover:bg-[#2A2A2A] border border-[#111111] text-white always-text-white font-sans text-xs font-semibold rounded-[8px] cursor-pointer transition-colors text-center"
            >
              {showAllAccounts ? 'Selected Currency' : 'View All Accounts'}
            </button>
            
            <button
              type="button"
              onClick={() => setIsAddingBank(!isAddingBank)}
              className="flex-1 bg-[#EC2F78] hover:bg-[#D9286C] text-white font-bold px-3 py-2.5 rounded-[8px] flex items-center justify-center gap-1.5 text-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Account</span>
            </button>
          </div>

          <div className="flex flex-col gap-4 w-full">
            {bankAccounts
              .filter(b => {
                if (summarySearch.trim()) {
                  const query = summarySearch.trim().toLowerCase();
                  return b.name.toLowerCase().includes(query) || (b.accountNumber && b.accountNumber.toLowerCase().includes(query));
                }
                return showAllAccounts || b.currency === selectedCurrency;
              })
              .map((b) => {
                const advancesForBank = customers
                  .filter(c => c.paymentMethodId === b.id || (!c.paymentMethodId && b.id === 'b1'))
                  .reduce((sum, c) => sum + Number(c.advancePayment || 0), 0);

                const completedRemainingForBank = customers
                  .filter(c => !!c.deliveryDate && (c.bankRemainingId === b.id || (!c.bankRemainingId && b.id === 'b1' && c.paymentMethodId === b.id)))
                  .reduce((sum, c) => {
                    const base = c.quantity * c.unitPrice;
                    const vat = c.isVatAdded ? base * 0.15 : 0;
                    const totalInvoice = base + vat;
                    const remaining = totalInvoice - c.advancePayment;
                    return sum + Math.max(0, remaining);
                  }, 0);

                const purchasesOutOfBank = purchases
                  .filter(p => p.paymentMethodId === b.id)
                  .reduce((sum, p) => sum + Number(p.totalPrice || 0), 0);
                
                const loanCashMovement = getLoanCashMovementForBank(b.id);
                const currentBalance = b.initialBalance + advancesForBank + completedRemainingForBank - purchasesOutOfBank + loanCashMovement;
                const isSystemDefault = ['b1', 'b2', 'b3'].includes(b.id);
                const isEditing = editingBankId === b.id;
                const isBankSelected = selectedBankIds.includes(b.id);
                const isSearchHighlighted = highlightedSearchResult?.id === b.id;

                if (!showAllAccounts && currentBalance === 0 && !isSystemDefault) {
                  return null;
                }

                return (
                  <div 
                    key={b.id} 
                    data-global-search-id={`bank-${b.id}`}
                    className={`relative bg-[#FFFCF7] border rounded-[10px] p-4 shadow-xs flex flex-col justify-between w-full max-w-full font-sans text-[#111111] ${isSearchHighlighted ? 'global-search-highlight' : ''} ${isBankSelected ? 'selected-row border-[#EC2F78]' : 'border-[#E5D8C5]'}`}
                    onClick={(e) => handleBankCardClick(b.id, e)}
                    onTouchStart={(e) => startBankLongPress(b.id, e)}
                    onTouchMove={clearBankLongPressTimer}
                    onTouchEnd={clearBankLongPressTimer}
                    onTouchCancel={clearBankLongPressTimer}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="px-2 py-1 bg-[#FAF7F0] border border-[#EC2F78] text-[#111111] text-xs font-semibold rounded-md outline-none w-full"
                            />
                          ) : (
                            <h4 className="font-bold text-[#111111] text-[13px] tracking-tight uppercase break-words" title={b.name}>
                              {b.name}
                            </h4>
                          )}
                          {!isEditing && (
                            <p className="mt-1 text-[11px] text-[#6B6258]">
                              {b.accountNumber ? `A/C: ${b.accountNumber}` : 'Cash account'} - {b.currency || 'ETB'}
                            </p>
                          )}
                          </div>
                        </div>

                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setActiveMenuBankId(activeMenuBankId === b.id ? null : b.id)}
                            className="text-[#6B6258] hover:text-[#111111] p-1 rounded transition-colors"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                            </svg>
                          </button>

                          {activeMenuBankId === b.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setActiveMenuBankId(null)} />
                              <div className="absolute right-0 mt-1 w-32 bg-white border border-[#E7E3D4] rounded shadow-lg z-50 py-1 text-xs">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuBankId(null);
                                    startEditing(b);
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-stone-50 text-black flex items-center gap-1.5 font-medium"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  Edit Account
                                </button>
                                {!isSystemDefault ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuBankId(null);
                                      setDeletingBankId(b.id);
                                    }}
                                    className="w-full text-left px-3 py-2 hover:bg-stone-50 text-rose-500 font-bold flex items-center gap-1.5"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    Delete
                                  </button>
                                ) : (
                                  <div className="px-3 py-2 text-stone-400 flex items-center gap-1.5 cursor-not-allowed select-none">
                                    <Lock className="w-3 h-3" />
                                    System Lock
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-[#6B6258] font-sans">
                        {isEditing ? (
                          <div className="space-y-1.5 mt-2">
                            <input
                              type="text"
                              placeholder="Account Number (optional)"
                              value={editNumber}
                              onChange={(e) => setEditNumber(e.target.value)}
                              className="px-2 py-1 bg-[#FAF8F2] border border-[#E7E3D4] text-black text-[11px] rounded-md outline-none w-full"
                            />
                            <select
                              value={editCurrency}
                              onChange={(e) => setEditCurrency(e.target.value.toUpperCase())}
                              className="w-full bg-[#FAF8F2] border border-[#E7E3D4] text-black text-[11px] rounded-md p-1 outline-none"
                            >
                              {newAccountCurrencies.map(curr => (
                                <option key={curr} value={curr}>
                                  {curr}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-3 border-y border-[#E5D8C5] divide-y divide-[#E5D8C5]">
                      <div className="grid grid-cols-3 divide-x divide-[#E5D8C5] text-xs">
                        <div className="py-3 pr-2">
                          <span className="block text-[9px] uppercase tracking-wider text-[#6B6258]">Opening Balance</span>
                          <CopyableAmount value={b.initialBalance} displayValue={formatMockupValue(b.initialBalance)} copyValue={formatMockupValue(b.initialBalance)} currency={b.currency || 'ETB'} className="text-[#111111] font-semibold" />
                          <button
                            type="button"
                            onClick={() => openAdjustmentModal(b)}
                            className="mt-1 rounded border border-[#E5D8C5] bg-[#FAF7F0] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#6B6258] hover:border-[#166534] hover:text-[#111111]"
                          >
                            Adjust
                          </button>
                        </div>
                        <div className="py-3 px-2">
                          <span className="block text-[9px] uppercase tracking-wider text-[#6B6258]">Received</span>
                          <span className="text-[#166534] font-bold">+<CopyableAmount value={advancesForBank + completedRemainingForBank} displayValue={formatMockupValue(advancesForBank + completedRemainingForBank)} copyValue={formatMockupValue(advancesForBank + completedRemainingForBank)} currency={b.currency || 'ETB'} className="text-[#166534] font-bold" /></span>
                        </div>
                        <div className="py-3 pl-2">
                          <span className="block text-[9px] uppercase tracking-wider text-[#6B6258]">Spent</span>
                          <span className="text-[#EC2F78] font-bold">-<CopyableAmount value={purchasesOutOfBank} displayValue={formatMockupValue(purchasesOutOfBank)} copyValue={formatMockupValue(purchasesOutOfBank)} currency={b.currency || 'ETB'} className="text-[#EC2F78] font-bold" /></span>
                        </div>
                      </div>

                      <div className="flex justify-between items-end bg-[#FAF7F0] px-3 py-3">
                        <span className="text-[#6B6258] font-sans text-xs font-semibold">Current Balance</span>
                        <CopyableAmount value={currentBalance} displayValue={formatMockupValue(currentBalance)} copyValue={formatMockupValue(currentBalance)} currency={b.currency || 'ETB'} className="text-[#111111] font-extrabold text-[15px] tracking-tight" />
                      </div>
                    </div>

                    {isEditing && (
                      <div className="flex items-center justify-end gap-2 mt-3 pt-2.5 border-t border-stone-100">
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(b.id)}
                          className="px-2.5 py-1 text-xs bg-[#71b536] text-white rounded font-bold"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingBankId(null)}
                          className="px-2.5 py-1 text-xs bg-stone-100 text-stone-600 rounded font-semibold border border-[#E7E3D4]"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        {/* Mobile Leaderboard & Marketing (Stacked) */}
        <div className="space-y-6 pt-2">
          {/* Leaderboard */}
          <div className="bg-white border border-[#E7E3D4] rounded-[12px] p-4 shadow-xs space-y-4 text-black">
            <div>
              <h3 className="font-sans font-bold text-black flex items-center gap-2 uppercase tracking-wider text-xs">
                <UserCheck className="w-4 h-4 text-[#ee317b]" />
                Employee Leaderboard
              </h3>
            </div>

            <div className="space-y-3">
              {employeeLeaderboard.map((emp, idx) => {
                const percentage = (emp.totalGross / maxEmployeeGross) * 100;
                return (
                  <div key={emp.name} className="space-y-1 font-sans">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-stone-700">{idx + 1}. {emp.name}</span>
                      <span className="text-[#ee317b] font-bold"><CopyableAmount value={emp.totalGross} displayValue={emp.totalGross.toLocaleString()} copyValue={emp.totalGross.toLocaleString()} currency="ETB" className="text-[#ee317b] font-bold" /> ({emp.completed} ord)</span>
                    </div>
                    <div className="w-full bg-[#FAF8F2] border border-stone-100 rounded-full h-2 overflow-hidden">
                      <div 
                        className="h-full bg-[#ee317b] rounded-full transition-all duration-1000"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
              {employeeLeaderboard.length === 0 && (
                <p className="text-center py-2 text-stone-400 text-xs">No staff data.</p>
              )}
            </div>
          </div>

          {/* Marketing Performance */}
          <div className="bg-white border border-[#E7E3D4] rounded-[12px] p-4 shadow-xs space-y-4 text-black">
            <div>
              <h3 className="font-sans font-bold text-black flex items-center gap-2 uppercase tracking-wider text-xs">
                <Users className="w-4 h-4 text-[#ee317b]" />
                Marketing Performance
              </h3>
            </div>

            <div className="space-y-3">
              {marketingPerformance.map((lead) => {
                const percentage = (lead.totalRevenue / maxRevenueChannel) * 100;
                return (
                  <div key={lead.channel} className="space-y-1 font-sans">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-stone-700">{lead.channel}</span>
                      <span className="text-[#71b536] font-bold"><CopyableAmount value={lead.totalRevenue} displayValue={lead.totalRevenue.toLocaleString()} copyValue={lead.totalRevenue.toLocaleString()} currency="ETB" className="text-[#71b536] font-bold" /> ({lead.totalLeads} leads)</span>
                    </div>
                    <div className="w-full bg-[#FAF8F2] border border-stone-100 rounded-full h-2 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[#71b536] to-[#518524] rounded-full transition-all duration-1000"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
              {marketingPerformance.length === 0 && (
                <p className="text-center py-2 text-stone-400 text-xs">No marketing data.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* DESKTOP LAYOUT                             */}
      {/* ========================================== */}
      <div className="hidden md:block space-y-5 text-[#111111]">

      {/* Custom Redesigned Financial Toolbar to match mockup */}
      <div className="performance-sticky-toolbar flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          {/* Dropdown for selecting main currency, styled as a tab/badge in mockup */}
          <div className="w-44 bg-[#FFFCF7] border border-[#E5D8C5] rounded-md overflow-hidden">
            <SearchableSelect
              value={selectedCurrency}
              onChange={(e) => {
                setSelectedCurrency(e.target.value);
                setShowAllCurrencies(false);
              }}
              placeholder="Select Currency..."
              inputClassName="font-bold font-sans text-xs uppercase tracking-wider text-[#111111]"
            >
              {newAccountCurrencies.map(curr => (
                <option key={curr} value={curr}>
                  {curr}
                </option>
              ))}
            </SearchableSelect>
          </div>

          {/* Toggle link to view all currencies, aligned and visually styled */}
          <button
            type="button"
            onClick={() => setShowAllCurrencies(!showAllCurrencies)}
            className="text-xs font-sans text-[#6B6258] hover:text-[#111111] transition-colors cursor-pointer"
          >
            {showAllCurrencies ? `Collapse to ${selectedCurrency}` : `View all currencies (${newAccountCurrencies.length})`}
          </button>
        </div>

        {/* Search and filter controls pairing visually with Customer Management tab toolbar style */}
        <div className="flex items-center gap-3">
          {/* Search bar button style to match mockup */}
          <div ref={searchWrapperRef} className="relative z-10 flex items-center">
            <AnimatePresence initial={false}>
              {!(isSearchExpanded || summarySearch) ? (
                <motion.button
                  key="search-btn"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.1 }}
                  type="button"
                  onClick={() => setIsSearchExpanded(true)}
                  className="flex items-center justify-center p-1.5 rounded text-[#6B6258] hover:bg-[#FFFCF7] hover:text-[#111111] transition-colors cursor-pointer"
                  title="Search accounts"
                >
                  <Search className="w-3.5 h-3.5" />
                </motion.button>
              ) : (
                <motion.div
                  key="search-input-wrapper"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 280, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ type: "spring", damping: 25, stiffness: 250 }}
                  className="relative flex items-center bg-transparent overflow-hidden"
                >
                  <div className="flex items-center justify-center w-7 h-7 rounded-md bg-[#FFFCF7] border border-[#E5D8C5] text-[#6B6258] mr-1 flex-shrink-0">
                    <Search className="h-3.5 w-3.5" />
                  </div>
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Type to search..."
                    value={summarySearch}
                    onChange={(e) => setSummarySearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setIsSearchExpanded(false);
                      }
                    }}
                    className="bg-transparent text-[11px] text-[#111111] border-none outline-none focus:outline-none focus:ring-0 no-focus-outline shadow-none p-0 m-0 font-sans w-full pl-0.5 placeholder-[#6B6258]"
                  />
                  {summarySearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setSummarySearch('');
                        setIsSearchExpanded(false);
                      }}
                      className="ml-1 text-[#6B6258] hover:text-[#111111] transition-colors focus:outline-none flex-shrink-0"
                      title="Clear search"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative z-40">
            <button
              type="button"
              onClick={() => setShowFilterPopover(!showFilterPopover)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[#6B6258] hover:bg-[#FFFCF7] hover:text-[#111111] transition-colors cursor-pointer text-[11px] font-medium font-sans ${
                (summaryStartDate || summaryEndDate || summaryAccount !== 'All' || summaryEmployee !== 'All')
                  ? 'text-[#EC2F78] bg-[#EC2F78]/10'
                  : ''
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              {[summaryStartDate, summaryEndDate, summaryAccount, summaryEmployee].filter(f => f && f !== 'All').length > 0 && (
                <span className="bg-[#EC2F78] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-0.5">
                  {[summaryStartDate, summaryEndDate, summaryAccount, summaryEmployee].filter(f => f && f !== 'All').length}
                </span>
              )}
            </button>

            {showFilterPopover && (
              <>
                <div
                  className="fixed inset-0 z-30 cursor-default"
                  onClick={() => setShowFilterPopover(false)}
                />
                <div
                  className="absolute right-0 mt-1.5 w-[320px] bg-[#FFFCF7] border border-[#E5D8C5] rounded shadow-xl z-40 p-3 text-xs font-sans text-[#111111] flex flex-col gap-2.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-1">
                    <span className="font-bold text-[#6B6258] text-[10px] uppercase tracking-wider select-none">Database Filter</span>
                    {(summaryStartDate || summaryEndDate || summaryAccount !== 'All' || summaryEmployee !== 'All') && (
                      <button
                        type="button"
                        onClick={() => {
                          setSummaryStartDate('');
                          setSummaryEndDate('');
                          setSummaryAccount('All');
                          setSummaryEmployee('All');
                        }}
                        className="text-[#ee317b] hover:text-[#ee317b]/80 flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Reset
                      </button>
                    )}
                  </div>
                  <div className="h-px bg-[#262626] my-0.5"></div>

                  <div className="flex flex-col gap-2.5">
                    {/* User / Employee filter */}
                    <div className="flex items-center gap-2 hover:bg-[#202020] rounded p-1 transition-colors">
                      <div className="flex items-center gap-1.5 text-gray-400 w-24 flex-shrink-0 select-none">
                        <UserCheck className="w-3.5 h-3.5 text-gray-400" />
                        <span>User</span>
                      </div>
                      <div className="flex-1 min-w-0 bg-[#121212] rounded border border-[#262626]">
                        <SearchableSelect
                          value={summaryEmployee}
                          onChange={(e) => setSummaryEmployee(e.target.value)}
                        >
                          <option value="All">All Users</option>
                          {allEmployees.map(emp => (
                            <option key={emp} value={emp}>{emp}</option>
                          ))}
                        </SearchableSelect>
                      </div>
                    </div>

                    {/* Account filter */}
                    <div className="flex items-center gap-2 hover:bg-[#202020] rounded p-1 transition-colors">
                      <div className="flex items-center gap-1.5 text-gray-400 w-24 flex-shrink-0 select-none">
                        <Building className="w-3.5 h-3.5 text-gray-400" />
                        <span>Account</span>
                      </div>
                      <div className="flex-1 min-w-0 bg-[#121212] rounded border border-[#262626]">
                        <SearchableSelect
                          value={summaryAccount}
                          onChange={(e) => setSummaryAccount(e.target.value)}
                        >
                          <option value="All">All Accounts</option>
                          {bankAccounts
                            .filter(b => b.currency === selectedCurrency)
                            .map(b => (
                              <option key={b.id} value={b.id}>{b.name} ({b.currency})</option>
                            ))}
                        </SearchableSelect>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="flex items-center gap-2 hover:bg-[#202020] rounded p-1 transition-colors">
                      <div className="flex items-center gap-1.5 text-gray-400 w-24 flex-shrink-0 select-none">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>Dates</span>
                      </div>
                      <div className="flex-1 grid grid-cols-2 gap-1.5">
                        <input
                          type="date"
                          value={summaryStartDate}
                          onChange={(e) => setSummaryStartDate(e.target.value)}
                          className="w-full bg-[#121212] rounded border border-[#262626] text-white text-[11px] font-sans outline-none px-1.5 py-1"
                          title="From date"
                        />
                        <input
                          type="date"
                          value={summaryEndDate}
                          onChange={(e) => setSummaryEndDate(e.target.value)}
                          className="w-full bg-[#121212] rounded border border-[#262626] text-white text-[11px] font-sans outline-none px-1.5 py-1"
                          title="To date"
                        />
                      </div>
                    </div>

                    {/* Presets */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 px-1">
                      <span className="text-[10px] text-gray-500 font-sans mr-1">Presets:</span>
                      <button
                        type="button"
                        onClick={() => applyDatePreset('all')}
                        className={`px-2 py-0.5 text-[10px] font-sans border rounded cursor-pointer transition-all ${
                          !summaryStartDate && !summaryEndDate
                            ? 'bg-[#31111E] text-[#ee317b] border-[#ee317b]/45'
                            : 'bg-[#181818] text-gray-400 border-[#262626] hover:border-gray-500'
                        }`}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => applyDatePreset('thisMonth')}
                        className="px-2 py-0.5 text-[10px] font-sans bg-[#181818] text-gray-400 border border-[#262626] hover:border-gray-500 rounded cursor-pointer"
                      >
                        This Month
                      </button>
                      <button
                        type="button"
                        onClick={() => applyDatePreset('last30')}
                        className="px-2 py-0.5 text-[10px] font-sans bg-[#181818] text-gray-400 border border-[#262626] hover:border-gray-500 rounded cursor-pointer"
                      >
                        Last 30
                      </button>
                      <button
                        type="button"
                        onClick={() => applyDatePreset('thisYear')}
                        className="px-2 py-0.5 text-[10px] font-sans bg-[#181818] text-gray-400 border border-[#262626] hover:border-gray-500 rounded cursor-pointer"
                      >
                        This Year
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Portfolio summaries loop */}
      {isSummaryExpanded && newAccountCurrencies
        .filter(curr => showAllCurrencies || curr === selectedCurrency)
        .map(curr => {
          const gross = grossByCurrency[curr] || 0;
          const spent = spentByCurrency[curr] || 0;
          const inflow = inflowByCurrency[curr] || 0;
          const income = inflow;
          const loanGiven = loanGivenByCurrency[curr] || 0;
          const loanReceived = loanReceivedByCurrency[curr] || 0;
          const loanMovement = loanCashMovementByCurrency[curr] || 0;
          const cash = inflow - spent + loanMovement;
          const debt = debtByCurrency[curr] || 0;
          const isCollapsed = !!collapsedCurrencies[curr];

          // Skip if zero values across the board unless it is ETB or selected
          if (gross === 0 && spent === 0 && income === 0 && cash === 0 && debt === 0 && loanGiven === 0 && loanReceived === 0 && curr !== 'ETB' && curr !== selectedCurrency) {
            return null;
          }

          return (
            <div key={curr} className="space-y-3">
              <div className="flex items-center justify-between border-b border-[#E5D8C5] pb-2">
                <h4 className="text-sm font-bold uppercase tracking-wider text-[#111111] font-sans">
                  {curr} FINANCIAL SUMMARY FROM ORDERS
                </h4>
                <button
                  type="button"
                  onClick={() => setCollapsedCurrencies(prev => ({ ...prev, [curr]: !prev[curr] }))}
                  className="text-[#6B6258] hover:text-[#111111] transition-colors cursor-pointer"
                  title={isCollapsed ? 'Expand' : 'Collapse'}
                >
                  {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {!isCollapsed && (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <button type="button" onClick={() => onNavigateFromSummary?.('customers')} className="relative min-h-[154px] overflow-hidden bg-[#EEF8EF] border border-[#A7C8AE] rounded-md p-5 text-left cursor-pointer hover:border-[#166534] transition-colors shadow-sm">
                    <ShoppingBag className="absolute -right-4 top-5 w-24 h-24 text-[#166534] opacity-10" />
                    <span className="text-[10px] font-sans tracking-wider uppercase font-bold text-[#6B6258]">Total Gross Orders</span>
                    <p className="mt-4 text-2xl font-sans font-extrabold leading-tight tracking-tight text-[#111111] break-all">
                      <CopyableAmount value={gross} currency={curr} className="text-[#111111]" />
                    </p>
                    <p className="mt-2 text-xs text-[#6B6258]">All order value recorded for this currency.</p>
                  </button>

                  <button type="button" onClick={() => onNavigateFromSummary?.('customers')} className="relative min-h-[154px] overflow-hidden bg-[#EEF8EF] border border-[#A7C8AE] rounded-md p-5 text-left cursor-pointer hover:border-[#166534] transition-colors shadow-sm">
                    <DollarSign className="absolute -right-4 top-5 w-24 h-24 text-[#166534] opacity-10" />
                    <span className="text-[10px] font-sans tracking-wider uppercase font-bold text-[#6B6258]">Income</span>
                    <p className="mt-4 text-2xl font-sans font-extrabold leading-tight tracking-tight text-[#166534] break-all">
                      <CopyableAmount value={income} currency={curr} className="text-[#166534]" />
                    </p>
                    <p className="mt-2 text-xs text-[#6B6258]">Customer payments received into accounts.</p>
                  </button>

                  <button 
                    type="button" 
                    onClick={() => onNavigateFromSummary?.('customers')} 
                    className={`relative min-h-[154px] overflow-hidden rounded-md p-5 text-left cursor-pointer transition-colors shadow-sm ${
                      cash >= 0 
                        ? 'bg-[#EEF8EF] border border-[#A7C8AE] hover:border-[#166534]' 
                        : 'bg-[#FFF0F6] border border-[#E5D8C5] border-l-4 border-l-[#EC2F78] hover:border-[#EC2F78]'
                    }`}
                  >
                    <Activity className={`absolute -right-4 top-5 w-24 h-24 opacity-10 ${cash >= 0 ? 'text-[#166534]' : 'text-[#EC2F78]'}`} />
                    <span className="text-[10px] font-sans tracking-wider uppercase font-bold text-[#6B6258]">Net Cash Position</span>
                    <p className={`mt-4 text-2xl font-sans font-extrabold leading-tight tracking-tight break-all ${cash >= 0 ? 'text-[#166534]' : 'text-[#EC2F78]'}`}>
                      <CopyableAmount value={cash} currency={curr} className={cash >= 0 ? 'text-[#166534]' : 'text-[#EC2F78]'} />
                    </p>
                    <p className="mt-2 text-xs text-[#6B6258]">Income less expenses plus loan movement.</p>
                  </button>

                  <button type="button" onClick={() => onNavigateFromSummary?.('customers-debt')} className="min-h-[136px] bg-[#FFF8E7] border border-[#E5D8C5] border-l-4 border-l-[#A16207] rounded-md p-5 text-left cursor-pointer hover:border-l-[#854D0E] transition-colors shadow-sm">
                    <span className="text-[10px] font-sans tracking-wider uppercase font-bold text-[#6B6258]">Total Outstanding Debt</span>
                    <p className="mt-4 text-2xl font-sans font-extrabold leading-tight tracking-tight text-[#A16207] break-all">
                      <CopyableAmount value={debt} currency={curr} className="text-[#A16207]" />
                    </p>
                    <p className="mt-2 text-xs text-[#6B6258]">Unpaid customer balances still open.</p>
                  </button>

                  <button type="button" onClick={() => onNavigateFromSummary?.('purchases')} className="min-h-[136px] bg-[#FFF0F6] border border-[#E5D8C5] border-l-4 border-l-[#EC2F78] rounded-md p-5 text-left cursor-pointer hover:border-l-[#BE185D] transition-colors shadow-sm">
                    <span className="text-[10px] font-sans tracking-wider uppercase font-bold text-[#6B6258]">Total Spent Expenses</span>
                    <p className="mt-4 text-2xl font-sans font-extrabold leading-tight tracking-tight text-[#EC2F78] break-all">
                      <CopyableAmount value={spent} currency={curr} className="text-[#EC2F78]" />
                    </p>
                    <p className="mt-2 text-xs text-[#6B6258]">Purchases and expense outflow.</p>
                  </button>

                  <button type="button" onClick={() => onNavigateFromSummary?.('purchases')} className="min-h-[136px] bg-[#FFFCF7] border border-[#E5D8C5] rounded-md p-5 text-left cursor-pointer hover:border-[#CDBEA8] transition-colors shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-sans tracking-wider uppercase font-bold text-[#6B6258]">Loans Summary</span>
                        <p className="mt-1 text-xs text-[#6B6258]">Quiet treasury movement view.</p>
                      </div>
                      <Banknote className="w-5 h-5 text-[#6B6258]" />
                    </div>
                    <div className="mt-5 space-y-3 text-xs">
                      <div className="flex items-center justify-between gap-3 border-b border-[#E5D8C5] pb-2">
                        <span className="font-medium text-[#6B6258]">Loan Given</span>
                        <CopyableAmount value={loanGiven} currency={curr} className="text-[#EC2F78] font-bold" />
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-[#6B6258]">Loan Received</span>
                        <CopyableAmount value={loanReceived} currency={curr} className="text-[#166534] font-bold" />
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          );
        })}

      {/* --- TREASURY DEPARTMENT & BANK ACCOUNTS MANAGER --- */}
      <div className="bg-[#FFFCF7] border border-[#E5D8C5] rounded-md p-5 shadow-sm space-y-4" id="treasury-desk-pnl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E5D8C5] pb-4 gap-4">
          <div>
            <h3 className="font-sans font-bold text-[#111111] uppercase tracking-wider text-sm">
              Payment Accounts
            </h3>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowAllAccounts(!showAllAccounts)}
              className="px-4 py-2 bg-[#111111] hover:bg-[#2A2A2A] border border-[#111111] text-white always-text-white font-sans text-xs font-semibold rounded-md cursor-pointer transition-colors"
            >
              {showAllAccounts ? 'Show Selected Currency Only' : 'View All Accounts'}
            </button>
            <button
              type="button"
              onClick={() => setIsAddingBank(!isAddingBank)}
              className="bg-[#EC2F78] hover:bg-[#D9286C] text-white font-bold px-4 py-2 rounded-md flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
            >
              {isAddingBank ? (
                <>
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel Form</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Account / Payment Method</span>
                </>
              )}
            </button>
          </div>
        </div>



        {/* Selected payment methods bulk action banner */}
        {selectedBankIds.length > 0 && (
          <div className="bg-[#112918] border border-[#71b536]/30 p-3 rounded-md flex items-center justify-between text-xs font-sans animate-fadeIn relative z-35">
            <div className="flex items-center gap-2 text-[#71b536]">
              <span className="w-2 h-2 rounded-full bg-[#71b536] animate-ping" />
              <span>Selected <strong>{selectedBankIds.length}</strong> payment accounts for action...</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowBulkDeleteConfirm(true)}
                className="px-3 py-1 bg-[#421A1D] hover:bg-rose-900 border border-rose-950 text-rose-400 font-bold cursor-pointer text-[10px] tracking-wider uppercase transition-all"
              >
                🗑️ Delete Selected Accounts
              </button>
              <button
                type="button"
                onClick={() => setSelectedBankIds([])}
                className="px-2 py-1 hover:text-white text-[#E2E8F0] border border-[#262626] cursor-pointer text-[10px]"
              >
                Deselect All
              </button>
            </div>
          </div>
        )}

        {/* Breathtaking Grid list of Accounts */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 font-sans">
          {bankAccounts
            .filter(b => {
              if (summarySearch.trim()) {
                const query = summarySearch.trim().toLowerCase();
                return b.name.toLowerCase().includes(query) || (b.accountNumber && b.accountNumber.toLowerCase().includes(query));
              }
              return showAllAccounts || b.currency === selectedCurrency;
            })
            .map((b) => {
              // Advances inflow to this bank account
              const advancesForBank = customers
                .filter(c => c.paymentMethodId === b.id || (!c.paymentMethodId && b.id === 'b1'))
                .reduce((sum, c) => sum + Number(c.advancePayment || 0), 0);

              // Completed remaining payments inflow to this bank account
              const completedRemainingForBank = customers
                .filter(c => !!c.deliveryDate && (c.bankRemainingId === b.id || (!c.bankRemainingId && b.id === 'b1' && c.paymentMethodId === b.id)))
                .reduce((sum, c) => {
                  const base = c.quantity * c.unitPrice;
                  const vat = c.isVatAdded ? base * 0.15 : 0;
                  const totalInvoice = base + vat;
                  const remaining = totalInvoice - c.advancePayment;
                  return sum + Math.max(0, remaining);
                }, 0);

              // Expenses/Materials purchased out of this bank account
              const purchasesOutOfBank = purchases
                .filter(p => p.paymentMethodId === b.id)
                .reduce((sum, p) => sum + Number(p.totalPrice || 0), 0);
              
              const loanCashMovement = getLoanCashMovementForBank(b.id);
              const currentBalance = b.initialBalance + advancesForBank + completedRemainingForBank - purchasesOutOfBank + loanCashMovement;
              const isSystemDefault = ['b1', 'b2', 'b3'].includes(b.id);
              const isEditing = editingBankId === b.id;
              const isBankSelected = selectedBankIds.includes(b.id);
              const isSearchHighlighted = highlightedSearchResult?.id === b.id;

              // Hide or collapse zero-value currencies if requested (when viewing all, but hide zero-value accounts if not default and have zero balance)
              if (!showAllAccounts && currentBalance === 0 && !isSystemDefault) {
                return null;
              }

              return (
                <div 
                  key={b.id} 
                  data-global-search-id={`bank-${b.id}`}
                  className={`relative bg-[#FFFCF7] border rounded-md p-4 shadow-sm hover:border-[#166534] transition-all duration-300 md:min-h-[238px] flex flex-col justify-between ${isSearchHighlighted ? 'global-search-highlight' : ''} ${isBankSelected ? 'selected-row border-[#EC2F78]' : 'border-[#E5D8C5]'}`}
                  onClick={(e) => handleBankCardClick(b.id, e)}
                  onTouchStart={(e) => startBankLongPress(b.id, e)}
                  onTouchMove={clearBankLongPressTimer}
                  onTouchEnd={clearBankLongPressTimer}
                  onTouchCancel={clearBankLongPressTimer}
                >
                  {/* Account Details Header */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="px-2 py-1 bg-[#FAF7F0] border border-[#166534] text-[#111111] text-xs font-semibold rounded-md outline-none w-full min-w-0"
                          />
                        ) : (
                          <h4 className="font-bold text-[#111111] text-[13px] tracking-tight uppercase break-words min-w-0" title={b.name}>
                            {b.name}
                          </h4>
                        )}
                        {!isEditing && (
                          <p className="mt-1 text-[11px] text-[#6B6258]">
                            {b.accountNumber ? `A/C: ${b.accountNumber}` : 'Cash account'} - {b.currency || 'ETB'}
                          </p>
                        )}
                        </div>
                      </div>

                      {/* Three-dot dropdown menu trigger */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setActiveMenuBankId(activeMenuBankId === b.id ? null : b.id)}
                          className="text-[#6B6258] hover:text-[#111111] p-1 rounded transition-colors"
                          title="Menu"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                          </svg>
                        </button>

                        {activeMenuBankId === b.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setActiveMenuBankId(null)} />
                            <div className="absolute right-0 mt-1 w-32 bg-[#FFFCF7] border border-[#E5D8C5] rounded shadow-lg z-50 py-1 text-xs">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuBankId(null);
                                  startEditing(b);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-[#FAF7F0] text-[#111111] flex items-center gap-1.5"
                              >
                                <Edit2 className="w-3 h-3" />
                                Edit Account
                              </button>
                              {!isSystemDefault ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuBankId(null);
                                    setDeletingBankId(b.id);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-[#FAF7F0] text-rose-500 font-semibold flex items-center gap-1.5"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Delete
                                </button>
                              ) : (
                                <div className="px-3 py-1.5 text-[#6B6258] flex items-center gap-1.5 cursor-not-allowed select-none">
                                  <Lock className="w-3 h-3" />
                                  System Lock
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-[#6B6258] font-sans flex flex-col gap-1">
                      {isEditing ? (
                        <>
                          <input
                            type="text"
                            placeholder="A/C: optional"
                            value={editNumber}
                            onChange={(e) => setEditNumber(e.target.value)}
                            className="px-2 py-1 bg-[#FAF7F0] border border-[#E5D8C5] text-[#111111] text-[11px] rounded-md outline-none w-full font-sans"
                          />
                          <div className="w-full bg-[#FAF7F0] border border-[#E5D8C5] rounded-md outline-none font-sans mt-1 overflow-hidden flex items-center min-h-[24px]">
                            <SearchableSelect
                              value={editCurrency}
                              onChange={(e) => setEditCurrency(e.target.value.toUpperCase())}
                              onCreateOption={(newVal) => {
                                const cleanVal = newVal.trim().toUpperCase();
                                if (cleanVal && !newAccountCurrencies.includes(cleanVal)) {
                                  setCustomCurrencies(prev => [...prev, cleanVal]);
                                  setEditCurrency(cleanVal);
                                }
                              }}
                              createOptionLabel="Add currency"
                              placeholder="Search/add..."
                              className="w-full h-full text-[#111111] text-[11px] bg-transparent"
                              inputClassName="text-[#111111] text-[11px] uppercase bg-transparent pl-1"
                            >
                              {newAccountCurrencies.map(curr => (
                                <option key={curr} value={curr}>
                                  {curr}
                                </option>
                              ))}
                            </SearchableSelect>
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {/* Account Balance Calculations */}
                  <div className="mt-4 border-y border-[#E5D8C5] divide-y divide-[#E5D8C5]">
                    <div className="grid grid-cols-3 divide-x divide-[#E5D8C5] text-xs">
                      <div className="py-3 pr-3">
                        <span className="block text-[10px] uppercase tracking-wider text-[#6B6258]">Opening Balance</span>
                        <CopyableAmount value={b.initialBalance} displayValue={formatMockupValue(b.initialBalance)} copyValue={formatMockupValue(b.initialBalance)} currency={b.currency || 'ETB'} className="text-[#111111] font-bold" />
                        <button
                          type="button"
                          onClick={() => openAdjustmentModal(b)}
                          className="mt-1 rounded border border-[#E5D8C5] bg-[#FAF7F0] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#6B6258] hover:border-[#166534] hover:text-[#111111]"
                        >
                          Adjust
                        </button>
                      </div>
                      <div className="py-3 px-3">
                        <span className="block text-[10px] uppercase tracking-wider text-[#6B6258]">Received</span>
                        <span className="text-[#166534] font-bold">+<CopyableAmount value={advancesForBank + completedRemainingForBank} displayValue={formatMockupValue(advancesForBank + completedRemainingForBank)} copyValue={formatMockupValue(advancesForBank + completedRemainingForBank)} currency={b.currency || 'ETB'} className="text-[#166534] font-bold" /></span>
                      </div>
                      <div className="py-3 pl-3">
                        <span className="block text-[10px] uppercase tracking-wider text-[#6B6258]">Spent</span>
                        <span className="text-[#EC2F78] font-bold">-<CopyableAmount value={purchasesOutOfBank} displayValue={formatMockupValue(purchasesOutOfBank)} copyValue={formatMockupValue(purchasesOutOfBank)} currency={b.currency || 'ETB'} className="text-[#EC2F78] font-bold" /></span>
                      </div>
                    </div>

                    <div className="flex justify-between items-end bg-[#FAF7F0] px-3 py-3">
                      <span className="text-[#6B6258] font-sans text-xs font-semibold">Current Balance</span>
                      <CopyableAmount value={currentBalance} displayValue={formatMockupValue(currentBalance)} copyValue={formatMockupValue(currentBalance)} currency={b.currency || 'ETB'} className="text-[#111111] font-extrabold text-lg tracking-tight" />
                    </div>
                  </div>

                  {/* Inline Editing Controls */}
                  {isEditing && (
                    <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-[#E5D8C5]">
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(b.id)}
                        className="p-1 text-[#166534] hover:bg-[#166534]/10 border border-[#166534]/20 cursor-pointer rounded"
                        title="Save Changes"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingBankId(null)}
                        className="p-1 text-[#6B6258] hover:bg-[#FAF7F0] border border-[#E5D8C5] cursor-pointer rounded"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>
      {/* Leaderboard and Marketing Side-by-Side Panels - Responsive grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Employee Leaderboard Tabular List & Core Chart */}
        <div className="bg-[#121212] border border-[#262626] rounded-md p-5 shadow-none space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#262626] pb-4 gap-2">
            <div>
              <h3 className="font-sans font-bold text-white flex items-center gap-2 uppercase tracking-wider text-sm">
                <UserCheck className="w-5 h-5 text-[#ee317b]" />
                Employee Leaderboard
              </h3>
              <p className="text-xs text-gray-400 mt-0.5 font-sans">Dynamic performance overview of staff completing orders.</p>
            </div>
            
            <div className="bg-[#181818] border border-[#262626] rounded-md p-1.5 font-sans text-[9px] text-[#ee317b] uppercase font-bold">
              Staff Revenue Aggregates
            </div>
          </div>

          {/* Simple Leaderboard Table */}
          <div className="data-table-scroll overflow-auto border border-[#262626] rounded-md">
            <table className="freeze-pane-table w-full text-left text-xs font-sans border-collapse">
              <thead>
                <tr className="bg-[#181818] border-b border-[#262626] text-gray-400 font-sans tracking-wider uppercase text-center">
                  <th className="py-2.5 px-3 font-semibold text-gray-300 border-r border-[#262626] text-left">Staff Member</th>
                  <th className="py-2.5 px-3 font-semibold text-gray-300 border-r border-[#262626] text-center">Orders Completed</th>
                  <th className="py-2.5 px-3 font-semibold text-gray-300 text-right">Total Gross (ETB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626] text-gray-350">
                {employeeLeaderboard.map((emp, idx) => (
                  <tr key={emp.name} className="hover:bg-[#1a1a1a] transition-colors">
                    <td className="py-2 px-3 border-r border-[#262626] font-semibold text-white flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold font-sans ${
                        idx === 0 ? 'bg-[#31111E] text-[#ee317b]' : 
                        idx === 1 ? 'bg-[#262626] text-white' : 
                        'bg-[#1a1a1a] text-gray-455'
                      }`}>
                        {idx + 1}
                      </span>
                      {emp.name}
                    </td>
                    <td className="py-2 px-3 border-r border-[#262626] text-center font-sans text-gray-400">{emp.completed}</td>
                    <td className="py-2 px-3 text-right font-sans font-medium text-white"><CopyableAmount value={emp.totalGross} displayValue={emp.totalGross.toLocaleString()} copyValue={emp.totalGross.toLocaleString()} currency="ETB" className="text-white font-medium" /></td>
                  </tr>
                ))}
                {employeeLeaderboard.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center py-4 text-gray-500">No staff data exists.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* SVG Visual Bar Chart for Employees */}
          <div className="bg-[#181818] border border-[#262626] rounded-md p-4">
            <h4 className="text-xs font-sans uppercase text-[#ee317b] tracking-wider mb-4 flex items-center gap-1.5_">
              <BarChart className="w-3.5 h-3.5 text-[#ee317b]" />
              Dynamic Gross Share (ETB)
            </h4>
            <div className="space-y-4">
              {employeeLeaderboard.map((emp) => {
                const percentage = (emp.totalGross / maxEmployeeGross) * 100;
                
                return (
                  <div key={emp.name} className="space-y-1 font-sans">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-gray-300">{emp.name}</span>
                      <CopyableAmount value={emp.totalGross} displayValue={emp.totalGross.toLocaleString()} copyValue={emp.totalGross.toLocaleString()} currency="ETB" className="text-[#ee317b] font-semibold" />
                    </div>
                    <div className="w-full bg-[#262626] rounded-md h-2.5 overflow-hidden">
                      <div 
                        className="h-full bg-[#ee317b] transition-all duration-1000"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Marketing Performance Tabular List & Core Chart */}
        <div className="bg-[#121212] border border-[#262626] rounded-md p-5 shadow-none space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#262626] pb-4 gap-2">
            <div>
              <h3 className="font-sans font-bold text-white flex items-center gap-2 uppercase tracking-wider text-sm">
                <Users className="w-5 h-5 text-[#ee317b]" />
                Marketing Performance
              </h3>
              <p className="text-xs text-gray-400 mt-0.5 font-sans">Lead channel efficiency sorted by maximum generated revenue.</p>
            </div>
            
            <div className="bg-[#181818] border border-[#262626] rounded-md p-1.5 font-sans text-[9px] text-[#2DA22D] uppercase font-bold">
              Lead Channel Performance
            </div>
          </div>

          {/* Simple Marketing Channel Table */}
          <div className="data-table-scroll overflow-auto border border-[#262626] rounded-md">
            <table className="freeze-pane-table w-full text-left text-xs font-sans border-collapse">
              <thead>
                <tr className="bg-[#181818] border-b border-[#262626] text-gray-400 font-sans tracking-wider uppercase text-center">
                  <th className="py-2.5 px-3 font-semibold text-gray-300 border-r border-[#262626] text-left">Lead Channel</th>
                  <th className="py-2.5 px-3 font-semibold text-gray-300 border-r border-[#262626] text-center">Total Leads</th>
                  <th className="py-2.5 px-3 font-semibold text-gray-300 text-right">Total Revenue (ETB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626] text-gray-300">
                {marketingPerformance.map((lead) => (
                  <tr key={lead.channel} className="hover:bg-[#1a1a1a] transition-colors">
                    <td className="py-2 px-3 border-r border-[#262626] font-semibold text-white flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-[#71b536] rounded-md"></span>
                      {lead.channel}
                    </td>
                    <td className="py-2 px-3 border-r border-[#262626] text-center font-sans text-gray-400">{lead.totalLeads}</td>
                    <td className="py-2 px-3 text-right font-sans font-medium text-white"><CopyableAmount value={lead.totalRevenue} displayValue={lead.totalRevenue.toLocaleString()} copyValue={lead.totalRevenue.toLocaleString()} currency="ETB" className="text-white font-medium" /></td>
                  </tr>
                ))}
                {marketingPerformance.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center py-4 text-gray-500">No marketing data exists.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* SVG Visual Horizontal Bar Chart of Lead Channels */}
          <div className="bg-[#181818] border border-[#262626] rounded-md p-4">
            <h4 className="text-xs font-sans uppercase text-[#71b536] tracking-wider mb-4 flex items-center gap-1.5">
              <PieIcon className="w-3.5 h-3.5 text-[#71b536]" />
              Channel Contribution Ratio
            </h4>
            <div className="space-y-4">
              {marketingPerformance.map((lead) => {
                const percentage = (lead.totalRevenue / maxRevenueChannel) * 100;
                return (
                  <div key={lead.channel} className="space-y-1 font-sans">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-gray-300">{lead.channel}</span>
                      <CopyableAmount value={lead.totalRevenue} displayValue={lead.totalRevenue.toLocaleString()} copyValue={lead.totalRevenue.toLocaleString()} currency="ETB" className="text-[#71b536] font-semibold" />
                    </div>
                    <div className="w-full bg-[#262626] rounded-md h-2.5 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[#71b536] to-[#518524] transition-all duration-1000"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      </div>

      <AnimatePresence>
        {adjustingBank && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-md p-0 md:p-4 font-sans"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ y: 60, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 60, opacity: 0, scale: 0.98 }}
              className="w-full md:max-w-md bg-[#121212] border-t md:border border-[#262626] rounded-t-2xl md:rounded-2xl shadow-2xl p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#71b536]">Adjust Account Balance</p>
                  <h3 className="mt-1 text-base font-bold text-white">{adjustingBank.name}</h3>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    Current balance: <span className="text-gray-300 font-bold">{formatMockupValue(getBankCurrentBalance(adjustingBank))} {adjustingBank.currency || 'ETB'}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAdjustingBank(null)}
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">Adjustment Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjustmentType('add')}
                      className={`rounded-md border px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${adjustmentType === 'add' ? 'border-[#71b536] bg-[#112918] text-[#71b536]' : 'border-[#262626] bg-[#181818] text-gray-400 hover:text-white'}`}
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustmentType('subtract')}
                      className={`rounded-md border px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${adjustmentType === 'subtract' ? 'border-[#ee317b] bg-[#31111E] text-[#ee317b]' : 'border-[#262626] bg-[#181818] text-gray-400 hover:text-white'}`}
                    >
                      Subtract
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">Amount</label>
                  <input
                    type="text"
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(cleanLeadingZeros(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        setAdjustmentAmount(parseFractionOrExpression(adjustmentAmount).toString());
                      }
                    }}
                    className="w-full rounded-md border border-[#262626] bg-[#181818] px-3 py-2 text-sm font-bold text-white outline-none focus:border-[#71b536]"
                    placeholder={`0 ${adjustingBank.currency || 'ETB'}`}
                  />
                  <p className="mt-1 text-[10px] text-gray-500">Parsed: {parseFractionOrExpression(adjustmentAmount)} {adjustingBank.currency || 'ETB'}</p>
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">Reason</label>
                  <textarea
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    className="min-h-[92px] w-full resize-none rounded-md border border-[#262626] bg-[#181818] px-3 py-2 text-sm text-white outline-none focus:border-[#71b536]"
                    placeholder="Why is this account balance being adjusted?"
                  />
                </div>
              </div>

              <div className="mt-5 rounded-md border border-[#262626] bg-[#181818] p-3 text-[11px] text-gray-400">
                This adjustment will be logged with user <span className="font-bold text-gray-200">{currentUser?.username || currentUser?.name || 'unknown'}</span>.
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustingBank(null)}
                  className="rounded-md border border-[#262626] bg-[#181818] px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBalanceAdjustment}
                  className="rounded-md bg-[#71b536] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#5a932a]"
                >
                  Save Adjustment
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deletingBankId && (() => {
          const targetBank = bankAccounts.find(b => b.id === deletingBankId);
          if (!targetBank) return null;
          return (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 font-sans "
            >
              <motion.div 
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-[#121212] border border-[#ee317b]/40 max-w-md w-full p-6 text-left space-y-5"
              >
                <div className="flex items-start gap-3.5">
                  <div className="text-[#ee317b] text-3xl">⚠️</div>
                  <div className="space-y-1.5 font-semibold text-white">
                    <h3 className="text-white text-sm font-bold uppercase tracking-wider">Confirm Account Deactivation</h3>
                    <p className="text-xs text-gray-400 font-sans font-normal leading-relaxed">
                      Are you sure you want to delete the treasury payment account <span className="text-white font-semibold font-sans">"{targetBank.name}"</span>? Any existing customer orders bound to this payment channel will automatically fall back to the system's default deposit ledger.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#262626]">
                  <button
                    onClick={() => setDeletingBankId(null)}
                    className="px-3.5 py-1.5 text-xs text-gray-400 hover:text-white border border-[#262626] bg-[#181818] uppercase tracking-wider cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      onDeleteBankAccount(deletingBankId);
                      setDeletingBankId(null);
                    }}
                    className="px-4 py-1.5 text-xs bg-[#ee317b] hover:bg-[#d61e63] text-white font-bold uppercase tracking-widest cursor-pointer"
                  >
                    Yes, Delete Account
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Non-blocking bulk delete confirmation modal for payment accounts */}
      <AnimatePresence>
        {showBulkDeleteConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 font-sans "
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[#121212] border border-[#ee317b]/60 max-w-md w-full p-6 text-left space-y-5"
            >
              <div className="flex items-start gap-3.5">
                <div className="text-[#ee317b] text-3xl">⚠️</div>
                <div className="space-y-1.5 font-semibold text-white">
                  <h3 className="text-white text-sm font-bold uppercase tracking-wider">Confirm Bulk Account Deletion</h3>
                  <p className="text-xs text-gray-400 font-sans font-normal leading-relaxed">
                    Are you sure you want to permanently delete the <span className="text-white font-bold font-sans">{selectedBankIds.length}</span> selected payment accounts?
                  </p>
                  <p className="text-xs text-stone-500 leading-relaxed font-sans font-normal">
                    Warning: Customer orders currently bound to these deleted accounts will fall back automatically to the standard system defaults. This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => setShowBulkDeleteConfirm(false)}
                  className="px-3.5 py-1.5 text-xs text-gray-400 hover:text-white border border-[#262626] bg-[#181818] uppercase tracking-wider cursor-pointer font-sans"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBulkDelete}
                  className="px-4 py-1.5 text-xs bg-[#ee317b] hover:bg-[#d61e63] text-white font-bold uppercase tracking-widest cursor-pointer font-sans"
                >
                  Delete Selected
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pop-up Modal Form for Adding Account / Payment Method */}
      <AnimatePresence>
        {isAddingBank && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 font-sans"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[#121212] border border-[#262626] max-w-xl w-full p-6 text-left space-y-5 rounded-md shadow-2xl"
            >
              <h3 className="font-sans font-bold text-white uppercase tracking-wider text-sm border-b border-[#262626] pb-3">
                Add New Treasury Account / Payment Variant
              </h3>
              
              {bankError && (
                <p className="text-xs text-[#F87171] font-sans bg-[#2E181D]/30 p-2 border border-rose-500/25 rounded">{bankError}</p>
              )}

              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-sans font-medium text-gray-500 uppercase tracking-wider mb-1">Account &amp; Bank Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Awash Bank, Telebirr, cash"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#121212] border border-[#262626] text-white rounded-md outline-none font-sans focus:border-[#71b536]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-sans font-medium text-gray-500 uppercase tracking-wider mb-1">Account Number (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. 10002938495"
                      value={bankNumber}
                      onChange={(e) => setBankNumber(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#121212] border border-[#262626] text-white rounded-md outline-none font-sans focus:border-[#71b536]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-sans font-medium text-gray-500 uppercase tracking-wider mb-1">Currency</label>
                    <div className="w-full bg-[#121212] border border-[#262626] rounded-md outline-none font-sans focus-within:border-[#71b536] overflow-hidden min-h-[34px] flex items-center">
                      <SearchableSelect
                        value={bankCurrency}
                        onChange={(e) => setBankCurrency(e.target.value.toUpperCase())}
                        onCreateOption={(newVal) => {
                          const cleanVal = newVal.trim().toUpperCase();
                          if (cleanVal && !newAccountCurrencies.includes(cleanVal)) {
                            setCustomCurrencies(prev => [...prev, cleanVal]);
                            setBankCurrency(cleanVal);
                          }
                        }}
                        createOptionLabel="Add currency"
                        placeholder="Search or add currency..."
                        className="w-full h-full text-white text-xs bg-transparent"
                        inputClassName="font-bold text-white text-xs uppercase bg-transparent"
                      >
                        {newAccountCurrencies.map(curr => (
                          <option key={curr} value={curr}>
                            {curr}
                          </option>
                        ))}
                      </SearchableSelect>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-sans font-medium text-gray-500 uppercase tracking-wider mb-1">Initial Balance (expression enabled)</label>
                    <input
                      type="text"
                      value={bankInitial}
                      onChange={(e) => setBankInitial(cleanLeadingZeros(e.target.value))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          setBankInitial(parseFractionOrExpression(bankInitial).toString());
                        }
                      }}
                      className="w-full px-3 py-2 text-xs bg-[#121212] border border-[#262626] text-white rounded-md outline-none font-sans focus:border-[#71b536]"
                    />
                    <div className="text-[10px] text-gray-500 mt-1.5 font-sans">
                      Parsed: {parseFractionOrExpression(bankInitial)} {bankCurrency}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#262626] mt-4">
                  <button
                    type="button"
                    onClick={() => setIsAddingBank(false)}
                    className="px-4 py-2 text-xs bg-[#181818] border border-[#262626] text-white font-semibold uppercase tracking-wider cursor-pointer rounded-md hover:bg-[#222]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs bg-[#71b536] hover:bg-[#5a932a] text-white font-semibold uppercase tracking-wider cursor-pointer rounded-md"
                  >
                    Register Account
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
