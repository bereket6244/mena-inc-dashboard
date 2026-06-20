import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Calendar, 
  DollarSign, 
  User, 
  FileText, 
  CreditCard,
  FolderPlus, 
  Tag, 
  X, 
  Briefcase,
  Banknote,
  PlusCircle,
  Check,
  Lock,
  ArrowRight,
  Calculator,
  Percent,
  Download,
  Filter,
  RotateCcw,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Table as TableIcon
} from 'lucide-react';

import { Purchase, ExpenseCategory, BankAccount, EmployeeUser, Loan } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import SearchableSelect from './SearchableSelect';
import { FloatingAddButton, DataTable, TableToolbar } from './shared/TabLayout';
import { parseFractionOrExpression, cleanLeadingZeros } from '../utils';
import AppToast, { AppToastType } from './shared/AppToast';

const PURCHASE_SORT_FIELDS = ['recordedOrder', 'lastAdded', 'itemOrService', 'expenseCategory', 'quantity', 'unitPrice', 'totalPrice', 'purchaseDate'] as const;
type PurchaseColumnSortField = Exclude<typeof PURCHASE_SORT_FIELDS[number], 'recordedOrder' | 'lastAdded'>;
type PurchaseSortField = typeof PURCHASE_SORT_FIELDS[number];
const PURCHASE_SORT_BY_STORAGE_KEY = 'ui.purchases.sortBy';
const PURCHASE_SORT_ASC_STORAGE_KEY = 'ui.purchases.sortAsc';
const PURCHASE_CATEGORIES_COLLAPSED_STORAGE_KEY = 'ui.purchases.categoriesCollapsed';
const PURCHASE_FILTERS_STORAGE_KEY = 'ui.purchases.filters';
const PURCHASE_LAYOUT_STORAGE_KEY = 'ui.purchases.layoutMode';
const PURCHASE_CATEGORY_PANEL_WIDTH_STORAGE_KEY = 'ui.purchases.categoryPanelWidth';
const PURCHASE_CATEGORY_LIST_HEIGHT_STORAGE_KEY = 'ui.purchases.categoryListHeight';
const PURCHASE_FINANCE_VIEW_STORAGE_KEY = 'ui.purchases.financeView';
const LOAN_LAYOUT_STORAGE_KEY = 'ui.loans.layoutMode';
const LOAN_SORT_BY_STORAGE_KEY = 'ui.loans.sortBy';
const LOAN_SORT_ASC_STORAGE_KEY = 'ui.loans.sortAsc';
const LOAN_FILTERS_STORAGE_KEY = 'ui.loans.filters';
const LOAN_SORT_FIELDS = ['loanDate', 'personName', 'principalAmount', 'paidAmount', 'remainingAmount', 'dueDate', 'status'] as const;
type LoanSortField = typeof LOAN_SORT_FIELDS[number];
const MIN_CATEGORY_PANEL_WIDTH = 260;
const MAX_CATEGORY_PANEL_WIDTH = 620;
const MIN_CATEGORY_LIST_HEIGHT = 220;
const FALLBACK_MAX_CATEGORY_LIST_HEIGHT = 1200;

interface PurchasesTabProps {
  purchases: Purchase[];
  onUpdatePurchases: (updated: Purchase[]) => void | Promise<void>;
  loans: Loan[];
  onUpdateLoans: (updated: Loan[]) => void | Promise<void>;
  categories: ExpenseCategory[];
  onUpdateCategories: (updated: ExpenseCategory[]) => void | Promise<void>;
  bankAccounts: BankAccount[];
  currentUser: EmployeeUser | null;
  employees: EmployeeUser[];
  highlightedSearchResult?: { type: string; id: string } | null;
}

export default function PurchasesTab({
  purchases,
  onUpdatePurchases,
  loans,
  onUpdateLoans,
  categories,
  onUpdateCategories,
  bankAccounts,
  currentUser,
  employees,
  highlightedSearchResult = null
}: PurchasesTabProps) {
  
  // Search & Filters
  const availableCurrencies = Array.from(new Set([
    'ETB', 'USD', 'EUR', 'GBP', 'AED',
    ...bankAccounts.map(b => b.currency || 'ETB')
  ]));

  const [searchQuery, setSearchQuery] = useState('');
  const [financeView, setFinanceView] = useState<'purchases' | 'loans'>(() => {
    return localStorage.getItem(PURCHASE_FINANCE_VIEW_STORAGE_KEY) === 'loans' ? 'loans' : 'purchases';
  });
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchWrapperRef = useRef<HTMLDivElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [isCategorySearchExpanded, setIsCategorySearchExpanded] = useState(false);
  const categorySearchWrapperRef = useRef<HTMLDivElement>(null);
  const categorySearchInputRef = useRef<HTMLInputElement>(null);
  const savedPurchaseFilters = (() => {
    try {
      return JSON.parse(localStorage.getItem(PURCHASE_FILTERS_STORAGE_KEY) || '{}') as Partial<Record<'category' | 'bank' | 'recordedBy' | 'intervalStart' | 'intervalEnd', string>>;
    } catch {
      return {};
    }
  })();
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>(savedPurchaseFilters.category || 'All');
  const [selectedBankFilter, setSelectedBankFilter] = useState<string>(savedPurchaseFilters.bank || 'All');
  const [selectedRecordedByFilter, setSelectedRecordedByFilter] = useState<string>(savedPurchaseFilters.recordedBy || 'All');
  const [expenseIntervalStart, setExpenseIntervalStart] = useState(savedPurchaseFilters.intervalStart || '');
  const [expenseIntervalEnd, setExpenseIntervalEnd] = useState(savedPurchaseFilters.intervalEnd || '');
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [showMobileSortPopover, setShowMobileSortPopover] = useState(false);
  const [showDesktopSortPopover, setShowDesktopSortPopover] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'cards'>(() => {
    return localStorage.getItem(PURCHASE_LAYOUT_STORAGE_KEY) === 'cards' ? 'cards' : 'grid';
  });
  const [loanLayoutMode, setLoanLayoutMode] = useState<'grid' | 'cards'>(() => {
    return localStorage.getItem(LOAN_LAYOUT_STORAGE_KEY) === 'cards' ? 'cards' : 'grid';
  });
  const [sortBy, setSortBy] = useState<PurchaseSortField>(() => {
    const savedSortBy = localStorage.getItem(PURCHASE_SORT_BY_STORAGE_KEY);
    return PURCHASE_SORT_FIELDS.includes(savedSortBy as PurchaseSortField) ? savedSortBy as PurchaseSortField : 'purchaseDate';
  });
  const [isSortAsc, setIsSortAsc] = useState(() => {
    return localStorage.getItem(PURCHASE_SORT_ASC_STORAGE_KEY) === 'true';
  });
  const savedLoanFilters = (() => {
    try {
      return JSON.parse(localStorage.getItem(LOAN_FILTERS_STORAGE_KEY) || '{}') as Partial<Record<'type' | 'status' | 'account' | 'staff' | 'startDate' | 'endDate', string>>;
    } catch {
      return {};
    }
  })();
  const [loanSearchQuery, setLoanSearchQuery] = useState('');
  const [loanTypeFilter, setLoanTypeFilter] = useState<string>(savedLoanFilters.type || 'All');
  const [loanStatusFilter, setLoanStatusFilter] = useState<string>(savedLoanFilters.status || 'All');
  const [loanAccountFilter, setLoanAccountFilter] = useState<string>(savedLoanFilters.account || 'All');
  const [loanStaffFilter, setLoanStaffFilter] = useState<string>(savedLoanFilters.staff || 'All');
  const [loanStartDate, setLoanStartDate] = useState(savedLoanFilters.startDate || '');
  const [loanEndDate, setLoanEndDate] = useState(savedLoanFilters.endDate || '');
  const [showLoanFilters, setShowLoanFilters] = useState(false);
  const [showLoanSortPopover, setShowLoanSortPopover] = useState(false);
  const [loanSortBy, setLoanSortBy] = useState<LoanSortField>(() => {
    const savedSortBy = localStorage.getItem(LOAN_SORT_BY_STORAGE_KEY);
    return LOAN_SORT_FIELDS.includes(savedSortBy as LoanSortField) ? savedSortBy as LoanSortField : 'loanDate';
  });
  const [isLoanSortAsc, setIsLoanSortAsc] = useState(() => {
    return localStorage.getItem(LOAN_SORT_ASC_STORAGE_KEY) === 'true';
  });
  // Form management for custom Purchase
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [isLoanFormOpen, setIsLoanFormOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [loanType, setLoanType] = useState<'given' | 'received'>('given');
  const [loanPersonName, setLoanPersonName] = useState('');
  const [loanPhone, setLoanPhone] = useState('');
  const [loanPrincipalInput, setLoanPrincipalInput] = useState('');
  const [loanInterestInput, setLoanInterestInput] = useState('');
  const [loanCurrency, setLoanCurrency] = useState('');
  const [loanDate, setLoanDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loanDueDate, setLoanDueDate] = useState('');
  const [loanPaymentMethodId, setLoanPaymentMethodId] = useState('');
  const [loanNotes, setLoanNotes] = useState('');
  const [repaymentLoan, setRepaymentLoan] = useState<Loan | null>(null);
  const [repaymentAmountInput, setRepaymentAmountInput] = useState('');
  const [repaymentDate, setRepaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [repaymentMethodId, setRepaymentMethodId] = useState('');
  const [repaymentNotes, setRepaymentNotes] = useState('');

  // New item from search suggestion flow state
  const [addingNewItemFromSearch, setAddingNewItemFromSearch] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(PURCHASE_FINANCE_VIEW_STORAGE_KEY, financeView);
  }, [financeView]);

  useEffect(() => {
    localStorage.setItem(LOAN_LAYOUT_STORAGE_KEY, loanLayoutMode);
  }, [loanLayoutMode]);

  useEffect(() => {
    localStorage.setItem(LOAN_SORT_BY_STORAGE_KEY, loanSortBy);
    localStorage.setItem(LOAN_SORT_ASC_STORAGE_KEY, String(isLoanSortAsc));
  }, [loanSortBy, isLoanSortAsc]);

  useEffect(() => {
    localStorage.setItem(LOAN_FILTERS_STORAGE_KEY, JSON.stringify({
      type: loanTypeFilter,
      status: loanStatusFilter,
      account: loanAccountFilter,
      staff: loanStaffFilter,
      startDate: loanStartDate,
      endDate: loanEndDate
    }));
  }, [loanTypeFilter, loanStatusFilter, loanAccountFilter, loanStaffFilter, loanStartDate, loanEndDate]);

  // Lock body scroll when purchases or loan forms are open
  useEffect(() => {
    if (isFormOpen || isLoanFormOpen || repaymentLoan || addingNewItemFromSearch !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFormOpen, isLoanFormOpen, repaymentLoan, addingNewItemFromSearch]);

  // Focus search input on expansion
  useEffect(() => {
    if (isSearchExpanded) {
      if (searchInputRef.current) searchInputRef.current.focus();
      if (mobileSearchInputRef.current) mobileSearchInputRef.current.focus();
    }
  }, [isSearchExpanded]);

  useEffect(() => {
    const handleFocusSearch = (event: Event) => {
      const requestedTab = (event as CustomEvent)?.detail?.tab;
      if (requestedTab && requestedTab !== 'purchases') return;
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
  }, [layoutMode]);

  useEffect(() => {
    const handleClearFiltersRequest = () => {
      setSearchQuery('');
      setSelectedCategoryFilter('All');
      setSelectedBankFilter('All');
      setSelectedRecordedByFilter('All');
      setExpenseIntervalStart('');
      setExpenseIntervalEnd('');
      setShowFilterPopover(false);
      setShowMobileFilters(false);
    };
    window.addEventListener('mena:purchases-clear-filters', handleClearFiltersRequest);
    return () => window.removeEventListener('mena:purchases-clear-filters', handleClearFiltersRequest);
  }, []);

  useEffect(() => {
    if (isCategorySearchExpanded && categorySearchInputRef.current) {
      categorySearchInputRef.current.focus();
    }
  }, [isCategorySearchExpanded]);

  // Click outside search container should close it if query is empty
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      let outsideDesktop = true;
      let outsideMobile = true;
      if (searchWrapperRef.current && searchWrapperRef.current.contains(e.target as Node)) {
        outsideDesktop = false;
      }
      if (mobileSearchWrapperRef.current && mobileSearchWrapperRef.current.contains(e.target as Node)) {
        outsideMobile = false;
      }
      if (categorySearchWrapperRef.current && categorySearchWrapperRef.current.contains(e.target as Node)) {
        return;
      }
      if (outsideDesktop && outsideMobile && !searchQuery) {
        setIsSearchExpanded(false);
      }
      if (!categorySearchQuery) {
        setIsCategorySearchExpanded(false);
      }
    };
    if (isSearchExpanded || isCategorySearchExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSearchExpanded, isCategorySearchExpanded, searchQuery, categorySearchQuery]);

  // Handle escape key to close search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSearchExpanded(false);
        setIsCategorySearchExpanded(false);
      }
    };
    if (isSearchExpanded || isCategorySearchExpanded) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSearchExpanded, isCategorySearchExpanded]);

  // Purchase Form inputs
  const [purchasedBy, setPurchasedBy] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [itemOrServiceInput, setItemOrServiceInput] = useState('');
  const [qtyInput, setQtyInput] = useState('');
  const quantity = Math.max(0, parseFractionOrExpression(qtyInput));
  const [unitPriceInput, setUnitPriceInput] = useState('');
  const unitPrice = Math.max(0, parseFractionOrExpression(unitPriceInput));
  const [purchaseCurrency, setPurchaseCurrency] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [notesOrDescription, setNotesOrDescription] = useState('');
  const [recordedBy, setRecordedBy] = useState('');

  // Tax and Withholding states inside form
  const [hasVat, setHasVat] = useState(false);
  const [hasWithholding, setHasWithholding] = useState(false);

  // Autocomplete Suggestions State
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const suggestionRef = useRef<HTMLDivElement>(null);
  const suggestionOptionRefs = useRef<Array<HTMLDivElement | null>>([]);

  // Batch purchase creation state
  interface PendingPurchaseItem {
    tempId: string;
    itemOrService: string;
    expenseCategory: string;
    quantity: number;
    unitPrice: number;
    currency: string;
    hasVat: boolean;
    vatAmount: number;
    hasWithholding: boolean;
    withholdingAmount: number;
    baseAmount: number;
    totalPrice: number;
    notesOrDescription: string;
  }
  const [pendingBatchItems, setPendingBatchItems] = useState<PendingPurchaseItem[]>([]);
  const purchaseFormInputClass = "w-full h-9 px-2.5 py-2 text-xs bg-[#121212] text-white border border-[#262626] focus:border-[#ee317b] rounded-md outline-none font-sans";

  // Category Configuration inputs
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [activeCategoryIdForNewItem, setActiveCategoryIdForNewItem] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [editingCategoryItem, setEditingCategoryItem] = useState<{ catId: string; item: string } | null>(null);
  const [editCategoryItemValue, setEditCategoryItemValue] = useState('');
  const [deletingCategoryItem, setDeletingCategoryItem] = useState<{ catId: string; categoryName: string; item: string } | null>(null);
  const [movingCategoryItem, setMovingCategoryItem] = useState<{ sourceCatId: string; sourceCategoryName: string; item: string; targetCatId: string } | null>(null);
  const [draggedCategoryItem, setDraggedCategoryItem] = useState<{ sourceCatId: string; item: string } | null>(null);
  const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null>(null);
  const [categoryPanelWidth, setCategoryPanelWidth] = useState(() => {
    const saved = Number(localStorage.getItem(PURCHASE_CATEGORY_PANEL_WIDTH_STORAGE_KEY));
    if (!Number.isFinite(saved) || saved <= 0) return 320;
    return Math.min(MAX_CATEGORY_PANEL_WIDTH, Math.max(MIN_CATEGORY_PANEL_WIDTH, saved));
  });
  const [categoryListHeight, setCategoryListHeight] = useState(() => {
    const saved = Number(localStorage.getItem(PURCHASE_CATEGORY_LIST_HEIGHT_STORAGE_KEY));
    if (!Number.isFinite(saved) || saved <= 0) return 500;
    return Math.min(FALLBACK_MAX_CATEGORY_LIST_HEIGHT, Math.max(MIN_CATEGORY_LIST_HEIGHT, saved));
  });
  const [isResizingCategoryPanel, setIsResizingCategoryPanel] = useState(false);
  const [isResizingCategoryList, setIsResizingCategoryList] = useState(false);
  const categoryPanelResizeRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const categoryPanelRef = useRef<HTMLDivElement>(null);
  const categoryListRef = useRef<HTMLDivElement>(null);
  const purchaseLedgerTableRef = useRef<HTMLDivElement>(null);
  const purchaseLedgerGalleryRef = useRef<HTMLDivElement>(null);
  const categoryListResizeRef = useRef<{ startY: number; startHeight: number; maxHeight: number } | null>(null);

  // Category inline editing states (Make categories editable)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryNameValue, setEditCategoryNameValue] = useState('');

  // Mobile categories collapse
  const [isMobileCategoriesCollapsed, setIsMobileCategoriesCollapsed] = useState(() => {
    const savedCollapsed = localStorage.getItem(PURCHASE_CATEGORIES_COLLAPSED_STORAGE_KEY);
    return savedCollapsed === null ? true : savedCollapsed === 'true';
  });

  // New item from search suggestion flow state
  const [newItemTargetCategory, setNewItemTargetCategory] = useState<string>('');
  const [isNewCategoryModeInModal, setIsNewCategoryModeInModal] = useState(false);
  const [modalNewCategoryName, setModalNewCategoryName] = useState('');

  // Selection for bulk actions
  const [selectedPurchaseIds, setSelectedPurchaseIds] = useState<string[]>([]);
  const [lastSelectedPurchaseId, setLastSelectedPurchaseId] = useState<string | null>(null);
  const rowLongPressTimerRef = useRef<number | null>(null);
  const [deletingPurchaseId, setDeletingPurchaseId] = useState<string | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<ExpenseCategory | null>(null);
  const [warningMessage, setWarningMessage] = useState('');
  const [purchaseToastType, setPurchaseToastType] = useState<AppToastType>('info');

  const isAdmin = currentUser?.role === 'admin';
  const showPurchaseToast = (message: string, type: AppToastType = 'success') => {
    setWarningMessage(message);
    setPurchaseToastType(type);
    window.setTimeout(() => setWarningMessage(''), 3000);
  };
  const showWarning = (message: string) => showPurchaseToast(message, 'error');

  const clearRowLongPressTimer = () => {
    if (rowLongPressTimerRef.current !== null) {
      window.clearTimeout(rowLongPressTimerRef.current);
      rowLongPressTimerRef.current = null;
    }
  };

  const togglePurchaseSelection = (purchaseId: string) => {
    setSelectedPurchaseIds(prev => (
      prev.includes(purchaseId)
        ? prev.filter(id => id !== purchaseId)
        : [...prev, purchaseId]
    ));
    setLastSelectedPurchaseId(purchaseId);
  };

  const startPurchaseRowLongPress = (purchaseId: string, event: React.TouchEvent) => {
    const target = event.target as HTMLElement;
    if (target.closest('button, input, select, textarea, a, [role="button"]')) return;
    clearRowLongPressTimer();
    rowLongPressTimerRef.current = window.setTimeout(() => {
      togglePurchaseSelection(purchaseId);
      rowLongPressTimerRef.current = null;
    }, 520);
  };

  const handlePurchaseRowClick = (purchaseId: string, event: React.MouseEvent) => {
    if (selectedPurchaseIds.length === 0 && !event.shiftKey) return;
    const target = event.target as HTMLElement;
    if (target.closest('button, input, select, textarea, a, [role="button"]')) return;
    if (event.shiftKey && lastSelectedPurchaseId) {
      const start = sortedPurchases.findIndex(purchase => purchase.id === lastSelectedPurchaseId);
      const end = sortedPurchases.findIndex(purchase => purchase.id === purchaseId);
      if (start !== -1 && end !== -1) {
        const [from, to] = start < end ? [start, end] : [end, start];
        const rangeIds = sortedPurchases.slice(from, to + 1).map(purchase => purchase.id);
        setSelectedPurchaseIds(prev => Array.from(new Set([...prev, ...rangeIds])));
        setLastSelectedPurchaseId(purchaseId);
        return;
      }
    }
    togglePurchaseSelection(purchaseId);
  };

  useEffect(() => clearRowLongPressTimer, []);

  // Listen for clicks outside suggestions box to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Pre-populate user persona name on opening of modal
  useEffect(() => {
    if (isFormOpen && !editingPurchase) {
      setPurchasedBy(currentUser?.name || '');
      setRecordedBy(currentUser?.name || '');
    }
  }, [isFormOpen, editingPurchase, currentUser]);

  // Toggle sorting
  const handleRecordedOrderSort = () => {
    setSortBy('recordedOrder');
    setIsSortAsc(true);
  };

  const handleSort = (field: PurchaseColumnSortField) => {
    if (sortBy === field) {
      setIsSortAsc(!isSortAsc);
    } else {
      setSortBy(field);
      setIsSortAsc(true);
    }
  };

  const SortablePurchaseHeader = ({ field, children, align = 'left', className = '' }: { field: PurchaseColumnSortField; children: React.ReactNode; align?: 'left' | 'center' | 'right'; className?: string }) => {
    const alignClass = align === 'right' ? 'justify-end text-right' : align === 'center' ? 'justify-center text-center' : 'justify-start text-left';
    const arrow = isSortAsc ? '\u2191' : '\u2193';

    return (
      <th
        className={`py-2.5 px-3 font-semibold text-gray-300 border-r border-[#262626] ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'} cursor-pointer select-none ${className}`}
        onClick={() => handleSort(field)}
      >
        <span className={`inline-flex w-full items-center ${alignClass} gap-1 whitespace-nowrap`}>
          <span>{children}</span>
          <span className="inline-flex w-3 shrink-0 justify-center text-[#ee317b]" aria-hidden="true">
            {sortBy === field ? arrow : ''}
          </span>
        </span>
      </th>
    );
  };

  const movePurchaseColumn = (table: HTMLTableElement, fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    Array.from(table.rows).forEach(row => {
      const cells = Array.from(row.children);
      const fromCell = cells[fromIndex];
      const toCell = cells[toIndex];
      if (!fromCell || !toCell) return;
      row.insertBefore(fromCell, fromIndex < toIndex ? toCell.nextSibling : toCell);
    });
  };

  useEffect(() => {
    localStorage.setItem(PURCHASE_SORT_BY_STORAGE_KEY, sortBy);
    localStorage.setItem(PURCHASE_SORT_ASC_STORAGE_KEY, String(isSortAsc));
  }, [sortBy, isSortAsc]);



  useEffect(() => {
    localStorage.setItem(PURCHASE_CATEGORIES_COLLAPSED_STORAGE_KEY, String(isMobileCategoriesCollapsed));
  }, [isMobileCategoriesCollapsed]);

  useEffect(() => {
    localStorage.setItem(PURCHASE_FILTERS_STORAGE_KEY, JSON.stringify({
      category: selectedCategoryFilter,
      bank: selectedBankFilter,
      recordedBy: selectedRecordedByFilter,
      intervalStart: expenseIntervalStart,
      intervalEnd: expenseIntervalEnd,
    }));
  }, [selectedCategoryFilter, selectedBankFilter, selectedRecordedByFilter, expenseIntervalStart, expenseIntervalEnd]);

  useEffect(() => {
    localStorage.setItem(PURCHASE_LAYOUT_STORAGE_KEY, layoutMode);
  }, [layoutMode]);

  useEffect(() => {
    localStorage.setItem(PURCHASE_CATEGORY_PANEL_WIDTH_STORAGE_KEY, String(categoryPanelWidth));
  }, [categoryPanelWidth]);

  useEffect(() => {
    localStorage.setItem(PURCHASE_CATEGORY_LIST_HEIGHT_STORAGE_KEY, String(categoryListHeight));
  }, [categoryListHeight]);

  const getCategoryListMaxHeight = () => {
    const listRect = categoryListRef.current?.getBoundingClientRect();
    const panelRect = categoryPanelRef.current?.getBoundingClientRect();
    const ledgerRect = (layoutMode === 'grid'
      ? purchaseLedgerTableRef.current
      : purchaseLedgerGalleryRef.current
    )?.getBoundingClientRect();
    if (!listRect || !panelRect || !ledgerRect || ledgerRect.height <= 0) return FALLBACK_MAX_CATEGORY_LIST_HEIGHT;
    const panelChromeBelowList = Math.max(0, panelRect.bottom - listRect.bottom);
    return Math.max(MIN_CATEGORY_LIST_HEIGHT, ledgerRect.bottom - listRect.top - panelChromeBelowList);
  };

  useEffect(() => {
    const clampCategoryListToLedger = () => {
      const availableHeight = getCategoryListMaxHeight();
      setCategoryListHeight(prev => Math.min(prev, availableHeight));
    };

    window.addEventListener('resize', clampCategoryListToLedger);
    return () => window.removeEventListener('resize', clampCategoryListToLedger);
  }, []);

  useEffect(() => {
    if (!isResizingCategoryPanel) return;

    const handleMouseMove = (event: MouseEvent) => {
      if (!categoryPanelResizeRef.current) return;
      const delta = event.clientX - categoryPanelResizeRef.current.startX;
      const nextWidth = categoryPanelResizeRef.current.startWidth + delta;
      setCategoryPanelWidth(Math.min(MAX_CATEGORY_PANEL_WIDTH, Math.max(MIN_CATEGORY_PANEL_WIDTH, nextWidth)));
    };

    const handleMouseUp = () => {
      setIsResizingCategoryPanel(false);
      categoryPanelResizeRef.current = null;
      document.body.classList.remove('purchase-category-panel-resizing');
    };

    document.body.classList.add('purchase-category-panel-resizing');
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.classList.remove('purchase-category-panel-resizing');
    };
  }, [isResizingCategoryPanel]);

  useEffect(() => {
    if (!isResizingCategoryList) return;

    const handleMouseMove = (event: MouseEvent) => {
      if (!categoryListResizeRef.current) return;
      const delta = event.clientY - categoryListResizeRef.current.startY;
      const nextHeight = categoryListResizeRef.current.startHeight + delta;
      setCategoryListHeight(Math.min(categoryListResizeRef.current.maxHeight, Math.max(MIN_CATEGORY_LIST_HEIGHT, nextHeight)));
    };

    const handleMouseUp = () => {
      setIsResizingCategoryList(false);
      categoryListResizeRef.current = null;
      document.body.classList.remove('purchase-category-list-resizing');
    };

    document.body.classList.add('purchase-category-list-resizing');
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.classList.remove('purchase-category-list-resizing');
    };
  }, [isResizingCategoryList]);

  // Open Form for addition
  const handleOpenAddForm = () => {
    setEditingPurchase(null);
    setPendingBatchItems([]); // reset batch creation
    setPurchasedBy(currentUser?.name || '');
    setExpenseCategory('');
    setItemOrServiceInput('');
    setQtyInput('');
    setUnitPriceInput('');
    setPurchaseCurrency('');
    setHasVat(false);
    setHasWithholding(false);
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setPaymentMethodId('');
    setNotesOrDescription('');
    setRecordedBy(currentUser?.name || '');
    setIsFormOpen(true);
  };

  // Open Form for editing
  const handleOpenEditForm = (p: Purchase) => {
    setEditingPurchase(p);
    setPendingBatchItems([]); // batch mode unavailable during editing
    setPurchasedBy(p.purchasedBy);
    setExpenseCategory(p.expenseCategory);
    setItemOrServiceInput(p.itemOrService);
    setQtyInput(p.quantity.toString());
    setUnitPriceInput(p.unitPrice.toString());
    setPurchaseCurrency(p.currency || '');
    
    // Support pre-populating historical custom tax items
    setHasVat(!!p.hasVat);
    setHasWithholding(!!p.hasWithholding);
    
    setPurchaseDate(p.purchaseDate);
    setPaymentMethodId(p.paymentMethodId);
    setNotesOrDescription(p.notesOrDescription);
    setRecordedBy(p.recordedBy);
    setIsFormOpen(true);
  };

  // Extract all catalog subitems across all categories
  const allCatalogItems = categories.flatMap(cat => 
    cat.items.map(it => ({
      name: it,
      categoryName: cat.name
    }))
  );

  const hasExactSuggestionMatch = allCatalogItems.some(
    item => item.name.toLowerCase() === itemOrServiceInput.trim().toLowerCase()
  );

  // Suggestions filtered by what user is currently typing
  const filteredSuggestions = itemOrServiceInput.trim()
    ? allCatalogItems.filter(item => 
        item.name.toLowerCase().includes(itemOrServiceInput.toLowerCase())
      )
    : [];
  const matchedItemCategoryName = allCatalogItems.find(
    item => item.name.toLowerCase() === itemOrServiceInput.trim().toLowerCase()
  )?.categoryName;
  const displayedItemCategory = matchedItemCategoryName || expenseCategory;
  const showCreateSuggestion = itemOrServiceInput.trim() !== '' && !hasExactSuggestionMatch;
  const suggestionOptionCount = filteredSuggestions.length + (showCreateSuggestion ? 1 : 0);

  useEffect(() => {
    setActiveSuggestionIndex(0);
    suggestionOptionRefs.current = [];
  }, [itemOrServiceInput, showSuggestions]);

  useEffect(() => {
    if (!showSuggestions) return;
    suggestionOptionRefs.current[activeSuggestionIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeSuggestionIndex, showSuggestions]);

  const handleSuggestionClick = (itemName: string, categoryName: string) => {
    setItemOrServiceInput(itemName);
    setExpenseCategory(categoryName);
    setShowSuggestions(false);
  };

  // Auto detect category if user typed text exactly matches a catalog item
  const handleItemInputChange = (text: string) => {
    setItemOrServiceInput(text);
    setShowSuggestions(true);
    
    const exactMatch = allCatalogItems.find(
      catItem => catItem.name.toLowerCase() === text.trim().toLowerCase()
    );
    if (exactMatch) {
      setExpenseCategory(exactMatch.categoryName);
    }
  };

  const selectActiveSuggestion = () => {
    if (activeSuggestionIndex < filteredSuggestions.length) {
      const topSuggestion = filteredSuggestions[activeSuggestionIndex];
      if (topSuggestion) {
        handleSuggestionClick(topSuggestion.name, topSuggestion.categoryName);
      }
      return;
    }
    if (showCreateSuggestion) {
      handleTriggerAddNewItemFlow();
    }
  };

  // Tax math breakdown for single item
  const baseAmount = quantity * unitPrice;
  const vatAmount = hasVat ? baseAmount * 0.15 : 0;
  const withholdingAmount = hasWithholding ? baseAmount * 0.03 : 0;
  const currentCalculatedTotalPrice = baseAmount + vatAmount - withholdingAmount;

  // Add Item to current Batch (temporary list)
  const handleAddCurrentRowToBatch = () => {
    if (!paymentMethodId) {
      showWarning('Please select the Charge Ledger Bank/Cash account.');
      return;
    }

    if (!purchaseCurrency) {
      showWarning('Please select a currency for the item.');
      return;
    }

    const finalItemName = itemOrServiceInput.trim();
    if (!finalItemName) {
      showWarning('Please specify the Item or Service purchased.');
      return;
    }
    if (quantity <= 0) {
      showWarning('Quantity must be greater than zero for the pending item.');
      return;
    }
    if (unitPrice < 0) {
      showWarning('Unit Price cannot be negative for the pending item.');
      return;
    }

    const calculatedBase = quantity * unitPrice;
    const calculatedVat = hasVat ? calculatedBase * 0.15 : 0;
    const calculatedWithholding = hasWithholding ? calculatedBase * 0.03 : 0;
    const calculatedTotal = calculatedBase + calculatedVat - calculatedWithholding;

    const newBatchItem: PendingPurchaseItem = {
      tempId: `tmp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      itemOrService: finalItemName,
      expenseCategory: expenseCategory || categories[0]?.name || 'Uncategorized',
      quantity,
      unitPrice,
      currency: purchaseCurrency,
      hasVat,
      vatAmount: calculatedVat,
      hasWithholding,
      withholdingAmount: calculatedWithholding,
      baseAmount: calculatedBase,
      totalPrice: calculatedTotal,
      notesOrDescription: notesOrDescription.trim()
    };

    setPendingBatchItems(prev => [...prev, newBatchItem]);
    showPurchaseToast('Purchase item added to batch.');

    // Track state of dynamic catalog addition safely if custom item typed
    const existingInCatalog = allCatalogItems.some(
      item => item.name.toLowerCase() === finalItemName.toLowerCase()
    );
    if (!existingInCatalog && finalItemName) {
      const targetCat = expenseCategory || categories[0]?.name;
      const updatedCats = categories.map(c => {
        if (c.name === targetCat && !c.items.includes(finalItemName)) {
          return { ...c, items: [...c.items, finalItemName] };
        }
        return c;
      });
      onUpdateCategories(updatedCats);
    }

    // Reset item level form inputs for next catalog item
    setItemOrServiceInput('');
    setQtyInput('');
    setUnitPriceInput('');
    setHasVat(false);
    setHasWithholding(false);
    setNotesOrDescription('');
  };

  // Remove individual row from Batch
  const handleRemoveItemFromBatch = (tempId: string) => {
    setPendingBatchItems(prev => prev.filter(item => item.tempId !== tempId));
  };

  // Save changes/Commit Purchases
  const handleSavePurchase = (e: React.FormEvent) => {
    e.preventDefault();

    if (!paymentMethodId) {
      showWarning('Please select the Charge Ledger Bank/Cash account.');
      return;
    }

    const finalItemName = itemOrServiceInput.trim();
    let allItemsToSave = [...pendingBatchItems];

    // If there is a partially drafted item in the form, append it to the batch automatically
    if (finalItemName) {
      if (!purchaseCurrency) {
        showWarning('Please select a currency for the item.');
        return;
      }
      if (quantity <= 0) {
        showWarning('Quantity must be greater than zero for the pending item.');
        return;
      }
      if (unitPrice < 0) {
        showWarning('Unit Price cannot be negative for the pending item.');
        return;
      }

      const calculatedBase = quantity * unitPrice;
      const calculatedVat = hasVat ? calculatedBase * 0.15 : 0;
      const calculatedWithholding = hasWithholding ? calculatedBase * 0.03 : 0;
      const calculatedTotal = calculatedBase + calculatedVat - calculatedWithholding;

      const newBatchItem: PendingPurchaseItem = {
        tempId: `tmp-${Date.now()}-auto`,
        itemOrService: finalItemName,
        expenseCategory: expenseCategory || categories[0]?.name || 'Uncategorized',
        quantity,
        unitPrice,
        currency: purchaseCurrency,
        hasVat,
        vatAmount: calculatedVat,
        hasWithholding,
        withholdingAmount: calculatedWithholding,
        baseAmount: calculatedBase,
        totalPrice: calculatedTotal,
        notesOrDescription: notesOrDescription.trim()
      };
      
      allItemsToSave.push(newBatchItem);

      // Track dynamic additions for the automatically added item
      const existingInCatalog = allCatalogItems.some(
        item => item.name.toLowerCase() === finalItemName.toLowerCase()
      );
      if (!existingInCatalog) {
        const targetCat = expenseCategory || categories[0]?.name;
        const updatedCats = categories.map(c => {
          if (c.name === targetCat && !c.items.includes(finalItemName)) {
            return { ...c, items: [...c.items, finalItemName] };
          }
          return c;
        });
        onUpdateCategories(updatedCats);
      }
    }

    // If we have items in the batch (including the auto-added one)
    if (allItemsToSave.length > 0) {
      if (editingPurchase && allItemsToSave.length === 1) {
        // We are editing a single purchase
        const item = allItemsToSave[0];
        const shopperWorkerName = isAdmin ? purchasedBy.trim() : currentUser?.name;
        const loggerWorkerName = isAdmin ? recordedBy.trim() : currentUser?.name;

        const updated = purchases.map(p => {
          if (p.id === editingPurchase.id) {
            return {
              ...p,
              purchasedBy: shopperWorkerName || p.purchasedBy,
              itemOrService: item.itemOrService,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              currency: item.currency,
              purchaseDate,
              paymentMethodId,
              totalPrice: item.totalPrice,
              notesOrDescription: item.notesOrDescription,
              recordedBy: loggerWorkerName || p.recordedBy,
              expenseCategory: item.expenseCategory,
              hasVat: item.hasVat,
              vatAmount: item.vatAmount,
              hasWithholding: item.hasWithholding,
              withholdingAmount: item.withholdingAmount,
              baseAmount: item.baseAmount
            };
          }
          return p;
        });
        onUpdatePurchases(updated);
        showPurchaseToast('Purchase updated successfully.');
      } else {
        // We are creating new purchases
        const newItemsToCommit: Purchase[] = allItemsToSave.map((item, idx) => ({
          id: `pur-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
          purchasedBy: (isAdmin ? purchasedBy.trim() : currentUser?.name) || 'Staff',
          itemOrService: item.itemOrService,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          currency: item.currency,
          purchaseDate,
          paymentMethodId,
          totalPrice: item.totalPrice,
          notesOrDescription: item.notesOrDescription || 'Batch item',
          recordedBy: (isAdmin ? recordedBy.trim() : currentUser?.name) || 'Admin',
          expenseCategory: item.expenseCategory,
          hasVat: item.hasVat,
          vatAmount: item.vatAmount,
          hasWithholding: item.hasWithholding,
          withholdingAmount: item.withholdingAmount,
          baseAmount: item.baseAmount
        }));

        onUpdatePurchases([...purchases, ...newItemsToCommit]);
        showPurchaseToast(`${newItemsToCommit.length} purchase ${newItemsToCommit.length === 1 ? 'record' : 'records'} added successfully.`);
      }
      
      setPendingBatchItems([]);
      setIsFormOpen(false);
      return;
    }

    // If nothing was entered at all
    showWarning('Please specify the Item or Service purchased.');
    return;

  };

  // Delete single purchase
  const handleDeleteSingle = (id: string) => {
    const remaining = purchases.filter(p => p.id !== id);
    onUpdatePurchases(remaining);
    setSelectedPurchaseIds(prev => prev.filter(pId => pId !== id));
    setDeletingPurchaseId(null);
  };

  // Delete selected purchases (bulk delete)
  const handleBulkDelete = () => {
    const remaining = purchases.filter(p => !selectedPurchaseIds.includes(p.id));
    onUpdatePurchases(remaining);
    setSelectedPurchaseIds([]);
  };

  const getLoanTotalDue = (loan: Loan) => Number(loan.principalAmount || 0) + Number(loan.interestAmount || 0);
  const getLoanPaid = (loan: Loan) => (loan.payments || []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const getLoanRemaining = (loan: Loan) => Math.max(0, getLoanTotalDue(loan) - getLoanPaid(loan));
  const getLoanStatus = (loan: Loan): Loan['status'] => {
    if (loan.status === 'written_off') return 'written_off';
    const paid = getLoanPaid(loan);
    if (paid <= 0) return 'open';
    return getLoanRemaining(loan) <= 0 ? 'paid' : 'partially_paid';
  };

  const openAddLoanForm = (type: 'given' | 'received' = 'given') => {
    setEditingLoan(null);
    setLoanType(type);
    setLoanPersonName('');
    setLoanPhone('');
    setLoanPrincipalInput('');
    setLoanInterestInput('');
    setLoanCurrency('');
    setLoanDate(new Date().toISOString().split('T')[0]);
    setLoanDueDate('');
    setLoanPaymentMethodId('');
    setLoanNotes('');
    setIsLoanFormOpen(true);
  };

  const openEditLoanForm = (loan: Loan) => {
    setEditingLoan(loan);
    setLoanType(loan.type);
    setLoanPersonName(loan.personName);
    setLoanPhone(loan.phone || '');
    setLoanPrincipalInput(String(loan.principalAmount || ''));
    setLoanInterestInput(String(loan.interestAmount || ''));
    setLoanCurrency(loan.currency || '');
    setLoanDate(loan.loanDate);
    setLoanDueDate(loan.dueDate || '');
    setLoanPaymentMethodId(loan.paymentMethodId);
    setLoanNotes(loan.notes || '');
    setIsLoanFormOpen(true);
  };

  const handleLoanPaymentMethodChange = (accountId: string) => {
    setLoanPaymentMethodId(accountId);
    const selectedAccount = bankAccounts.find(account => account.id === accountId);
    if (selectedAccount) {
      setLoanCurrency(selectedAccount.currency || 'ETB');
    }
  };

  const handleSaveLoan = () => {
    const personName = loanPersonName.trim();
    const principalAmount = Math.max(0, parseFractionOrExpression(loanPrincipalInput));
    const interestAmount = Math.max(0, parseFractionOrExpression(loanInterestInput));
    if (!personName) {
      showWarning('Loan person or organization name is required.');
      return;
    }
    if (principalAmount <= 0) {
      showWarning('Loan amount must be greater than zero.');
      return;
    }
    if (!loanPaymentMethodId) {
      showWarning('Select the bank or cash account for this loan.');
      return;
    }
    if (!loanCurrency) {
      showWarning('Select a currency for this loan.');
      return;
    }

    const baseLoan: Loan = {
      id: editingLoan?.id || `loan-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: loanType,
      personName,
      phone: loanPhone.trim() || undefined,
      principalAmount,
      currency: loanCurrency,
      loanDate,
      dueDate: loanDueDate || undefined,
      paymentMethodId: loanPaymentMethodId,
      interestAmount,
      notes: loanNotes.trim() || undefined,
      recordedBy: editingLoan?.recordedBy || currentUser?.name || currentUser?.username || 'Staff',
      payments: editingLoan?.payments || []
    };
    const nextLoan = { ...baseLoan, status: getLoanStatus(baseLoan) };
    const nextLoans = editingLoan
      ? loans.map(loan => loan.id === editingLoan.id ? nextLoan : loan)
      : [nextLoan, ...loans];

    onUpdateLoans(nextLoans);
    setIsLoanFormOpen(false);
    showPurchaseToast(editingLoan ? 'Loan updated successfully.' : 'Loan recorded successfully.');
  };

  const openRepaymentForm = (loan: Loan) => {
    setRepaymentLoan(loan);
    setRepaymentAmountInput('');
    setRepaymentDate(new Date().toISOString().split('T')[0]);
    setRepaymentMethodId(loan.paymentMethodId);
    setRepaymentNotes('');
  };

  const handleSaveRepayment = () => {
    if (!repaymentLoan) return;
    const amount = Math.max(0, parseFractionOrExpression(repaymentAmountInput));
    if (amount <= 0) {
      showWarning('Repayment amount must be greater than zero.');
      return;
    }
    if (!repaymentMethodId) {
      showWarning('Select the bank or cash account for this repayment.');
      return;
    }
    const payment = {
      id: `lp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      loanId: repaymentLoan.id,
      amount,
      paymentDate: repaymentDate,
      paymentMethodId: repaymentMethodId,
      recordedBy: currentUser?.name || currentUser?.username || 'Staff',
      notes: repaymentNotes.trim() || undefined
    };
    const nextLoans = loans.map(loan => {
      if (loan.id !== repaymentLoan.id) return loan;
      const nextLoan = { ...loan, payments: [...(loan.payments || []), payment] };
      return { ...nextLoan, status: getLoanStatus(nextLoan) };
    });
    onUpdateLoans(nextLoans);
    setRepaymentLoan(null);
    showPurchaseToast('Repayment recorded successfully.');
  };

  const handleDeleteLoan = (loanId: string) => {
    onUpdateLoans(loans.filter(loan => loan.id !== loanId));
    showPurchaseToast('Loan deleted successfully.');
  };

  // --- EDITABLE CATEGORIES AND CASCADE CONTROLS ---

  // Initiate category rename
  const handleStartRenameCategory = (cat: ExpenseCategory) => {
    setEditingCategoryId(cat.id);
    setEditCategoryNameValue(cat.name);
  };

  // Commit category rename
  const handleRenameCategorySave = (catId: string) => {
    if (!editCategoryNameValue.trim()) return;
    const trimmedNewName = editCategoryNameValue.trim();
    const targetCat = categories.find(c => c.id === catId);
    if (!targetCat) return;
    const oldName = targetCat.name;

    // Check duplicate check
    if (oldName.toLowerCase() !== trimmedNewName.toLowerCase() &&
        categories.some(c => c.name.toLowerCase() === trimmedNewName.toLowerCase())) {
      showWarning(`Category "${trimmedNewName}" already exists on record.`);
      return;
    }

    // 1. Rename category in categories state
    const renamedCategories = categories.map(c => 
      c.id === catId ? { ...c, name: trimmedNewName } : c
    );
    onUpdateCategories(renamedCategories);

    // 2. Cascade rename matching entries in the purchase ledger
    const cascadePurchases = purchases.map(p => 
      p.expenseCategory === oldName ? { ...p, expenseCategory: trimmedNewName } : p
    );
    onUpdatePurchases(cascadePurchases);

    setEditingCategoryId(null);
  };

  // safe delete a category
  const handleDeleteCategory = (cat: ExpenseCategory) => {
    setDeletingCategory(cat);
  };

  // Add a new Category
  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    
    const trimmed = newCategoryName.trim();
    if (categories.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
      showWarning('This expense category already exists.');
      return;
    }

    const newCat: ExpenseCategory = {
      id: `cat-${Date.now()}`,
      name: trimmed,
      items: []
    };

    onUpdateCategories([...categories, newCat]);
    showPurchaseToast('Expense category added successfully.');
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  // Add Item to chosen Category
  const handleAddItemToCategory = (catId: string) => {
    if (!newItemName.trim()) return;
    const trimmed = newItemName.trim();

    const updated = categories.map(c => {
      if (c.id === catId) {
        if (c.items.some(it => it.toLowerCase() === trimmed.toLowerCase())) {
          return c;
        }
        return {
          ...c,
          items: [...c.items, trimmed]
        };
      }
      return c;
    });

    onUpdateCategories(updated);
    showPurchaseToast('Category item added successfully.');
    setNewItemName('');
    setActiveCategoryIdForNewItem(null);
  };

  const handleStartRenameCategoryItem = (catId: string, item: string) => {
    setEditingCategoryItem({ catId, item });
    setEditCategoryItemValue(item);
  };

  const handleRenameCategoryItem = (catId: string, oldItem: string) => {
    const trimmed = editCategoryItemValue.trim();
    if (!trimmed) return;

    const targetCat = categories.find(c => c.id === catId);
    if (!targetCat) return;

    if (
      oldItem.toLowerCase() !== trimmed.toLowerCase() &&
      targetCat.items.some(item => item.toLowerCase() === trimmed.toLowerCase())
    ) {
      showWarning(`Item "${trimmed}" already exists in ${targetCat.name}.`);
      return;
    }

    onUpdateCategories(categories.map(cat =>
      cat.id === catId
        ? { ...cat, items: cat.items.map(item => item === oldItem ? trimmed : item) }
        : cat
    ));

    onUpdatePurchases(purchases.map(p =>
      p.expenseCategory === targetCat.name && p.itemOrService === oldItem
        ? { ...p, itemOrService: trimmed }
        : p
    ));

    setEditingCategoryItem(null);
    setEditCategoryItemValue('');
  };

  const handleConfirmDeleteCategoryItem = (catId: string, itemToDelete: string) => {
    onUpdateCategories(categories.map(cat =>
      cat.id === catId
        ? { ...cat, items: cat.items.filter(item => item !== itemToDelete) }
        : cat
    ));
    if (editingCategoryItem?.catId === catId && editingCategoryItem.item === itemToDelete) {
      setEditingCategoryItem(null);
      setEditCategoryItemValue('');
    }
    setDeletingCategoryItem(null);
  };

  const handleStartMoveCategoryItem = (cat: ExpenseCategory, item: string) => {
    const firstTarget = categories.find(c => c.id !== cat.id && !c.isDeleted);
    if (!firstTarget) {
      showWarning('Create another category before moving this item.');
      return;
    }

    setMovingCategoryItem({
      sourceCatId: cat.id,
      sourceCategoryName: cat.name,
      item,
      targetCatId: firstTarget.id
    });
  };

  const moveCategoryItemToCategory = async (sourceCatId: string, targetCatId: string, itemToMove: string) => {
    const sourceCat = categories.find(c => c.id === sourceCatId);
    const targetCat = categories.find(c => c.id === targetCatId);
    if (!sourceCat || !targetCat || sourceCat.id === targetCat.id) {
      showWarning('Please select a valid target category.');
      return null;
    }

    const itemLower = itemToMove.toLowerCase();
    const updatedCategories = categories.map(cat => {
      if (cat.id === sourceCat.id) {
        return { ...cat, items: cat.items.filter(item => item !== itemToMove) };
      }
      if (cat.id === targetCat.id) {
        const alreadyExists = cat.items.some(item => item.toLowerCase() === itemLower);
        return alreadyExists ? cat : { ...cat, items: [...cat.items, itemToMove] };
      }
      return cat;
    });

    const sourceCategoryLower = sourceCat.name.toLowerCase();
    let adjustedRows = 0;
    const updatedPurchases = purchases.map(p => {
      const matchesMovedItem =
        (p.expenseCategory || '').toLowerCase() === sourceCategoryLower &&
        (p.itemOrService || '').toLowerCase() === itemLower;
      if (!matchesMovedItem) return p;
      adjustedRows += 1;
      return { ...p, expenseCategory: targetCat.name };
    });

    await onUpdateCategories(updatedCategories);
    await onUpdatePurchases(updatedPurchases);
    return { targetCategoryName: targetCat.name, adjustedRows };
  };

  const handleConfirmMoveCategoryItem = async () => {
    if (!movingCategoryItem) return;
    const result = await moveCategoryItemToCategory(
      movingCategoryItem.sourceCatId,
      movingCategoryItem.targetCatId,
      movingCategoryItem.item
    );
    if (!result) return;
    setMovingCategoryItem(null);
    showPurchaseToast(`Moved "${movingCategoryItem.item}" to ${result.targetCategoryName}. Updated ${result.adjustedRows} ledger row${result.adjustedRows === 1 ? '' : 's'}.`);
  };

  const handleCategoryItemDrop = async (targetCatId: string) => {
    if (!draggedCategoryItem) return;
    if (draggedCategoryItem.sourceCatId === targetCatId) {
      setDraggedCategoryItem(null);
      setDragOverCategoryId(null);
      return;
    }

    const result = await moveCategoryItemToCategory(draggedCategoryItem.sourceCatId, targetCatId, draggedCategoryItem.item);
    if (result) {
      showPurchaseToast(`Moved "${draggedCategoryItem.item}" to ${result.targetCategoryName}. Updated ${result.adjustedRows} ledger row${result.adjustedRows === 1 ? '' : 's'}.`);
    }
    setDraggedCategoryItem(null);
    setDragOverCategoryId(null);
  };

  const handleStartCategoryPanelResize = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    categoryPanelResizeRef.current = {
      startX: event.clientX,
      startWidth: categoryPanelWidth
    };
    setIsResizingCategoryPanel(true);
  };

  const handleStartCategoryListResize = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const availableHeight = getCategoryListMaxHeight();
    categoryListResizeRef.current = {
      startY: event.clientY,
      startHeight: categoryListHeight,
      maxHeight: availableHeight
    };
    setIsResizingCategoryList(true);
  };

  // Trigger add item setup from suggestions
  const handleTriggerAddNewItemFlow = () => {
    if (!itemOrServiceInput.trim()) return;
    setAddingNewItemFromSearch(itemOrServiceInput.trim());
    setNewItemTargetCategory(categories[0]?.id || '');
    setIsNewCategoryModeInModal(false);
    setModalNewCategoryName('');
    setShowSuggestions(false);
  };

  // Commit item and possible new category from search suggestion
  const handleSaveNewItemFromSearch = () => {
    if (!addingNewItemFromSearch) return;

    let finalCategoryName = '';

    if (isNewCategoryModeInModal) {
      const trimmedCat = modalNewCategoryName.trim();
      if (!trimmedCat) {
        showWarning('Please enter a category name.');
        return;
      }
      const existingCat = categories.find(c => c.name.toLowerCase() === trimmedCat.toLowerCase());
      if (existingCat) {
        finalCategoryName = existingCat.name;
        const updated = categories.map(c => {
          if (c.id === existingCat.id) {
            if (!c.items.some(it => it.toLowerCase() === addingNewItemFromSearch.toLowerCase())) {
              return { ...c, items: [...c.items, addingNewItemFromSearch] };
            }
          }
          return c;
        });
        onUpdateCategories(updated);
        showPurchaseToast('Category item added successfully.');
      } else {
        const newCat: ExpenseCategory = {
          id: `cat-${Date.now()}`,
          name: trimmedCat,
          items: [addingNewItemFromSearch]
        };
        onUpdateCategories([...categories, newCat]);
        showPurchaseToast('Expense category and item added successfully.');
        finalCategoryName = trimmedCat;
      }
    } else {
      const matchedCategory = categories.find(c => c.id === newItemTargetCategory);
      if (!matchedCategory) {
        showWarning('Please select a valid category.');
        return;
      }
      finalCategoryName = matchedCategory.name;
      
      const updated = categories.map(c => {
        if (c.id === matchedCategory.id) {
          if (!c.items.some(it => it.toLowerCase() === addingNewItemFromSearch.toLowerCase())) {
            return { ...c, items: [...c.items, addingNewItemFromSearch] };
          }
        }
        return c;
      });
      onUpdateCategories(updated);
      showPurchaseToast('Category item added successfully.');
    }

    setItemOrServiceInput(addingNewItemFromSearch);
    setExpenseCategory(finalCategoryName);
    setAddingNewItemFromSearch(null);
  };

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;

      if (event.key === 'Escape') {
        if (warningMessage) {
          event.preventDefault();
          setWarningMessage('');
        } else if (addingNewItemFromSearch !== null) {
          event.preventDefault();
          setAddingNewItemFromSearch(null);
        } else if (isFormOpen) {
          event.preventDefault();
          setIsFormOpen(false);
        } else if (showMobileFilters) {
          event.preventDefault();
          setShowMobileFilters(false);
        } else if (showFilterPopover) {
          event.preventDefault();
          setShowFilterPopover(false);
        } else if (showBulkDeleteConfirm) {
          event.preventDefault();
          setShowBulkDeleteConfirm(false);
        } else if (deletingPurchaseId) {
          event.preventDefault();
          setDeletingPurchaseId(null);
        } else if (movingCategoryItem) {
          event.preventDefault();
          setMovingCategoryItem(null);
        } else if (deletingCategoryItem) {
          event.preventDefault();
          setDeletingCategoryItem(null);
        } else if (deletingCategory) {
          event.preventDefault();
          setDeletingCategory(null);
        }
      }

      if (event.key === 'Enter' && !(event.target instanceof HTMLTextAreaElement)) {
        if (warningMessage) {
          event.preventDefault();
        } else if (showBulkDeleteConfirm) {
          event.preventDefault();
          handleBulkDelete();
          setShowBulkDeleteConfirm(false);
        } else if (deletingPurchaseId) {
          event.preventDefault();
          handleDeleteSingle(deletingPurchaseId);
        } else if (movingCategoryItem) {
          event.preventDefault();
          handleConfirmMoveCategoryItem();
        } else if (deletingCategoryItem) {
          event.preventDefault();
          handleConfirmDeleteCategoryItem(deletingCategoryItem.catId, deletingCategoryItem.item);
        } else if (deletingCategory) {
          event.preventDefault();
          onUpdateCategories(categories.filter(c => c.id !== deletingCategory.id));
          setDeletingCategory(null);
        } else if (addingNewItemFromSearch !== null) {
          event.preventDefault();
          handleSaveNewItemFromSearch();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    warningMessage,
    addingNewItemFromSearch,
    isFormOpen,
    showMobileFilters,
    showFilterPopover,
    showBulkDeleteConfirm,
    deletingPurchaseId,
    movingCategoryItem,
    deletingCategoryItem,
    deletingCategory,
    purchases,
    selectedPurchaseIds,
    categories,
    isNewCategoryModeInModal,
    modalNewCategoryName,
    newItemTargetCategory,
  ]);

  // Filter Purchase Records
  const baseFilteredPurchases = purchases.filter(p => {
    const matchesCategory = selectedCategoryFilter === 'All' || p.expenseCategory === selectedCategoryFilter;
    const matchesBank = selectedBankFilter === 'All' || p.paymentMethodId === selectedBankFilter;
    const matchesRecordedBy = selectedRecordedByFilter === 'All' || p.recordedBy === selectedRecordedByFilter;
    
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      p.purchasedBy.toLowerCase().includes(searchLower) ||
      p.itemOrService.toLowerCase().includes(searchLower) ||
      p.expenseCategory.toLowerCase().includes(searchLower) ||
      (p.notesOrDescription && p.notesOrDescription.toLowerCase().includes(searchLower)) ||
      p.recordedBy.toLowerCase().includes(searchLower);

    return matchesCategory && matchesBank && matchesRecordedBy && matchesSearch;
  });

  const filteredPurchases = baseFilteredPurchases.filter(p => {
    const afterStart = !expenseIntervalStart || p.purchaseDate >= expenseIntervalStart;
    const beforeEnd = !expenseIntervalEnd || p.purchaseDate <= expenseIntervalEnd;
    return afterStart && beforeEnd;
  });

  // Sort Purchase Records
  const sortedPurchases = [...filteredPurchases].sort((a, b) => {
    if (sortBy === 'recordedOrder') return 0;
    if (sortBy === 'lastAdded') {
      const indexA = purchases.findIndex(p => p.id === a.id);
      const indexB = purchases.findIndex(p => p.id === b.id);
      return indexB - indexA;
    }
    let valA = a[sortBy as Exclude<PurchaseSortField, 'recordedOrder' | 'lastAdded'>];
    let valB = b[sortBy as Exclude<PurchaseSortField, 'recordedOrder' | 'lastAdded'>];

    let cmp = 0;
    if (typeof valA === 'string' && typeof valB === 'string') {
      cmp = isSortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    } else {
      cmp = isSortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    }

    if (cmp !== 0) return cmp;

    // Fallback index-based comparison for identical values (e.g. same day dates)
    const indexA = purchases.findIndex(p => p.id === a.id);
    const indexB = purchases.findIndex(p => p.id === b.id);
    return isSortAsc ? indexA - indexB : indexB - indexA;
  });

  const intervalExpenseAmount = filteredPurchases.reduce((sum, p) => sum + p.totalPrice, 0);
  const activeLoans = loans.filter(loan => getLoanStatus(loan) !== 'paid' && getLoanStatus(loan) !== 'written_off');
  const totalLoanedOut = loans
    .filter(loan => loan.type === 'given')
    .reduce((sum, loan) => sum + getLoanRemaining(loan), 0);
  const totalBorrowed = loans
    .filter(loan => loan.type === 'received')
    .reduce((sum, loan) => sum + getLoanRemaining(loan), 0);
  const loanRepaymentsTotal = loans.reduce((sum, loan) => sum + getLoanPaid(loan), 0);
  const getLoanStatusClasses = (status?: Loan['status']) => {
    if (status === 'paid') return 'bg-[#112918] text-[#71b536] border-[#71b536]/30';
    if (status === 'partially_paid') return 'bg-[#24131A] text-[#ee317b] border-[#ee317b]/30';
    if (status === 'written_off') return 'bg-[#2E181D] text-red-400 border-red-900/40';
    return 'bg-[#181818] text-gray-300 border-[#262626]';
  };
  const loanStaffOptions = Array.from(new Set([
    ...employees.filter(employee => !employee.isDeleted).map(employee => employee.name || employee.username),
    ...loans.map(loan => loan.recordedBy),
    ...loans.flatMap(loan => (loan.payments || []).map(payment => payment.recordedBy))
  ].filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const loanSortLabels: Record<LoanSortField, string> = {
    loanDate: 'Loan Date',
    personName: 'Name',
    principalAmount: 'Principal',
    paidAmount: 'Paid',
    remainingAmount: 'Remaining',
    dueDate: 'Due Date',
    status: 'Status'
  };
  const filteredLoans = loans.filter(loan => {
    const status = getLoanStatus(loan);
    const bank = bankAccounts.find(account => account.id === loan.paymentMethodId);
    const searchLower = loanSearchQuery.trim().toLowerCase();
    const matchesSearch = !searchLower || [
      loan.personName,
      loan.phone,
      loan.notes,
      loan.recordedBy,
      bank?.name,
      loan.type === 'given' ? 'given loaned out receivable' : 'received borrowed payable',
      status?.replace('_', ' ')
    ].some(value => (value || '').toLowerCase().includes(searchLower));
    const matchesType = loanTypeFilter === 'All' || loan.type === loanTypeFilter;
    const matchesStatus = loanStatusFilter === 'All' || status === loanStatusFilter;
    const matchesAccount = loanAccountFilter === 'All' || loan.paymentMethodId === loanAccountFilter || (loan.payments || []).some(payment => payment.paymentMethodId === loanAccountFilter);
    const matchesStaff = loanStaffFilter === 'All' || loan.recordedBy === loanStaffFilter || (loan.payments || []).some(payment => payment.recordedBy === loanStaffFilter);
    const matchesStart = !loanStartDate || loan.loanDate >= loanStartDate || (loan.payments || []).some(payment => payment.paymentDate >= loanStartDate);
    const matchesEnd = !loanEndDate || loan.loanDate <= loanEndDate || (loan.payments || []).some(payment => payment.paymentDate <= loanEndDate);
    return matchesSearch && matchesType && matchesStatus && matchesAccount && matchesStaff && matchesStart && matchesEnd;
  });
  const sortedLoans = [...filteredLoans].sort((a, b) => {
    const getLoanSortValue = (loan: Loan) => {
      if (loanSortBy === 'paidAmount') return getLoanPaid(loan);
      if (loanSortBy === 'remainingAmount') return getLoanRemaining(loan);
      if (loanSortBy === 'status') return getLoanStatus(loan) || 'open';
      return loan[loanSortBy as Extract<LoanSortField, 'loanDate' | 'personName' | 'principalAmount' | 'dueDate'>] || '';
    };
    const valA = getLoanSortValue(a);
    const valB = getLoanSortValue(b);
    let cmp = 0;
    if (typeof valA === 'number' && typeof valB === 'number') {
      cmp = valA - valB;
    } else {
      cmp = String(valA).localeCompare(String(valB));
    }
    return isLoanSortAsc ? cmp : -cmp;
  });
  const filteredLoanedOut = filteredLoans
    .filter(loan => loan.type === 'given')
    .reduce((sum, loan) => sum + getLoanRemaining(loan), 0);
  const filteredBorrowed = filteredLoans
    .filter(loan => loan.type === 'received')
    .reduce((sum, loan) => sum + getLoanRemaining(loan), 0);
  const filteredRepaymentsTotal = filteredLoans.reduce((sum, loan) => sum + getLoanPaid(loan), 0);
  const activeLoanFilterCount = [
    loanTypeFilter !== 'All',
    loanStatusFilter !== 'All',
    loanAccountFilter !== 'All',
    loanStaffFilter !== 'All',
    Boolean(loanStartDate || loanEndDate),
    Boolean(loanSearchQuery.trim())
  ].filter(Boolean).length;
  const activeLedgerFilterCount = [
    selectedCategoryFilter !== 'All',
    selectedBankFilter !== 'All',
    selectedRecordedByFilter !== 'All',
    Boolean(expenseIntervalStart || expenseIntervalEnd),
  ].filter(Boolean).length;
  const recordedByOptions = Array.from(new Set(purchases.map(p => p.recordedBy).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const categorySearchLower = categorySearchQuery.trim().toLowerCase();
  const visibleCategories = categorySearchLower
    ? categories.filter(cat =>
        cat.name.toLowerCase().includes(categorySearchLower) ||
        cat.items.some(item => item.toLowerCase().includes(categorySearchLower))
      )
    : categories;

  useEffect(() => {
    const isPurchasesShortcut = (event: Event) => (event as CustomEvent)?.detail?.tab === 'purchases';
    const shortcutsBlocked = Boolean(warningMessage || addingNewItemFromSearch !== null || isFormOpen || showMobileFilters || showFilterPopover || showBulkDeleteConfirm || deletingPurchaseId || movingCategoryItem || deletingCategoryItem || deletingCategory);
    const handleNewRecord = (event: Event) => {
      if (!isPurchasesShortcut(event) || shortcutsBlocked) return;
      handleOpenAddForm();
    };
    const handleSelectAllVisible = (event: Event) => {
      if (!isPurchasesShortcut(event) || shortcutsBlocked) return;
      setSelectedPurchaseIds(sortedPurchases.map(purchase => purchase.id));
    };
    const handleDeleteSelected = (event: Event) => {
      if (!isPurchasesShortcut(event) || shortcutsBlocked || selectedPurchaseIds.length === 0) return;
      setShowBulkDeleteConfirm(true);
    };

    window.addEventListener('mena:new-record', handleNewRecord);
    window.addEventListener('mena:select-all-visible', handleSelectAllVisible);
    window.addEventListener('mena:delete-selected', handleDeleteSelected);
    return () => {
      window.removeEventListener('mena:new-record', handleNewRecord);
      window.removeEventListener('mena:select-all-visible', handleSelectAllVisible);
      window.removeEventListener('mena:delete-selected', handleDeleteSelected);
    };
  }, [warningMessage, addingNewItemFromSearch, isFormOpen, showMobileFilters, showFilterPopover, showBulkDeleteConfirm, deletingPurchaseId, movingCategoryItem, deletingCategoryItem, deletingCategory, sortedPurchases, selectedPurchaseIds]);

  return (
    <div
      className={`purchase-mobile-fixed-stack space-y-2 md:space-y-3 animate-fadeIn ${!isMobileCategoriesCollapsed ? 'expense-categories-expanded' : ''}`}
      id="purchases-tab-pnl"
    >
      <div className="md:hidden hidden items-center justify-between gap-1.5 pt-1 relative w-full h-8">
        <div className="flex bg-transparent shrink-0 gap-0.5" />
        <div className="flex items-center gap-1 justify-end flex-1">
          <div ref={mobileSearchWrapperRef} className="relative flex items-center h-7 select-none">
            <AnimatePresence initial={false}>
              {!(isSearchExpanded || searchQuery) ? (
                <motion.button
                  key="search-btn"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.1 }}
                  type="button"
                  onClick={() => setIsSearchExpanded(true)}
                  className="flex items-center justify-center p-1.5 rounded text-gray-300 hover:bg-[#181818] transition-colors cursor-pointer"
                  title="Search database"
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
                  <div className="flex items-center justify-center w-7 h-7 rounded-md bg-[#252525] text-gray-400 mr-1 flex-shrink-0">
                    <Search className="h-3.5 w-3.5" />
                  </div>
                  <input
                    ref={mobileSearchInputRef}
                    type="text"
                    placeholder="Type to search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setIsSearchExpanded(false);
                      }
                    }}
                    className="bg-transparent text-[11px] text-white border-none outline-none focus:outline-none focus:ring-0 no-focus-outline shadow-none p-0 m-0 font-sans w-full pl-0.5"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setIsSearchExpanded(false);
                      }}
                      className="ml-1 text-gray-500 hover:text-white transition-colors focus:outline-none flex-shrink-0"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {!(isSearchExpanded || searchQuery) && (
            <button
              type="button"
              onClick={() => setShowMobileFilters(true)}
              className="bg-transparent text-gray-300 p-1.5 rounded hover:bg-[#181818] transition-colors flex items-center justify-center relative cursor-pointer"
              title="Refine ledger"
            >
              <Filter className="w-3.5 h-3.5" />
              {activeLedgerFilterCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#ee317b] text-white text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">
                  {activeLedgerFilterCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="bg-[#121212] border border-[#262626] rounded-md p-2 font-sans flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div className="grid grid-cols-2 rounded-md border border-[#262626] bg-[#181818] p-1 w-full md:w-[222px]">
          <button
            type="button"
            onClick={() => setFinanceView('purchases')}
            className={`h-8 rounded text-[11px] font-bold uppercase tracking-wider transition-colors ${financeView === 'purchases' ? 'bg-[#ee317b] text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Purchases
          </button>
          <button
            type="button"
            onClick={() => setFinanceView('loans')}
            className={`h-8 rounded text-[11px] font-bold uppercase tracking-wider transition-colors ${financeView === 'loans' ? 'bg-[#71b536] text-black' : 'text-gray-400 hover:text-white'}`}
          >
            Loans
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 text-[10px] md:text-[11px] text-right">
          <div>
            <div className="text-gray-500 uppercase tracking-wider">Loaned Out</div>
            <div className="font-bold text-[#ee317b]">{totalLoanedOut.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-gray-500 uppercase tracking-wider">Borrowed</div>
            <div className="font-bold text-[#71b536]">{totalBorrowed.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-gray-500 uppercase tracking-wider">Active</div>
            <div className="font-bold text-white">{activeLoans.length}</div>
          </div>
        </div>
      </div>
      
      {financeView === 'purchases' && (
      <>
      <div className="purchase-mobile-summary-sticky md:hidden bg-[#121212] border border-[#262626] rounded-md px-2 py-2 font-sans text-xs flex items-center justify-between gap-3">
        <div className="text-gray-300 min-w-0">
          <div className="text-white font-bold truncate">Total expenses</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[#ee317b] font-extrabold text-xs">{intervalExpenseAmount.toLocaleString()} ETB</div>
        </div>
      </div>

      <div
        className="purchase-ledger-layout grid grid-cols-1 xl:grid-cols-4 gap-2 md:gap-6 items-start"
        style={{ '--purchase-category-panel-width': `${categoryPanelWidth}px` } as React.CSSProperties}
      >
        
        {/* Left Side: Expense Categories Sidebar Layout */}
        <div className="purchase-categories-sticky xl:col-span-1 space-y-2 md:space-y-4">
          <div ref={categoryPanelRef} className={`expense-category-panel relative bg-[#121212] border border-[#262626] rounded-md ${isMobileCategoriesCollapsed ? 'p-2 space-y-0 xl:p-4 xl:space-y-4' : 'p-4 space-y-4'}`}>
            <div
              role="separator"
              aria-orientation="vertical"
              title="Drag to resize categories"
              onMouseDown={handleStartCategoryPanelResize}
              className="purchase-category-resize-handle hidden xl:flex"
            />
            <div className="purchase-mobile-category-control-sticky flex items-center justify-between">
              <h3 className={`${isMobileCategoriesCollapsed ? 'text-[11px]' : 'text-xs'} font-sans font-bold text-white uppercase tracking-wider flex items-center`}>
                Expense Categories
              </h3>
              
              <div className="flex items-center gap-1.5">
                <div ref={categorySearchWrapperRef} className={`${isMobileCategoriesCollapsed ? 'hidden xl:flex' : 'flex'} relative items-center h-7 select-none`}>
                  <AnimatePresence initial={false}>
                    {!(isCategorySearchExpanded || categorySearchQuery) ? (
                      <motion.button
                        key="category-search-btn"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.15 }}
                        type="button"
                        onClick={() => setIsCategorySearchExpanded(true)}
                        className="flex items-center justify-center p-1.5 rounded text-gray-300 hover:bg-[#181818] transition-colors cursor-pointer"
                        title="Search categories"
                      >
                        <Search className="w-3.5 h-3.5" />
                      </motion.button>
                    ) : (
                      <motion.div
                        key="category-search-input-wrapper"
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 180, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 250 }}
                        className="relative flex items-center bg-transparent overflow-hidden"
                      >
                        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-[#252525] text-gray-400 mr-1 flex-shrink-0">
                          <Search className="h-3.5 w-3.5" />
                        </div>
                        <input
                          ref={categorySearchInputRef}
                          type="text"
                          placeholder="Type to search..."
                          value={categorySearchQuery}
                          onChange={(e) => setCategorySearchQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              setIsCategorySearchExpanded(false);
                            }
                          }}
                          className="bg-transparent text-[11px] text-white border-none outline-none focus:outline-none focus:ring-0 no-focus-outline shadow-none p-0 m-0 font-sans w-full pl-0.5"
                        />
                        {categorySearchQuery && (
                          <button
                            type="button"
                            onClick={() => {
                              setCategorySearchQuery('');
                              setIsCategorySearchExpanded(false);
                            }}
                            className="ml-1 text-gray-500 hover:text-white transition-colors focus:outline-none flex-shrink-0"
                            title="Clear search"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {!isAddingCategory ? (
                  <button
                    type="button"
                    onClick={() => setIsAddingCategory(true)}
                    className={`${isMobileCategoriesCollapsed ? 'hidden xl:inline-flex' : 'inline-flex'} p-1 bg-[#181818] border border-[#262626] text-stone-300 hover:text-white cursor-pointer transition-colors`}
                    title="Add New Category"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingCategory(false)}
                    className="p-1 text-gray-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3 h-4" />
                  </button>
                )}

                {/* Mobile Collapse Trigger */}
                <button
                  type="button"
                  onClick={() => setIsMobileCategoriesCollapsed(!isMobileCategoriesCollapsed)}
                  className="xl:hidden p-1 bg-transparent text-white hover:text-[#ee317b] transition-colors border-none"
                  title={isMobileCategoriesCollapsed ? "Expand" : "Collapse"}
                >
                  {isMobileCategoriesCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Collapsible area on mobile */}
            <motion.div
              initial={false}
              animate={{
                height: isMobileCategoriesCollapsed ? 0 : 'auto',
                opacity: isMobileCategoriesCollapsed ? 0 : 1
              }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="space-y-4 overflow-hidden xl:!block xl:!h-auto xl:!opacity-100"
              style={{ '--purchase-category-list-height': `${categoryListHeight}px` } as React.CSSProperties}
            >
              {/* Quick add category form */}
              <AnimatePresence>
                {isAddingCategory && (
                  <motion.form 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    onSubmit={handleCreateCategory}
                    className="bg-[#181818] border border-[#262626] p-3 space-y-2 overflow-hidden"
                  >
                    <label className="block text-[10px] text-gray-400 uppercase tracking-wider">New Category Name</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="flex-1 px-2 py-1 text-xs bg-[#101010] border border-[#262626] rounded-md focus:border-[#ee317b] text-white"
                        placeholder="e.g. Rent & Utilities"
                      />
                      <button
                        type="submit"
                        className="px-2.5 bg-[#71b536] text-white hover:bg-[#5a932a] text-xs font-sans font-bold cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* List of Categories and their Subitems (Fully Editable) */}
              <div ref={categoryListRef} className="purchase-category-list space-y-3.5 overflow-y-auto pr-1">
                {visibleCategories.length === 0 && (
                  <div className="text-[10px] text-gray-500 italic border border-[#202020] bg-[#161616]/45 p-3 rounded-md">
                    No categories or items match this search.
                  </div>
                )}
                {visibleCategories.map((cat) => (
                  <div
                    key={cat.id}
                    onDragOver={(event) => {
                      if (!draggedCategoryItem || draggedCategoryItem.sourceCatId === cat.id) return;
                      event.preventDefault();
                      event.dataTransfer.dropEffect = 'move';
                      setDragOverCategoryId(cat.id);
                    }}
                    onDragLeave={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                        setDragOverCategoryId(prev => prev === cat.id ? null : prev);
                      }
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      handleCategoryItemDrop(cat.id);
                    }}
                    className={`expense-category-drop-zone border border-[#202020] bg-[#161616]/45 p-3 rounded-md relative ${dragOverCategoryId === cat.id ? 'expense-category-drop-zone-active' : ''}`}
                  >
                    
                    {/* Category Rename inline editor or standard display label */}
                    {editingCategoryId === cat.id ? (
                      <div className="flex items-center gap-1.5 bg-[#101010] p-1.5 border border-[#71b536] mb-2 font-sans">
                        <input
                          type="text"
                          value={editCategoryNameValue}
                          onChange={(e) => setEditCategoryNameValue(e.target.value)}
                          className="flex-1 px-1 py-0.5 text-xs bg-[#141414] text-white outline-none font-sans font-bold uppercase"
                        />
                        <button
                          onClick={() => handleRenameCategorySave(cat.id)}
                          className="p-1 text-emerald-400 hover:text-white"
                          title="Save rename"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingCategoryId(null)}
                          className="p-1 text-rose-400 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between mb-2 pb-1 border-b border-[#222222]">
                        <span className="text-[11px] font-sans font-bold text-white uppercase tracking-wider block truncate max-w-[150px]" title={cat.name}>
                          {cat.name}
                        </span>
                        
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartRenameCategory(cat)}
                            className="p-1 text-zinc-500 hover:text-white cursor-pointer"
                            title="Rename category"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat)}
                            className="p-1 text-zinc-650 hover:text-rose-400 cursor-pointer"
                            title="Delete category"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveCategoryIdForNewItem(
                              activeCategoryIdForNewItem === cat.id ? null : cat.id
                            )}
                            className="text-[9px] text-[#71b536] hover:text-[#5fa22e] font-sans uppercase bg-[#141414] px-1.5 py-0.5 border border-[#202020] cursor-pointer ml-1"
                          >
                            + Item
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Add subitem inside category form */}
                    {activeCategoryIdForNewItem === cat.id && (
                      <div className="mb-2 bg-[#101010] p-2 border border-[#262626] flex gap-1 items-center">
                        <input
                          type="text"
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddItemToCategory(cat.id);
                            }
                          }}
                          placeholder="New subitem..."
                          className="flex-1 px-2 py-0.5 text-[11px] bg-[#141414] border border-[#262626] text-white font-sans"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddItemToCategory(cat.id)}
                          className="px-1.5 py-0.5 bg-[#71b536] text-white text-[10px] cursor-pointer font-bold"
                        >
                          ✓
                        </button>
                      </div>
                    )}

                    {/* Subitems container - Beautifully styled with high contrast in Light theme too! */}
                    {cat.items.length === 0 ? (
                      <span className="text-[10px] text-gray-500 italic block">No items registered in template.</span>
                    ) : (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {cat.items.map((item, i) => (
                          editingCategoryItem?.catId === cat.id && editingCategoryItem.item === item ? (
                            <span
                              key={`${item}-${i}-edit`}
                              className="expense-category-item-chip inline-flex items-center gap-1 px-1 py-0.5"
                            >
                              <input
                                value={editCategoryItemValue}
                                onChange={(e) => setEditCategoryItemValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleRenameCategoryItem(cat.id, item);
                                  }
                                  if (e.key === 'Escape') {
                                    setEditingCategoryItem(null);
                                    setEditCategoryItemValue('');
                                  }
                                }}
                                className="expense-category-item-edit-input w-24 bg-transparent text-[9px] text-stone-100 placeholder:text-stone-400 outline-none"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleRenameCategoryItem(cat.id, item)}
                                className="text-[#71b536] hover:text-[#5fa22e]"
                                title="Save item"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCategoryItem(null);
                                  setEditCategoryItemValue('');
                                }}
                                className="text-rose-500 hover:text-rose-400"
                                title="Cancel"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ) : (
                            <span 
                              key={`${item}-${i}`} 
                              draggable
                              onDragStart={(event) => {
                                event.dataTransfer.effectAllowed = 'move';
                                event.dataTransfer.setData('text/plain', item);
                                setDraggedCategoryItem({ sourceCatId: cat.id, item });
                              }}
                              onDragEnd={() => {
                                setDraggedCategoryItem(null);
                                setDragOverCategoryId(null);
                              }}
                              className={`expense-category-item-chip inline-flex items-center gap-1 text-[9px] font-sans pl-2 pr-1 py-0.5 ${draggedCategoryItem?.sourceCatId === cat.id && draggedCategoryItem.item === item ? 'expense-category-item-chip-dragging' : ''}`}
                              title="Ready for auto-fill in purchase entry"
                            >
                              <span className="max-w-[120px] truncate">{item}</span>
                              <button
                                type="button"
                                onClick={() => handleStartRenameCategoryItem(cat.id, item)}
                                className="p-0.5 text-stone-500 hover:text-[#ee317b] dark:text-stone-400"
                                title={`Rename ${item}`}
                              >
                                <Edit3 className="w-2.5 h-2.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStartMoveCategoryItem(cat, item)}
                                className="p-0.5 text-stone-500 hover:text-[#71b536] dark:text-stone-400"
                                title={`Move ${item} to another category`}
                              >
                                <ArrowRight className="w-2.5 h-2.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingCategoryItem({ catId: cat.id, categoryName: cat.name, item })}
                                className="p-0.5 text-stone-500 hover:!text-red-600 dark:text-stone-400 dark:hover:!text-red-400 transition-colors"
                                title={`Delete ${item}`}
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </span>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div
                role="separator"
                aria-orientation="horizontal"
                title="Drag to extend categories"
                onMouseDown={handleStartCategoryListResize}
                className="purchase-category-list-resize-handle hidden xl:flex"
              />


            </motion.div>
          </div>
        </div>

        {/* Right Side: Ledger Table Grid */}
        <div className="purchase-ledger-main xl:col-span-3 space-y-2 md:space-y-4">
          
          {/* Controls */}
          <div className="hidden">
            <div className="flex items-center text-gray-400 font-medium gap-2"></div>
            <div className="flex items-center gap-1.5 shrink-0">
               {/* Search box */}
              <div className="flex items-center">
                {!(isSearchExpanded || searchQuery) ? (
                  <motion.button
                    key="search-btn"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    type="button"
                    onClick={() => setIsSearchExpanded(true)}
                    className="flex items-center justify-center p-1.5 rounded text-gray-300 hover:bg-[#181818] transition-colors cursor-pointer"
                    title="Search database"
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
                    <div className="flex items-center justify-center w-7 h-7 rounded-md bg-[#252525] text-gray-400 mr-1 flex-shrink-0">
                      <Search className="h-3.5 w-3.5" />
                    </div>
                    <input
                      type="text"
                      placeholder="Type to search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setIsSearchExpanded(false);
                        }
                      }}
                      className="bg-transparent text-[11px] text-white border-none outline-none focus:outline-none focus:ring-0 no-focus-outline shadow-none p-0 m-0 font-sans w-full pl-0.5"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setIsSearchExpanded(false);
                        }}
                        className="ml-1 text-gray-500 hover:text-white transition-colors focus:outline-none flex-shrink-0"
                        title="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </motion.div>
                )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowFilterPopover(!showFilterPopover)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-gray-300 hover:bg-[#202020] transition-colors cursor-pointer text-[11px] font-medium font-sans ${
                    activeLedgerFilterCount > 0
                      ? 'text-[#ee317b] bg-[#ee317b]/10'
                      : ''
                  }`}
                  title="Refine purchases"
                >
                  <Filter className="w-3.5 h-3.5" />
                  {activeLedgerFilterCount > 0 && (
                    <span className="bg-[#ee317b] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                      {activeLedgerFilterCount}
                    </span>
                  )}
                </button>

                {showFilterPopover && (
                  <>
                    <div
                      className="fixed inset-0 z-40 cursor-default"
                      onClick={() => setShowFilterPopover(false)}
                    />
                    <div
                      className="absolute right-0 mt-1.5 w-80 bg-[#181818] border border-[#262626] rounded-lg shadow-xl z-50 p-2.5 text-xs font-sans text-gray-300 flex flex-col gap-2.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between px-1">
                        <span className="font-bold text-gray-400 text-[10px] uppercase tracking-wider select-none">Ledger Options</span>
                        {activeLedgerFilterCount > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCategoryFilter('All');
                              setSelectedBankFilter('All');
                              setSelectedRecordedByFilter('All');
                              setExpenseIntervalStart('');
                              setExpenseIntervalEnd('');
                            }}
                            className="text-[#ee317b] hover:text-[#ee317b]/80 text-[10px] font-bold cursor-pointer"
                          >
                            Clear All
                          </button>
                        )}
                      </div>
                      <div className="h-px bg-[#262626] my-0.5"></div>
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 hover:bg-[#202020] rounded p-1 transition-colors">
                          <div className="flex items-center gap-1.5 text-gray-400 w-20 flex-shrink-0 select-none">
                            <Tag className="w-3.5 h-3.5" />
                            <span className="text-[11px]">Category</span>
                          </div>
                          <div className="flex-1 min-w-0 bg-[#121212] rounded border border-[#262626] hover:border-gray-500 transition-colors">
                            <SearchableSelect
                              value={selectedCategoryFilter}
                              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                              className="bg-transparent text-xs text-white"
                            >
                              <option value="All">All Categories</option>
                              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </SearchableSelect>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 hover:bg-[#202020] rounded p-1 transition-colors">
                          <div className="flex items-center gap-1.5 text-gray-400 w-20 flex-shrink-0 select-none">
                            <Banknote className="w-3.5 h-3.5" />
                            <span className="text-[11px]">Account</span>
                          </div>
                          <div className="flex-1 min-w-0 bg-[#121212] rounded border border-[#262626] hover:border-gray-500 transition-colors">
                            <SearchableSelect
                              value={selectedBankFilter}
                              onChange={(e) => setSelectedBankFilter(e.target.value)}
                              className="bg-transparent text-xs text-white"
                            >
                              <option value="All">All Bank Methods</option>
                              {bankAccounts.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                              ))}
                            </SearchableSelect>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 hover:bg-[#202020] rounded p-1 transition-colors">
                          <div className="flex items-center gap-1.5 text-gray-400 w-20 flex-shrink-0 select-none">
                            <User className="w-3.5 h-3.5" />
                            <span className="text-[11px]">Recorder</span>
                          </div>
                          <div className="flex-1 min-w-0 bg-[#121212] rounded border border-[#262626] hover:border-gray-500 transition-colors">
                            <SearchableSelect
                              value={selectedRecordedByFilter}
                              onChange={(e) => setSelectedRecordedByFilter(e.target.value)}
                              className="bg-transparent text-xs text-white"
                            >
                              <option value="All">All Recorders</option>
                              {recordedByOptions.map(name => (
                                <option key={name} value={name}>{name}</option>
                              ))}
                            </SearchableSelect>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 hover:bg-[#202020] rounded p-1 transition-colors">
                          <div className="flex items-center gap-1.5 text-gray-400 w-20 flex-shrink-0 select-none">
                            <Calendar className="w-3.5 h-3.5" />
                            <span className="text-[11px]">Dates</span>
                          </div>
                          <div className="flex-1 grid grid-cols-2 gap-1.5">
                            <input
                              type="date"
                              value={expenseIntervalStart}
                              onChange={(e) => setExpenseIntervalStart(e.target.value)}
                              className="min-w-0 bg-[#121212] rounded border border-[#262626] text-white text-[11px] font-sans outline-none px-1.5 py-1.5"
                              title="From date"
                            />
                            <input
                              type="date"
                              value={expenseIntervalEnd}
                              onChange={(e) => setExpenseIntervalEnd(e.target.value)}
                              className="min-w-0 bg-[#121212] rounded border border-[#262626] text-white text-[11px] font-sans outline-none px-1.5 py-1.5"
                              title="To date"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={handleOpenAddForm}
                className="text-[11px] font-sans font-bold text-black bg-[#ee317b] hover:bg-[#ee317b]/80 rounded px-2.5 py-1.5 flex items-center justify-center gap-1 shadow-sm transition-colors cursor-pointer"
                title="Add bulk purchases"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Bulk Action Ribbon */}
          {selectedPurchaseIds.length > 0 && (
            <div className="hidden md:flex bg-[#121212] border border-[#ee317b]/35 p-3 rounded-md items-center justify-between text-xs font-sans animate-fadeIn shadow-[0_0_18px_rgba(238,49,123,0.08)]">
              <div className="text-white font-bold inline-flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#ee317b]" />
                <span>{selectedPurchaseIds.length} purchase logs selected</span>
                <button
                  type="button"
                  onClick={() => setSelectedPurchaseIds([])}
                  className="ml-1 inline-flex items-center justify-center px-2 py-1 rounded-md text-gray-400 hover:text-white hover:bg-[#262626] border border-[#262626] font-bold cursor-pointer text-[10px] tracking-wider uppercase transition-colors"
                >
                  Deselect All
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkDeleteConfirm(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-gray-400 hover:text-[#F87171] hover:bg-[#262626] border border-[#262626] font-bold cursor-pointer text-[10px] tracking-wider uppercase transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          )}

          <div className="purchase-summary-sticky hidden md:flex bg-[#121212] border border-[#262626] rounded-md px-2 py-2 md:px-3 md:py-2.5 font-sans text-xs items-center justify-between gap-3">
            <div className="text-gray-300 min-w-0">
              <div className="text-white font-bold truncate">Total expenses</div>
            </div>
            <div className="flex items-center justify-end gap-2 shrink-0">
              <div className="text-right">
                <div className="text-[#ee317b] font-extrabold text-xs md:text-sm">{intervalExpenseAmount.toLocaleString()} ETB</div>
                <div className="hidden sm:block text-[10px] text-gray-500">{filteredPurchases.length} of {purchases.length} rows</div>
              </div>
            </div>
          </div>

          <div className="app-mobile-sticky-toolbar purchase-mobile-toolbar-sticky md:hidden flex items-center justify-between gap-1.5 pt-1 relative w-full h-8">
            {!(isSearchExpanded || searchQuery) && (
              <div className="flex items-center shrink-0">
                <div className="flex items-center border border-[#262626] rounded bg-[#181818] overflow-hidden h-7">
                  <button
                    type="button"
                    onClick={() => setLayoutMode('grid')}
                    className={`p-1.5 transition-colors ${layoutMode === 'grid' ? 'bg-[#ee317b]/10 text-[#ee317b]' : 'text-gray-400 hover:text-white'}`}
                    title="Table view"
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setLayoutMode('cards')}
                    className={`p-1.5 transition-colors ${layoutMode === 'cards' ? 'bg-[#ee317b]/10 text-[#ee317b]' : 'text-gray-400 hover:text-white'}`}
                    title="Gallery view"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
            <div className="flex items-center justify-end gap-1.5 min-w-0 flex-1">
            <div ref={mobileSearchWrapperRef} className={`relative flex min-w-0 items-center h-8 select-none transition-all duration-200 ${isSearchExpanded ? 'w-full flex-1' : ''}`}>
              <AnimatePresence initial={false}>
                {!(isSearchExpanded || searchQuery) ? (
                  <motion.button
                    key="search-btn"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.1 }}
                    type="button"
                    onClick={() => setIsSearchExpanded(true)}
                    className="purchase-mobile-icon-button"
                    title="Search database"
                  >
                    <Search className="w-3.5 h-3.5" />
                  </motion.button>
                ) : (
                  <motion.div
                    key="search-input-wrapper"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: '100%', opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 250 }}
                    className="relative flex items-center bg-transparent overflow-hidden w-full"
                  >
                    <div className="flex items-center justify-center w-7 h-7 rounded-md bg-[#252525] text-gray-400 mr-1 flex-shrink-0">
                      <Search className="h-3.5 w-3.5" />
                    </div>
                    <input
                      ref={mobileSearchInputRef}
                      type="text"
                      placeholder="Type to search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setIsSearchExpanded(false);
                      }}
                      className="bg-transparent text-[11px] text-white border-none outline-none focus:outline-none focus:ring-0 no-focus-outline shadow-none p-0 m-0 font-sans w-full pl-0.5"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setIsSearchExpanded(false);
                        }}
                        className="ml-1 text-gray-500 hover:text-white transition-colors focus:outline-none flex-shrink-0"
                        title="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {!(isSearchExpanded || searchQuery) && (
              <>
                <button
                  type="button"
                  onClick={() => setShowMobileFilters(true)}
                  className="purchase-mobile-icon-button relative"
                  title="Refine ledger"
                >
                  <Filter className="w-3.5 h-3.5" />
                  {activeLedgerFilterCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-[#ee317b] text-white text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">
                      {activeLedgerFilterCount}
                    </span>
                  )}
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowMobileSortPopover(!showMobileSortPopover); }}
                    className={`purchase-mobile-icon-button flex items-center justify-center cursor-pointer ${
                      sortBy !== 'recordedOrder' ? 'text-[#ee317b]' : 'text-gray-300'
                    }`}
                    title="Sort options"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                  {showMobileSortPopover && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowMobileSortPopover(false)} />
                      <div className="absolute right-0 mt-1.5 w-52 bg-[#181818] border border-[#262626] rounded-lg shadow-xl z-50 p-2 text-[11px] font-sans text-gray-300 flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSortBy('recordedOrder');
                            setIsSortAsc(true);
                            setShowMobileSortPopover(false);
                          }}
                          className={`text-left px-2 py-1.5 rounded hover:bg-[#202020] hover:text-white transition-colors ${sortBy === 'recordedOrder' ? 'text-[#ee317b] font-bold' : ''}`}
                        >
                          First Added (Oldest First)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSortBy('lastAdded');
                            setIsSortAsc(false);
                            setShowMobileSortPopover(false);
                          }}
                          className={`text-left px-2 py-1.5 rounded hover:bg-[#202020] hover:text-white transition-colors ${sortBy === 'lastAdded' ? 'text-[#ee317b] font-bold' : ''}`}
                        >
                          Last Added (Newest First)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSortBy('purchaseDate');
                            setIsSortAsc(false);
                            setShowMobileSortPopover(false);
                          }}
                          className={`text-left px-2 py-1.5 rounded hover:bg-[#202020] hover:text-white transition-colors ${(sortBy === 'purchaseDate' && !isSortAsc) ? 'text-[#ee317b] font-bold' : ''}`}
                        >
                          Date: Newest to Oldest
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSortBy('purchaseDate');
                            setIsSortAsc(true);
                            setShowMobileSortPopover(false);
                          }}
                          className={`text-left px-2 py-1.5 rounded hover:bg-[#202020] hover:text-white transition-colors ${(sortBy === 'purchaseDate' && isSortAsc) ? 'text-[#ee317b] font-bold' : ''}`}
                        >
                          Date: Oldest to Newest
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSortBy('totalPrice');
                            setIsSortAsc(false);
                            setShowMobileSortPopover(false);
                          }}
                          className={`text-left px-2 py-1.5 rounded hover:bg-[#202020] hover:text-white transition-colors ${(sortBy === 'totalPrice' && !isSortAsc) ? 'text-[#ee317b] font-bold' : ''}`}
                        >
                          Total: High to Low
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSortBy('totalPrice');
                            setIsSortAsc(true);
                            setShowMobileSortPopover(false);
                          }}
                          className={`text-left px-2 py-1.5 rounded hover:bg-[#202020] hover:text-white transition-colors ${(sortBy === 'totalPrice' && isSortAsc) ? 'text-[#ee317b] font-bold' : ''}`}
                        >
                          Total: Low to High
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSortBy('quantity');
                            setIsSortAsc(false);
                            setShowMobileSortPopover(false);
                          }}
                          className={`text-left px-2 py-1.5 rounded hover:bg-[#202020] hover:text-white transition-colors ${(sortBy === 'quantity' && !isSortAsc) ? 'text-[#ee317b] font-bold' : ''}`}
                        >
                          Quantity: High to Low
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSortBy('quantity');
                            setIsSortAsc(true);
                            setShowMobileSortPopover(false);
                          }}
                          className={`text-left px-2 py-1.5 rounded hover:bg-[#202020] hover:text-white transition-colors ${(sortBy === 'quantity' && isSortAsc) ? 'text-[#ee317b] font-bold' : ''}`}
                        >
                          Quantity: Low to High
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
            </div>
          </div>

          <div className="app-sticky-toolbar purchase-toolbar-sticky hidden md:flex items-center justify-between gap-4 py-1.5 border-b border-[#262626] font-sans text-xs">
            <div className="flex items-center text-gray-400 font-medium gap-2">
              <div className="flex items-center border border-[#262626] rounded bg-[#181818] overflow-hidden h-7">
                <button
                  type="button"
                  onClick={() => setLayoutMode('grid')}
                  className={`p-1.5 transition-colors ${layoutMode === 'grid' ? 'bg-[#ee317b]/10 text-[#ee317b]' : 'text-gray-400 hover:text-white'}`}
                  title="Table view"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutMode('cards')}
                  className={`p-1.5 transition-colors ${layoutMode === 'cards' ? 'bg-[#ee317b]/10 text-[#ee317b]' : 'text-gray-400 hover:text-white'}`}
                  title="Gallery view"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <div ref={searchWrapperRef} className="flex items-center">
                {!(isSearchExpanded || searchQuery) ? (
                  <motion.button
                    key="search-btn"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    type="button"
                    onClick={() => setIsSearchExpanded(true)}
                    className="flex items-center justify-center p-1.5 rounded text-gray-300 hover:bg-[#181818] transition-colors cursor-pointer"
                    title="Search database"
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
                    <div className="flex items-center justify-center w-7 h-7 rounded-md bg-[#252525] text-gray-400 mr-1 flex-shrink-0">
                      <Search className="h-3.5 w-3.5" />
                    </div>
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Type to search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setIsSearchExpanded(false);
                      }}
                      className="bg-transparent text-[11px] text-white border-none outline-none focus:outline-none focus:ring-0 no-focus-outline shadow-none p-0 m-0 font-sans w-full pl-0.5"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setIsSearchExpanded(false);
                        }}
                        className="ml-1 text-gray-500 hover:text-white transition-colors focus:outline-none flex-shrink-0"
                        title="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </motion.div>
                )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowFilterPopover(!showFilterPopover)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-gray-300 hover:bg-[#202020] transition-colors cursor-pointer text-[11px] font-medium font-sans ${
                    activeLedgerFilterCount > 0
                      ? 'text-[#ee317b] bg-[#ee317b]/10'
                      : ''
                  }`}
                  title="Refine purchases"
                >
                  <Filter className="w-3.5 h-3.5" />
                  {activeLedgerFilterCount > 0 && (
                    <span className="bg-[#ee317b] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                      {activeLedgerFilterCount}
                    </span>
                  )}
                </button>

                {showFilterPopover && (
                  <>
                    <div
                      className="fixed inset-0 z-40 cursor-default"
                      onClick={() => setShowFilterPopover(false)}
                    />
                    <div
                      className="absolute right-0 mt-1.5 w-80 bg-[#181818] border border-[#262626] rounded-lg shadow-xl z-50 p-2.5 text-xs font-sans text-gray-300 flex flex-col gap-2.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between px-1">
                        <span className="font-bold text-gray-400 text-[10px] uppercase tracking-wider select-none">Ledger Options</span>
                        {activeLedgerFilterCount > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCategoryFilter('All');
                              setSelectedBankFilter('All');
                              setSelectedRecordedByFilter('All');
                              setExpenseIntervalStart('');
                              setExpenseIntervalEnd('');
                            }}
                            className="text-[#ee317b] hover:text-[#ee317b]/80 text-[10px] font-bold cursor-pointer"
                          >
                            Clear All
                          </button>
                        )}
                      </div>
                      <div className="h-px bg-[#262626] my-0.5"></div>
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 hover:bg-[#202020] rounded p-1 transition-colors">
                          <div className="flex items-center gap-1.5 text-gray-400 w-20 flex-shrink-0 select-none">
                            <Tag className="w-3.5 h-3.5" />
                            <span className="text-[11px]">Category</span>
                          </div>
                          <div className="flex-1 min-w-0 bg-[#121212] rounded border border-[#262626] hover:border-gray-500 transition-colors">
                            <SearchableSelect
                              value={selectedCategoryFilter}
                              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                              className="bg-transparent text-xs text-white"
                            >
                              <option value="All">All Categories</option>
                              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </SearchableSelect>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 hover:bg-[#202020] rounded p-1 transition-colors">
                          <div className="flex items-center gap-1.5 text-gray-400 w-20 flex-shrink-0 select-none">
                            <Banknote className="w-3.5 h-3.5" />
                            <span className="text-[11px]">Account</span>
                          </div>
                          <div className="flex-1 min-w-0 bg-[#121212] rounded border border-[#262626] hover:border-gray-500 transition-colors">
                            <SearchableSelect
                              value={selectedBankFilter}
                              onChange={(e) => setSelectedBankFilter(e.target.value)}
                              className="bg-transparent text-xs text-white"
                            >
                              <option value="All">All Bank Methods</option>
                              {bankAccounts.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                              ))}
                            </SearchableSelect>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 hover:bg-[#202020] rounded p-1 transition-colors">
                          <div className="flex items-center gap-1.5 text-gray-400 w-20 flex-shrink-0 select-none">
                            <User className="w-3.5 h-3.5" />
                            <span className="text-[11px]">Recorder</span>
                          </div>
                          <div className="flex-1 min-w-0 bg-[#121212] rounded border border-[#262626] hover:border-gray-500 transition-colors">
                            <SearchableSelect
                              value={selectedRecordedByFilter}
                              onChange={(e) => setSelectedRecordedByFilter(e.target.value)}
                              className="bg-transparent text-xs text-white"
                            >
                              <option value="All">All Recorders</option>
                              {recordedByOptions.map(name => (
                                <option key={name} value={name}>{name}</option>
                              ))}
                            </SearchableSelect>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 hover:bg-[#202020] rounded p-1 transition-colors">
                          <div className="flex items-center gap-1.5 text-gray-400 w-20 flex-shrink-0 select-none">
                            <Calendar className="w-3.5 h-3.5" />
                            <span className="text-[11px]">Dates</span>
                          </div>
                          <div className="flex-1 grid grid-cols-2 gap-1.5">
                            <input
                              type="date"
                              value={expenseIntervalStart}
                              onChange={(e) => setExpenseIntervalStart(e.target.value)}
                              className="min-w-0 bg-[#121212] rounded border border-[#262626] text-white text-[11px] font-sans outline-none px-1.5 py-1.5"
                              title="From date"
                            />
                            <input
                              type="date"
                              value={expenseIntervalEnd}
                              onChange={(e) => setExpenseIntervalEnd(e.target.value)}
                              className="min-w-0 bg-[#121212] rounded border border-[#262626] text-white text-[11px] font-sans outline-none px-1.5 py-1.5"
                              title="To date"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowDesktopSortPopover(!showDesktopSortPopover); }}
                  className={`flex items-center justify-center p-1.5 rounded hover:bg-[#202020] transition-colors cursor-pointer ${
                    sortBy !== 'recordedOrder' ? 'text-[#ee317b] bg-[#ee317b]/10' : 'text-gray-300'
                  }`}
                  title="Sort options"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>
                {showDesktopSortPopover && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowDesktopSortPopover(false)} />
                    <div className="absolute right-0 mt-1.5 w-52 bg-[#181818] border border-[#262626] rounded-lg shadow-xl z-50 p-2 text-[11px] font-sans text-gray-300 flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSortBy('recordedOrder');
                          setIsSortAsc(true);
                          setShowDesktopSortPopover(false);
                        }}
                        className={`text-left px-2 py-1.5 rounded hover:bg-[#202020] hover:text-white transition-colors ${sortBy === 'recordedOrder' ? 'text-[#ee317b] font-bold' : ''}`}
                      >
                        First Added (Oldest First)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSortBy('lastAdded');
                          setIsSortAsc(false);
                          setShowDesktopSortPopover(false);
                        }}
                        className={`text-left px-2 py-1.5 rounded hover:bg-[#202020] hover:text-white transition-colors ${sortBy === 'lastAdded' ? 'text-[#ee317b] font-bold' : ''}`}
                      >
                        Last Added (Newest First)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSortBy('purchaseDate');
                          setIsSortAsc(false);
                          setShowDesktopSortPopover(false);
                        }}
                        className={`text-left px-2 py-1.5 rounded hover:bg-[#202020] hover:text-white transition-colors ${(sortBy === 'purchaseDate' && !isSortAsc) ? 'text-[#ee317b] font-bold' : ''}`}
                      >
                        Date: Newest to Oldest
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSortBy('purchaseDate');
                          setIsSortAsc(true);
                          setShowDesktopSortPopover(false);
                        }}
                        className={`text-left px-2 py-1.5 rounded hover:bg-[#202020] hover:text-white transition-colors ${(sortBy === 'purchaseDate' && isSortAsc) ? 'text-[#ee317b] font-bold' : ''}`}
                      >
                        Date: Oldest to Newest
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSortBy('totalPrice');
                          setIsSortAsc(false);
                          setShowDesktopSortPopover(false);
                        }}
                        className={`text-left px-2 py-1.5 rounded hover:bg-[#202020] hover:text-white transition-colors ${(sortBy === 'totalPrice' && !isSortAsc) ? 'text-[#ee317b] font-bold' : ''}`}
                      >
                        Total: High to Low
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSortBy('totalPrice');
                          setIsSortAsc(true);
                          setShowDesktopSortPopover(false);
                        }}
                        className={`text-left px-2 py-1.5 rounded hover:bg-[#202020] hover:text-white transition-colors ${(sortBy === 'totalPrice' && isSortAsc) ? 'text-[#ee317b] font-bold' : ''}`}
                      >
                        Total: Low to High
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSortBy('quantity');
                          setIsSortAsc(false);
                          setShowDesktopSortPopover(false);
                        }}
                        className={`text-left px-2 py-1.5 rounded hover:bg-[#202020] hover:text-white transition-colors ${(sortBy === 'quantity' && !isSortAsc) ? 'text-[#ee317b] font-bold' : ''}`}
                      >
                        Quantity: High to Low
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSortBy('quantity');
                          setIsSortAsc(true);
                          setShowDesktopSortPopover(false);
                        }}
                        className={`text-left px-2 py-1.5 rounded hover:bg-[#202020] hover:text-white transition-colors ${(sortBy === 'quantity' && isSortAsc) ? 'text-[#ee317b] font-bold' : ''}`}
                      >
                        Quantity: Low to High
                      </button>
                    </div>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={handleOpenAddForm}
                className="text-[11px] font-sans font-bold text-black bg-[#ee317b] hover:bg-[#ee317b]/80 rounded px-2.5 py-1.5 flex items-center justify-center gap-1 shadow-sm transition-colors cursor-pointer"
                title="Add bulk purchases"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Table Spreadsheet View */}
          <div ref={purchaseLedgerTableRef} className={`${layoutMode === 'grid' ? 'block' : 'hidden'} bg-[#121212] border border-[#262626] overflow-hidden rounded-md shadow-none mobile-table-bottom-gap md:mb-0 ${selectedPurchaseIds.length > 0 ? 'mobile-selection-lift' : ''}`}>
            <DataTable
              id="purchases-table"
              className="min-w-[980px] alternating-table-rows wide-freeze-three-cols purchase-ledger-table"
            >
                <thead>
                  <tr className="bg-[#181818] border-b border-[#262626] text-gray-400 font-sans tracking-wider uppercase text-center">
                    <th className="py-1.5 md:py-2.5 px-2.5 md:px-3 border-r border-[#262626] bg-[#1C1C1C] font-bold text-gray-500 font-sans text-center w-8 text-[11px] md:text-xs">#</th>
                    <th className="py-2.5 px-3 text-center w-12 border-r border-[#262626]">
                      <input
                        type="checkbox"
                        checked={sortedPurchases.length > 0 && sortedPurchases.every(p => selectedPurchaseIds.includes(p.id))}
                        onChange={(e) => {
                          const allFilteredIds = sortedPurchases.map(p => p.id);
                          if (e.target.checked) {
                            setSelectedPurchaseIds(prev => {
                              const next = [...prev];
                              allFilteredIds.forEach(id => {
                                if (!next.includes(id)) next.push(id);
                              });
                              return next;
                            });
                          } else {
                            setSelectedPurchaseIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
                          }
                        }}
                        className="accent-[#ee317b] cursor-pointer"
                        title="Select all page purchases"
                      />
                    </th>
                    <SortablePurchaseHeader field="itemOrService">Item / Service</SortablePurchaseHeader>
                    <th className="py-2.5 px-3 font-semibold text-gray-300 border-r border-[#262626] text-left min-w-[180px]">Item Notes</th>
                    <SortablePurchaseHeader field="expenseCategory">Category</SortablePurchaseHeader>
                    <SortablePurchaseHeader field="quantity" align="right">Qty</SortablePurchaseHeader>
                    <SortablePurchaseHeader field="unitPrice" align="right">Unit P.</SortablePurchaseHeader>
                    <SortablePurchaseHeader field="totalPrice" align="right">Total Charged</SortablePurchaseHeader>
                    <SortablePurchaseHeader field="purchaseDate">Date</SortablePurchaseHeader>
                    <th className="py-2.5 px-3 font-semibold text-gray-300 border-r border-[#262626] text-left">Payment Account</th>
                    <th className="py-2.5 px-3 font-semibold text-gray-300 border-r border-[#262626] text-left">Recorded By</th>
                    <th className="py-2.5 px-3 text-center text-gray-400 font-sans w-32">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626] text-gray-300 font-sans text-xs">
                  {sortedPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-gray-500 font-sans leading-relaxed italic">
                        No purchase logs recorded in current settings. Use the Add button to record ledger data.
                      </td>
                    </tr>
                  ) : (
                    sortedPurchases.map((p, index) => {
                      const isSelected = selectedPurchaseIds.includes(p.id);
                      const isSearchHighlighted = highlightedSearchResult?.id === p.id;
                      const matchedBank = bankAccounts.find(b => b.id === p.paymentMethodId);
                      
                      return (
                        <tr 
                          key={p.id}
                          data-global-search-id={`purchase-${p.id}`}
                          className={`transition-colors ${isSearchHighlighted ? 'global-search-highlight' : ''} ${
                            isSelected ? 'selected-row' : 'hover:bg-[#181818]'
                          }`}
                          onClick={(e) => handlePurchaseRowClick(p.id, e)}
                          onTouchStart={(e) => startPurchaseRowLongPress(p.id, e)}
                          onTouchMove={clearRowLongPressTimer}
                          onTouchEnd={clearRowLongPressTimer}
                          onTouchCancel={clearRowLongPressTimer}
                        >
                          <td className="py-2 px-1 text-center font-sans text-gray-500 border-r border-[#262626] bg-[#181818]">{index + 1}</td>
                          {/* Checkbox selector */}
                          <td className="py-2 px-3 text-center border-r border-[#262626]">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                setLastSelectedPurchaseId(p.id);
                                if (e.target.checked) {
                                  setSelectedPurchaseIds(prev => [...prev, p.id]);
                                } else {
                                  setSelectedPurchaseIds(prev => prev.filter(id => id !== p.id));
                                }
                              }}
                              className="accent-[#ee317b] cursor-pointer"
                            />
                          </td>

                          {/* Item/Service with smart custom tax labels if applicable */}
                          <td className="py-2 px-3 border-r border-[#262626] text-[#E2E8F0] select-all font-semibold font-sans table-cell-wrap">
                            <div className="flex flex-col gap-0.5">
                              <span>{p.itemOrService}</span>
                              <div className="flex flex-wrap gap-1 mt-0.5 ">
                                {p.hasVat && (
                                  <span className="text-[8px] tracking-wider uppercase bg-[#182318] text-emerald-400 border border-emerald-900/50 px-1 font-sans font-bold">
                                    +15% VAT
                                  </span>
                                )}
                                {p.hasWithholding && (
                                  <span className="text-[8px] tracking-wider uppercase bg-[#31111E] text-red-400 border border-rose-950/50 px-1 font-sans font-bold">
                                    -3% WH
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Item notes / vendor metadata */}
                          <td className="py-2 px-3 border-r border-[#262626] text-gray-400 max-w-[220px] table-cell-wrap">
                            <span className="block" title={p.notesOrDescription || 'No notes'}>
                              {p.notesOrDescription || 'None'}
                            </span>
                          </td>

                          {/* Category */}
                          <td className="py-2 px-3 border-r border-[#262626]">
                            <span className="bg-[#24131A] text-pink-400 border border-pink-900/40 text-[10px] px-1.5 py-0.5 uppercase tracking-wide">
                              {p.expenseCategory}
                            </span>
                          </td>

                          {/* Qty */}
                          <td className="py-2 px-3 border-r border-[#262626] text-right font-bold text-stone-200">{p.quantity}</td>

                          {/* Unit Price */}
                          <td className="py-2 px-3 border-r border-[#262626] text-right text-gray-400">{Number(p.unitPrice).toLocaleString()} {p.currency || 'ETB'}</td>

                          {/* Total Price */}
                          <td className="py-2 px-3 border-r border-[#262626] text-right text-red-400 font-bold font-sans">
                            <div className="flex flex-col items-end">
                              <span>{Number(p.totalPrice).toLocaleString()} {p.currency || 'ETB'}</span>
                              {p.baseAmount && (p.hasVat || p.hasWithholding) && (
                                <span className="text-[9px] text-gray-500 font-normal">
                                  Base: {p.baseAmount.toLocaleString()} {p.currency || 'ETB'}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Purchase Date */}
                          <td className="py-2 px-3 border-r border-[#262626] text-[#71b536] whitespace-nowrap">{p.purchaseDate}</td>

                          {/* Payment Method */}
                          <td className="py-2 px-3 border-r border-[#262626] text-stone-300 font-sans font-semibold mb-1">
                            {matchedBank ? matchedBank.name : 'Unknown Account'}
                          </td>

                          {/* Recorded By */}
                          <td className="py-2 px-3 border-r border-[#262626] text-gray-400 font-sans">{p.recordedBy}</td>

                          {/* Actions */}
                          <td className="py-1 px-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEditForm(p)}
                                className="text-gray-400 hover:text-[#ee317b] hover:bg-[#262626] p-1 rounded-md transition-colors cursor-pointer"
                                title="Edit Purchase Record"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingPurchaseId(p.id)}
                                className="text-gray-500 hover:text-[#F87171] hover:bg-[#262626] p-1 rounded-md transition-colors cursor-pointer"
                                title="Delete Purchase Ledger Line"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
            </DataTable>
          </div>

          <div ref={purchaseLedgerGalleryRef} className={`${layoutMode === 'cards' ? 'grid' : 'hidden'} shared-gallery-scroll grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 animate-none mobile-table-bottom-gap md:mb-0 ${selectedPurchaseIds.length > 0 ? 'mobile-selection-lift' : ''}`}>
            {sortedPurchases.length === 0 ? (
              <div className="col-span-full border border-[#262626] bg-[#121212] rounded-md p-8 text-center text-xs text-gray-500 italic">
                No purchase logs recorded in current settings.
              </div>
            ) : (
              sortedPurchases.map((p) => {
                const isSelected = selectedPurchaseIds.includes(p.id);
                const isSearchHighlighted = highlightedSearchResult?.id === p.id;
                const matchedBank = bankAccounts.find(b => b.id === p.paymentMethodId);
                const totalLabel = `${Number(p.totalPrice).toLocaleString()} ${p.currency || 'ETB'}`;

                return (
                  <div
                    key={p.id}
                    data-global-search-id={`purchase-${p.id}`}
                    className={`border rounded-md p-3 shadow-none flex flex-col justify-between transition-all duration-300 text-gray-300 min-h-[190px] ${
                      isSearchHighlighted ? 'global-search-highlight' : ''
                    } ${
                      isSelected
                        ? 'selected-row border-[#ee317b]'
                        : 'bg-[#121212] border-[#262626] hover:border-[#ee317b]/60'
                    }`}
                    onClick={(e) => handlePurchaseRowClick(p.id, e)}
                    onTouchStart={(e) => startPurchaseRowLongPress(p.id, e)}
                    onTouchMove={clearRowLongPressTimer}
                    onTouchEnd={clearRowLongPressTimer}
                    onTouchCancel={clearRowLongPressTimer}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                setLastSelectedPurchaseId(p.id);
                                if (e.target.checked) {
                                  setSelectedPurchaseIds(prev => [...prev, p.id]);
                                } else {
                                  setSelectedPurchaseIds(prev => prev.filter(id => id !== p.id));
                                }
                              }}
                              className="accent-[#ee317b] cursor-pointer"
                              title="Select purchase"
                            />
                            <h4 className="font-bold text-white text-sm leading-tight truncate">{p.itemOrService}</h4>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            <span className="bg-[#24131A] text-pink-400 border border-pink-900/40 text-[9px] px-1.5 py-0.5 uppercase tracking-wide rounded-sm">
                              {p.expenseCategory}
                            </span>
                            {p.hasVat && (
                              <span className="bg-[#182318] text-emerald-400 border border-emerald-900/50 text-[9px] px-1.5 py-0.5 uppercase tracking-wide rounded-sm">
                                +VAT
                              </span>
                            )}
                            {p.hasWithholding && (
                              <span className="bg-[#31111E] text-red-400 border border-rose-950/50 text-[9px] px-1.5 py-0.5 uppercase tracking-wide rounded-sm">
                                -WH
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[#ee317b] font-extrabold text-sm leading-tight">{totalLabel}</div>
                          <div className="text-[9px] text-gray-500 uppercase tracking-wider">{p.purchaseDate}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="bg-[#181818] border border-[#262626] rounded p-2 min-w-0">
                          <span className="block text-gray-500 uppercase text-[9px] tracking-wider">Quantity</span>
                          <span className="font-bold text-white">{p.quantity}</span>
                        </div>
                        <div className="bg-[#181818] border border-[#262626] rounded p-2 min-w-0">
                          <span className="block text-gray-500 uppercase text-[9px] tracking-wider">Unit Price</span>
                          <span className="font-bold text-white">{Number(p.unitPrice).toLocaleString()} {p.currency || 'ETB'}</span>
                        </div>
                      </div>

                      <div className="space-y-1 text-[11px]">
                        <div className="flex justify-between gap-2">
                          <span className="text-gray-500">Account</span>
                          <span className="text-gray-300 font-semibold text-right truncate">{matchedBank ? matchedBank.name : 'Unknown Account'}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-gray-500">Recorded By</span>
                          <span className="text-gray-300 font-semibold text-right truncate">{p.recordedBy || 'Unknown'}</span>
                        </div>
                        <div className="pt-1 text-gray-400 leading-snug line-clamp-2">
                          {p.notesOrDescription || 'No notes'}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-[#262626] flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleOpenEditForm(p);
                        }}
                        className="text-gray-400 hover:text-[#ee317b] hover:bg-[#262626] p-1.5 rounded-md transition-colors cursor-pointer"
                        title="Edit Purchase Record"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setDeletingPurchaseId(p.id);
                        }}
                        className="text-gray-400 hover:text-red-400 hover:bg-[#2E181D] p-1.5 rounded-md transition-colors cursor-pointer"
                        title="Delete Purchase"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      </>
      )}

      {financeView === 'loans' && (
        <div className="space-y-3 font-sans animate-fadeIn">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="bg-[#121212] border border-[#262626] rounded-md p-3">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Receivable</div>
              <div className="text-lg font-extrabold text-[#ee317b]">{filteredLoanedOut.toLocaleString()}</div>
            </div>
            <div className="bg-[#121212] border border-[#262626] rounded-md p-3">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Payable</div>
              <div className="text-lg font-extrabold text-[#71b536]">{filteredBorrowed.toLocaleString()}</div>
            </div>
            <div className="bg-[#121212] border border-[#262626] rounded-md p-3 flex items-center justify-between gap-2">
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">Repayments</div>
                <div className="text-lg font-extrabold text-white">{filteredRepaymentsTotal.toLocaleString()}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 w-36 sm:w-40">
                <button
                  type="button"
                  onClick={() => openAddLoanForm('given')}
                  className="h-9 rounded-md bg-[#ee317b] px-2 text-[10px] font-bold uppercase text-white hover:bg-[#d61e63]"
                >
                  Give
                </button>
                <button
                  type="button"
                  onClick={() => openAddLoanForm('received')}
                  className="h-9 rounded-md bg-[#71b536] px-2 text-[10px] font-bold uppercase text-black hover:bg-[#5f9c2d]"
                >
                  Receive
                </button>
              </div>
            </div>
          </div>

          <TableToolbar
            searchQuery={loanSearchQuery}
            setSearchQuery={setLoanSearchQuery}
            mobileLeftControls={
              <>
                <button type="button" onClick={() => setLoanLayoutMode('grid')} className={`p-1.5 rounded cursor-pointer transition-colors ${loanLayoutMode === 'grid' ? 'bg-[#ee317b]/10 text-[#ee317b]' : 'text-gray-400 hover:text-white'}`} title="Table view">
                  <TableIcon className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => setLoanLayoutMode('cards')} className={`p-1.5 rounded cursor-pointer transition-colors ${loanLayoutMode === 'cards' ? 'bg-[#ee317b]/10 text-[#ee317b]' : 'text-gray-400 hover:text-white'}`} title="Gallery view">
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </>
            }
            mobileRightControls={
              <>
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowLoanFilters(prev => !prev); }}
                    className="bg-transparent text-gray-300 p-1.5 rounded hover:bg-[#181818] transition-colors flex items-center justify-center relative cursor-pointer"
                    title="Refine loans"
                  >
                    <Filter className="w-3.5 h-3.5" />
                    {activeLoanFilterCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-[#ee317b] text-white text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">
                        {activeLoanFilterCount}
                      </span>
                    )}
                  </button>
                  {showLoanFilters && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowLoanFilters(false)} />
                      <div className="absolute right-0 mt-1.5 w-72 z-50 rounded-lg border border-[#262626] bg-[#181818] p-2.5 text-xs font-sans text-gray-300 shadow-2xl flex flex-col gap-2.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-1">
                          <span className="font-bold text-gray-400 text-[10px] uppercase tracking-wider select-none">Loan Options</span>
                          {activeLoanFilterCount > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setLoanSearchQuery('');
                                setLoanTypeFilter('All');
                                setLoanStatusFilter('All');
                                setLoanAccountFilter('All');
                                setLoanStaffFilter('All');
                                setLoanStartDate('');
                                setLoanEndDate('');
                              }}
                              className="text-[#ee317b] hover:text-[#ee317b]/80 flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Clear All
                            </button>
                          )}
                        </div>
                        <div className="h-px bg-[#262626] my-0.5"></div>
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 hover:bg-[#202020] rounded p-1 transition-colors">
                            <div className="flex items-center gap-1.5 text-gray-400 w-20 flex-shrink-0 select-none">
                              <Banknote className="w-3.5 h-3.5" />
                              <span className="text-[11px]">Type</span>
                            </div>
                            <div className="flex-1 min-w-0 bg-[#121212] rounded border border-[#262626] hover:border-gray-500 transition-colors">
                              <SearchableSelect value={loanTypeFilter} onChange={(e) => setLoanTypeFilter(e.target.value)} className="bg-transparent text-xs text-white">
                                <option value="All">All Types</option>
                                <option value="given">Given</option>
                                <option value="received">Received</option>
                              </SearchableSelect>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 hover:bg-[#202020] rounded p-1 transition-colors">
                            <div className="flex items-center gap-1.5 text-gray-400 w-20 flex-shrink-0 select-none">
                              <Check className="w-3.5 h-3.5" />
                              <span className="text-[11px]">Status</span>
                            </div>
                            <div className="flex-1 min-w-0 bg-[#121212] rounded border border-[#262626] hover:border-gray-500 transition-colors">
                              <SearchableSelect value={loanStatusFilter} onChange={(e) => setLoanStatusFilter(e.target.value)} className="bg-transparent text-xs text-white">
                                <option value="All">All Statuses</option>
                                <option value="open">Open</option>
                                <option value="partially_paid">Partial</option>
                                <option value="paid">Paid</option>
                                <option value="written_off">Written Off</option>
                              </SearchableSelect>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 hover:bg-[#202020] rounded p-1 transition-colors">
                            <div className="flex items-center gap-1.5 text-gray-400 w-20 flex-shrink-0 select-none">
                              <CreditCard className="w-3.5 h-3.5" />
                              <span className="text-[11px]">Account</span>
                            </div>
                            <div className="flex-1 min-w-0 bg-[#121212] rounded border border-[#262626] hover:border-gray-500 transition-colors">
                              <SearchableSelect value={loanAccountFilter} onChange={(e) => setLoanAccountFilter(e.target.value)} className="bg-transparent text-xs text-white">
                                <option value="All">All Accounts</option>
                                {bankAccounts.map(bank => <option key={bank.id} value={bank.id}>{bank.name}</option>)}
                              </SearchableSelect>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 hover:bg-[#202020] rounded p-1 transition-colors">
                            <div className="flex items-center gap-1.5 text-gray-400 w-20 flex-shrink-0 select-none">
                              <User className="w-3.5 h-3.5" />
                              <span className="text-[11px]">Staff</span>
                            </div>
                            <div className="flex-1 min-w-0 bg-[#121212] rounded border border-[#262626] hover:border-gray-500 transition-colors">
                              <SearchableSelect value={loanStaffFilter} onChange={(e) => setLoanStaffFilter(e.target.value)} className="bg-transparent text-xs text-white">
                                <option value="All">All Staff</option>
                                {loanStaffOptions.map(staff => <option key={staff} value={staff}>{staff}</option>)}
                              </SearchableSelect>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 hover:bg-[#202020] rounded p-1 transition-colors">
                            <div className="flex items-center gap-1.5 text-gray-400 w-20 flex-shrink-0 select-none">
                              <Calendar className="w-3.5 h-3.5" />
                              <span className="text-[11px]">Dates</span>
                            </div>
                            <div className="flex-1 grid grid-cols-2 gap-1.5">
                              <input type="date" value={loanStartDate} onChange={(e) => setLoanStartDate(e.target.value)} className="w-full bg-[#121212] rounded border border-[#262626] text-white text-[11px] font-sans outline-none px-1.5 py-1" title="From date" />
                              <input type="date" value={loanEndDate} onChange={(e) => setLoanEndDate(e.target.value)} className="w-full bg-[#121212] rounded border border-[#262626] text-white text-[11px] font-sans outline-none px-1.5 py-1" title="To date" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowLoanSortPopover(prev => !prev); }}
                    className={`bg-transparent p-1.5 rounded hover:bg-[#181818] transition-colors flex items-center justify-center cursor-pointer ${loanSortBy !== 'loanDate' || isLoanSortAsc ? 'text-[#ee317b]' : 'text-gray-300'}`}
                    title="Sort options"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                  {showLoanSortPopover && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowLoanSortPopover(false)} />
                      <div className="absolute right-0 mt-1.5 w-52 bg-[#181818] border border-[#262626] rounded-lg shadow-xl z-50 p-2 text-[11px] font-sans text-gray-300 flex flex-col gap-1 max-h-64 overflow-y-auto">
                        {LOAN_SORT_FIELDS.map(field => (
                          <button
                            key={field}
                            type="button"
                            onClick={() => {
                              if (loanSortBy === field) {
                                setIsLoanSortAsc(prev => !prev);
                              } else {
                                setLoanSortBy(field);
                                setIsLoanSortAsc(field === 'personName');
                              }
                              setShowLoanSortPopover(false);
                            }}
                            className={`text-left px-2 py-1.5 rounded hover:bg-[#202020] hover:text-white transition-colors ${loanSortBy === field ? 'text-[#ee317b] font-bold' : ''}`}
                          >
                            {loanSortLabels[field]} {loanSortBy === field ? (isLoanSortAsc ? '↑' : '↓') : ''}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </>
            }
            desktopLeftControls={
              <div className="border border-[#262626] rounded p-0.5 flex bg-transparent shrink-0">
                <button type="button" onClick={() => setLoanLayoutMode('grid')} className={`p-1 rounded cursor-pointer transition-colors ${loanLayoutMode === 'grid' ? 'bg-[#ee317b]/10 text-[#ee317b]' : 'text-gray-400 hover:text-white'}`} title="Tabular Grid View">
                  <TableIcon className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => setLoanLayoutMode('cards')} className={`p-1 rounded cursor-pointer transition-colors ${loanLayoutMode === 'cards' ? 'bg-[#ee317b]/10 text-[#ee317b]' : 'text-gray-400 hover:text-white'}`} title="Responsive Cards View">
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <span className="hidden lg:inline-flex items-center px-2 text-[10px] text-gray-500">{sortedLoans.length} of {loans.length}</span>
              </div>
            }
            desktopRightControls={
              <>
                <div className="relative z-40">
                  <button
                    type="button"
                    onClick={() => setShowLoanFilters(prev => !prev)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-gray-300 hover:bg-[#202020] transition-colors cursor-pointer text-[11px] font-medium font-sans ${
                      activeLoanFilterCount > 0 ? 'text-[#ee317b] bg-[#ee317b]/10' : ''
                    }`}
                    title="Refine loans"
                  >
                    <Filter className="w-3.5 h-3.5" />
                    {activeLoanFilterCount > 0 && (
                      <span className="bg-[#ee317b] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                        {activeLoanFilterCount}
                      </span>
                    )}
                  </button>

                  {showLoanFilters && (
                    <>
                      <div className="fixed inset-0 z-30 cursor-default" onClick={() => setShowLoanFilters(false)} />
                      <div className="absolute right-0 mt-1.5 w-72 z-40 rounded-lg border border-[#262626] bg-[#181818] p-2.5 text-xs font-sans text-gray-300 shadow-2xl flex flex-col gap-2.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-1">
                          <span className="font-bold text-gray-400 text-[10px] uppercase tracking-wider select-none">Loan Options</span>
                          {activeLoanFilterCount > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setLoanSearchQuery('');
                                setLoanTypeFilter('All');
                                setLoanStatusFilter('All');
                                setLoanAccountFilter('All');
                                setLoanStaffFilter('All');
                                setLoanStartDate('');
                                setLoanEndDate('');
                              }}
                              className="text-[#ee317b] hover:text-[#ee317b]/80 flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Clear All
                            </button>
                          )}
                        </div>
                        <div className="h-px bg-[#262626] my-0.5"></div>
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 hover:bg-[#202020] rounded p-1 transition-colors">
                            <div className="flex items-center gap-1.5 text-gray-400 w-20 flex-shrink-0 select-none">
                              <Banknote className="w-3.5 h-3.5" />
                              <span className="text-[11px]">Type</span>
                            </div>
                            <div className="flex-1 min-w-0 bg-[#121212] rounded border border-[#262626] hover:border-gray-500 transition-colors">
                              <SearchableSelect value={loanTypeFilter} onChange={(e) => setLoanTypeFilter(e.target.value)} className="bg-transparent text-xs text-white">
                                <option value="All">All Types</option>
                                <option value="given">Given</option>
                                <option value="received">Received</option>
                              </SearchableSelect>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 hover:bg-[#202020] rounded p-1 transition-colors">
                            <div className="flex items-center gap-1.5 text-gray-400 w-20 flex-shrink-0 select-none">
                              <Check className="w-3.5 h-3.5" />
                              <span className="text-[11px]">Status</span>
                            </div>
                            <div className="flex-1 min-w-0 bg-[#121212] rounded border border-[#262626] hover:border-gray-500 transition-colors">
                              <SearchableSelect value={loanStatusFilter} onChange={(e) => setLoanStatusFilter(e.target.value)} className="bg-transparent text-xs text-white">
                                <option value="All">All Statuses</option>
                                <option value="open">Open</option>
                                <option value="partially_paid">Partial</option>
                                <option value="paid">Paid</option>
                                <option value="written_off">Written Off</option>
                              </SearchableSelect>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 hover:bg-[#202020] rounded p-1 transition-colors">
                            <div className="flex items-center gap-1.5 text-gray-400 w-20 flex-shrink-0 select-none">
                              <CreditCard className="w-3.5 h-3.5" />
                              <span className="text-[11px]">Account</span>
                            </div>
                            <div className="flex-1 min-w-0 bg-[#121212] rounded border border-[#262626] hover:border-gray-500 transition-colors">
                              <SearchableSelect value={loanAccountFilter} onChange={(e) => setLoanAccountFilter(e.target.value)} className="bg-transparent text-xs text-white">
                                <option value="All">All Accounts</option>
                                {bankAccounts.map(bank => <option key={bank.id} value={bank.id}>{bank.name}</option>)}
                              </SearchableSelect>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 hover:bg-[#202020] rounded p-1 transition-colors">
                            <div className="flex items-center gap-1.5 text-gray-400 w-20 flex-shrink-0 select-none">
                              <User className="w-3.5 h-3.5" />
                              <span className="text-[11px]">Staff</span>
                            </div>
                            <div className="flex-1 min-w-0 bg-[#121212] rounded border border-[#262626] hover:border-gray-500 transition-colors">
                              <SearchableSelect value={loanStaffFilter} onChange={(e) => setLoanStaffFilter(e.target.value)} className="bg-transparent text-xs text-white">
                                <option value="All">All Staff</option>
                                {loanStaffOptions.map(staff => <option key={staff} value={staff}>{staff}</option>)}
                              </SearchableSelect>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 hover:bg-[#202020] rounded p-1 transition-colors">
                            <div className="flex items-center gap-1.5 text-gray-400 w-20 flex-shrink-0 select-none">
                              <Calendar className="w-3.5 h-3.5" />
                              <span className="text-[11px]">Dates</span>
                            </div>
                            <div className="flex-1 grid grid-cols-2 gap-1.5">
                              <input type="date" value={loanStartDate} onChange={(e) => setLoanStartDate(e.target.value)} className="w-full bg-[#121212] rounded border border-[#262626] text-white text-[11px] font-sans outline-none px-1.5 py-1" title="From date" />
                              <input type="date" value={loanEndDate} onChange={(e) => setLoanEndDate(e.target.value)} className="w-full bg-[#121212] rounded border border-[#262626] text-white text-[11px] font-sans outline-none px-1.5 py-1" title="To date" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowLoanSortPopover(prev => !prev); }}
                    className={`flex items-center justify-center p-1.5 rounded hover:bg-[#202020] transition-colors cursor-pointer ${
                      loanSortBy !== 'loanDate' || isLoanSortAsc ? 'text-[#ee317b] bg-[#ee317b]/10' : 'text-gray-300'
                    }`}
                    title="Sort options"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                  {showLoanSortPopover && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowLoanSortPopover(false)} />
                      <div className="absolute right-0 mt-1.5 w-52 bg-[#181818] border border-[#262626] rounded-lg shadow-xl z-50 p-2 text-[11px] font-sans text-gray-300 flex flex-col gap-1 max-h-64 overflow-y-auto">
                        {LOAN_SORT_FIELDS.map(field => (
                          <button
                            key={field}
                            type="button"
                            onClick={() => {
                              if (loanSortBy === field) {
                                setIsLoanSortAsc(prev => !prev);
                              } else {
                                setLoanSortBy(field);
                                setIsLoanSortAsc(field === 'personName');
                              }
                              setShowLoanSortPopover(false);
                            }}
                            className={`text-left px-2 py-1.5 rounded hover:bg-[#202020] hover:text-white transition-colors ${loanSortBy === field ? 'text-[#ee317b] font-bold' : ''}`}
                          >
                            {loanSortLabels[field]} {loanSortBy === field ? (isLoanSortAsc ? '↑' : '↓') : ''}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </>
            }
          />

          <div className={`${loanLayoutMode === 'grid' ? 'block' : 'hidden'} bg-[#121212] border border-[#262626] rounded-md overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-xs text-gray-300">
                <thead>
                  <tr className="bg-[#181818] border-b border-[#262626] text-gray-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3 text-left">Type</th>
                    <th className="py-2.5 px-3 text-left">Person / Org</th>
                    <th className="py-2.5 px-3 text-right">Principal</th>
                    <th className="py-2.5 px-3 text-right">Paid</th>
                    <th className="py-2.5 px-3 text-right">Remaining</th>
                    <th className="py-2.5 px-3 text-left">Account</th>
                    <th className="py-2.5 px-3 text-left">Dates</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626]">
                  {sortedLoans.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-gray-500 italic">
                        No loans recorded yet.
                      </td>
                    </tr>
                  ) : sortedLoans.map(loan => {
                    const bank = bankAccounts.find(account => account.id === loan.paymentMethodId);
                    const status = getLoanStatus(loan);
                    return (
                      <tr key={loan.id} className={`hover:bg-[#181818] border-l-2 ${loan.type === 'given' ? 'border-l-[#ee317b]' : 'border-l-[#71b536]'}`}>
                        <td className="py-2 px-3">
                          <span className={`rounded px-2 py-1 text-[10px] font-bold uppercase ${loan.type === 'given' ? 'bg-[#31111E] text-[#ee317b]' : 'bg-[#112918] text-[#71b536]'}`}>
                            {loan.type === 'given' ? 'Given' : 'Received'}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-bold text-white">{loan.personName}</div>
                          <div className="text-[10px] text-gray-500">{loan.phone || loan.notes || 'No contact'}</div>
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-white">{Number(loan.principalAmount).toLocaleString()} {loan.currency || 'ETB'}</td>
                        <td className="py-2 px-3 text-right text-gray-300">{getLoanPaid(loan).toLocaleString()} {loan.currency || 'ETB'}</td>
                        <td className="py-2 px-3 text-right font-bold text-[#ee317b]">{getLoanRemaining(loan).toLocaleString()} {loan.currency || 'ETB'}</td>
                        <td className="py-2 px-3">{bank?.name || 'Unknown Account'}</td>
                        <td className="py-2 px-3">
                          <div>{loan.loanDate}</div>
                          <div className="text-[10px] text-gray-500">Due: {loan.dueDate || 'Open'}</div>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className={`rounded border px-2 py-1 text-[10px] uppercase ${getLoanStatusClasses(status)}`}>
                            {status?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => openRepaymentForm(loan)}
                              className="rounded-md border border-[#71b536]/30 bg-[#112918] px-2 py-1 text-[10px] font-bold uppercase text-[#71b536] hover:bg-[#18351f] inline-flex items-center gap-1"
                              title="Record payment"
                            >
                              <Banknote className="w-3.5 h-3.5" />
                              Paid
                            </button>
                            <button type="button" onClick={() => openEditLoanForm(loan)} className="rounded p-1 text-gray-400 hover:bg-[#262626] hover:text-[#ee317b]" title="Edit loan">
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" onClick={() => handleDeleteLoan(loan.id)} className="rounded p-1 text-gray-500 hover:bg-[#2E181D] hover:text-red-400" title="Delete loan">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className={`${loanLayoutMode === 'cards' ? 'grid' : 'hidden'} shared-gallery-scroll grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mobile-table-bottom-gap md:mb-0`}>
            {sortedLoans.length === 0 ? (
              <div className="col-span-full border border-[#262626] bg-[#121212] rounded-md p-8 text-center text-xs text-gray-500 italic">
                No loans match the current filters.
              </div>
            ) : sortedLoans.map(loan => {
              const bank = bankAccounts.find(account => account.id === loan.paymentMethodId);
              const status = getLoanStatus(loan);
              const remaining = getLoanRemaining(loan);
              const paid = getLoanPaid(loan);
              return (
                <div
                  key={loan.id}
                  className={`border rounded-md p-3 shadow-none flex flex-col justify-between gap-3 min-h-[220px] ${
                    loan.type === 'given'
                      ? 'bg-[#121212] border-[#ee317b]/35 hover:border-[#ee317b]/70'
                      : 'bg-[#121212] border-[#71b536]/35 hover:border-[#71b536]/70'
                  } transition-colors`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`rounded px-2 py-1 text-[9px] font-bold uppercase ${loan.type === 'given' ? 'bg-[#31111E] text-[#ee317b]' : 'bg-[#112918] text-[#71b536]'}`}>
                            {loan.type === 'given' ? 'Given' : 'Received'}
                          </span>
                          <span className={`rounded border px-2 py-1 text-[9px] uppercase ${getLoanStatusClasses(status)}`}>
                            {status?.replace('_', ' ')}
                          </span>
                        </div>
                        <h4 className="mt-2 text-sm font-bold text-white truncate">{loan.personName}</h4>
                        <p className="text-[10px] text-gray-500 truncate">{loan.phone || loan.notes || 'No contact saved'}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-sm font-extrabold ${loan.type === 'given' ? 'text-[#ee317b]' : 'text-[#71b536]'}`}>
                          {remaining.toLocaleString()}
                        </div>
                        <div className="text-[9px] text-gray-500 uppercase">{loan.currency || 'ETB'} left</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="bg-[#181818] border border-[#262626] rounded p-2 min-w-0">
                        <span className="block text-gray-500 uppercase text-[9px] tracking-wider">Principal</span>
                        <span className="font-bold text-white">{Number(loan.principalAmount).toLocaleString()} {loan.currency || 'ETB'}</span>
                      </div>
                      <div className="bg-[#181818] border border-[#262626] rounded p-2 min-w-0">
                        <span className="block text-gray-500 uppercase text-[9px] tracking-wider">Paid</span>
                        <span className="font-bold text-[#71b536]">{paid.toLocaleString()} {loan.currency || 'ETB'}</span>
                      </div>
                    </div>

                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between gap-2">
                        <span className="text-gray-500">Account</span>
                        <span className="text-gray-300 font-semibold text-right truncate">{bank?.name || 'Unknown Account'}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-gray-500">Loan Date</span>
                        <span className="text-gray-300 font-semibold">{loan.loanDate}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-gray-500">Due Date</span>
                        <span className="text-gray-300 font-semibold">{loan.dueDate || 'Open'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#262626] flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => openRepaymentForm(loan)}
                      className="rounded-md border border-[#71b536]/30 bg-[#112918] px-2 py-1.5 text-[10px] font-bold uppercase text-[#71b536] hover:bg-[#18351f] inline-flex items-center gap-1"
                      title="Record payment"
                    >
                      <Banknote className="w-3.5 h-3.5" />
                      Paid
                    </button>
                    <button type="button" onClick={() => openEditLoanForm(loan)} className="rounded p-1.5 text-gray-400 hover:bg-[#262626] hover:text-[#ee317b]" title="Edit loan">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => handleDeleteLoan(loan.id)} className="rounded p-1.5 text-gray-500 hover:bg-[#2E181D] hover:text-red-400" title="Delete loan">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <AnimatePresence>
        {selectedPurchaseIds.length > 0 && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="md:hidden fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 bg-[#121212] border-t border-[#ee317b] text-white z-40 p-3 flex flex-col gap-2 shadow-[0_-4px_15px_rgba(238,49,123,0.15)] pb-5"
          >
            <div className="flex justify-between items-center text-xs font-bold text-[#ee317b] mb-1 px-1">
              <span>{selectedPurchaseIds.length} Selected Purchases</span>
              <button
                type="button"
                onClick={() => setSelectedPurchaseIds([])}
                className="text-gray-400 font-normal underline"
              >
                Clear Selection
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => setShowBulkDeleteConfirm(true)}
                className="bg-[#2E181D] border border-red-900/40 text-red-400 py-2.5 rounded font-bold text-xs cursor-pointer flex items-center justify-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AppToast message={warningMessage} type={purchaseToastType} />

      <AnimatePresence>
        {isLoanFormOpen && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-md p-0 md:p-4 font-sans">
            <motion.div
              initial={{ y: 60, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 60, opacity: 0, scale: 0.98 }}
              className="w-full md:max-w-2xl bg-[#121212] border-t md:border border-[#262626] rounded-t-2xl md:rounded-md shadow-2xl overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-[#262626] flex items-center justify-between bg-[#181818]">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">{editingLoan ? 'Edit Loan' : 'Record Loan'}</h3>
                  <p className="text-[11px] text-gray-500">Loans affect account balances, not expense or income totals.</p>
                </div>
                <button type="button" onClick={() => setIsLoanFormOpen(false)} className="text-gray-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="max-h-[75vh] overflow-y-auto p-5 space-y-4">
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Loan Direction</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setLoanType('given')} className={`rounded-md border px-3 py-2 text-xs font-bold uppercase ${loanType === 'given' ? 'border-[#ee317b] bg-[#31111E] text-[#ee317b]' : 'border-[#262626] bg-[#181818] text-gray-400'}`}>
                      Give Loan
                    </button>
                    <button type="button" onClick={() => setLoanType('received')} className={`rounded-md border px-3 py-2 text-xs font-bold uppercase ${loanType === 'received' ? 'border-[#71b536] bg-[#112918] text-[#71b536]' : 'border-[#262626] bg-[#181818] text-gray-400'}`}>
                      Receive Loan
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Person / Organization</label>
                    <input value={loanPersonName} onChange={(e) => setLoanPersonName(e.target.value)} className={purchaseFormInputClass} placeholder="Name" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Phone / Contact</label>
                    <input value={loanPhone} onChange={(e) => setLoanPhone(e.target.value)} className={purchaseFormInputClass} placeholder="Optional" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Principal Amount</label>
                    <input value={loanPrincipalInput} onChange={(e) => setLoanPrincipalInput(cleanLeadingZeros(e.target.value))} className={purchaseFormInputClass} placeholder="0" />
                    <div className="text-[10px] text-gray-500 mt-1">Parsed: {parseFractionOrExpression(loanPrincipalInput)}</div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Interest / Fee</label>
                    <input value={loanInterestInput} onChange={(e) => setLoanInterestInput(cleanLeadingZeros(e.target.value))} className={purchaseFormInputClass} placeholder="Optional" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Bank / Cash Account</label>
                    <SearchableSelect value={loanPaymentMethodId} onChange={(e) => handleLoanPaymentMethodChange(e.target.value)} className="w-full bg-[#121212] border border-[#262626] rounded-md text-white text-xs">
                      <option value="">Select Account</option>
                      {bankAccounts.map(bank => <option key={bank.id} value={bank.id}>{bank.name}</option>)}
                    </SearchableSelect>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Currency</label>
                    <SearchableSelect value={loanCurrency} onChange={(e) => setLoanCurrency(e.target.value)} className="w-full bg-[#121212] border border-[#262626] rounded-md text-white text-xs">
                      <option value="">Select Currency</option>
                      {availableCurrencies.map(curr => <option key={curr} value={curr}>{curr}</option>)}
                    </SearchableSelect>
                    <p className="mt-1 text-[10px] text-gray-500">Auto-filled from the selected account.</p>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Loan Date</label>
                    <input type="date" value={loanDate} onChange={(e) => setLoanDate(e.target.value)} className={purchaseFormInputClass} />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Due Date</label>
                    <input type="date" value={loanDueDate} onChange={(e) => setLoanDueDate(e.target.value)} className={purchaseFormInputClass} />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Notes</label>
                  <textarea value={loanNotes} onChange={(e) => setLoanNotes(e.target.value)} className="w-full min-h-[90px] px-2.5 py-2 text-xs bg-[#121212] text-white border border-[#262626] focus:border-[#ee317b] rounded-md outline-none font-sans resize-none" placeholder="Reason, agreement details, collateral, etc." />
                </div>
              </div>

              <div className="px-5 py-4 border-t border-[#262626] bg-[#181818] flex justify-end gap-2">
                <button type="button" onClick={() => setIsLoanFormOpen(false)} className="rounded-md border border-[#262626] px-4 py-2 text-xs font-bold uppercase text-gray-300 hover:text-white">
                  Cancel
                </button>
                <button type="button" onClick={handleSaveLoan} className="rounded-md bg-[#ee317b] px-4 py-2 text-xs font-bold uppercase text-white hover:bg-[#d61e63]">
                  Save Loan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {repaymentLoan && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-md p-0 md:p-4 font-sans">
            <motion.div
              initial={{ y: 60, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 60, opacity: 0, scale: 0.98 }}
              className="w-full md:max-w-md bg-[#121212] border-t md:border border-[#262626] rounded-t-2xl md:rounded-md shadow-2xl p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#71b536]">Record Repayment</p>
                  <h3 className="text-base font-bold text-white">{repaymentLoan.personName}</h3>
                  <p className="text-[11px] text-gray-500">Remaining: {getLoanRemaining(repaymentLoan).toLocaleString()} {repaymentLoan.currency || 'ETB'}</p>
                </div>
                <button type="button" onClick={() => setRepaymentLoan(null)} className="text-gray-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Amount</label>
                  <input value={repaymentAmountInput} onChange={(e) => setRepaymentAmountInput(cleanLeadingZeros(e.target.value))} className={purchaseFormInputClass} placeholder="0" />
                  <div className="text-[10px] text-gray-500 mt-1">Parsed: {parseFractionOrExpression(repaymentAmountInput)} {repaymentLoan.currency || 'ETB'}</div>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Date</label>
                  <input type="date" value={repaymentDate} onChange={(e) => setRepaymentDate(e.target.value)} className={purchaseFormInputClass} />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Bank / Cash Account</label>
                  <SearchableSelect value={repaymentMethodId} onChange={(e) => setRepaymentMethodId(e.target.value)} className="w-full bg-[#121212] border border-[#262626] rounded-md text-white text-xs">
                    <option value="">Select Account</option>
                    {bankAccounts.map(bank => <option key={bank.id} value={bank.id}>{bank.name}</option>)}
                  </SearchableSelect>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Notes</label>
                  <textarea value={repaymentNotes} onChange={(e) => setRepaymentNotes(e.target.value)} className="w-full min-h-[76px] px-2.5 py-2 text-xs bg-[#121212] text-white border border-[#262626] focus:border-[#71b536] rounded-md outline-none resize-none" />
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={() => setRepaymentLoan(null)} className="rounded-md border border-[#262626] px-4 py-2 text-xs font-bold uppercase text-gray-300 hover:text-white">
                  Cancel
                </button>
                <button type="button" onClick={handleSaveRepayment} className="rounded-md bg-[#71b536] px-4 py-2 text-xs font-bold uppercase text-black hover:bg-[#5f9c2d]">
                  Save Repayment
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal for Single Delete */}
      <AnimatePresence>
        {deletingPurchaseId && (() => {
          const target = purchases.find(p => p.id === deletingPurchaseId);
          if (!target) return null;
          return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-end md:items-center justify-center p-0 md:p-4">
              <motion.div 
                initial={{ y: 36, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 36, opacity: 0 }}
                className="bg-[#121212] border border-[#ee317b]/40 md:max-w-md w-full p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:p-6 text-left space-y-4 rounded-t-2xl md:rounded-md"
              >
                <div className="space-y-2">
                  <h3 className="font-sans text-white font-bold uppercase tracking-wider text-sm">Discards Specific Expense</h3>
                  <p className="text-stone-400 text-xs leading-relaxed font-sans">
                    Are you sure you want to permanently delete the registered purchase entry for <strong className="text-white">"{target.itemOrService}"</strong> recorded on {target.purchaseDate} for {target.totalPrice} ETB?
                  </p>
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t border-[#262626] font-sans">
                  <button
                    type="button"
                    onClick={() => setDeletingPurchaseId(null)}
                    className="px-4 py-1.5 bg-[#1a1a1a] border border-[#2d2d2d] text-gray-300 hover:text-white hover:bg-[#232323] cursor-pointer text-xs rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSingle(deletingPurchaseId)}
                    className="px-4 py-1.5 bg-[#ee317b] hover:bg-[#d61e63] text-white font-bold cursor-pointer text-xs uppercase rounded-md"
                  >
                    Confirm Delete
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Non-blocking bulk delete confirmation modal for Purchases */}
      <AnimatePresence>
        {showBulkDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/85 backdrop-blur-sm ">
            <motion.div
              initial={{ y: 36, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 36, opacity: 0 }}
              className="bg-[#121212] border border-[#ee317b]/40 md:max-w-md w-full p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:p-6 text-left space-y-4 rounded-t-2xl md:rounded-md"
            >
              <div className="space-y-2">
                <h3 className="font-sans text-white font-bold uppercase tracking-wider text-sm">Discards Highlighted Purchases</h3>
                <p className="text-stone-400 text-xs leading-relaxed font-sans">
                  Are you absolutely sure you want to permanently delete the <span className="text-white font-bold font-sans">{selectedPurchaseIds.length}</span> selected purchase logs?
                </p>
                <p className="text-stone-500 text-[11px] leading-relaxed font-sans">
                  Warning: This action will permanently remove these expenses from your calculations and reports. It cannot be undone.
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-[#262626] font-sans">
                <button
                  type="button"
                  onClick={() => setShowBulkDeleteConfirm(false)}
                  className="px-4 py-1.5 bg-[#1a1a1a] border border-[#2d2d2d] text-gray-300 hover:text-white hover:bg-[#232323] cursor-pointer text-xs rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleBulkDelete();
                    setShowBulkDeleteConfirm(false);
                  }}
                  className="px-4 py-1.5 bg-[#ee317b] hover:bg-[#d61e63] text-white font-bold cursor-pointer text-xs uppercase rounded-md"
                >
                  Delete Selected
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Move category item modal */}
      <AnimatePresence>
        {movingCategoryItem && (() => {
          const sourceCat = categories.find(c => c.id === movingCategoryItem.sourceCatId);
          const targetOptions = categories.filter(c => c.id !== movingCategoryItem.sourceCatId && !c.isDeleted);
          const selectedTarget = categories.find(c => c.id === movingCategoryItem.targetCatId);
          const affectedRows = purchases.filter(p =>
            (p.expenseCategory || '').toLowerCase() === (sourceCat?.name || '').toLowerCase() &&
            (p.itemOrService || '').toLowerCase() === movingCategoryItem.item.toLowerCase()
          ).length;

          return (
            <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/85 backdrop-blur-sm">
              <motion.div
                initial={{ y: 36, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 36, opacity: 0 }}
                className="bg-[#121212] border border-[#71b536]/40 md:max-w-md w-full p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:p-6 text-left space-y-4 rounded-t-2xl md:rounded-md"
              >
                <div className="space-y-2">
                  <h3 className="font-sans text-white font-bold uppercase tracking-wider text-sm">Move Category Item</h3>
                  <p className="text-stone-400 text-xs leading-relaxed font-sans">
                    Move <strong className="text-white">"{movingCategoryItem.item}"</strong> from <strong className="text-white">"{movingCategoryItem.sourceCategoryName}"</strong> to another category.
                  </p>
                  <p className="text-stone-500 text-[11px] leading-relaxed font-sans">
                    {affectedRows} existing purchase ledger row{affectedRows === 1 ? '' : 's'} will automatically change to the new category.
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">Target Category</label>
                  <select
                    value={movingCategoryItem.targetCatId}
                    onChange={(e) => setMovingCategoryItem(prev => prev ? { ...prev, targetCatId: e.target.value } : prev)}
                    className="w-full rounded-md border border-[#262626] bg-[#181818] px-3 py-2 text-sm font-bold text-white outline-none focus:border-[#71b536]"
                  >
                    {targetOptions.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  {selectedTarget?.items.some(item => item.toLowerCase() === movingCategoryItem.item.toLowerCase()) && (
                    <p className="mt-1 text-[10px] text-[#FBBF24]">
                      This item already exists in {selectedTarget.name}; the catalog will merge it there.
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-[#262626] font-sans">
                  <button
                    type="button"
                    onClick={() => setMovingCategoryItem(null)}
                    className="px-4 py-1.5 bg-[#1a1a1a] border border-[#2d2d2d] text-gray-300 hover:text-white hover:bg-[#232323] cursor-pointer text-xs rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmMoveCategoryItem}
                    className="px-4 py-1.5 bg-[#71b536] hover:bg-[#5a932a] text-white font-bold cursor-pointer text-xs uppercase rounded-md"
                  >
                    Move Item
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Confirmation modal for deleting a category item template */}
      <AnimatePresence>
        {deletingCategoryItem && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/85 backdrop-blur-sm">
            <motion.div
              initial={{ y: 36, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 36, opacity: 0 }}
              className="bg-[#121212] border border-[#ee317b]/40 md:max-w-md w-full p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:p-6 text-left space-y-4 rounded-t-2xl md:rounded-md"
            >
              <div className="space-y-2">
                <h3 className="font-sans text-white font-bold uppercase tracking-wider text-sm">Remove Category Item</h3>
                <p className="text-stone-400 text-xs leading-relaxed font-sans">
                  Are you sure you want to delete <strong className="text-white">"{deletingCategoryItem.item}"</strong> from <strong className="text-white">"{deletingCategoryItem.categoryName}"</strong>?
                </p>
                <p className="text-stone-500 text-[11px] leading-relaxed font-sans">
                  This only removes the item from the expense category template. Existing purchase ledger rows will stay unchanged.
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-[#262626] font-sans">
                <button
                  type="button"
                  onClick={() => setDeletingCategoryItem(null)}
                  className="px-4 py-1.5 bg-[#1a1a1a] border border-[#2d2d2d] text-gray-300 hover:text-white hover:bg-[#232323] cursor-pointer text-xs rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmDeleteCategoryItem(deletingCategoryItem.catId, deletingCategoryItem.item)}
                  className="px-4 py-1.5 bg-[#ee317b] hover:bg-[#d61e63] text-white font-bold cursor-pointer text-xs uppercase rounded-md"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Non-blocking custom delete modal for Expense Category */}
      <AnimatePresence>
        {deletingCategory && (() => {
          const isBound = purchases.some(p => p.expenseCategory === deletingCategory.name);
          return (
            <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/85 backdrop-blur-sm ">
              <motion.div
                initial={{ y: 36, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 36, opacity: 0 }}
                className="bg-[#121212] border border-[#ee317b]/40 md:max-w-md w-full p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:p-6 text-left space-y-4 rounded-t-2xl md:rounded-md"
              >
                <div className="space-y-2">
                  <h3 className="font-sans text-white font-bold uppercase tracking-wider text-sm">Remove Expense Category</h3>
                  <p className="text-stone-400 text-xs leading-relaxed font-sans">
                    Are you sure you want to delete the expense category <strong className="text-white">"{deletingCategory.name}"</strong>?
                  </p>
                  {isBound && (
                    <p className="text-rose-400 text-[11px] leading-relaxed font-sans">
                      ⚠️ ALERT: This category is currently referenced by existing purchase logs. Deleting this category will orphan those ledger lines and they will show up under default Uncategorized layout!
                    </p>
                  )}
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t border-[#262626] font-sans">
                  <button
                    type="button"
                    onClick={() => setDeletingCategory(null)}
                    className="px-4 py-1.5 bg-[#1a1a1a] border border-[#2d2d2d] text-gray-300 hover:text-white hover:bg-[#232323] cursor-pointer text-xs rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateCategories(categories.filter(c => c.id !== deletingCategory.id));
                      setDeletingCategory(null);
                    }}
                    className="px-4 py-1.5 bg-[#ee317b] hover:bg-[#d61e63] text-white font-bold cursor-pointer text-xs uppercase rounded-md"
                  >
                    Confirm Delete
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Drawer / Right Sliding Form Modal for Add (Batch Enabled) / Edit Purchase */}
      <AnimatePresence>
        {isFormOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-end overscroll-contain"
            onClick={() => setIsFormOpen(false)}
          >
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-[#121212] w-full max-w-2xl h-[100dvh] sm:h-full border-l border-[#262626] shadow-2xl overflow-hidden flex flex-col justify-between overscroll-contain"
              onClick={(e) => e.stopPropagation()}
            >
              
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#262626] bg-[#181818] flex-shrink-0">
                <div>
                  <h4 className="font-sans font-bold text-white text-sm uppercase">
                    {editingPurchase ? 'Edit Purchase Order' : 'Record Purchases Batch'}
                  </h4>
                </div>
                
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="p-1 text-gray-400 hover:text-white hover:bg-[#262626] rounded-md cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
                      {/* Form Inputs Container */}
               <div className="flex-1 p-4 sm:p-6 space-y-5 sm:space-y-6 overflow-y-auto overscroll-contain pb-4">
                
                {/* Batch Details Section */}
                <div className="bg-[#181818] border border-[#262626] p-3.5 sm:p-4 space-y-4 rounded-lg shadow-sm">
                  <h5 className="text-xs font-bold text-[#ee317b] uppercase tracking-wider flex items-center gap-1.5">
                    Batch Details
                  </h5>
 
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-stone-300 font-medium mb-1.5" htmlFor="purchase-date-input">Purchase Date</label>
                      <input
                        id="purchase-date-input"
                        type="date"
                        required
                        value={purchaseDate}
                        onChange={(e) => setPurchaseDate(e.target.value)}
                        className="w-full h-10 px-3 py-2 text-sm bg-[#121212] text-white border border-[#262626] focus:border-[#ee317b] focus:ring-1 focus:ring-[#ee317b] rounded-md outline-none font-sans transition-colors"
                      />
                    </div>
 
                    <div>
                      <label className="block text-xs text-stone-300 font-medium mb-1.5" htmlFor="payment-method-select">Paid From / Charge Ledger</label>
                      <SearchableSelect
                        id="payment-method-select"
                        value={paymentMethodId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPaymentMethodId(val);
                          const bank = bankAccounts.find(b => b.id === val);
                          if (bank) {
                            setPurchaseCurrency(bank.currency || 'ETB');
                          }
                        }}
                        className="w-full h-10 px-3 py-2 text-sm bg-[#121212] text-white border border-[#262626] focus:border-[#ee317b] focus:ring-1 focus:ring-[#ee317b] rounded-md outline-none font-sans transition-colors purchase-ledger-bank-select cursor-pointer"
                        inputClassName="text-left pl-1 pr-6 text-white"
                        placeholder="Select bank/cash..."
                      >
                        <option value="">Select bank/cash...</option>
                        {bankAccounts
                          .map((b) => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                      </SearchableSelect>
                    </div>
                  </div>
 
                  <div className="text-xs text-stone-400 flex items-center justify-between border-t border-[#262626] pt-3 mt-1">
                    <span>Recorded by: <span className="font-semibold text-stone-300">{recordedBy}</span></span>
                  </div>
                </div>
 
                {/* Add Item Section */}
                <div className="bg-[#181818] border border-[#262626] p-3.5 sm:p-4 space-y-4 rounded-lg shadow-sm relative">
                  <h5 className="text-xs font-bold text-[#ee317b] uppercase tracking-wider">
                    {editingPurchase ? 'Item Parameters' : 'Add Item'}
                  </h5>
 
                  <div className="relative">
                    <label className="block text-xs text-stone-300 font-medium mb-1.5" htmlFor="item-service-input">Item or Service Name</label>
                    <input
                      id="item-service-input"
                      type="text"
                      required
                      value={itemOrServiceInput}
                      onChange={(e) => handleItemInputChange(e.target.value)}
                      onFocus={() => setShowSuggestions(true)}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          if (!showSuggestions) {
                            setShowSuggestions(true);
                            return;
                          }
                          if (suggestionOptionCount > 0) {
                            setActiveSuggestionIndex(prev => (prev + 1) % suggestionOptionCount);
                          }
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          if (!showSuggestions) {
                            setShowSuggestions(true);
                            return;
                          }
                          if (suggestionOptionCount > 0) {
                            setActiveSuggestionIndex(prev => (prev - 1 + suggestionOptionCount) % suggestionOptionCount);
                          }
                        } else if (e.key === 'Enter') {
                          if (showSuggestions && suggestionOptionCount > 0) {
                            e.preventDefault();
                            selectActiveSuggestion();
                          }
                        } else if (e.key === 'Escape') {
                          if (showSuggestions) {
                            e.preventDefault();
                            setShowSuggestions(false);
                          }
                        }
                      }}
                      className="w-full h-10 px-3 py-2 text-sm bg-[#121212] text-white border border-[#262626] focus:border-[#ee317b] focus:ring-1 focus:ring-[#ee317b] rounded-md outline-none font-sans transition-colors"
                      placeholder="Type products (e.g. CMYK toner, Kraft backing...)"
                    />
                    <div className="mt-1.5 text-xs text-stone-400">
                      Category: <span className="text-[#ee317b] font-medium">{displayedItemCategory || 'Choose an item from the catalog'}</span>
                    </div>
 
                    {/* Suggestions Floating Popup */}
                    <AnimatePresence>
                      {showSuggestions && (filteredSuggestions.length > 0 || showCreateSuggestion) && (
                        <motion.div 
                          ref={suggestionRef}
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute left-0 right-0 top-[70px] bg-[#181818] border border-[#262626] z-50 max-h-[220px] overflow-y-auto divide-y divide-[#262626] shadow-xl cursor-pointer rounded-md"
                        >
                          {filteredSuggestions.map((sug, idx) => (
                            <div
                              key={idx}
                              ref={(node) => { suggestionOptionRefs.current[idx] = node; }}
                              onClick={() => handleSuggestionClick(sug.name, sug.categoryName)}
                              className={`px-3 py-2 text-xs text-white hover:bg-[#ee317b]/10 hover:text-[#ee317b] flex items-center justify-between font-sans font-medium ${activeSuggestionIndex === idx ? 'bg-[#ee317b]/10 text-[#ee317b]' : ''}`}
                            >
                              <span>{sug.name}</span>
                              <span className="text-[9px] text-[#ee317b] bg-[#ee317b]/10 px-1.5 py-0.5 border border-[#ee317b]/20 rounded lowercase">
                                {sug.categoryName}
                              </span>
                            </div>
                          ))}
 
                          {showCreateSuggestion && (
                            <div
                              ref={(node) => { suggestionOptionRefs.current[filteredSuggestions.length] = node; }}
                              onClick={handleTriggerAddNewItemFlow}
                              className={`px-3 py-2.5 bg-[#121212] hover:bg-[#262626] text-stone-300 font-sans text-xs flex items-center justify-between cursor-pointer border-t border-[#262626] ${activeSuggestionIndex === filteredSuggestions.length ? 'ring-1 ring-[#ee317b]/40' : ''}`}
                            >
                              <div className="flex items-center gap-1.5">
                                <PlusCircle className="w-4 h-4 text-[#ee317b]" />
                                <span>Create <strong className="text-[#ee317b]">"{itemOrServiceInput.trim()}"</strong> as a new item...</span>
                              </div>
                              <span className="text-[10px] text-[#ee317b] uppercase font-sans font-bold tracking-wider">Catalog Tool</span>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
 
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-stone-300 font-medium mb-1.5" htmlFor="quantity-input">Quantity</label>
                      <input
                        id="quantity-input"
                        type="text"
                        required
                        value={qtyInput}
                        onChange={(e) => {
                          const v = cleanLeadingZeros(e.target.value);
                          setQtyInput(v);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const res = parseFractionOrExpression(qtyInput);
                            setQtyInput(res.toString());
                          }
                        }}
                        className="w-full h-10 px-3 py-2 text-sm bg-[#121212] text-white border border-[#262626] focus:border-[#ee317b] focus:ring-1 focus:ring-[#ee317b] rounded-md outline-none font-sans transition-colors"
                        placeholder="0"
                      />
                    </div>
 
                    <div>
                      <label className="block text-xs text-stone-300 font-medium mb-1.5" htmlFor="unit-price-input">Unit Price</label>
                      <div className="flex -space-x-px">
                        <input
                          id="unit-price-input"
                          type="text"
                          required
                          value={unitPriceInput}
                          onChange={(e) => setUnitPriceInput(cleanLeadingZeros(e.target.value))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              setUnitPriceInput(parseFractionOrExpression(unitPriceInput).toString());
                            }
                          }}
                          className="w-full h-10 px-3 py-2 text-sm bg-[#121212] text-white border border-[#262626] focus:border-[#ee317b] focus:ring-1 focus:ring-[#ee317b] rounded-l-md rounded-r-none outline-none font-sans transition-colors flex-1 min-w-0"
                          placeholder="0.00 or 250 * 4"
                        />
                        <select
                          value={purchaseCurrency}
                          onChange={(e) => setPurchaseCurrency(e.target.value)}
                          className="bg-[#121212] border border-[#262626] text-white px-3 h-10 text-xs rounded-r-md outline-none focus:border-[#ee317b] focus:ring-1 focus:ring-[#ee317b] font-bold font-sans border-l-0 cursor-pointer"
                        >
                          <option value="">Select...</option>
                          {availableCurrencies.map(curr => (
                            <option key={curr} value={curr}>
                              {curr}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
 
                {/* Tax Section */}
                <div className="bg-[#181818] border border-[#262626] p-3.5 sm:p-4 space-y-4 rounded-lg shadow-sm">
                  <h5 className="text-xs font-bold text-[#ee317b] uppercase tracking-wider">
                    Tax
                  </h5>
 
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex items-center gap-3 px-3 py-2.5 bg-[#121212] border border-[#262626] rounded-md cursor-pointer shadow-xs hover:bg-[#262626] transition-colors">
                      <input
                        type="checkbox"
                        checked={hasVat}
                        onChange={(e) => setHasVat(e.target.checked)}
                        className="accent-[#ee317b] w-4 h-4 cursor-pointer rounded"
                      />
                      <div className="font-sans leading-tight">
                        <span className="text-xs font-semibold text-white block">Add 15% VAT</span>
                        <span className="text-[10px] text-stone-400 block">Value Added Tax</span>
                      </div>
                    </label>
 
                    <label className="flex items-center gap-3 px-3 py-2.5 bg-[#121212] border border-[#262626] rounded-md cursor-pointer shadow-xs hover:bg-[#262626] transition-colors">
                      <input
                        type="checkbox"
                        checked={hasWithholding}
                        onChange={(e) => setHasWithholding(e.target.checked)}
                        className="accent-[#ee317b] w-4 h-4 cursor-pointer rounded"
                      />
                      <div className="font-sans leading-tight">
                        <span className="text-xs font-semibold text-white block">Apply 3% withholding</span>
                        <span className="text-[10px] text-stone-400 block">Tax deduction</span>
                      </div>
                    </label>
                  </div>
                </div>
 
                {/* Notes Section */}
                <div className="bg-[#181818] border border-[#262626] p-3.5 sm:p-4 space-y-4 rounded-lg shadow-sm">
                  <h5 className="text-xs font-bold text-[#ee317b] uppercase tracking-wider">
                    Notes
                  </h5>
 
                  <div>
                    <textarea
                      value={notesOrDescription}
                      onChange={(e) => setNotesOrDescription(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 text-sm bg-[#121212] text-white border border-[#262626] focus:border-[#ee317b] focus:ring-1 focus:ring-[#ee317b] rounded-md outline-none font-sans transition-colors resize-none h-auto"
                      placeholder="Add manufacturer invoice number, roll weights, etc."
                    />
                  </div>
                </div>
 
                {/* BATCH OVERVIEW / PENDING SUMMARY BOX (Only in Add Mode) */}
                {!editingPurchase && pendingBatchItems.length > 0 && (
                  <div className="bg-[#181818] border border-[#262626] p-3.5 sm:p-4 space-y-3 rounded-lg shadow-sm">
                    <div className="flex justify-between items-center border-b border-[#262626] pb-2">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Calculator className="w-4 h-4 text-[#ee317b]" />
                        Reviewing Pending Batch Summary ({pendingBatchItems.length} Products)
                      </span>
                      
                      <button
                        type="button"
                        onClick={() => setPendingBatchItems([])}
                        className="text-[10px] text-rose-600 hover:text-rose-800 font-bold uppercase tracking-wider font-sans outline-none"
                      >
                        Clear batch
                      </button>
                    </div>
 
                    {/* Small Grid pending items spreadsheet */}
                    <div className="overflow-auto border border-[#262626] rounded-md text-xs font-sans bg-[#121212]">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#181818] text-stone-400 uppercase text-[9px] border-b border-[#262626]">
                            <th className="p-2">Item Product</th>
                            <th className="p-2 text-right">Qty</th>
                            <th className="p-2 text-right">Unit Price</th>
                            <th className="p-2 text-center">Taxes</th>
                            <th className="p-2 text-right">Net total</th>
                            <th className="p-2 text-center">Remove</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#262626] text-stone-300">
                          {pendingBatchItems.map((item, idx) => (
                            <tr key={item.tempId} className="hover:bg-[#262626]/40">
                              <td className="p-2 font-semibold text-white max-w-[120px] truncate" title={item.itemOrService}>
                                <span className="block truncate">{item.itemOrService}</span>
                                <span className="block text-[9px] font-normal text-pink-500 truncate">{item.expenseCategory}</span>
                              </td>
                              <td className="p-2 text-right text-white font-bold">{item.quantity}</td>
                              <td className="p-2 text-right text-stone-300">{item.unitPrice.toLocaleString()} {item.currency}</td>
                              <td className="p-2 text-center">
                                <div className="flex gap-1 justify-center text-[9px] font-bold">
                                  {item.hasVat && <span className="bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 px-1 rounded">V</span>}
                                  {item.hasWithholding && <span className="bg-rose-950/40 text-rose-400 border border-rose-900/40 px-1 rounded">W</span>}
                                </div>
                              </td>
                              <td className="p-2 text-right text-white font-bold">{item.totalPrice.toLocaleString()} {item.currency}</td>
                              <td className="p-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItemFromBatch(item.tempId)}
                                  className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
 
                    {/* Cumulative Pricing Mathematics */}
                    <div className="bg-[#121212] border border-[#262626] rounded-lg p-3 space-y-2 text-xs font-sans">
                      <div className="flex justify-between text-stone-300">
                        <span>Total Cumulative Base Amount:</span>
                        <span className="text-white font-bold">
                          {pendingBatchItems.reduce((acc, c) => acc + c.baseAmount, 0).toLocaleString()} {purchaseCurrency}
                        </span>
                      </div>
                      <div className="flex justify-between text-emerald-500 font-medium">
                        <span>Total Cumulative VAT Added (15%):</span>
                        <span>
                          +{pendingBatchItems.reduce((acc, c) => acc + c.vatAmount, 0).toLocaleString()} {purchaseCurrency}
                        </span>
                      </div>
                      <div className="flex justify-between text-rose-500 font-medium">
                        <span>Total Cumulative Supplier Withholding Deducted (3%):</span>
                        <span>
                          -{pendingBatchItems.reduce((acc, c) => acc + c.withholdingAmount, 0).toLocaleString()} {purchaseCurrency}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-[#262626] pt-2 text-sm font-extrabold text-[#ee317b]">
                        <span>NET CHARGES TO CHARGE LEDGER BANK:</span>
                        <span>
                          {pendingBatchItems.reduce((acc, c) => acc + c.totalPrice, 0).toLocaleString()} {purchaseCurrency}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
 
              </div>
 
              {/* Sticky Bottom Section */}
              <div className="border-t border-[#262626] bg-[#181818] flex flex-col flex-shrink-0 shadow-lg z-10">
                {/* Compact Purchase Summary */}
                <div className="px-4 pt-3 pb-2 border-b border-[#262626] font-sans text-xs space-y-1">
                  <div className="flex justify-between text-stone-300">
                    <span className="font-medium">Base Purchase Total:</span>
                    <span className="font-semibold text-white">{baseAmount.toLocaleString()} {purchaseCurrency}</span>
                  </div>
                  {hasVat && vatAmount > 0 && (
                    <div className="flex justify-between text-stone-300">
                      <span className="font-medium">VAT (15%):</span>
                      <span className="font-semibold text-emerald-500">+{vatAmount.toLocaleString()} {purchaseCurrency}</span>
                    </div>
                  )}
                  {hasWithholding && withholdingAmount > 0 && (
                    <div className="flex justify-between text-stone-300">
                      <span className="font-medium">Withholding (3%):</span>
                      <span className="font-semibold text-rose-500 font-mono">-{withholdingAmount.toLocaleString()} {purchaseCurrency}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-[#ee317b]">
                    <span>Net charged to bank:</span>
                    <span>{currentCalculatedTotalPrice.toLocaleString()} {purchaseCurrency}</span>
                  </div>
                </div>
 
                {/* Add Item to Batch Button (Only show in Add Mode) */}
                {!editingPurchase && (
                  <div className="px-4 pt-2">
                    <button
                      type="button"
                      onClick={handleAddCurrentRowToBatch}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-sans font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5 rounded-md transition-all shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Add Item to Batch
                    </button>
                  </div>
                )}
 
                {/* Cancel / Save to Ledger Buttons */}
                <div className="px-4 py-3 bg-[#181818] flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="flex-1 px-4 py-2 bg-transparent text-stone-300 hover:text-white text-xs font-sans font-semibold cursor-pointer border border-[#262626] hover:bg-[#262626] rounded-md transition-colors text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePurchase}
                    className="flex-1 px-5 py-2 bg-[#ee317b] hover:bg-[#d61e63] text-white text-xs font-sans font-bold cursor-pointer rounded-md transition-colors shadow-sm text-center"
                  >
                    {editingPurchase 
                      ? 'Update Purchase' 
                      : pendingBatchItems.length > 0 || itemOrServiceInput.trim() !== ''
                        ? `Save to Ledger (${pendingBatchItems.length + (itemOrServiceInput.trim() !== '' ? 1 : 0)} items)`
                        : 'Save to Ledger'
                    }
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dynamic Pop-up Dialog to Add New Item to Catalog */}
      <AnimatePresence>
        {addingNewItemFromSearch !== null && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121212] border border-[#262626] max-w-md w-full p-6 text-left space-y-5 shadow-2xl rounded-md animate-fadeIn"
            >
              <div>
                <h3 className="font-sans text-white font-bold uppercase tracking-wider text-sm flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-[#ee317b]" />
                  Add New Item to Catalog
                </h3>
                <p className="text-gray-400 text-[11px] leading-relaxed font-sans mt-1">
                  You are registering <strong className="text-[#ee317b]">"{addingNewItemFromSearch}"</strong> to the business catalog. Assign it to an expense category below.
                </p>
              </div>

              <div className="space-y-4">
                {/* Category Option Selector Mode Toggle */}
                <div className="flex gap-4 border-b border-[#262626] pb-2 text-xs font-sans">
                  <label className="flex items-center gap-1.5 cursor-pointer text-white">
                    <input
                      type="radio"
                      checked={!isNewCategoryModeInModal}
                      onChange={() => setIsNewCategoryModeInModal(false)}
                      className="accent-[#ee317b]"
                    />
                    Choose Existing Category
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-white">
                    <input
                      type="radio"
                      checked={isNewCategoryModeInModal}
                      onChange={() => setIsNewCategoryModeInModal(true)}
                      className="accent-[#ee317b]"
                    />
                    + Create New Category
                  </label>
                </div>

                {!isNewCategoryModeInModal ? (
                  <div>
                    <label className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1.5 font-bold">Select Category</label>
                    <SearchableSelect
                      value={newItemTargetCategory}
                      onChange={(e) => setNewItemTargetCategory(e.target.value)}
                      className="w-full px-2.5 py-2 text-xs bg-[#121212] text-white border border-[#262626] focus:border-[#ee317b] rounded-md outline-none cursor-pointer"
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </SearchableSelect>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1.5 font-bold">New Category Name</label>
                    <input
                      type="text"
                      required
                      value={modalNewCategoryName}
                      onChange={(e) => setModalNewCategoryName(e.target.value)}
                      placeholder="e.g. Licensing & Compliance"
                      className="w-full px-2.5 py-2 text-xs bg-[#121212] text-white border border-[#262626] focus:border-[#ee317b] rounded-md outline-none font-sans"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#262626] font-sans">
                <button
                  type="button"
                  onClick={() => setAddingNewItemFromSearch(null)}
                  className="px-4 py-1.5 bg-[#181818] border border-[#262626] text-gray-300 hover:text-white cursor-pointer text-xs rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNewItemFromSearch}
                  className="px-4 py-1.5 bg-[#ee317b] hover:bg-[#d61e63] text-white font-bold cursor-pointer text-xs uppercase rounded-md"
                >
                  Save Item
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMobileFilters && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileFilters(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-[#121212] border-t border-[#262626] rounded-t-xl z-50 p-4 md:hidden pb-10"
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-400 font-bold text-[11px] uppercase tracking-wider">Ledger Options</span>
                <button onClick={() => setShowMobileFilters(false)} className="p-1 text-gray-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Category</label>
                  <SearchableSelect
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="w-full bg-[#181818] border border-[#262626] text-white rounded-md text-xs"
                  >
                    <option value="All">All Categories</option>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </SearchableSelect>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Account</label>
                  <SearchableSelect
                    value={selectedBankFilter}
                    onChange={(e) => setSelectedBankFilter(e.target.value)}
                    className="w-full bg-[#181818] border border-[#262626] text-white rounded-md text-xs"
                  >
                    <option value="All">All Bank Methods</option>
                    {bankAccounts.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </SearchableSelect>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Recorded By</label>
                  <SearchableSelect
                    value={selectedRecordedByFilter}
                    onChange={(e) => setSelectedRecordedByFilter(e.target.value)}
                    className="w-full bg-[#181818] border border-[#262626] text-white rounded-md text-xs"
                  >
                    <option value="All">All Recorders</option>
                    {recordedByOptions.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </SearchableSelect>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Date Interval</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={expenseIntervalStart}
                      onChange={(e) => setExpenseIntervalStart(e.target.value)}
                      className="min-w-0 bg-[#181818] border border-[#262626] text-white rounded-md text-xs px-2 py-2 outline-none"
                      title="From date"
                    />
                    <input
                      type="date"
                      value={expenseIntervalEnd}
                      onChange={(e) => setExpenseIntervalEnd(e.target.value)}
                      className="min-w-0 bg-[#181818] border border-[#262626] text-white rounded-md text-xs px-2 py-2 outline-none"
                      title="To date"
                    />
                  </div>
                </div>
                {activeLedgerFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategoryFilter('All');
                      setSelectedBankFilter('All');
                      setSelectedRecordedByFilter('All');
                      setExpenseIntervalStart('');
                      setExpenseIntervalEnd('');
                    }}
                    className="w-full py-2 bg-[#ee317b]/10 text-[#ee317b] hover:bg-[#ee317b]/20 rounded-md font-bold text-xs transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <FloatingAddButton
        onClick={financeView === 'loans' ? () => openAddLoanForm('given') : handleOpenAddForm}
        title={financeView === 'loans' ? 'Add loan' : 'Add bulk purchases'}
      />

    </div>
  );
}
