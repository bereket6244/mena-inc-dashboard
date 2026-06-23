import React, { useState, useEffect, useRef } from 'react';
import { 
  Database, 
  TrendingUp, 
  Users, 
  Package, 
  RefreshCw, 
  Clock,
  Wifi,
  CloudLightning,
  LogOut,
  Lock,
  Shield,
  UserPlus,
  Eye,
  EyeOff,
  X,
  User,
  Sun,
  Moon,
  Download,
  Smartphone,
  Share2,
  Search,
  Menu,
  FolderDown,
  Type,
  MoreVertical,
  Printer,
  Sliders,
  Upload
} from 'lucide-react';
import { exportAllDataToExcel, parseAppDataImportFile, AppDataImportBundle } from './utils/excelExport';
import { sendDailyTelegramBackup } from './utils/telegramBackup';
import { resolveStockId } from './utils';
import SearchableSelect from './components/SearchableSelect';
import { 
  Customer, 
  PaperStock, 
  DEFAULT_PAPER_STOCKS, 
  INITIAL_CUSTOMERS,
  EmployeeUser,
  DEFAULT_USERS,
  BankAccount,
  DEFAULT_BANK_ACCOUNTS,
  Purchase,
  ExpenseCategory,
  INITIAL_EXPENSE_CATEGORIES,
  INITIAL_PURCHASES,
  ProductType,
  DEFAULT_PRODUCT_TYPES,
  ClientType,
  DEFAULT_CLIENT_TYPES,
  AuditLogEntry,
  Loan,
  INITIAL_LOANS
} from './types';
import { motion, AnimatePresence } from 'motion/react';
import InventoryTab from './components/InventoryTab';
import PerformanceTab from './components/PerformanceTab';
import CustomerTab from './components/CustomerTab';
import PurchasesTab from './components/PurchasesTab';

const LOCAL_STORAGE_STOCKS_KEY = 'mena_inc_stocks_v3';
const LOCAL_STORAGE_CUSTOMERS_KEY = 'mena_inc_customers_v3';
const LOCAL_STORAGE_BANKS_KEY = 'mena_inc_bank_accounts_v4';
const LOCAL_STORAGE_PURCHASES_KEY = 'mena_inc_purchases_v2';
const LOCAL_STORAGE_LOANS_KEY = 'mena_inc_loans_v1';
const LOCAL_STORAGE_CATEGORIES_KEY = 'mena_inc_categories_v2';
const LOCAL_STORAGE_PRODUCT_TYPES_KEY = 'mena_inc_product_types_v3';
const LOCAL_STORAGE_CLIENT_TYPES_KEY = 'mena_inc_client_types_v1';
const LOCAL_STORAGE_AUDIT_LOGS_KEY = 'mena_inc_audit_logs_v1';
const TAB_SCROLL_STORAGE_KEY = 'mena_inc_tab_scroll_positions_v1';
const TAB_SCROLL_TTL_MS = 5 * 60 * 1000;
type AppTab = 'customers' | 'inventory' | 'performance' | 'purchases';
type GlobalSearchTarget = {
  type: 'customer' | 'stock' | 'purchase' | 'bank';
  id: string;
  nonce: number;
};
type GlobalSearchItem = {
  id: string;
  title: string;
  source: string;
  destination?: string;
  detail?: string;
  hint?: string;
  disabled?: boolean;
  action: () => void;
};

export default function App() {
  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('mena_inc_theme_v3') as 'dark' | 'light') || 'dark';
  });

  // Font size state
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>(() => {
    return (localStorage.getItem('mena_inc_font_size') as 'sm' | 'base' | 'lg') || 'base';
  });

  // Density state
  const [density, setDensity] = useState<'compact' | 'standard' | 'relaxed'>(() => {
    return (localStorage.getItem('mena_inc_density') as 'compact' | 'standard' | 'relaxed') || 'standard';
  });

  useEffect(() => {
    if (fontSize === 'sm') document.documentElement.style.fontSize = '14px';
    else if (fontSize === 'lg') document.documentElement.style.fontSize = '18px';
    else document.documentElement.style.fontSize = '16px';
    localStorage.setItem('mena_inc_font_size', fontSize);
  }, [fontSize]);

  useEffect(() => {
    document.body.classList.remove('density-compact', 'density-standard', 'density-relaxed');
    document.body.classList.add(`density-${density}`);
    localStorage.setItem('mena_inc_density', density);
  }, [density]);

  useEffect(() => {
    const faviconHref = theme === 'light' ? '/mena-favicon-light.png' : '/mena-favicon-dark.png';
    const themeColor = theme === 'light' ? '#f5f0e8' : '#0A0A0A';
    const faviconLinks = document.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="shortcut icon"]');
    faviconLinks.forEach(link => {
      link.href = faviconHref;
    });
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', themeColor);

    if (theme === 'light') {
      document.body.classList.add('light-theme');
      document.documentElement.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
      document.documentElement.classList.remove('light-theme');
    }
    localStorage.setItem('mena_inc_theme_v3', theme);
  }, [theme]);

  // 1. "i want the customer management to be first" -> tab defaults to 'customers'
  const [activeTab, setActiveTab] = useState<AppTab>('customers');
  const activeTabRef = useRef<AppTab>('customers');
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandSearch, setCommandSearch] = useState('');
  const [globalSearchTarget, setGlobalSearchTarget] = useState<GlobalSearchTarget | null>(null);
  const gShortcutTimerRef = useRef<number | null>(null);
  const globalSearchHighlightFrameRef = useRef<number | null>(null);

  const getTabScrollElement = (tab: AppTab): HTMLElement | null => {
    const selectors: Record<AppTab, string[]> = {
      customers: [
        '#customers-tab-pnl .customer-gallery-scroll:not(.hidden)',
        '#customers-tab-pnl .data-table-scroll',
        '#customers-tab-pnl',
      ],
      inventory: [
        '#inventory-tab-pnl .shared-gallery-scroll:not(.hidden)',
        '#inventory-tab-pnl .data-table-scroll',
        '#inventory-tab-pnl',
      ],
      purchases: [
        '#purchases-tab-pnl .data-table-scroll',
        '#purchases-tab-pnl',
      ],
      performance: [
        '#performance-tab-pnl',
      ],
    };

    for (const selector of selectors[tab]) {
      const element = document.querySelector<HTMLElement>(selector);
      if (element) return element;
    }
    return null;
  };

  const readSavedTabScroll = () => {
    try {
      return JSON.parse(localStorage.getItem(TAB_SCROLL_STORAGE_KEY) || '{}') as Record<AppTab, { top: number; left: number; savedAt: number }>;
    } catch (_) {
      return {} as Record<AppTab, { top: number; left: number; savedAt: number }>;
    }
  };

  const saveTabScroll = (tab: AppTab) => {
    const element = getTabScrollElement(tab);
    if (!element) return;
    const saved = readSavedTabScroll();
    saved[tab] = {
      top: element.scrollTop,
      left: element.scrollLeft,
      savedAt: Date.now(),
    };
    localStorage.setItem(TAB_SCROLL_STORAGE_KEY, JSON.stringify(saved));
  };

  const changeTab = (tab: AppTab) => {
    if (tab === activeTabRef.current) return;
    saveTabScroll(activeTabRef.current);
    setActiveTab(tab);
  };

  const highlightGlobalSearchTarget = (target: Omit<GlobalSearchTarget, 'nonce'>) => {
    if (globalSearchHighlightFrameRef.current) {
      window.cancelAnimationFrame(globalSearchHighlightFrameRef.current);
    }
    setGlobalSearchTarget(null);
    globalSearchHighlightFrameRef.current = window.requestAnimationFrame(() => {
      setGlobalSearchTarget({ ...target, nonce: Date.now() });
      globalSearchHighlightFrameRef.current = null;
    });
  };

  const dispatchShortcut = (name: string) => {
    window.dispatchEvent(new CustomEvent(`mena:${name}`, { detail: { tab: activeTabRef.current } }));
  };

  const focusCurrentTabSearch = () => {
    window.dispatchEvent(new CustomEvent('mena:focus-search', { detail: { tab: activeTabRef.current } }));
  };

  const openTabSearch = (tab: AppTab) => {
    changeTab(tab);
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('mena:focus-search', { detail: { tab } }));
    }, 80);
  };

  const navigateFromReportsSummary = (target: 'customers' | 'customers-debt' | 'purchases') => {
    if (target === 'purchases') {
      changeTab('purchases');
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent('mena:purchases-clear-filters'));
      }, 80);
      return;
    }
    changeTab('customers');
    window.setTimeout(() => {
      if (target === 'customers-debt') {
        window.dispatchEvent(new CustomEvent('mena:customer-filter-debt'));
      } else {
        window.dispatchEvent(new CustomEvent('mena:customer-clear-filters'));
      }
    }, 80);
  };

  const isEditableShortcutTarget = (target: EventTarget | null) => {
    const element = target as HTMLElement | null;
    if (!element) return false;
    return Boolean(element.closest('input, textarea, select, [contenteditable="true"]'));
  };

  useEffect(() => {
    activeTabRef.current = activeTab;
    const saved = readSavedTabScroll()[activeTab];
    if (!saved || Date.now() - saved.savedAt > TAB_SCROLL_TTL_MS) return;

    const restore = () => {
      const element = getTabScrollElement(activeTab);
      if (!element) return;
      element.scrollTo({ top: saved.top, left: saved.left, behavior: 'auto' });
    };

    const frame = window.requestAnimationFrame(() => {
      restore();
      window.setTimeout(restore, 80);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeTab]);

  useEffect(() => {
    if (!globalSearchTarget) return;

    const scrollToTarget = () => {
      const element = document.querySelector<HTMLElement>(`[data-global-search-id="${globalSearchTarget.type}-${globalSearchTarget.id}"]`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    };

    const frame = window.requestAnimationFrame(() => {
      scrollToTarget();
      window.setTimeout(scrollToTarget, 120);
    });
    const timeout = window.setTimeout(() => {
      setGlobalSearchTarget(current => current?.nonce === globalSearchTarget.nonce ? null : current);
    }, 3500);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [globalSearchTarget, activeTab]);

  useEffect(() => {
    const handlePageHide = () => saveTabScroll(activeTabRef.current);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      if (globalSearchHighlightFrameRef.current) {
        window.cancelAnimationFrame(globalSearchHighlightFrameRef.current);
      }
    };
  }, []);

  const [showGlobalProforma, setShowGlobalProforma] = useState(false);
  const [paperStocks, setPaperStocks] = useState<PaperStock[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_STOCKS_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch (_) {}
    }
    return DEFAULT_PAPER_STOCKS;
  });
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_CUSTOMERS_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch (_) {}
    }
    return INITIAL_CUSTOMERS;
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_BANKS_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch (_) {}
    }
    return DEFAULT_BANK_ACCOUNTS;
  });
  const [purchases, setPurchases] = useState<Purchase[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_PURCHASES_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch (_) {}
    }
    return INITIAL_PURCHASES;
  });
  const [loans, setLoans] = useState<Loan[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_LOANS_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch (_) {}
    }
    return INITIAL_LOANS;
  });
  const [categories, setCategories] = useState<ExpenseCategory[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_CATEGORIES_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch (_) {}
    }
    return INITIAL_EXPENSE_CATEGORIES;
  });
  const [productTypes, setProductTypes] = useState<ProductType[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_PRODUCT_TYPES_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch (_) {}
    }
    return DEFAULT_PRODUCT_TYPES;
  });
  const [clientTypes, setClientTypes] = useState<ClientType[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_CLIENT_TYPES_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch (_) {}
    }
    return DEFAULT_CLIENT_TYPES;
  });
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_AUDIT_LOGS_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch (_) {}
    }
    return [];
  });
  const [liveDbLinked, setLiveDbLinked] = useState(false);
  const [showDbConfigModal, setShowDbConfigModal] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [dataLoadComplete, setDataLoadComplete] = useState(false);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const appDataImportInputRef = useRef<HTMLInputElement>(null);
  const telegramBackupAttemptDateRef = useRef('');

  // Login & RBAC personnel state
  const [employees, setEmployees] = useState<EmployeeUser[]>(() => {
    const saved = localStorage.getItem('mena_inc_employees_v3');
    if (saved) {
      try { return JSON.parse(saved); } catch (_) {}
    }
    return DEFAULT_USERS;
  });
  const [currentUser, setCurrentUser] = useState<EmployeeUser | null>(() => {
    const saved = localStorage.getItem('mena_inc_current_user_v3');
    if (saved) {
      try { return JSON.parse(saved); } catch (_) {}
    }
    return null;
  });
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [tempDbUrl, setTempDbUrl] = useState(() => (import.meta as any).env?.VITE_SUPABASE_URL || '');
  const [tempDbKey, setTempDbKey] = useState(() => (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '');
  const [installGuideTab, setInstallGuideTab] = useState<'ios' | 'android'>('android');
  const [dbValidationError, setDbValidationError] = useState<string | null>(null);

  const hasTabAccess = (tab: AppTab) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    if (!currentUser.allowedTabs) return true; // legacy support
    return currentUser.allowedTabs.includes(tab);
  };

  useEffect(() => {
    if (currentUser && !hasTabAccess(activeTab)) {
      const allowed = (['customers', 'inventory', 'purchases', 'performance'] as const).find(t => hasTabAccess(t));
      if (allowed) changeTab(allowed);
    }
  }, [currentUser, activeTab]);
  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isIOSDevice) {
      setInstallGuideTab('ios');
    } else {
      setInstallGuideTab('android');
    }
  }, []);

  // Internet connectivity monitoring (Telegram-style indicator)
  const [isOnline, setIsOnline] = useState(true);
  useEffect(() => {
    setIsOnline(window.navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Progressive Web App (PWA) installation parameters & handlers
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallGuideModal, setShowInstallGuideModal] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  // Native/custom download helper function for Android & iOS PWA triggering
  const triggerPwaInstall = async () => {
    if (deferredPrompt) {
      // Must execute prompt() synchronously in the exact call stack of the user gesture
      try {
        deferredPrompt.prompt();
      } catch (err) {
        console.error("Installation prompting failed:", err);
        setShowInstallGuideModal(true);
        return;
      }
      
      // Await outcome separately after prompt has been shown
      try {
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User installation outcome: ${outcome}`);
        setDeferredPrompt(null);
        setShowInstallGuideModal(false);
      } catch (err) {
        console.error("Failed to read userChoice:", err);
      }
    } else {
      setShowInstallGuideModal(true);
    }
  };

  // 30-second deletion undo states & timer integration
  const [deletedHistory, setDeletedHistory] = useState<{
    type: 'customer' | 'bulk-customers' | 'bank' | 'stock' | 'employee' | 'loan' | 'bulk-loans';
    data: any;
    timestamp: number;
  } | null>(null);
  const [undoCountdown, setUndoCountdown] = useState<number>(30);
  useEffect(() => {
    if (!deletedHistory) return;
    setUndoCountdown(30);
    const interval = setInterval(() => {
      setUndoCountdown(prev => {
        if (prev <= 1) {
          setDeletedHistory(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [deletedHistory]);

  // Operator security session variables
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // New staff creation form variables
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffUser, setNewStaffUser] = useState('');
  const [newStaffPass, setNewStaffPass] = useState('');
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'admin' | 'employee'>('employee');
  const [newStaffAllowedTabs, setNewStaffAllowedTabs] = useState<('customers' | 'inventory' | 'performance' | 'purchases')[]>(['customers', 'inventory', 'performance', 'purchases']);
  const [staffError, setStaffError] = useState('');
  const [editingEmployee, setEditingEmployee] = useState<EmployeeUser | null>(null);
  const [pendingDeleteEmployee, setPendingDeleteEmployee] = useState<EmployeeUser | null>(null);
  const [showAuditLogModal, setShowAuditLogModal] = useState(false);
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [auditFilterType, setAuditFilterType] = useState('All');
  const activeEmployees = employees.filter(emp => !emp.isDeleted);
  const getAuditActor = () => currentUser?.name || currentUser?.username || 'system';
  const getStaffDisplayName = (actor?: string) => {
    if (!actor) return 'Unknown staff';
    const matched = employees.find(emp =>
      emp.name === actor ||
      emp.username === actor ||
      emp.id === actor
    );
    return matched?.name || actor;
  };
  const logAuditEntry = (entry: Omit<AuditLogEntry, 'id' | 'performedBy' | 'performedAt'> & Partial<Pick<AuditLogEntry, 'performedBy' | 'performedAt'>>) => {
    const performedAt = entry.performedAt || new Date().toISOString();
    const normalizedEntry = normalizeAuditEntryForStorage(entry);
    const auditEntry: AuditLogEntry = {
      ...normalizedEntry,
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      performedBy: getStaffDisplayName(normalizedEntry.performedBy || getAuditActor()),
      performedAt
    };

    setAuditLogs(prev => {
      const next = [auditEntry, ...prev].slice(0, 1000);
      localStorage.setItem(LOCAL_STORAGE_AUDIT_LOGS_KEY, JSON.stringify(next));
      return next;
    });

    import('./lib/dbService').then(({ saveAuditLogDoc }) => {
      saveAuditLogDoc(auditEntry).catch(() => {});
    }).catch(() => {});
  };

  const getChangedFieldNames = (previous: Record<string, any>, next: Record<string, any>, ignoredFields: string[] = []) => {
    const ignored = new Set(['isDeleted', 'deletedBy', ...ignoredFields]);
    const isEmptyAuditValue = (value: any) => (
      value === undefined ||
      value === null ||
      value === '' ||
      (Array.isArray(value) && value.length === 0)
    );
    const areAuditValuesEqual = (previousValue: any, nextValue: any) => {
      if (isEmptyAuditValue(previousValue) && isEmptyAuditValue(nextValue)) return true;
      if (isEmptyAuditValue(previousValue) && (nextValue === false || nextValue === 0)) return true;
      if (isEmptyAuditValue(nextValue) && (previousValue === false || previousValue === 0)) return true;
      return JSON.stringify(previousValue ?? null) === JSON.stringify(nextValue ?? null);
    };
    return Array.from(new Set([...Object.keys(previous || {}), ...Object.keys(next || {})]))
      .filter(field => !ignored.has(field))
      .filter(field => !areAuditValuesEqual(previous?.[field], next?.[field]));
  };

  const summarizeAuditObject = (value: Record<string, any>): string => {
    const primary =
      value.clientName ||
      value.itemOrService ||
      value.personName ||
      value.bankAccountName ||
      value.name ||
      value.username ||
      value.productType ||
      value.expenseCategory ||
      value.accountNumber;
    const secondaryParts = [
      value.quantity !== undefined ? `qty ${value.quantity}` : '',
      value.totalPrice !== undefined ? `${value.totalPrice} ${value.currency || ''}`.trim() : '',
      value.purchaseDate || value.deliveryDate || value.loanDate || value.editedAt || ''
    ].filter(Boolean);
    if (primary) return secondaryParts.length ? `${primary} (${secondaryParts.join(', ')})` : String(primary);
    return JSON.stringify(value);
  };

  const stockIdAuditFields = new Set([
    'paperType1',
    'paperType1Id',
    'paperType2',
    'paperType2Id',
    'paperType3',
    'paperType3Id',
    'entrancePaper',
    'entrancePaperId',
    'ajabiPaper',
    'ajabiPaperId'
  ]);
  const bankIdAuditFields = new Set(['paymentMethodId', 'bankRemainingId', 'remainingBank', 'bankAccountId']);
  const staffAuditFields = new Set(['performedBy', 'recordedBy', 'editedBy', 'deletedBy', 'purchasedBy', 'orderTakenBy']);

  const resolveKnownAuditRecordValue = (value: any): string | null => {
    if (value === undefined || value === null || value === '') return null;
    const stringValue = String(value);
    const matchers: Array<[Array<Record<string, any>>, string[]]> = [
      [paperStocks, ['name']],
      [bankAccounts, ['name']],
      [customers, ['clientName']],
      [purchases, ['itemOrService']],
      [loans, ['personName']],
      [categories, ['name']],
      [employees, ['name']],
      [productTypes, ['name']],
      [clientTypes, ['name']]
    ];

    for (const [collection, labelFields] of matchers) {
      const matched = collection.find(item => item.id === stringValue || item.username === stringValue);
      if (matched) {
        const label = labelFields.map(field => matched[field]).find(Boolean);
        return label ? String(label) : summarizeAuditObject(matched);
      }
    }

    for (const loan of loans) {
      const matchedPayment = (loan.payments || []).find(payment => payment.id === stringValue);
      if (matchedPayment) {
        const bankName = bankAccounts.find(bank => bank.id === matchedPayment.paymentMethodId)?.name || 'payment account';
        return `Payment on ${matchedPayment.paymentDate} (${matchedPayment.amount} ${loan.currency || 'ETB'} via ${bankName})`;
      }
    }
    return null;
  };

  const isDatabaseIdLike = (value: any) => (
    typeof value === 'string' &&
    /^[a-z][a-z0-9]*[-_][a-z0-9-]{6,}$/i.test(value.trim())
  );

  const getAuditEntityTypeLabel = (entityType: string) => (
    ({
      p: 'Paper stock',
      c: 'Customer',
      b: 'Bank account',
      loan: 'Loan',
      lp: 'Loan payment',
      lc: 'Lead channel'
    }[entityType] || getAuditFieldLabel(entityType))
      .replace(/\b\w/g, char => char.toUpperCase())
  );

  const sanitizeAuditText = (value: string) => (
    value.replace(/\b[a-z][a-z0-9]*[-_][a-z0-9-]{6,}\b/gi, token => (
      resolveKnownAuditRecordValue(token) || `${getAuditEntityTypeLabel(token.split(/[-_]/)[0] || 'record')} record`
    ))
  );

  const resolveAuditReferenceValue = (field: string, value: any): string | null => {
    if (value === undefined || value === null || value === '') return null;
    const stringValue = String(value);
    if (stockIdAuditFields.has(field)) {
      if (stringValue === 'None') return 'Empty';
      return paperStocks.find(stock => stock.id === stringValue)?.name || resolveKnownAuditRecordValue(stringValue) || (isDatabaseIdLike(stringValue) ? 'Paper stock record' : stringValue);
    }
    if (bankIdAuditFields.has(field)) {
      return bankAccounts.find(bank => bank.id === stringValue)?.name || resolveKnownAuditRecordValue(stringValue) || (isDatabaseIdLike(stringValue) ? 'Bank account record' : stringValue);
    }
    if (staffAuditFields.has(field)) {
      return getStaffDisplayName(stringValue);
    }
    const knownRecordValue = resolveKnownAuditRecordValue(stringValue);
    if (knownRecordValue) return knownRecordValue;
    return null;
  };

  const formatAuditValue = (value: any): string => {
    if (value === undefined || value === null || value === '') return 'Empty';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) {
      if (value.length === 0) return 'Empty';
      return value.map(item => {
        if (item === undefined || item === null || item === '') return 'Empty';
        if (typeof item === 'object') return summarizeAuditObject(item);
        return String(item);
      }).join(', ');
    }
    if (typeof value === 'object') return summarizeAuditObject(value);
    return String(value);
  };

  const formatAuditFieldValue = (field: string, value: any): string => (
    resolveAuditReferenceValue(field, value) || formatAuditValue(value)
  );

  const auditFieldLabels: Record<string, string> = {
    clientName: 'Client name',
    phone: 'Phone number',
    acquisitionSource: 'Lead source',
    orderTakenBy: 'Agent',
    productType: 'Product',
    quantity: 'Quantity',
    unitPrice: 'Unit price',
    baseUnitPrice: 'Base unit price',
    isVatAdded: 'VAT added',
    totalPrice: 'Total price',
    currency: 'Currency',
    deliveryDate: 'Delivery date',
    advancePaymentDate: 'Advance payment date',
    bankRemainingId: 'Remaining bank',
    paymentMethodId: 'Payment bank',
    paperType1: 'Paper type 1',
    paperType1Id: 'Paper type 1',
    paperType2: 'Paper type 2',
    paperType2Id: 'Paper type 2',
    paperType3: 'Paper type 3',
    paperType3Id: 'Paper type 3',
    entrancePaper: 'Entrance paper',
    entrancePaperId: 'Entrance paper',
    ajabiPaper: 'Ajabi paper',
    ajabiPaperId: 'Ajabi paper',
    expenseCategory: 'Expense category',
    purchaseDate: 'Purchase date',
    itemOrService: 'Item or service',
    initialStock: 'Stock quantity',
    initialBalance: 'Current balance',
    accountNumber: 'Account number',
    name: 'Name',
    username: 'Username',
    role: 'Role',
    allowedTabs: 'Allowed tabs',
    items: 'Items',
    amount: 'Amount',
    adjustmentType: 'Adjustment type',
    previousInitialBalance: 'Previous balance',
    newInitialBalance: 'New balance',
    changedFields: 'Changed fields'
  };

  const getAuditFieldLabel = (field: string) => (
    auditFieldLabels[field] ||
    field
      .replace(/Id$/, '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' ')
      .replace(/^./, char => char.toUpperCase())
  );

  const normalizeAuditFieldToken = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
  const auditFieldAliases: Record<string, string> = {
    papertype1: 'paperType1Id',
    papertype2: 'paperType2Id',
    papertype3: 'paperType3Id',
    entrancepaper: 'entrancePaperId',
    ajabipaper: 'ajabiPaperId',
    paymentbank: 'paymentMethodId',
    remainingbank: 'bankRemainingId'
  };

  const getAuditFieldFromLabel = (label: string) => {
    const normalizedLabel = normalizeAuditFieldToken(label);
    if (auditFieldAliases[normalizedLabel]) return auditFieldAliases[normalizedLabel];
    return Object.entries(auditFieldLabels).find(([field, displayLabel]) => (
      normalizeAuditFieldToken(field) === normalizedLabel ||
      normalizeAuditFieldToken(displayLabel) === normalizedLabel
    ))?.[0] || label;
  };

  const getResolvedAuditEntityLabel = (log: AuditLogEntry) => {
    const savedLabel = (log.entityLabel || '').trim();
    if (savedLabel && savedLabel !== log.entityId && !isDatabaseIdLike(savedLabel)) return sanitizeAuditText(savedLabel);

    const collectionsByEntity: Record<string, Array<Record<string, any>>> = {
      customer: customers,
      stock: paperStocks,
      bank_account: bankAccounts,
      purchase: purchases,
      loan: loans,
      expense_category: categories,
      staff: employees,
      employee: employees,
      product_type: productTypes,
      client_type: clientTypes
    };
    const matched = collectionsByEntity[log.entityType]?.find(item => item.id === log.entityId || item.username === log.entityId);
    if (matched) return summarizeAuditObject(matched);
    const resolvedFromKnownRecords = resolveKnownAuditRecordValue(log.entityId) || resolveKnownAuditRecordValue(savedLabel);
    if (resolvedFromKnownRecords) return resolvedFromKnownRecords;
    const fallback = savedLabel || log.entityId;
    return isDatabaseIdLike(fallback) ? `${getAuditEntityTypeLabel(log.entityType)} record` : sanitizeAuditText(fallback);
  };

  const getResolvedAuditAction = (log: AuditLogEntry) => {
    const label = getResolvedAuditEntityLabel(log);
    const savedLabel = (log.entityLabel || '').trim();
    if (!log.action) return log.action;
    if (label === log.entityId) return sanitizeAuditText(log.action);
    if (savedLabel && savedLabel !== log.entityId) return sanitizeAuditText(log.action);
    return sanitizeAuditText(log.action.replaceAll(log.entityId, label));
  };

  const normalizeChangedFieldsForAuditStorage = (changedFields: any) => {
    if (typeof changedFields !== 'string') return changedFields;
    return changedFields
      .split(',')
      .map(field => field.trim())
      .filter(Boolean)
      .map(field => getAuditFieldLabel(getAuditFieldFromLabel(field)))
      .join(', ');
  };

  const normalizeAuditDetailValueForStorage = (field: string, value: any): any => {
    if (value === undefined || value === null || value === '') return value;
    if (field === 'changedFields') return normalizeChangedFieldsForAuditStorage(value);
    if (Array.isArray(value)) {
      return value.map(item => typeof item === 'object' && item !== null ? summarizeAuditObject(item) : formatAuditFieldValue(field, item));
    }
    if (typeof value === 'object') return summarizeAuditObject(value);
    return sanitizeAuditText(formatAuditFieldValue(getAuditFieldFromLabel(field), value));
  };

  const normalizeAuditDetailsForStorage = (details?: Record<string, any>) => {
    if (!details) return details;
    return Object.fromEntries(
      Object.entries(details).map(([key, value]) => [key, normalizeAuditDetailValueForStorage(key, value)])
    );
  };

  const normalizeAuditEntryForStorage = (
    entry: Omit<AuditLogEntry, 'id' | 'performedBy' | 'performedAt'> & Partial<Pick<AuditLogEntry, 'performedBy' | 'performedAt'>>
  ) => {
    const entityLabel = entry.entityLabel || resolveKnownAuditRecordValue(entry.entityId) || entry.entityId;
    const sanitizedEntityLabel = sanitizeAuditText(entityLabel);
    return {
      ...entry,
      entityId: sanitizedEntityLabel,
      entityLabel: sanitizedEntityLabel,
      action: sanitizeAuditText(entry.action),
      details: normalizeAuditDetailsForStorage(entry.details)
    };
  };

  const buildEditDetail = (changedFields: string[], previous?: Record<string, any>, next?: Record<string, any>) => {
    if (previous && next) {
      return changedFields
        .map(field => `${getAuditFieldLabel(field)} changed from ${formatAuditFieldValue(field, previous[field])} to ${formatAuditFieldValue(field, next[field])}`)
        .join('; ');
    }
    return changedFields.length === 1
      ? `Changed ${getAuditFieldLabel(changedFields[0])}`
      : `Changed ${changedFields.map(getAuditFieldLabel).join(', ')}`;
  };

  const prettifyAuditDetailText = (detail: string) => (
    detail
      .split(';')
      .map(part => {
        const trimmed = part.trim();
        const readableMatch = trimmed.match(/^(.+?)\s+changed from\s+(.*?)\s+to\s+(.*)$/i);
        if (readableMatch) {
          const [, label, before, after] = readableMatch;
          const field = getAuditFieldFromLabel(label);
          return `${getAuditFieldLabel(field)} changed from ${formatAuditFieldValue(field, before)} to ${formatAuditFieldValue(field, after)}`;
        }
        const match = trimmed.match(/^([A-Za-z0-9_]+):\s*(.*?)\s*->\s*(.*)$/);
        if (!match) return trimmed;
        const [, field, before, after] = match;
        return `${getAuditFieldLabel(field)} changed from ${formatAuditFieldValue(field, before) || 'Empty'} to ${formatAuditFieldValue(field, after) || 'Empty'}`;
      })
      .filter(Boolean)
      .join('; ')
  );

  const getLeadChannelsForBackup = () => {
    try {
      const saved = localStorage.getItem('mena_inc_acquisition_channels_v3');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed.filter(channel => typeof channel === 'string') : [];
    } catch (_) {
      return [];
    }
  };

  const mergeRecordsByKey = <T extends Record<string, any>>(current: T[], imported: T[], fallbackKey: keyof T | string = 'name') => {
    const getKey = (item: T) => String(item.id || item.username || item[fallbackKey] || '').trim().toLowerCase();
    const next = [...current];
    const indexByKey = new Map<string, number>();
    next.forEach((item, index) => {
      const key = getKey(item);
      if (key) indexByKey.set(key, index);
    });
    imported.forEach(item => {
      const key = getKey(item);
      if (!key) {
        next.push(item);
        return;
      }
      const existingIndex = indexByKey.get(key);
      if (existingIndex === undefined) {
        indexByKey.set(key, next.length);
        next.push(item);
      } else {
        next[existingIndex] = { ...next[existingIndex], ...item };
      }
    });
    return next;
  };

  const importAppDataBundle = async (bundle: AppDataImportBundle) => {
    const importedCounts: string[] = [];
    const countImported = (label: string, items?: any[]) => {
      if (items?.length) importedCounts.push(`${items.length} ${label}`);
    };

    if (bundle.paperStocks?.length) {
      const next = mergeRecordsByKey(paperStocks, bundle.paperStocks);
      setPaperStocks(next);
      localStorage.setItem(LOCAL_STORAGE_STOCKS_KEY, JSON.stringify(next));
      countImported('paper stocks', bundle.paperStocks);
    }
    if (bundle.customers?.length) {
      const next = mergeRecordsByKey(customers, bundle.customers, 'clientName');
      setCustomers(next);
      localStorage.setItem(LOCAL_STORAGE_CUSTOMERS_KEY, JSON.stringify(next));
      countImported('customers', bundle.customers);
    }
    if (bundle.bankAccounts?.length) {
      const next = mergeRecordsByKey(bankAccounts, bundle.bankAccounts);
      setBankAccounts(next);
      localStorage.setItem(LOCAL_STORAGE_BANKS_KEY, JSON.stringify(next));
      countImported('bank accounts', bundle.bankAccounts);
    }
    if (bundle.purchases?.length) {
      const next = mergeRecordsByKey(purchases, bundle.purchases, 'itemOrService');
      setPurchases(next);
      localStorage.setItem(LOCAL_STORAGE_PURCHASES_KEY, JSON.stringify(next));
      countImported('purchases', bundle.purchases);
    }
    if (bundle.loans?.length) {
      const next = mergeRecordsByKey(loans, bundle.loans, 'personName');
      setLoans(next);
      localStorage.setItem(LOCAL_STORAGE_LOANS_KEY, JSON.stringify(next));
      countImported('loans', bundle.loans);
    }
    if (bundle.categories?.length) {
      const next = mergeRecordsByKey(categories, bundle.categories);
      setCategories(next);
      localStorage.setItem(LOCAL_STORAGE_CATEGORIES_KEY, JSON.stringify(next));
      countImported('categories', bundle.categories);
    }
    if (bundle.productTypes?.length) {
      const next = mergeRecordsByKey(productTypes, bundle.productTypes);
      setProductTypes(next);
      localStorage.setItem(LOCAL_STORAGE_PRODUCT_TYPES_KEY, JSON.stringify(next));
      countImported('product types', bundle.productTypes);
    }
    if (bundle.clientTypes?.length) {
      const next = mergeRecordsByKey(clientTypes, bundle.clientTypes);
      setClientTypes(next);
      localStorage.setItem(LOCAL_STORAGE_CLIENT_TYPES_KEY, JSON.stringify(next));
      countImported('client types', bundle.clientTypes);
    }
    if (bundle.employees?.length) {
      const next = mergeRecordsByKey(employees, bundle.employees, 'username');
      setEmployees(next);
      localStorage.setItem('mena_inc_employees_v3', JSON.stringify(next));
      countImported('staff records', bundle.employees);
    }
    if (bundle.auditLogs?.length) {
      const next = mergeRecordsByKey(auditLogs, bundle.auditLogs);
      setAuditLogs(next);
      localStorage.setItem(LOCAL_STORAGE_AUDIT_LOGS_KEY, JSON.stringify(next));
      countImported('audit logs', bundle.auditLogs);
    }
    if (bundle.leadChannels?.length) {
      const next = Array.from(new Set([...getLeadChannelsForBackup(), ...bundle.leadChannels].map(channel => channel.trim()).filter(Boolean)));
      localStorage.setItem('mena_inc_acquisition_channels_v3', JSON.stringify(next));
      countImported('lead channels', bundle.leadChannels);
    }

    try {
      const {
        savePaperStockDoc,
        saveCustomerDoc,
        saveBankAccountDoc,
        savePurchaseDoc,
        saveLoanDoc,
        saveExpenseCategoryDoc,
        saveProductTypeDoc,
        saveClientTypeDoc,
        saveEmployeeDoc,
        saveAuditLogDoc,
        saveLeadChannelDoc
      } = await import('./lib/dbService');
      await Promise.allSettled([
        ...(bundle.paperStocks || []).map(item => savePaperStockDoc(item)),
        ...(bundle.customers || []).map(item => saveCustomerDoc(item)),
        ...(bundle.bankAccounts || []).map(item => saveBankAccountDoc(item)),
        ...(bundle.purchases || []).map(item => savePurchaseDoc(item)),
        ...(bundle.loans || []).map(item => saveLoanDoc(item)),
        ...(bundle.categories || []).map(item => saveExpenseCategoryDoc(item)),
        ...(bundle.productTypes || []).map(item => saveProductTypeDoc(item)),
        ...(bundle.clientTypes || []).map(item => saveClientTypeDoc(item)),
        ...(bundle.employees || []).map(item => saveEmployeeDoc(item)),
        ...(bundle.auditLogs || []).map(item => saveAuditLogDoc(item)),
        ...(bundle.leadChannels || []).map(item => saveLeadChannelDoc(item))
      ]);
    } catch (_) {}

    if (importedCounts.length === 0) {
      alert('No importable app data was found in that file.');
      return;
    }
    alert(`Import complete: ${importedCounts.join(', ')}.`);
    logAuditEntry({
      eventType: 'staff_update',
      entityType: 'app_data',
      entityId: 'App data import',
      entityLabel: 'App data import',
      action: `Imported app data from CSV/XLSX`,
      details: { imported: importedCounts.join(', ') }
    });
  };

  const handleImportAppDataFile = async (file?: File | null) => {
    if (!file) return;
    if (!window.confirm('Import this file into the app? Matching records will be updated and new records will be added.')) return;
    setIsBuffering(true);
    try {
      const bundle = await parseAppDataImportFile(file);
      await importAppDataBundle(bundle);
    } catch (err: any) {
      alert(`Import failed: ${err?.message || String(err)}`);
    } finally {
      setIsBuffering(false);
      if (appDataImportInputRef.current) appDataImportInputRef.current.value = '';
    }
  };

  const isOrderCompleted = (customer?: Customer | null) => Boolean(customer?.deliveryDate);
  const commandItems: GlobalSearchItem[] = currentUser ? [
    { id: 'command-search', title: 'Focus search', source: 'Command', detail: 'Focus the search field inside the current tab', hint: '/', action: () => focusCurrentTabSearch() },
    { id: 'command-new', title: 'New record in current tab', source: 'Command', detail: 'Open the create form for the active section', hint: 'Ctrl N', action: () => dispatchShortcut('new-record') },
    { id: 'command-customers', title: 'Go to Customers', source: 'Command', destination: 'Customers', hint: 'Ctrl 1', action: () => changeTab('customers'), disabled: !hasTabAccess('customers') },
    { id: 'command-inventory', title: 'Go to Inventory', source: 'Command', destination: 'Inventory', hint: 'Ctrl 2', action: () => changeTab('inventory'), disabled: !hasTabAccess('inventory') },
    { id: 'command-purchases', title: 'Go to Purchases', source: 'Command', destination: 'Purchases', hint: 'Ctrl 3', action: () => changeTab('purchases'), disabled: !hasTabAccess('purchases') },
    { id: 'command-performance', title: 'Go to Reports', source: 'Command', destination: 'Reports', hint: 'Ctrl 4', action: () => changeTab('performance'), disabled: !hasTabAccess('performance') },
    { id: 'command-search-purchases', title: 'Search Purchases Ledger', source: 'Command', destination: 'Purchases', detail: 'Open Purchases and focus the ledger search', hint: 'Ctrl F', action: () => openTabSearch('purchases'), disabled: !hasTabAccess('purchases') },
    { id: 'command-search-reports', title: 'Search Reports', source: 'Command', destination: 'Reports', detail: 'Open Reports and focus the reports search', hint: 'Ctrl F', action: () => openTabSearch('performance'), disabled: !hasTabAccess('performance') },
    { id: 'command-theme', title: `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`, source: 'Command', action: () => setTheme(prev => prev === 'dark' ? 'light' : 'dark') },
    { id: 'command-proforma', title: 'Open standalone proforma tool', source: 'Command', detail: 'Open the proforma workspace', action: () => setShowGlobalProforma(true) },
    { id: 'command-staff', title: 'Manage staff settings', source: 'Command', destination: 'Staff Settings', action: () => setShowStaffModal(true), disabled: currentUser.role !== 'admin' },
    { id: 'command-audit-log', title: 'Open audit log', source: 'Command', destination: 'Audit Log', detail: 'Review deletions, staff edits, adjustments, purchases, and completions', action: () => setShowAuditLogModal(true), disabled: currentUser.role !== 'admin' },
    {
      id: 'command-export',
      title: 'Export all data',
      source: 'Command',
      detail: 'Download every app table, including audit logs and import-safe raw sheets',
      action: () => {
        const getBankName = (id?: string) => bankAccounts.find(b => b.id === id)?.name || 'CBE / System Default';
        exportAllDataToExcel(customers, purchases, bankAccounts, paperStocks, getBankName, {
          categories,
          loans,
          productTypes,
          clientTypes,
          employees,
          auditLogs,
          leadChannels: getLeadChannelsForBackup()
        });
      },
      disabled: currentUser.role !== 'admin'
    },
    {
      id: 'command-import',
      title: 'Import CSV or backup',
      source: 'Command',
      detail: 'Import a full backup workbook or a CSV from a raw app-data sheet',
      action: () => appDataImportInputRef.current?.click(),
      disabled: currentUser.role !== 'admin'
    },
    { id: 'command-install', title: 'Install app / open install guide', source: 'Command', detail: 'Show phone installation options', action: triggerPwaInstall },
  ].filter(item => !item.disabled) : [];

  const commandQuery = commandSearch.trim().toLowerCase();
  const wordsMatch = (values: Array<string | number | undefined | null>) => {
    if (!commandQuery) return true;
    const haystack = values.filter(value => value !== undefined && value !== null).join(' ').toLowerCase();
    return commandQuery.split(/\s+/).every(word => haystack.includes(word));
  };
  const openSearchResult = (tab: AppTab, target?: Omit<GlobalSearchTarget, 'nonce'>) => {
    changeTab(tab);
    if (target) {
      highlightGlobalSearchTarget(target);
    }
  };
  const getBankName = (id?: string) => bankAccounts.find(bank => bank.id === id)?.name || 'Unassigned account';
  const globalDataItems: GlobalSearchItem[] = currentUser && commandQuery ? [
    ...(hasTabAccess('customers') ? customers
      .filter(customer => !customer.isDeleted && wordsMatch([
        customer.clientName,
        customer.phone,
        customer.productType,
        customer.clientType,
        customer.acquisitionSource,
        customer.orderTakenBy,
        customer.paperType1,
        customer.paperType2,
        customer.paperType3,
        customer.entrancePaper,
        customer.ajabiPaper,
        customer.currency,
        customer.id,
      ]))
      .map(customer => ({
        id: `customer-${customer.id}`,
        title: customer.clientName || 'Unnamed customer',
        source: 'Customer',
        destination: 'Customers',
        detail: `${customer.productType || 'Order'}${customer.phone ? ` · ${customer.phone}` : ''}${customer.orderTakenBy ? ` · ${customer.orderTakenBy}` : ''}`,
        action: () => openSearchResult('customers', { type: 'customer', id: customer.id }),
      })) : []),
    ...(hasTabAccess('inventory') ? paperStocks
      .filter(stock => !stock.isDeleted && wordsMatch([stock.name, stock.initialStock, stock.id]))
      .map(stock => ({
        id: `stock-${stock.id}`,
        title: stock.name || 'Unnamed stock',
        source: 'Inventory',
        destination: 'Inventory',
        detail: `Initial stock: ${stock.initialStock}`,
        action: () => openSearchResult('inventory', { type: 'stock', id: stock.id }),
      })) : []),
    ...(hasTabAccess('purchases') ? purchases
      .filter(purchase => !purchase.isDeleted && wordsMatch([
        purchase.itemOrService,
        purchase.expenseCategory,
        purchase.purchasedBy,
        purchase.recordedBy,
        purchase.notesOrDescription,
        purchase.purchaseDate,
        purchase.currency,
        purchase.totalPrice,
        getBankName(purchase.paymentMethodId),
        purchase.id,
      ]))
      .map(purchase => ({
        id: `purchase-${purchase.id}`,
        title: purchase.itemOrService || 'Unnamed purchase',
        source: 'Purchase',
        destination: 'Purchases',
        detail: `${purchase.expenseCategory || 'Expense'} · ${purchase.totalPrice.toLocaleString()} ${purchase.currency || ''}${purchase.purchaseDate ? ` · ${purchase.purchaseDate}` : ''}`,
        action: () => openSearchResult('purchases', { type: 'purchase', id: purchase.id }),
      })) : []),
    ...(hasTabAccess('performance') ? bankAccounts
      .filter(bank => !bank.isDeleted && wordsMatch([bank.name, bank.accountNumber, bank.currency, bank.initialBalance, bank.id]))
      .map(bank => ({
        id: `bank-${bank.id}`,
        title: bank.name || 'Unnamed bank account',
        source: 'Bank Account',
        destination: 'Reports',
        detail: `${bank.currency || 'ETB'}${bank.accountNumber ? ` · ${bank.accountNumber}` : ''}`,
        action: () => openSearchResult('performance', { type: 'bank', id: bank.id }),
      })) : []),
    ...(hasTabAccess('purchases') ? categories
      .filter(category => !category.isDeleted && wordsMatch([category.name, ...(category.items || []), category.id]))
      .map(category => ({
        id: `category-${category.id}`,
        title: category.name || 'Unnamed category',
        source: 'Expense Category',
        destination: 'Purchases',
        detail: category.items?.length ? `${category.items.length} linked items` : 'Purchase category',
        action: () => openSearchResult('purchases'),
      })) : []),
    ...(hasTabAccess('customers') ? productTypes
      .filter(product => !product.isDeleted && wordsMatch([product.name, product.id]))
      .map(product => ({
        id: `product-${product.id}`,
        title: product.name || 'Unnamed product type',
        source: 'Product Type',
        destination: 'Customers',
        detail: 'Customer order product option',
        action: () => openSearchResult('customers'),
      })) : []),
    ...(hasTabAccess('customers') ? clientTypes
      .filter(clientType => !clientType.isDeleted && wordsMatch([clientType.name, clientType.id]))
      .map(clientType => ({
        id: `client-type-${clientType.id}`,
        title: clientType.name || 'Unnamed client type',
        source: 'Client Type',
        destination: 'Customers',
        detail: 'Customer classification option',
        action: () => openSearchResult('customers'),
      })) : []),
    ...(currentUser.role === 'admin' ? activeEmployees
      .filter(employee => wordsMatch([employee.name, employee.username, employee.role, ...(employee.allowedTabs || []), employee.id]))
      .map(employee => ({
        id: `employee-${employee.id || employee.username}`,
        title: employee.name || employee.username,
        source: 'Staff',
        destination: 'Staff Settings',
        detail: `@${employee.username} · ${employee.role}`,
        action: () => setShowStaffModal(true),
      })) : []),
  ].slice(0, 60) : [];

  const paletteItems: GlobalSearchItem[] = [
    ...commandItems.filter(item => wordsMatch([item.title, item.source, item.destination, item.detail, item.hint])),
    ...globalDataItems,
  ];

  const runCommand = (action: () => void) => {
    setShowCommandPalette(false);
    setCommandSearch('');
    action();
  };

  useEffect(() => {
    const tabByNumber: Record<string, AppTab> = {
      '1': 'customers',
      '2': 'inventory',
      '3': 'purchases',
      '4': 'performance',
    };
    const tabByGoKey: Record<string, AppTab> = {
      c: 'customers',
      i: 'inventory',
      r: 'performance',
      p: 'purchases',
    };

    const handleGlobalShortcuts = (event: KeyboardEvent) => {
      if (!currentUser || event.defaultPrevented) return;
      const key = event.key.toLowerCase();
      const modifier = event.metaKey || event.ctrlKey;
      const targetIsEditable = isEditableShortcutTarget(event.target);

      if (modifier && key === 'k') {
        event.preventDefault();
        setCommandSearch('');
        setShowCommandPalette(true);
        return;
      }

      if (modifier && tabByNumber[event.key]) {
        event.preventDefault();
        const tab = tabByNumber[event.key];
        if (hasTabAccess(tab)) changeTab(tab);
        return;
      }

      if (!modifier && key === 'g' && !targetIsEditable) {
        event.preventDefault();
        if (gShortcutTimerRef.current) window.clearTimeout(gShortcutTimerRef.current);
        gShortcutTimerRef.current = window.setTimeout(() => {
          gShortcutTimerRef.current = null;
        }, 900);
        return;
      }

      if (!modifier && gShortcutTimerRef.current && tabByGoKey[key] && !targetIsEditable) {
        event.preventDefault();
        window.clearTimeout(gShortcutTimerRef.current);
        gShortcutTimerRef.current = null;
        const tab = tabByGoKey[key];
        if (hasTabAccess(tab)) changeTab(tab);
        return;
      }

      if ((key === '/' || (modifier && key === 'f')) && !targetIsEditable) {
        event.preventDefault();
        focusCurrentTabSearch();
        return;
      }

      if (modifier && key === 'n') {
        event.preventDefault();
        dispatchShortcut('new-record');
        return;
      }

      if (modifier && key === 'a' && !targetIsEditable) {
        event.preventDefault();
        dispatchShortcut('select-all-visible');
        return;
      }

      if ((key === 'delete' || key === 'backspace') && !targetIsEditable) {
        event.preventDefault();
        dispatchShortcut('delete-selected');
        return;
      }

      if (modifier && key === 'c' && !targetIsEditable) {
        event.preventDefault();
        dispatchShortcut('copy-selected');
        return;
      }

      if (modifier && key === 'enter' && !targetIsEditable) {
        event.preventDefault();
        dispatchShortcut('primary-selected-action');
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => {
      window.removeEventListener('keydown', handleGlobalShortcuts);
      if (gShortcutTimerRef.current) {
        window.clearTimeout(gShortcutTimerRef.current);
      }
    };
  }, [currentUser, activeTab, employees]);

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.key !== 'Escape') return;

      if (isMobileMenuOpen) {
        event.preventDefault();
        setIsMobileMenuOpen(false);
      } else if (showCommandPalette) {
        event.preventDefault();
        setShowCommandPalette(false);
      } else if (showStaffModal) {
        event.preventDefault();
        setShowStaffModal(false);
        setEditingEmployee(null);
      } else if (showAuditLogModal) {
        event.preventDefault();
        setShowAuditLogModal(false);
      } else if (showDbConfigModal) {
        event.preventDefault();
        setShowDbConfigModal(false);
      } else if (showInstallGuideModal) {
        event.preventDefault();
        setShowInstallGuideModal(false);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isMobileMenuOpen, showCommandPalette, showStaffModal, showAuditLogModal, showDbConfigModal, showInstallGuideModal]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [isMobileMenuOpen]);

  // Save and restore scroll behaviors natively without gesture locks.

  // Apply saved row & column sizes automatically via MutationObserver
  useEffect(() => {
    const applySavedTableSizes = () => {
      try {
        const savedSizesStr = localStorage.getItem('mena_inc_table_sizes');
        if (!savedSizesStr) return;
        const savedSizes = JSON.parse(savedSizesStr);

        // Apply column widths
        const ths = document.querySelectorAll('.freeze-pane-table th');
        ths.forEach((th: any) => {
          const table = th.closest('table');
          if (!table) return;
          const tableId = table.id || table.className.split(' ').find((c: string) => c.includes('table')) || 'default';
          const colIndex = th.cellIndex;
          const headerText = th.textContent?.trim() || String(colIndex);
          const colKey = `${tableId}-col-${headerText}`;

          if (savedSizes[colKey] !== undefined) {
            const width = savedSizes[colKey];
            th.style.width = `${width}px`;
            th.style.minWidth = `${width}px`;
            th.style.maxWidth = `${width}px`;

            Array.from(table.rows).forEach((row: any) => {
              const cell = row.cells[colIndex];
              if (cell) {
                cell.style.width = `${width}px`;
                cell.style.minWidth = `${width}px`;
                cell.style.maxWidth = `${width}px`;
              }
            });

            // Update sticky column CSS custom properties dynamically to prevent overlap
            if (colIndex === 0) {
              table.style.setProperty('--freeze-col-1', `${width}px`);
            } else if (colIndex === 1) {
              table.style.setProperty('--freeze-col-2', `${width}px`);
            } else if (colIndex === 2) {
              table.style.setProperty('--freeze-col-3', `${width}px`);
            }
          }
        });

        // Apply row heights
        const trs = document.querySelectorAll('.freeze-pane-table tbody tr');
        trs.forEach((tr: any, rowIndex) => {
          const table = tr.closest('table');
          if (!table) return;
          const tableId = table.id || table.className.split(' ').find((c: string) => c.includes('table')) || 'default';
          const rowKey = `${tableId}-row-${rowIndex}`;

          if (savedSizes[rowKey] !== undefined) {
            const height = savedSizes[rowKey];
            tr.style.height = `${height}px`;
            Array.from(tr.cells).forEach((cell: any) => {
              cell.style.height = `${height}px`;
            });
          }
        });
      } catch (err) {
        console.error('Error applying saved table sizes:', err);
      }
    };

    // Auto-load dimensions and register MutationObserver
    applySavedTableSizes();
    const observer = new MutationObserver(() => {
      applySavedTableSizes();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleCreateStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffUser.trim() || !newStaffPass.trim()) {
      setStaffError('Please fill out all registration inputs.');
      return;
    }

    if (editingEmployee) {
      // Check if username is changing and already exists for another user
      if (
        newStaffUser.trim().toLowerCase() !== editingEmployee.username.toLowerCase() &&
        employees.some(emp => emp.username.toLowerCase() === newStaffUser.trim().toLowerCase())
      ) {
        setStaffError('Username already exists on record.');
        return;
      }

      // Update existing employee
      const updatedEmp: EmployeeUser = {
        id: editingEmployee.id,
        name: newStaffName.trim(),
        username: newStaffUser.trim().toLowerCase(),
        password: newStaffPass,
        role: newStaffRole,
        allowedTabs: newStaffRole === 'employee' ? newStaffAllowedTabs : undefined
      };

      const updatedEmployees = employees.map(emp => {
        if (emp.id === editingEmployee.id) {
          return updatedEmp;
        }
        return emp;
      });

      setEmployees(updatedEmployees);
      localStorage.setItem('mena_inc_employees_v3', JSON.stringify(updatedEmployees));

      // Sync updated employee to live database
      import('./lib/dbService').then(({ saveEmployeeDoc }) => {
        saveEmployeeDoc(updatedEmp).catch(() => {});
      }).catch(() => {});

      // If we edited the currently logged-in user, update their session state!
      if (currentUser && currentUser.id === editingEmployee.id) {
        const updatedCurrentUser = updatedEmp;
        setCurrentUser(updatedCurrentUser);
        localStorage.setItem('mena_inc_current_user_v3', JSON.stringify(updatedCurrentUser));
      }

      const staffChangedFields = getChangedFieldNames(editingEmployee, updatedEmp, ['password']);
      const didChangePassword = editingEmployee.password !== updatedEmp.password;
      const staffReason = staffChangedFields.length > 0
        ? buildEditDetail(staffChangedFields, editingEmployee, updatedEmp)
        : didChangePassword
          ? 'Changed credential'
          : '';
      if (staffReason) {
        logAuditEntry({
          eventType: 'staff_update',
          entityType: 'staff',
          entityId: updatedEmp.id,
          entityLabel: updatedEmp.name,
          action: `Updated staff member ${updatedEmp.name}`,
          details: {
            detail: staffReason,
            changedFields: [
              ...staffChangedFields,
              ...(didChangePassword ? ['credential'] : [])
            ].join(', '),
            previous: {
              name: editingEmployee.name,
              username: editingEmployee.username,
              role: editingEmployee.role,
              allowedTabs: editingEmployee.allowedTabs || []
            },
            next: {
              name: updatedEmp.name,
              username: updatedEmp.username,
              role: updatedEmp.role,
              allowedTabs: updatedEmp.allowedTabs || []
            }
          }
        });
      }

      setEditingEmployee(null);
      setNewStaffName('');
      setNewStaffUser('');
      setNewStaffPass('');
      setNewStaffRole('employee');
      setNewStaffAllowedTabs(['customers', 'inventory', 'performance', 'purchases']);
      setStaffError('');
      alert('Changes saved! The database has been updated with their new module access permissions.');
    } else {
      // Create new employee
      if (employees.some(emp => emp.username.toLowerCase() === newStaffUser.trim().toLowerCase())) {
        setStaffError('Username already exists on record.');
        return;
      }
      const newWorker: EmployeeUser = {
        id: 'emp-' + Math.random().toString(36).substring(2, 9),
        username: newStaffUser.trim().toLowerCase(),
        password: newStaffPass,
        name: newStaffName.trim(),
        role: newStaffRole,
        allowedTabs: newStaffRole === 'employee' ? newStaffAllowedTabs : undefined
      };
      handleAddNewEmployee(newWorker);
      logAuditEntry({
        eventType: 'staff_create',
        entityType: 'staff',
        entityId: newWorker.id,
        entityLabel: newWorker.name,
        action: `Created staff member ${newWorker.name}`,
        details: {
          username: newWorker.username,
          role: newWorker.role,
          allowedTabs: newWorker.allowedTabs || []
        }
      });
      setNewStaffName('');
      setNewStaffUser('');
      setNewStaffPass('');
      setNewStaffRole('employee');
      setNewStaffAllowedTabs(['customers', 'inventory', 'performance', 'purchases']);
      setStaffError('');
      alert(`Changes saved! The database has been updated. Successfully registered "${newWorker.name}" as ${newWorker.role} with selected module access.`);
    }
  };

  const handleStartEditEmployee = (emp: EmployeeUser) => {
    setEditingEmployee(emp);
    setNewStaffName(emp.name);
    setNewStaffUser(emp.username);
    setNewStaffPass(emp.password || '');
    setNewStaffRole(emp.role);
    setNewStaffAllowedTabs(emp.allowedTabs || ['customers', 'inventory', 'performance', 'purchases']);
    setStaffError('');
  };

  const handleCancelEditEmployee = () => {
    setEditingEmployee(null);
    setNewStaffName('');
    setNewStaffUser('');
    setNewStaffPass('');
    setNewStaffRole('employee');
    setNewStaffAllowedTabs(['customers', 'inventory', 'performance', 'purchases']);
    setStaffError('');
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Hardcoded emergency fallback admin access
    if (usernameInput.trim() === 'admin6244' && passwordInput === 'admin6244') {
      const fallbackAdmin: EmployeeUser = {
        id: 'fallback_admin_id_6244',
        name: 'Super Admin',
        username: 'admin6244',
        password: 'admin6244', // not usually needed in state, but mapped here
        role: 'admin',
        allowedTabs: ['customers', 'inventory', 'performance', 'purchases']
      };
      setCurrentUser(fallbackAdmin);
      localStorage.setItem('mena_inc_current_user_v3', JSON.stringify(fallbackAdmin));
      setLoginError('');
      setUsernameInput('');
      setPasswordInput('');
      return;
    }

    // 2. Standard login via database
    const user = employees.find(
      emp => emp.username.toLowerCase() === usernameInput.trim().toLowerCase()
    );
    if (user && user.password === passwordInput) {
      setCurrentUser(user);
      localStorage.setItem('mena_inc_current_user_v3', JSON.stringify(user));
      setLoginError('');
      setUsernameInput('');
      setPasswordInput('');
    } else {
      setLoginError('Invalid registered username or password. Review credentials.');
    }
  };

  // Load from LocalStorage and synchronizing with Real Cloud Firestore if configured
  const loadData = async (isBackgroundRefresh = false) => {
    if (!isBackgroundRefresh) {
      setIsBuffering(true);
      setDataLoadComplete(false);
    }
    try {
      // Load and seed employees
      const savedEmployees = localStorage.getItem('mena_inc_employees_v3');
      let initialEmployees = DEFAULT_USERS;
      if (savedEmployees) {
        try {
          initialEmployees = JSON.parse(savedEmployees);
        } catch (_) {}
      }
      if (!isBackgroundRefresh) setEmployees(initialEmployees);

      // Load active login session
      if (!isBackgroundRefresh) {
        const savedUser = localStorage.getItem('mena_inc_current_user_v3');
        if (savedUser) {
          try {
            setCurrentUser(JSON.parse(savedUser));
          } catch (_) {}
        }
      }

      const savedStocks = localStorage.getItem(LOCAL_STORAGE_STOCKS_KEY);
      const savedCustomers = localStorage.getItem(LOCAL_STORAGE_CUSTOMERS_KEY);
      const savedBanks = localStorage.getItem(LOCAL_STORAGE_BANKS_KEY);
      const savedPurchases = localStorage.getItem(LOCAL_STORAGE_PURCHASES_KEY);
      const savedLoans = localStorage.getItem(LOCAL_STORAGE_LOANS_KEY);
      const savedCategories = localStorage.getItem(LOCAL_STORAGE_CATEGORIES_KEY);
      const savedProductTypes = localStorage.getItem(LOCAL_STORAGE_PRODUCT_TYPES_KEY);
      const savedAuditLogs = localStorage.getItem(LOCAL_STORAGE_AUDIT_LOGS_KEY);
      
      let initialS = DEFAULT_PAPER_STOCKS;
      let initialC = INITIAL_CUSTOMERS;
      let initialB = DEFAULT_BANK_ACCOUNTS;
      let initialP = INITIAL_PURCHASES;
      let initialLoans = INITIAL_LOANS;
      let initialCat = INITIAL_EXPENSE_CATEGORIES;
      let initialProd = DEFAULT_PRODUCT_TYPES;
      let initialAuditLogs: AuditLogEntry[] = [];
      
      if (savedStocks) {
        try {
          initialS = JSON.parse(savedStocks);
        } catch (_) {}
      }
      if (savedCustomers) {
        try {
          initialC = JSON.parse(savedCustomers);
        } catch (_) {}
      }
      if (savedBanks) {
        try {
          initialB = JSON.parse(savedBanks);
        } catch (_) {}
      }
      if (savedPurchases) {
        try {
          initialP = JSON.parse(savedPurchases);
        } catch (_) {}
      }
      if (savedLoans) {
        try {
          initialLoans = JSON.parse(savedLoans);
        } catch (_) {}
      }
      if (savedCategories) {
        try {
          initialCat = JSON.parse(savedCategories);
        } catch (_) {}
      }
      if (savedProductTypes) {
        try {
          initialProd = JSON.parse(savedProductTypes);
        } catch (_) {}
      }
      if (savedAuditLogs) {
        try {
          initialAuditLogs = JSON.parse(savedAuditLogs);
        } catch (_) {}
      }

      if (!isBackgroundRefresh) {
        const savedClientTypes = localStorage.getItem(LOCAL_STORAGE_CLIENT_TYPES_KEY);
        if (savedClientTypes) {
          try {
            setClientTypes(JSON.parse(savedClientTypes));
          } catch (_) {
            setClientTypes(DEFAULT_CLIENT_TYPES);
          }
        } else {
          setClientTypes(DEFAULT_CLIENT_TYPES);
        }
      }

      const { isSupabaseConfigured } = await import('./lib/supabase');
      setLiveDbLinked(isSupabaseConfigured);

      const { 
        fetchAllPaperStocks, 
        fetchAllCustomers, 
        fetchAllBankAccounts,
        saveBankAccountDoc,
        fetchAllPurchases,
        fetchAllLoans,
        fetchAllExpenseCategories,
        fetchAllEmployees,
        saveEmployeeDoc,
        fetchAllProductTypes,
        saveProductTypeDoc,
        fetchAllClientTypes,
        saveClientTypeDoc,
        fetchAllAuditLogs
      } = await import('./lib/dbService');
      
      const finalS = await fetchAllPaperStocks(initialS);
      const fetchedC = await fetchAllCustomers(initialC);
      const finalC = fetchedC.map(cust => {
        const repaired = { ...cust };
        if (repaired.id === 'c1') {
          if (repaired.amount1 === 75) repaired.amount1 = 0.5;
          if (repaired.amount2 === 50) repaired.amount2 = 50 / 150;
        } else if (repaired.id === 'c2') {
          if (repaired.amount1 === 150) repaired.amount1 = 0.5;
          if (repaired.amount2 === 150) repaired.amount2 = 0.5;
          if (repaired.amount3 === 100) repaired.amount3 = 100 / 300;
        } else if (repaired.id === 'c3') {
          if (repaired.amount1 === 100) repaired.amount1 = 0.5;
          if (repaired.amount2 === 50) repaired.amount2 = 0.25;
        } else if (repaired.id === 'c4') {
          if (repaired.amount1 === 80) repaired.amount1 = 0.8;
          if (repaired.amount2 === 40) repaired.amount2 = 0.4;
        } else if (repaired.id === 'c5') {
          if (repaired.amount1 === 250) repaired.amount1 = 0.5;
          if (repaired.amount2 === 120) repaired.amount2 = 120 / 500;
          if (repaired.amount3 === 50) repaired.amount3 = 0.1;
        } else if (repaired.id === 'c6') {
          if (repaired.amount1 === 60) repaired.amount1 = 0.5;
        }
        if (!repaired.advancePaymentDate) {
          repaired.advancePaymentDate = repaired.deliveryDate || new Date().toISOString().split('T')[0];
        }
        const stockMappings = [
          ['paperType1', 'paperType1Id'],
          ['paperType2', 'paperType2Id'],
          ['paperType3', 'paperType3Id'],
          ['entrancePaper', 'entrancePaperId'],
          ['ajabiPaper', 'ajabiPaperId'],
        ] as const;
        stockMappings.forEach(([nameField, idField]) => {
          const currentId = repaired[idField];
          if (typeof currentId === 'string' && currentId.trim()) return;
          const resolvedId = resolveStockId(repaired[nameField], finalS);
          if (resolvedId !== 'None') {
            repaired[idField] = resolvedId;
          }
        });
        return repaired;
      });
      const finalB = await fetchAllBankAccounts(initialB);
      if (!isBackgroundRefresh) {
        const hasCbeDefault = finalB.some(b => b.accountNumber === '1000632725896');
        if (!hasCbeDefault) {
          const cbeAccount = {
            id: 'b_cbe_default',
            name: 'CBE (Mena INK Trading PLC)',
            accountNumber: '1000632725896',
            initialBalance: 0
          };
          await saveBankAccountDoc(cbeAccount).catch(() => {});
          finalB.push(cbeAccount);
        }
      }
      const finalP = await fetchAllPurchases(initialP);
      const finalLoans = await fetchAllLoans(initialLoans);
      const finalCat = await fetchAllExpenseCategories(initialCat);
      const finalEmployees = await fetchAllEmployees(initialEmployees);
      
      const finalProd = await fetchAllProductTypes(initialProd);
      if (!isBackgroundRefresh && finalProd.length === 0 && DEFAULT_PRODUCT_TYPES.length > 0) {
        for (const prod of DEFAULT_PRODUCT_TYPES) {
          await saveProductTypeDoc(prod).catch(() => {});
        }
        finalProd.push(...DEFAULT_PRODUCT_TYPES);
      }

      const initialClientTypesForDb = clientTypes.length > 0 ? clientTypes : DEFAULT_CLIENT_TYPES;
      const finalClientTypes = await fetchAllClientTypes(initialClientTypesForDb);
      if (!isBackgroundRefresh && finalClientTypes.length === 0 && DEFAULT_CLIENT_TYPES.length > 0) {
        for (const ct of DEFAULT_CLIENT_TYPES) {
          await saveClientTypeDoc(ct).catch(() => {});
        }
        finalClientTypes.push(...DEFAULT_CLIENT_TYPES);
      }
      const finalAuditLogs = await fetchAllAuditLogs(initialAuditLogs);

      if (!isBackgroundRefresh && finalEmployees.length === 0 && initialEmployees.length > 0) {
        // Empty remote table, seed with initialEmployees
        for (const emp of initialEmployees) {
          await saveEmployeeDoc(emp);
        }
        finalEmployees.push(...initialEmployees);
      }
      
      // Only update state if data actually changed (prevents blinking/flickering from re-renders)
      const updateIfChanged = <T,>(setter: React.Dispatch<React.SetStateAction<T>>, newVal: T, localKey?: string) => {
        const newJson = JSON.stringify(newVal);
        setter((prev: T) => {
          if (JSON.stringify(prev) === newJson) return prev;
          if (localKey) localStorage.setItem(localKey, newJson);
          return newVal;
        });
      };

      updateIfChanged(setPaperStocks, finalS, LOCAL_STORAGE_STOCKS_KEY);
      updateIfChanged(setCustomers, finalC, LOCAL_STORAGE_CUSTOMERS_KEY);
      updateIfChanged(setBankAccounts, finalB, LOCAL_STORAGE_BANKS_KEY);
      updateIfChanged(setPurchases, finalP, LOCAL_STORAGE_PURCHASES_KEY);
      updateIfChanged(setLoans, finalLoans, LOCAL_STORAGE_LOANS_KEY);
      updateIfChanged(setCategories, finalCat, LOCAL_STORAGE_CATEGORIES_KEY);
      updateIfChanged(setEmployees, finalEmployees);
      updateIfChanged(setProductTypes, finalProd, LOCAL_STORAGE_PRODUCT_TYPES_KEY);
      updateIfChanged(setClientTypes, finalClientTypes);
      updateIfChanged(setAuditLogs, finalAuditLogs, LOCAL_STORAGE_AUDIT_LOGS_KEY);

      if (currentUser) {
        const matchedUser = finalEmployees.find(e => e.username === currentUser.username);
        if (!matchedUser) {
          setCurrentUser(prev => {
            if (prev === null) return prev;
            localStorage.removeItem('mena_inc_current_user_v3');
            return null;
          });
        } else {
          const matchedJson = JSON.stringify(matchedUser);
          setCurrentUser(prev => {
            if (JSON.stringify(prev) === matchedJson) return prev;
            localStorage.setItem('mena_inc_current_user_v3', matchedJson);
            return matchedUser;
          });
        }
      }
      
      const { supabaseValidationError } = await import('./lib/supabase');
      setDbValidationError(prev => prev === supabaseValidationError ? prev : supabaseValidationError);
      
      // localStorage is already updated inside updateIfChanged above
      localStorage.setItem('mena_inc_employees_v3', JSON.stringify(finalEmployees));
    } catch (err) {
      // Fallback
    } finally {
      if (!isBackgroundRefresh) {
        setDataLoadComplete(true);
        setTimeout(() => setIsBuffering(false), 500);
      }
    }
  };

  // Initial load on mount
  useEffect(() => {
    loadData(false);
  }, []);

  useEffect(() => {
    if (!dataLoadComplete) return;
    const backupDate = new Date();
    const dateKey = `${backupDate.getFullYear()}-${String(backupDate.getMonth() + 1).padStart(2, '0')}-${String(backupDate.getDate()).padStart(2, '0')}`;
    if (telegramBackupAttemptDateRef.current === dateKey) return;
    telegramBackupAttemptDateRef.current = dateKey;

    sendDailyTelegramBackup(
      { customers, purchases, loans, bankAccounts, paperStocks, categories, productTypes, clientTypes, employees, auditLogs, leadChannels: getLeadChannelsForBackup() },
      getBankName,
      currentUser
    ).catch((err) => {
      console.warn('Daily Telegram backup was not sent:', err);
    });
  }, [dataLoadComplete, customers, purchases, loans, bankAccounts, paperStocks, categories, productTypes, clientTypes, employees, auditLogs, currentUser]);

  // Sync state changes to Local Storage & Database
  const handleUpdateStocks = async (newStocks: PaperStock[]) => {
    setIsBuffering(true);
    // Track deleted stocks for 30s undo
    const oldIds = new Set(paperStocks.map(s => s.id));
    const newIds = new Set(newStocks.map(s => s.id));
    const deletedStocks = paperStocks.filter(s => !newIds.has(s.id));
    if (deletedStocks.length > 0) {
      setDeletedHistory({
        type: 'stock',
        data: deletedStocks,
        timestamp: Date.now()
      });
      deletedStocks.forEach(stock => logAuditEntry({
        eventType: 'delete',
        entityType: 'stock',
        entityId: stock.id,
        entityLabel: stock.name,
        action: `Deleted stock item ${stock.name}`,
        details: { initialStock: stock.initialStock }
      }));
    }
    const stockById = new Map(paperStocks.map(stock => [stock.id, stock]));
    newStocks.forEach(stock => {
      const previousStock = stockById.get(stock.id);
      if (!previousStock) return;
      const changedFields = getChangedFieldNames(previousStock, stock);
      if (changedFields.length === 0) return;
      logAuditEntry({
        eventType: 'stock_update',
        entityType: 'stock',
        entityId: stock.id,
        entityLabel: stock.name,
        action: `Updated stock item ${stock.name}`,
        details: {
          detail: buildEditDetail(changedFields, previousStock, stock),
          changedFields: changedFields.join(', ')
        }
      });
    });

    setPaperStocks(newStocks);
    localStorage.setItem(LOCAL_STORAGE_STOCKS_KEY, JSON.stringify(newStocks));
    
    try {
      const { savePaperStockDoc, deletePaperStockDoc } = await import('./lib/dbService');
      // Delete removed stocks and update changes concurrently in parallel
      const deletePromises = deletedStocks.map(ds => deletePaperStockDoc(ds.id, currentUser?.username).catch(() => {}));
      const savePromises = newStocks.map(stock => savePaperStockDoc(stock).catch(() => {}));
      await Promise.allSettled([...deletePromises, ...savePromises]);
    } catch (_) {} finally {
      setTimeout(() => setIsBuffering(false), 400);
    }
  };

  const handleUpdateCustomers = (newCustomers: Customer[]) => {
    setCustomers(newCustomers);
    localStorage.setItem(LOCAL_STORAGE_CUSTOMERS_KEY, JSON.stringify(newCustomers));
  };

  // Mutators for customers with real-time firestore writes
  const handleAddCustomer = async (c: Customer) => {
    setIsBuffering(true);
    const updated = [c, ...customers];
    handleUpdateCustomers(updated);
    try {
      const { saveCustomerDoc } = await import('./lib/dbService');
      await saveCustomerDoc(c);
    } catch (_) {} finally {
      setTimeout(() => setIsBuffering(false), 400);
    }
  };

  const handleEditCustomer = async (c: Customer) => {
    setIsBuffering(true);
    const previousCustomer = customers.find(item => item.id === c.id);
    const updated = customers.map(item => item.id === c.id ? c : item);
    handleUpdateCustomers(updated);
    if (previousCustomer) {
      const changedFields = getChangedFieldNames(previousCustomer, c);
      if (changedFields.length > 0) {
        logAuditEntry({
          eventType: 'customer_update',
          entityType: 'customer',
          entityId: c.id,
          entityLabel: c.clientName,
          action: `Updated customer order for ${c.clientName}`,
          details: {
            detail: buildEditDetail(changedFields, previousCustomer, c),
            changedFields: changedFields.join(', ')
          }
        });
      }
    }
    if (!isOrderCompleted(previousCustomer) && isOrderCompleted(c)) {
      logAuditEntry({
        eventType: 'order_completion',
        entityType: 'customer',
        entityId: c.id,
        entityLabel: c.clientName,
        action: `Completed order for ${c.clientName}`,
        details: {
          deliveryDate: c.deliveryDate,
          remainingBank: c.bankRemainingId,
          productType: c.productType,
          quantity: c.quantity
        }
      });
    }
    try {
      const { saveCustomerDoc } = await import('./lib/dbService');
      await saveCustomerDoc(c);
    } catch (_) {} finally {
      setTimeout(() => setIsBuffering(false), 400);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    setIsBuffering(true);
    const target = customers.find(item => item.id === id);
    if (target) {
      setDeletedHistory({
        type: 'customer',
        data: target,
        timestamp: Date.now()
      });
      logAuditEntry({
        eventType: 'delete',
        entityType: 'customer',
        entityId: target.id,
        entityLabel: target.clientName,
        action: `Deleted customer order for ${target.clientName}`,
        details: {
          phone: target.phone,
          productType: target.productType,
          total: Number(target.quantity || 0) * Number(target.unitPrice || 0)
        }
      });
    }
    const updated = customers.filter(item => item.id !== id);
    handleUpdateCustomers(updated);
    try {
      const { deleteCustomerDoc } = await import('./lib/dbService');
      await deleteCustomerDoc(id, currentUser?.username);
    } catch (_) {} finally {
      setTimeout(() => setIsBuffering(false), 400);
    }
  };

  const handleBulkUpdateCustomers = async (updatedList: Customer[]) => {
    setIsBuffering(true);
    const updatedIds = new Set(updatedList.map(item => item.id));
    const deletedItems = customers.filter(item => !updatedIds.has(item.id));
    if (deletedItems.length > 0) {
      setDeletedHistory({
        type: 'bulk-customers',
        data: deletedItems,
        timestamp: Date.now()
      });
      deletedItems.forEach(item => logAuditEntry({
        eventType: 'delete',
        entityType: 'customer',
        entityId: item.id,
        entityLabel: item.clientName,
        action: `Deleted customer order for ${item.clientName}`,
        details: {
          phone: item.phone,
          productType: item.productType,
          source: 'bulk_update'
        }
      }));
    }

    handleUpdateCustomers(updatedList);
    const previousById = new Map<string, Customer>(customers.map(item => [item.id, item]));
    updatedList.forEach(item => {
      const previous = previousById.get(item.id);
      if (previous) {
        const changedFields = getChangedFieldNames(previous, item);
        if (changedFields.length > 0) {
          logAuditEntry({
            eventType: 'customer_update',
            entityType: 'customer',
            entityId: item.id,
            entityLabel: item.clientName,
            action: `Updated customer order for ${item.clientName}`,
            details: {
              detail: buildEditDetail(changedFields, previous, item),
              changedFields: changedFields.join(', '),
              source: 'bulk_update'
            }
          });
        }
      }
      if (!isOrderCompleted(previous) && isOrderCompleted(item)) {
        logAuditEntry({
          eventType: 'order_completion',
          entityType: 'customer',
          entityId: item.id,
          entityLabel: item.clientName,
          action: `Completed order for ${item.clientName}`,
          details: {
            deliveryDate: item.deliveryDate,
            remainingBank: item.bankRemainingId,
            productType: item.productType,
            quantity: item.quantity,
            source: 'bulk_update'
          }
        });
      }
    });
    try {
      const { saveCustomerDoc, deleteCustomerDoc } = await import('./lib/dbService');
      // Concurrently run all database updates/deletes in parallel
      const deletePromises = deletedItems.map(item => deleteCustomerDoc(item.id, currentUser?.username).catch(() => {}));
      const savePromises = updatedList.map(item => saveCustomerDoc(item).catch(() => {}));
      await Promise.allSettled([...deletePromises, ...savePromises]);
    } catch (_) {} finally {
      setTimeout(() => setIsBuffering(false), 450);
    }
  };

  const handleDeleteEmployee = async (username: string) => {
    if (currentUser?.role !== 'admin') {
      setStaffError('Only administrators can remove workforce members.');
      return;
    }
    if (currentUser?.username === username) {
      setStaffError('You cannot remove your own active operator account.');
      return;
    }
    const target = employees.find(emp => emp.username === username);
    if (!target) return;

    setIsBuffering(true);
    setPendingDeleteEmployee(null);
    setDeletedHistory({
      type: 'employee',
      data: { ...target, isDeleted: true, deletedBy: currentUser?.username },
      timestamp: Date.now()
    });
    logAuditEntry({
      eventType: 'staff_delete',
      entityType: 'staff',
      entityId: target.id,
      entityLabel: target.name,
      action: `Deleted staff member ${target.name}`,
      details: {
        username: target.username,
        role: target.role,
        deletedBy: currentUser?.name || currentUser?.username || 'unknown'
      }
    });

    const updated = employees
      .map(emp => emp.username === username ? { ...emp, isDeleted: true, deletedBy: currentUser?.username } : emp)
      .filter(emp => !emp.isDeleted);
    setEmployees(updated);
    localStorage.setItem('mena_inc_employees_v3', JSON.stringify(updated));
    if (editingEmployee?.username === username) {
      handleCancelEditEmployee();
    }

    try {
      const { deleteEmployeeDoc } = await import('./lib/dbService');
      await deleteEmployeeDoc(username, currentUser?.username);
    } catch (_) {
    } finally {
      setTimeout(() => setIsBuffering(false), 400);
    }
  };

  // Mutators for Bank/Payment Accounts with Local and Cloud Storage integrations
  const handleUpdateBankAccountsLocal = (newBanks: BankAccount[]) => {
    setBankAccounts(newBanks);
    localStorage.setItem(LOCAL_STORAGE_BANKS_KEY, JSON.stringify(newBanks));
  };

  const handleAddBankAccount = async (bank: BankAccount) => {
    setIsBuffering(true);
    const updated = [...bankAccounts, bank];
    handleUpdateBankAccountsLocal(updated);
    try {
      const { saveBankAccountDoc } = await import('./lib/dbService');
      await saveBankAccountDoc(bank);
    } catch (_) {} finally {
      setTimeout(() => setIsBuffering(false), 400);
    }
  };

  const handleEditBankAccount = async (bank: BankAccount) => {
    setIsBuffering(true);
    const previousBank = bankAccounts.find(item => item.id === bank.id);
    if (previousBank) {
      const changedFields = getChangedFieldNames(previousBank, bank);
      const profileChangedFields = changedFields.filter(field => field !== 'initialBalance');
      if (profileChangedFields.length > 0) {
        logAuditEntry({
          eventType: 'bank_account_update',
          entityType: 'bank_account',
          entityId: bank.id,
          entityLabel: bank.name,
          action: `Updated bank account ${bank.name}`,
          details: {
            detail: buildEditDetail(profileChangedFields, previousBank, bank),
            changedFields: profileChangedFields.join(', ')
          }
        });
      }
    }
    const updated = bankAccounts.map(item => item.id === bank.id ? bank : item);
    handleUpdateBankAccountsLocal(updated);
    try {
      const { saveBankAccountDoc } = await import('./lib/dbService');
      await saveBankAccountDoc(bank);
    } catch (_) {} finally {
      setTimeout(() => setIsBuffering(false), 400);
    }
  };

  const handleDeleteBankAccount = async (ids: string | string[]) => {
    setIsBuffering(true);
    const idList = Array.isArray(ids) ? ids : [ids];
    const firstTarget = bankAccounts.find(item => idList.includes(item.id));
    if (firstTarget) {
      setDeletedHistory({
        type: 'bank',
        data: firstTarget,
        timestamp: Date.now()
      });
    }
    bankAccounts
      .filter(item => idList.includes(item.id))
      .forEach(item => logAuditEntry({
        eventType: 'delete',
        entityType: 'bank_account',
        entityId: item.id,
        entityLabel: item.name,
        action: `Deleted bank account ${item.name}`,
        details: {
          accountNumber: item.accountNumber || '',
          currency: item.currency || 'ETB',
          initialBalance: item.initialBalance
        }
      }));
    const updated = bankAccounts.filter(item => !idList.includes(item.id));
    handleUpdateBankAccountsLocal(updated);
    try {
      const { deleteBankAccountDoc } = await import('./lib/dbService');
      await deleteBankAccountDoc(ids, currentUser?.username);
    } catch (_) {} finally {
      setTimeout(() => setIsBuffering(false), 400);
    }
  };

  // Mutators for Business Expenses/Purchases Ledger
  const handleUpdatePurchases = async (newPurchases: Purchase[]) => {
    setIsBuffering(true);
    const oldIds = new Set<string>(purchases.map(p => p.id));
    const newIds = new Set<string>(newPurchases.map(p => p.id));
    const oldMap = new Map(purchases.map(p => [p.id, p]));
    purchases
      .filter(p => !newIds.has(p.id))
      .forEach(p => logAuditEntry({
        eventType: 'purchase_delete',
        entityType: 'purchase',
        entityId: p.id,
        entityLabel: p.itemOrService,
        action: `Deleted purchase ${p.itemOrService}`,
        details: {
          category: p.expenseCategory,
          totalPrice: p.totalPrice,
          purchaseDate: p.purchaseDate,
          paymentMethodId: p.paymentMethodId
        }
      }));
    newPurchases.forEach(p => {
      const oldP = oldMap.get(p.id);
      if (!oldP) {
        logAuditEntry({
          eventType: 'purchase_create',
          entityType: 'purchase',
          entityId: p.id,
          entityLabel: p.itemOrService,
          action: `Created purchase ${p.itemOrService}`,
          details: {
            category: p.expenseCategory,
            totalPrice: p.totalPrice,
            purchaseDate: p.purchaseDate,
            paymentMethodId: p.paymentMethodId
          }
        });
      } else if (JSON.stringify(oldP) !== JSON.stringify(p)) {
        const changedFields = getChangedFieldNames(oldP, p);
        if (changedFields.length > 0) {
          logAuditEntry({
            eventType: 'purchase_update',
            entityType: 'purchase',
            entityId: p.id,
            entityLabel: p.itemOrService,
            action: `Updated purchase ${p.itemOrService}`,
            details: {
              detail: buildEditDetail(changedFields, oldP, p),
              changedFields: changedFields.join(', ')
            }
          });
        }
      }
    });
    setPurchases(newPurchases);
    localStorage.setItem(LOCAL_STORAGE_PURCHASES_KEY, JSON.stringify(newPurchases));
    try {
      const { savePurchaseDoc, deletePurchaseDoc } = await import('./lib/dbService');

      const promises: Promise<any>[] = [];
      // Delete removed purchases from database
      for (const oldId of oldIds) {
        if (!newIds.has(oldId)) {
          promises.push(deletePurchaseDoc(oldId, currentUser?.username).catch(() => {}));
        }
      }
      
      // Save added/changed purchases to database
      for (const p of newPurchases) {
        const oldP = oldMap.get(p.id);
        if (!oldP || JSON.stringify(oldP) !== JSON.stringify(p)) {
          promises.push(savePurchaseDoc(p).catch(() => {}));
        }
      }

      await Promise.allSettled(promises);
    } catch (_) {} finally {
      setTimeout(() => setIsBuffering(false), 400);
    }
  };

  const handleUpdateLoans = async (newLoans: Loan[]) => {
    setIsBuffering(true);
    const oldIds = new Set<string>(loans.map(loan => loan.id));
    const newIds = new Set<string>(newLoans.map(loan => loan.id));
    const oldMap = new Map(loans.map(loan => [loan.id, loan]));

    // Track deleted loans for 30s undo
    const deletedLoans = loans.filter(loan => !newIds.has(loan.id));
    if (deletedLoans.length > 0) {
      if (deletedLoans.length === 1) {
        setDeletedHistory({
          type: 'loan',
          data: deletedLoans[0],
          timestamp: Date.now()
        });
      } else {
        setDeletedHistory({
          type: 'bulk-loans',
          data: deletedLoans,
          timestamp: Date.now()
        });
      }
    }

    loans
      .filter(loan => !newIds.has(loan.id))
      .forEach(loan => logAuditEntry({
        eventType: 'loan_delete',
        entityType: 'loan',
        entityId: loan.id,
        entityLabel: loan.personName,
        action: `Deleted ${loan.type === 'given' ? 'loan given to' : 'loan received from'} ${loan.personName}`,
        details: {
          type: loan.type,
          principalAmount: loan.principalAmount,
          paymentMethodId: loan.paymentMethodId,
          loanDate: loan.loanDate
        }
      }));

    newLoans.forEach(loan => {
      const oldLoan = oldMap.get(loan.id);
      if (!oldLoan) {
        logAuditEntry({
          eventType: 'loan_create',
          entityType: 'loan',
          entityId: loan.id,
          entityLabel: loan.personName,
          action: `Created ${loan.type === 'given' ? 'loan given to' : 'loan received from'} ${loan.personName}`,
          details: {
            type: loan.type,
            principalAmount: loan.principalAmount,
            paymentMethodId: loan.paymentMethodId,
            loanDate: loan.loanDate,
            dueDate: loan.dueDate || ''
          }
        });
      } else if (JSON.stringify(oldLoan) !== JSON.stringify(loan)) {
        const changedFields = getChangedFieldNames(oldLoan, loan);
        if (changedFields.length > 0) {
          logAuditEntry({
            eventType: 'loan_update',
            entityType: 'loan',
            entityId: loan.id,
            entityLabel: loan.personName,
            action: `Updated loan for ${loan.personName}`,
            details: {
              detail: buildEditDetail(changedFields, oldLoan, loan),
              changedFields: changedFields.join(', ')
            }
          });
        }
      }
    });

    setLoans(newLoans);
    localStorage.setItem(LOCAL_STORAGE_LOANS_KEY, JSON.stringify(newLoans));
    try {
      const { saveLoanDoc, deleteLoanDoc } = await import('./lib/dbService');
      const promises: Promise<any>[] = [];
      for (const oldId of oldIds) {
        if (!newIds.has(oldId)) {
          promises.push(deleteLoanDoc(oldId, currentUser?.username).catch(() => {}));
        }
      }
      for (const loan of newLoans) {
        const oldLoan = oldMap.get(loan.id);
        if (!oldLoan || JSON.stringify(oldLoan) !== JSON.stringify(loan)) {
          promises.push(saveLoanDoc(loan).catch(() => {}));
        }
      }
      await Promise.allSettled(promises);
    } catch (_) {} finally {
      setTimeout(() => setIsBuffering(false), 400);
    }
  };

  const handleUpdateCategories = async (newCategories: ExpenseCategory[]) => {
    setIsBuffering(true);
    // Find deleted categories by comparing state with newCategories list
    const deletedCats = categories.filter(oldCat => !newCategories.some(newCat => newCat.id === oldCat.id));
    const categoryById = new Map(categories.map(cat => [cat.id, cat]));
    deletedCats.forEach(cat => logAuditEntry({
      eventType: 'delete',
      entityType: 'expense_category',
      entityId: cat.id,
      entityLabel: cat.name,
      action: `Deleted expense category ${cat.name}`,
      details: { items: cat.items || [] }
    }));
    newCategories.forEach(cat => {
      const previousCat = categoryById.get(cat.id);
      if (!previousCat) return;
      const changedFields = getChangedFieldNames(previousCat, cat);
      if (changedFields.length === 0) return;
      logAuditEntry({
        eventType: 'expense_category_update',
        entityType: 'expense_category',
        entityId: cat.id,
        entityLabel: cat.name,
        action: `Updated expense category ${cat.name}`,
        details: {
          detail: buildEditDetail(changedFields, previousCat, cat),
          changedFields: changedFields.join(', ')
        }
      });
    });
    
    setCategories(newCategories);
    localStorage.setItem(LOCAL_STORAGE_CATEGORIES_KEY, JSON.stringify(newCategories));
    try {
      const { saveExpenseCategoryDoc, deleteExpenseCategoryDoc } = await import('./lib/dbService');
      const savePromises = newCategories.map(cat => saveExpenseCategoryDoc(cat).catch(() => {}));
      const deletePromises = deletedCats.map(cat => deleteExpenseCategoryDoc(cat.id, currentUser?.username).catch(() => {}));
      
      await Promise.allSettled([...savePromises, ...deletePromises]);
    } catch (_) {} finally {
      setTimeout(() => setIsBuffering(false), 400);
    }
  };

  // Safe undo handler restoring offline and online collections
  const handleUndoDelete = async () => {
    if (!deletedHistory) return;
    setIsBuffering(true);
    const { type, data } = deletedHistory;
    setDeletedHistory(null);

    try {
      if (type === 'customer') {
        const item = data as Customer;
        const updated = [item, ...customers];
        handleUpdateCustomers(updated);
        const { saveCustomerDoc } = await import('./lib/dbService');
        await saveCustomerDoc({ ...item, isDeleted: false, deletedBy: undefined });
      } else if (type === 'bulk-customers') {
        const items = data as Customer[];
        const updated = [...items, ...customers];
        handleUpdateCustomers(updated);
        const { saveCustomerDoc } = await import('./lib/dbService');
        for (const item of items) {
          await saveCustomerDoc({ ...item, isDeleted: false, deletedBy: undefined });
        }
      } else if (type === 'bank') {
        const item = data as BankAccount;
        const updated = [...bankAccounts, item];
        handleUpdateBankAccountsLocal(updated);
        const { saveBankAccountDoc } = await import('./lib/dbService');
        await saveBankAccountDoc({ ...item, isDeleted: false, deletedBy: undefined });
      } else if (type === 'stock') {
        const items = data as PaperStock[];
        const updated = [...paperStocks, ...items];
        setPaperStocks(updated);
        localStorage.setItem(LOCAL_STORAGE_STOCKS_KEY, JSON.stringify(updated));
        const { savePaperStockDoc } = await import('./lib/dbService');
        for (const stock of items) {
          await savePaperStockDoc({ ...stock, isDeleted: false, deletedBy: undefined });
        }
      } else if (type === 'employee') {
        const item = data as EmployeeUser;
        const restored = { ...item, isDeleted: false, deletedBy: undefined };
        const updated = [restored, ...employees.filter(emp => emp.username !== restored.username)];
        setEmployees(updated);
        localStorage.setItem('mena_inc_employees_v3', JSON.stringify(updated));
        const { saveEmployeeDoc } = await import('./lib/dbService');
        await saveEmployeeDoc(restored);
      } else if (type === 'loan') {
        const item = data as Loan;
        const updated = [item, ...loans];
        handleUpdateLoans(updated);
        const { saveLoanDoc } = await import('./lib/dbService');
        await saveLoanDoc({ ...item, isDeleted: false, deletedBy: undefined });
      } else if (type === 'bulk-loans') {
        const items = data as Loan[];
        const updated = [...items, ...loans];
        handleUpdateLoans(updated);
        const { saveLoanDoc } = await import('./lib/dbService');
        for (const item of items) {
          await saveLoanDoc({ ...item, isDeleted: false, deletedBy: undefined });
        }
      }
    } catch (e) {
      console.error("Undo action failed", e);
    } finally {
      setTimeout(() => setIsBuffering(false), 500);
    }
  };

  const handleAddProductType = async (newProd: ProductType) => {
    const updated = [...productTypes, newProd];
    setProductTypes(updated);
    localStorage.setItem(LOCAL_STORAGE_PRODUCT_TYPES_KEY, JSON.stringify(updated));
    try {
      const { saveProductTypeDoc } = await import('./lib/dbService');
      await saveProductTypeDoc({ ...newProd, isDeleted: false, deletedBy: undefined });
    } catch (error) {
      console.warn('DB save product type failed, kept local update', error);
    }
  };

  const handleUpdateProductType = async (updatedProd: ProductType) => {
    const previousProd = productTypes.find(prod => prod.id === updatedProd.id);
    if (previousProd) {
      const changedFields = getChangedFieldNames(previousProd, updatedProd);
      if (changedFields.length > 0) {
        logAuditEntry({
          eventType: 'product_type_update',
          entityType: 'product_type',
          entityId: updatedProd.id,
          entityLabel: updatedProd.name,
          action: `Updated product type ${updatedProd.name}`,
          details: {
            detail: buildEditDetail(changedFields, previousProd, updatedProd),
            changedFields: changedFields.join(', ')
          }
        });
      }
    }
    const updated = productTypes.map(prod => prod.id === updatedProd.id ? updatedProd : prod);
    setProductTypes(updated);
    localStorage.setItem(LOCAL_STORAGE_PRODUCT_TYPES_KEY, JSON.stringify(updated));
    try {
      const { saveProductTypeDoc } = await import('./lib/dbService');
      await saveProductTypeDoc(updatedProd);
    } catch (error) {
      console.warn('DB update product type failed, kept local update', error);
    }
  };

  const handleDeleteProductType = async (ids: string[]) => {
    if (ids.length === 0) return;
    productTypes
      .filter(product => ids.includes(product.id))
      .forEach(product => logAuditEntry({
        eventType: 'delete',
        entityType: 'product_type',
        entityId: product.id,
        entityLabel: product.name,
        action: `Deleted product type ${product.name}`,
        details: {}
      }));
    try {
      const { deleteProductTypes } = await import('./lib/dbService');
      await deleteProductTypes(ids, currentUser?.username);
    } catch (e) {
      console.warn('DB delete product type failed, continuing local update');
    }
    const updated = productTypes.filter(p => !ids.includes(p.id));
    setProductTypes(updated);
    localStorage.setItem(LOCAL_STORAGE_PRODUCT_TYPES_KEY, JSON.stringify(updated));
  };

  const handleAddClientType = (newType: ClientType) => {
    const updated = [...clientTypes, newType];
    setClientTypes(updated);
    localStorage.setItem(LOCAL_STORAGE_CLIENT_TYPES_KEY, JSON.stringify(updated));

    import('./lib/dbService').then(({ saveClientTypeDoc }) => {
      saveClientTypeDoc(newType).catch(() => {});
    }).catch(() => {});
  };

  const handleUpdateClientType = (updatedType: ClientType) => {
    const previousType = clientTypes.find(type => type.id === updatedType.id);
    if (previousType) {
      const changedFields = getChangedFieldNames(previousType, updatedType);
      if (changedFields.length > 0) {
        logAuditEntry({
          eventType: 'client_type_update',
          entityType: 'client_type',
          entityId: updatedType.id,
          entityLabel: updatedType.name,
          action: `Updated client type ${updatedType.name}`,
          details: {
            detail: buildEditDetail(changedFields, previousType, updatedType),
            changedFields: changedFields.join(', ')
          }
        });
      }
    }
    const updated = clientTypes.map(type => type.id === updatedType.id ? updatedType : type);
    setClientTypes(updated);
    localStorage.setItem(LOCAL_STORAGE_CLIENT_TYPES_KEY, JSON.stringify(updated));

    import('./lib/dbService').then(({ saveClientTypeDoc }) => {
      saveClientTypeDoc(updatedType).catch(() => {});
    }).catch(() => {});
  };

  const handleDeleteClientType = async (ids: string[]) => {
    if (ids.length === 0) return;
    clientTypes
      .filter(type => ids.includes(type.id))
      .forEach(type => logAuditEntry({
        eventType: 'delete',
        entityType: 'client_type',
        entityId: type.id,
        entityLabel: type.name,
        action: `Deleted client type ${type.name}`,
        details: {}
      }));
    try {
      const { deleteClientTypes } = await import('./lib/dbService');
      await deleteClientTypes(ids, currentUser?.username);
    } catch (e) {
      console.warn('DB delete client type failed, continuing local update');
    }
    const updated = clientTypes.filter(c => !ids.includes(c.id));
    setClientTypes(updated);
    localStorage.setItem(LOCAL_STORAGE_CLIENT_TYPES_KEY, JSON.stringify(updated));
  };

  // Staff and Authentication mutators
  const handleAddNewEmployee = (newEmp: EmployeeUser) => {
    const updated = [...employees, newEmp];
    setEmployees(updated);
    localStorage.setItem('mena_inc_employees_v3', JSON.stringify(updated));

    // Sync new employee to live database
    import('./lib/dbService').then(({ saveEmployeeDoc }) => {
      saveEmployeeDoc(newEmp).catch(() => {});
    }).catch(() => {});
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('mena_inc_current_user_v3');
  };

  const [sqlCopied, setSqlCopied] = useState(false);

  const bootstrapSqlText = `-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.paper_stocks (
  id text PRIMARY KEY,
  name text NOT NULL,
  "initialStock" numeric DEFAULT 0,
  "isDeleted" boolean DEFAULT false,
  "deletedBy" text
);

CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id text PRIMARY KEY,
  name text NOT NULL,
  "accountNumber" text,
  "initialBalance" numeric DEFAULT 0,
  "isDeleted" boolean DEFAULT false,
  "deletedBy" text
);

CREATE TABLE IF NOT EXISTS public.expense_categories (
  id text PRIMARY KEY,
  name text NOT NULL,
  items jsonb DEFAULT '[]'::jsonb,
  "isDeleted" boolean DEFAULT false,
  "deletedBy" text
);

CREATE TABLE IF NOT EXISTS public.purchases (
  id text PRIMARY KEY,
  "purchasedBy" text,
  "itemOrService" text,
  quantity numeric DEFAULT 0,
  "unitPrice" numeric DEFAULT 0,
  "currency" text DEFAULT 'ETB',
  "purchaseDate" text,
  "paymentMethodId" text,
  "totalPrice" numeric DEFAULT 0,
  "notesOrDescription" text,
  "recordedBy" text,
  "expenseCategory" text,
  "hasVat" boolean DEFAULT false,
  "vatAmount" numeric DEFAULT 0,
  "hasWithholding" boolean DEFAULT false,
  "withholdingAmount" numeric DEFAULT 0,
  "baseAmount" numeric DEFAULT 0,
  "isDeleted" boolean DEFAULT false,
  "deletedBy" text
);

CREATE TABLE IF NOT EXISTS public.loans (
  id text PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('given', 'received')),
  "personName" text NOT NULL,
  phone text,
  "principalAmount" numeric DEFAULT 0,
  currency text DEFAULT 'ETB',
  "loanDate" text,
  "dueDate" text,
  "paymentMethodId" text,
  "interestAmount" numeric DEFAULT 0,
  notes text,
  "recordedBy" text,
  payments jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'open',
  "isDeleted" boolean DEFAULT false,
  "deletedBy" text
);

CREATE TABLE IF NOT EXISTS public.customers (
  id text PRIMARY KEY,
  "clientType" text,
  "clientName" text,
  phone text,
  "acquisitionSource" text,
  "orderTakenBy" text,
  "productType" text,
  quantity numeric DEFAULT 0,
  "unitPrice" numeric DEFAULT 0,
  "currency" text DEFAULT 'ETB',
  "advancePayment" numeric DEFAULT 0,
  "paymentMethodId" text,
  "paperType1" text,
  "paperType1Id" text REFERENCES public.paper_stocks(id),
  amount1 numeric DEFAULT 0,
  "paperType2" text,
  "paperType2Id" text REFERENCES public.paper_stocks(id),
  amount2 numeric DEFAULT 0,
  "paperType3" text,
  "paperType3Id" text REFERENCES public.paper_stocks(id),
  amount3 numeric DEFAULT 0,
  "entrancePaper" text,
  "entrancePaperId" text REFERENCES public.paper_stocks(id),
  amount16 numeric DEFAULT 0,
  "ajabiPaper" text,
  "ajabiPaperId" text REFERENCES public.paper_stocks(id),
  amount9 numeric DEFAULT 0,
  "deliveryDate" text,
  "advancePaymentDate" text,
  "bankRemainingId" text,
  "incompletionReason" text,
  "isVatAdded" boolean DEFAULT false,
  "baseUnitPrice" numeric DEFAULT 0,
  "isDeleted" boolean DEFAULT false,
  "deletedBy" text
);

CREATE TABLE IF NOT EXISTS public.employees (
  id text PRIMARY KEY,
  name text NOT NULL,
  username text UNIQUE NOT NULL,
  password text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'employee')),
  "allowedTabs" jsonb DEFAULT '[]'::jsonb,
  "isDeleted" boolean DEFAULT false,
  "deletedBy" text
);

CREATE TABLE IF NOT EXISTS public.product_types (
  id text PRIMARY KEY,
  name text UNIQUE NOT NULL,
  "isDeleted" boolean DEFAULT false,
  "deletedBy" text
);

CREATE TABLE IF NOT EXISTS public.client_types (
  id text PRIMARY KEY,
  name text UNIQUE NOT NULL,
  "isDeleted" boolean DEFAULT false,
  "deletedBy" text
);

CREATE TABLE IF NOT EXISTS public.lead_channels (
  id text PRIMARY KEY,
  name text UNIQUE NOT NULL,
  "isDeleted" boolean DEFAULT false,
  "deletedBy" text
);

CREATE TABLE IF NOT EXISTS public.bank_account_adjustments (
  id text PRIMARY KEY,
  bank_account_id text,
  bank_account_name text,
  adjustment_type text,
  amount numeric DEFAULT 0,
  previous_initial_balance numeric DEFAULT 0,
  new_initial_balance numeric DEFAULT 0,
  reason text,
  edited_by text,
  edited_at text
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id text PRIMARY KEY,
  event_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  entity_label text,
  action text NOT NULL,
  performed_by text,
  performed_at text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb
);

-- Safely migrate existing tables by adding any new columns
ALTER TABLE IF EXISTS public.employees ADD COLUMN IF NOT EXISTS "allowedTabs" jsonb DEFAULT '[]'::jsonb;
ALTER TABLE IF EXISTS public.customers ADD COLUMN IF NOT EXISTS "acquisitionSource" text;
ALTER TABLE IF EXISTS public.customers ADD COLUMN IF NOT EXISTS "paperType1Id" text REFERENCES public.paper_stocks(id);
ALTER TABLE IF EXISTS public.customers ADD COLUMN IF NOT EXISTS "paperType2Id" text REFERENCES public.paper_stocks(id);
ALTER TABLE IF EXISTS public.customers ADD COLUMN IF NOT EXISTS "paperType3Id" text REFERENCES public.paper_stocks(id);
ALTER TABLE IF EXISTS public.customers ADD COLUMN IF NOT EXISTS "entrancePaperId" text REFERENCES public.paper_stocks(id);
ALTER TABLE IF EXISTS public.customers ADD COLUMN IF NOT EXISTS "ajabiPaperId" text REFERENCES public.paper_stocks(id);
ALTER TABLE IF EXISTS public.customers ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'ETB';
ALTER TABLE IF EXISTS public.purchases ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'ETB';

INSERT INTO public.lead_channels (id, name)
VALUES
  ('lc_tiktok', 'TikTok'),
  ('lc_instagram', 'Instagram'),
  ('lc_telegram', 'Telegram'),
  ('lc_word_of_mouth', 'Word of Mouth'),
  ('lc_repeat', 'Repeat')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    "isDeleted" = false,
    "deletedBy" = null;

-- Soft delete columns migration
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['paper_stocks', 'bank_accounts', 'expense_categories', 'purchases', 'loans', 'customers', 'employees', 'product_types', 'client_types', 'lead_channels'])
  LOOP
    EXECUTE format('ALTER TABLE IF EXISTS public.%I ADD COLUMN IF NOT EXISTS "isDeleted" boolean DEFAULT false;', t);
    EXECUTE format('ALTER TABLE IF EXISTS public.%I ADD COLUMN IF NOT EXISTS "deletedBy" text;', t);
  END LOOP;
END $$;

-- Disable Row Level Security (RLS) on each table so the web app can read and write records instantly
ALTER TABLE public.paper_stocks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_channels DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_account_adjustments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(bootstrapSqlText).then(() => {
      setSqlCopied(true);
      setTimeout(() => setSqlCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy SQL:', err);
    });
  };

  // Live Clock banner
  const [timeStr, setTimeStr] = useState('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Keep a ref containing the latest state of all collections to avoid resetting the polling interval on changes
  const collectionsRef = React.useRef({ paperStocks, customers, bankAccounts, purchases, loans, categories, employees, auditLogs });
  
  useEffect(() => {
    collectionsRef.current = { paperStocks, customers, bankAccounts, purchases, loans, categories, employees, auditLogs };
  }, [paperStocks, customers, bankAccounts, purchases, loans, categories, employees, auditLogs]);

  // Background database polling to fetch updates when online and linked
  useEffect(() => {
    if (!liveDbLinked || !isOnline) return;

    const syncDatabase = async () => {
      // Skip sync if the browser tab is in the background
      if (document.hidden) return;

      try {
        const { 
          fetchAllPaperStocks, 
          fetchAllCustomers, 
          fetchAllBankAccounts,
          saveBankAccountDoc,
          fetchAllPurchases,
          fetchAllLoans,
          fetchAllExpenseCategories,
          fetchAllEmployees,
          fetchAllAuditLogs
        } = await import('./lib/dbService');

        const current = collectionsRef.current;

        // Fetch all tables concurrently in parallel
        const [newS, newC, newB, newP, newLoans, newCat, newE, newAuditLogs] = await Promise.all([
          fetchAllPaperStocks(current.paperStocks),
          fetchAllCustomers(current.customers),
          fetchAllBankAccounts(current.bankAccounts),
          fetchAllPurchases(current.purchases),
          fetchAllLoans(current.loans),
          fetchAllExpenseCategories(current.categories),
          fetchAllEmployees(current.employees),
          fetchAllAuditLogs(current.auditLogs)
        ]);

        const hasCbeDefault = newB.some(b => b.accountNumber === '1000632725896');
        if (!hasCbeDefault) {
          const cbeAccount = {
            id: 'b_cbe_default',
            name: 'CBE (Mena INK Trading PLC)',
            accountNumber: '1000632725896',
            initialBalance: 0
          };
          await saveBankAccountDoc(cbeAccount).catch(() => {});
          newB.push(cbeAccount);
        }

        const reconcileCollection = <T extends { id: any }>(currentList: T[], newList: T[]): { list: T[]; hasChanges: boolean } => {
          const currentMap = new Map(currentList.map(item => [item.id, item]));
          let hasChanges = false;
          const reconciled = newList.map(newItem => {
            const currentItem = currentMap.get(newItem.id);
            if (!currentItem) {
              hasChanges = true;
              return newItem;
            }
            if (JSON.stringify(currentItem) !== JSON.stringify(newItem)) {
              hasChanges = true;
              return newItem;
            }
            return currentItem;
          });
          if (currentList.length !== newList.length) {
            hasChanges = true;
          }
          return { list: reconciled, hasChanges };
        };

        // Update states only if new data was fetched and differs from current state, keeping unchanged references intact
        const recS = reconcileCollection(current.paperStocks, newS);
        if (recS.hasChanges) {
          setPaperStocks(recS.list);
          localStorage.setItem(LOCAL_STORAGE_STOCKS_KEY, JSON.stringify(recS.list));
        }

        // Apply repaired mappings to customers before reconciling
        const repairedC = newC.map(cust => {
          const repaired = { ...cust };
          if (!repaired.advancePaymentDate) {
            repaired.advancePaymentDate = repaired.deliveryDate || new Date().toISOString().split('T')[0];
          }
          return repaired;
        });
        const recC = reconcileCollection(current.customers, repairedC);
        if (recC.hasChanges) {
          setCustomers(recC.list);
          localStorage.setItem(LOCAL_STORAGE_CUSTOMERS_KEY, JSON.stringify(recC.list));
        }

        const recB = reconcileCollection(current.bankAccounts, newB);
        if (recB.hasChanges) {
          setBankAccounts(recB.list);
          localStorage.setItem(LOCAL_STORAGE_BANKS_KEY, JSON.stringify(recB.list));
        }

        const recP = reconcileCollection(current.purchases, newP);
        if (recP.hasChanges) {
          setPurchases(recP.list);
          localStorage.setItem(LOCAL_STORAGE_PURCHASES_KEY, JSON.stringify(recP.list));
        }

        const recLoans = reconcileCollection(current.loans, newLoans);
        if (recLoans.hasChanges) {
          setLoans(recLoans.list);
          localStorage.setItem(LOCAL_STORAGE_LOANS_KEY, JSON.stringify(recLoans.list));
        }

        const recCat = reconcileCollection(current.categories, newCat);
        if (recCat.hasChanges) {
          setCategories(recCat.list);
          localStorage.setItem(LOCAL_STORAGE_CATEGORIES_KEY, JSON.stringify(recCat.list));
        }

        const recAuditLogs = reconcileCollection(current.auditLogs, newAuditLogs);
        if (recAuditLogs.hasChanges) {
          setAuditLogs(recAuditLogs.list);
          localStorage.setItem(LOCAL_STORAGE_AUDIT_LOGS_KEY, JSON.stringify(recAuditLogs.list));
        }

        const recE = reconcileCollection(current.employees, newE);
        if (recE.hasChanges) {
          setEmployees(recE.list);
          localStorage.setItem('mena_inc_employees_v3', JSON.stringify(recE.list));

          // If the currently logged-in user was updated/deleted in the database
          if (currentUser) {
            const matched = recE.list.find(e => e.username === currentUser.username);
            if (!matched) {
              setCurrentUser(null);
              localStorage.removeItem('mena_inc_current_user_v3');
              setStaffError('Your active operator account was deleted by another administrator.');
            } else if (matched.role !== currentUser.role || matched.password !== currentUser.password || matched.name !== currentUser.name) {
              setCurrentUser(matched);
              localStorage.setItem('mena_inc_current_user_v3', JSON.stringify(matched));
            }
          }
        }
      } catch (err) {
        console.warn("Background database synchronization failed:", err);
      }
    };

    // Execute immediately on reconnection or mount
    syncDatabase();

    const intervalId = setInterval(syncDatabase, 5000); // Sync check every 5 seconds

    return () => clearInterval(intervalId);
  }, [liveDbLinked, isOnline, currentUser]);

  const auditEventLabels: Record<string, string> = {
    delete: 'Deletion',
    customer_update: 'Customer Edited',
    stock_update: 'Stock Edited',
    staff_create: 'Staff Created',
    staff_update: 'Staff Edited',
    staff_delete: 'Staff Deleted',
    bank_account_update: 'Bank Edited',
    bank_adjustment: 'Bank Adjustment',
    expense_category_update: 'Category Edited',
    product_type_update: 'Product Type Edited',
    client_type_update: 'Client Type Edited',
    purchase_create: 'Purchase Created',
    purchase_update: 'Purchase Edited',
    purchase_delete: 'Purchase Deleted',
    loan_create: 'Loan Created',
    loan_update: 'Loan Edited',
    loan_delete: 'Loan Deleted',
    order_completion: 'Order Completed'
  };
  const isAuditEditEvent = (log: AuditLogEntry) => (
    log.eventType.includes('update') ||
    log.eventType === 'staff_update' ||
    log.eventType === 'customer_update' ||
    log.eventType === 'stock_update' ||
    log.eventType === 'bank_account_update' ||
    log.eventType === 'expense_category_update' ||
    log.eventType === 'product_type_update' ||
    log.eventType === 'client_type_update'
  );

  const getAuditReasonText = (log: AuditLogEntry) => {
    const details = log.details || {};
    const possibleReason = [
      !isAuditEditEvent(log) ? details.reason : '',
      details.adjustmentReason,
      details.deleteReason,
      details.completionReason
    ].find(value => typeof value === 'string' && value.trim());

    return typeof possibleReason === 'string' ? possibleReason.trim() : '';
  };

  const getAuditDetailText = (log: AuditLogEntry) => {
    const details = log.details || {};
    if (typeof details.detail === 'string' && details.detail.trim()) return sanitizeAuditText(prettifyAuditDetailText(details.detail.trim()));
    if (isAuditEditEvent(log) && typeof details.reason === 'string' && details.reason.trim()) return sanitizeAuditText(prettifyAuditDetailText(details.reason.trim()));
    if (log.eventType === 'bank_adjustment') {
      const direction = details.adjustmentType === 'subtract' ? 'Subtracted' : 'Added';
      const amount = formatAuditValue(details.amount);
      const balanceText = details.previousInitialBalance !== undefined && details.newInitialBalance !== undefined
        ? ` Balance changed from ${formatAuditValue(details.previousInitialBalance)} to ${formatAuditValue(details.newInitialBalance)}.`
        : '';
      return sanitizeAuditText(`${direction} ${amount}.${balanceText}`.trim());
    }

    const excludedKeys = new Set(['reason', 'adjustmentReason', 'deleteReason', 'completionReason', 'detail', 'previous', 'next']);
    const parts = Object.entries(details)
      .filter(([key, value]) => !excludedKeys.has(key) && value !== undefined && value !== null && value !== '')
      .map(([key, value]) => `${getAuditFieldLabel(key)}: ${formatAuditFieldValue(key, value)}`);

    return sanitizeAuditText(parts.join('; '));
  };

  const isRedundantBankBalanceEdit = (log: AuditLogEntry, allLogs: AuditLogEntry[]) => {
    if (log.eventType !== 'bank_account_update') return false;
    const changedFields = String(log.details?.changedFields || '')
      .split(',')
      .map(field => getAuditFieldFromLabel(field.trim()))
      .filter(Boolean);
    if (changedFields.length !== 1 || changedFields[0] !== 'initialBalance') return false;

    const detailText = getAuditDetailText(log);
    const balanceMatch = detailText.match(/(?:initialBalance|Current balance)\s*(?:changed from|:)\s*([\d.,-]+)\s*(?:to|->)\s*([\d.,-]+)/i);
    const previousBalance = balanceMatch ? Number(balanceMatch[1].replace(/,/g, '')) : null;
    const newBalance = balanceMatch ? Number(balanceMatch[2].replace(/,/g, '')) : null;
    const logTime = new Date(log.performedAt).getTime();

    return allLogs.some(candidate => {
      if (candidate.eventType !== 'bank_adjustment') return false;
      if (candidate.entityId !== log.entityId) return false;
      if (getStaffDisplayName(candidate.performedBy) !== getStaffDisplayName(log.performedBy)) return false;
      const candidateTime = new Date(candidate.performedAt).getTime();
      if (!Number.isNaN(logTime) && !Number.isNaN(candidateTime) && Math.abs(candidateTime - logTime) > 2 * 60 * 1000) return false;
      const details = candidate.details || {};
      if (previousBalance !== null && Number(details.previousInitialBalance) !== previousBalance) return false;
      if (newBalance !== null && Number(details.newInitialBalance) !== newBalance) return false;
      return true;
    });
  };

  const auditFilterOptions: string[] = ['All', ...Array.from(new Set<string>(auditLogs.map(log => log.eventType)))];
  const visibleAuditLogs = auditLogs
    .filter(log => !isRedundantBankBalanceEdit(log, auditLogs))
    .filter(log => auditFilterType === 'All' || log.eventType === auditFilterType)
    .filter(log => {
      const query = auditSearchQuery.trim().toLowerCase();
      if (!query) return true;
      return [
        auditEventLabels[log.eventType] || log.eventType,
        log.entityType,
        log.entityId,
        getResolvedAuditEntityLabel(log),
        getResolvedAuditAction(log),
        getStaffDisplayName(log.performedBy),
        getAuditDetailText(log),
        getAuditReasonText(log),
        JSON.stringify(log.details || {})
      ].join(' ').toLowerCase().includes(query);
    })
    .sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime());

  const formatAuditDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-4 selection:bg-[#ee317b]/30 font-sans">
        <div className="w-full max-w-md bg-[#121212] border border-[#262626] p-8 shadow-2xl relative rounded-2xl overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-2 bg-[#ee317b]" />
          <div className="absolute top-0 right-0 w-2 h-2 bg-[#71b536]" />
          <div className="absolute bottom-0 left-0 w-2 h-2 bg-[#71b536]" />
          <div className="absolute bottom-0 right-0 w-2 h-2 bg-[#ee317b]" />
          
          <div className="text-center mb-8">
            <div className="relative inline-block mb-3">
              <img 
                src="/mena-logo.png"
                alt="Mena Logo" 
                className="w-16 h-16 object-contain mx-auto"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -bottom-1 -right-1 bg-[#ee317b] text-black p-1 text-[9px] font-bold leading-none">
                <Lock className="w-3 h-3" />
              </div>
            </div>
            <h2 className="text-xl font-bold tracking-tight uppercase">AUTHENTICATED GATEWAY</h2>
            <p className="text-xs text-gray-500 font-sans tracking-widest uppercase mt-1">Mena Inc. Corporate Security</p>
          </div>

          {loginError && (
            <div className="bg-[#31111E] border border-[#ee317b]/25 text-[#F87171] p-3 text-xs mb-5 font-sans border-l-2 border-l-[#ee317b]">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase font-sans tracking-wider text-gray-400 mb-1 font-bold">Username / Operator ID</label>
              <input
                type="text"
                required
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full bg-[#181818] border border-[#262626] px-3.5 py-2 text-sm text-white focus:border-[#ee317b] outline-none font-sans rounded-md"
                placeholder="e.g. bereket"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-sans tracking-wider text-gray-400 mb-1 font-bold">Passkey Keyphrase</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full bg-[#181818] border border-[#262626] px-3.5 py-2 text-sm text-white focus:border-[#ee317b] outline-none font-sans rounded-md"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-500 hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-[#ee317b] text-black font-bold font-sans py-2.5 hover:bg-white hover:text-black transition-all cursor-pointer text-xs uppercase rounded-md"
            >
              Sign in
            </button>
          </form>


        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E2E8F0] flex flex-col font-sans antialiased" style={{ lineSpacing: "1.15" }}>
      <input
        ref={appDataImportInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(event) => handleImportAppDataFile(event.target.files?.[0])}
      />
      <AnimatePresence>
        {showCommandPalette && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-start justify-center px-3 pt-[12vh] font-sans"
            onMouseDown={() => setShowCommandPalette(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              className="w-full max-w-lg rounded-xl border border-[#262626] bg-[#121212] shadow-2xl overflow-hidden"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="flex items-center gap-2 border-b border-[#262626] px-3 py-2.5">
                <Search className="h-4 w-4 text-[#ee317b]" />
                <input
                  autoFocus
                  value={commandSearch}
                  onChange={(event) => setCommandSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      setShowCommandPalette(false);
                    } else if (event.key === 'Enter' && paletteItems[0]) {
                      event.preventDefault();
                      runCommand(paletteItems[0].action);
                    }
                  }}
                  placeholder="Search the whole app..."
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-gray-600"
                />
                <span className="rounded border border-[#262626] bg-[#181818] px-1.5 py-0.5 text-[10px] text-gray-500">Esc</span>
              </div>
              <div className="max-h-[420px] overflow-y-auto p-1.5">
                {paletteItems.length > 0 ? (
                  paletteItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => runCommand(item.action)}
                      className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left text-xs text-gray-300 hover:bg-[#202020] hover:text-white"
                    >
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="rounded border border-[#333] bg-[#181818] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#ee317b]">
                            {item.source}
                          </span>
                          <span className="truncate font-semibold text-white">{item.title}</span>
                        </span>
                        {(item.detail || item.destination) && (
                          <span className="mt-1 block truncate text-[10px] text-gray-500">
                            {item.detail}
                            {item.detail && item.destination ? ' · ' : ''}
                            {item.destination ? `Open ${item.destination}` : ''}
                          </span>
                        )}
                      </span>
                      {item.hint && <span className="shrink-0 text-[10px] uppercase tracking-wider text-gray-500">{item.hint}</span>}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-8 text-center text-xs text-gray-500">No matching app results</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Sticky Top Navigation Container */}
      <div className="sticky top-[env(safe-area-inset-top)] z-40">
        {/* Telegram-style Connection Status indicator bar */}
        {!isOnline && (
          <div className="bg-[#C53030] text-white text-center py-1 px-3 text-xs font-sans font-bold flex items-center justify-center gap-2 animate-pulse shadow-md">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
            <span>CONNECTING TO DIRECT DIGITAL LEDGER... (WORKING OFFLINE)</span>
          </div>
        )}

        {/* Top Executive Header */}
        <header className="bg-[#121212] border-b border-[#262626]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-1.5 md:py-2 flex-wrap gap-y-1">

              {/* Branding Logo - Utilizing the Premium Custom Logo */}
              <div className="flex items-center gap-1.5 md:gap-2">
                <img 
                  src="/mena-logo.png"
                alt="Mena Logo" 
                className="w-8 h-8 md:w-8 md:h-8 object-contain"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                  const fallback = document.getElementById('branding-icon-fallback');
                  if (fallback) fallback.classList.remove('hidden');
                }}
              />
              <div id="branding-icon-fallback" className="w-8 h-8 md:w-7 md:h-7 rounded-md bg-[#ee317b] flex items-center justify-center text-white shadow-sm font-bold hidden">
                <Database className="w-4 h-4 md:w-4 md:h-4 text-black" />
              </div>
              <div>
                <h1 className="text-sm md:text-sm font-bold text-white tracking-tight font-sans">
                  MENA INC.
                </h1>
                <p className="text-[9px] text-gray-500 font-sans tracking-wider uppercase hidden sm:block">Advanced Database &amp; Inventory System</p>
              </div>
            </div>

              {/* Unified Profile Menu */}
              <div className="relative" ref={profileMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="w-8 h-8 md:w-8 md:h-8 bg-[#181818] hover:bg-[#202020] border border-[#262626] rounded-full flex items-center justify-center cursor-pointer transition-colors focus:outline-none focus:border-[#ee317b]"
                  title="Profile Menu"
                >
                  <span className="text-xs md:text-xs text-white font-bold font-sans uppercase">
                    {currentUser.name.charAt(0)}
                  </span>
                </button>
                
                <AnimatePresence>
                  {isMobileMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40 pointer-events-none" aria-hidden="true" />
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="absolute right-0 top-full mt-2 w-64 bg-[#181818] border border-[#262626] rounded-md shadow-2xl z-50 py-2 font-sans overflow-hidden"
                      >
                      {/* Account Section */}
                      <div className="px-4 py-3 bg-[#121212] border-b border-[#262626] mb-2">
                        <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block mb-1">Account</span>
                        <div className="flex flex-col">
                          <span className="text-white font-bold text-sm truncate">{currentUser.name}</span>
                          <span className="text-gray-400 text-xs truncate">@{currentUser.username}</span>
                          <div className="mt-1">
                            <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 border font-bold rounded-sm ${
                              currentUser.role === 'admin' ? 'bg-[#31111E] text-[#ee317b] border-[#ee317b]/20' : 'bg-[#1b2b1a] text-[#71b536] border-[#71b536]/20'
                            }`}>
                              {currentUser.role}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Appearance Section */}
                      <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold px-4 pt-1 block mb-1">Appearance</span>
                      <button
                        type="button"
                        onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                        className="w-full text-left px-4 py-2.5 text-xs text-gray-300 hover:text-white hover:bg-[#202020] transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-sky-450" />}
                          Theme
                        </div>
                        <span className="text-gray-500">{theme === 'dark' ? 'Dark' : 'Light'}</span>
                      </button>
                      
                      <div className="px-4 py-2.5 text-xs text-gray-300 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Type className="w-4 h-4 text-[#ee317b]" />
                          <span>Text Size</span>
                        </div>
                        <div className="flex items-center gap-1 bg-[#121212] rounded p-0.5 border border-[#262626]">
                          <button onClick={() => setFontSize('sm')} className={`px-2 py-1 rounded transition-colors ${fontSize === 'sm' ? 'bg-[#ee317b] text-black font-bold' : 'text-gray-400 hover:text-white'}`}>A-</button>
                          <button onClick={() => setFontSize('base')} className={`px-2 py-1 rounded transition-colors ${fontSize === 'base' ? 'bg-[#ee317b] text-black font-bold' : 'text-gray-400 hover:text-white'}`}>A</button>
                          <button onClick={() => setFontSize('lg')} className={`px-2 py-1 rounded transition-colors ${fontSize === 'lg' ? 'bg-[#ee317b] text-black font-bold' : 'text-gray-400 hover:text-white'}`}>A+</button>
                        </div>
                      </div>

                      <div className="px-4 py-2.5 text-xs text-gray-300 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sliders className="w-4 h-4 text-[#ee317b]" />
                          <span>Density</span>
                        </div>
                        <div className="flex items-center gap-1 bg-[#121212] rounded p-0.5 border border-[#262626]">
                          <button onClick={() => setDensity('compact')} className={`px-2 py-1 rounded transition-colors text-[10px] ${density === 'compact' ? 'bg-[#ee317b] text-black font-bold' : 'text-gray-400 hover:text-white'}`}>Compact</button>
                          <button onClick={() => setDensity('standard')} className={`px-2 py-1 rounded transition-colors text-[10px] ${density === 'standard' ? 'bg-[#ee317b] text-black font-bold' : 'text-gray-400 hover:text-white'}`}>Standard</button>
                          <button onClick={() => setDensity('relaxed')} className={`px-2 py-1 rounded transition-colors text-[10px] ${density === 'relaxed' ? 'bg-[#ee317b] text-black font-bold' : 'text-gray-400 hover:text-white'}`}>Relaxed</button>
                        </div>
                      </div>
                      
                      <div className="border-t border-[#262626] my-2"></div>

                      {/* Data / Admin Section */}
                      <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold px-4 pt-1 block mb-1">Data / Admin</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          setShowGlobalProforma(true);
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs text-gray-300 hover:text-white hover:bg-[#202020] transition-colors flex items-center gap-2"
                      >
                        <Printer className="w-4 h-4 text-[#ee317b]" />
                        Standalone Proforma Tool
                      </button>
                      {currentUser.role === 'admin' && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            const getBankName = (id?: string) => bankAccounts.find(b => b.id === id)?.name || 'CBE / System Default';
                            exportAllDataToExcel(customers, purchases, bankAccounts, paperStocks, getBankName, {
                              categories,
                              loans,
                              productTypes,
                              clientTypes,
                              employees,
                              auditLogs,
                              leadChannels: getLeadChannelsForBackup()
                            });
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs text-gray-300 hover:text-white hover:bg-[#202020] transition-colors flex items-center gap-2"
                        >
                          <FolderDown className="w-4 h-4 text-sky-400" />
                          Export All Data
                        </button>
                      )}

                      {currentUser.role === 'admin' && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            appDataImportInputRef.current?.click();
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs text-gray-300 hover:text-white hover:bg-[#202020] transition-colors flex items-center gap-2"
                        >
                          <Upload className="w-4 h-4 text-[#71b536]" />
                          Import CSV / Backup
                        </button>
                      )}

                      {currentUser.role === 'admin' && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            setShowStaffModal(true);
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs text-gray-300 hover:text-white hover:bg-[#202020] transition-colors flex items-center gap-2"
                        >
                          <UserPlus className="w-4 h-4 text-[#ee317b]" />
                          Manage Staff Settings
                        </button>
                      )}

                      {currentUser.role === 'admin' && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            setShowAuditLogModal(true);
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs text-gray-300 hover:text-white hover:bg-[#202020] transition-colors flex items-center gap-2"
                        >
                          <Shield className="w-4 h-4 text-[#71b536]" />
                          Audit Log
                        </button>
                      )}

                      <div className="border-t border-[#262626] my-2"></div>

                      {/* Logout */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-[#202020]/50 transition-colors flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

           </div>
         </div>
         {/* Mobile Navigation Drawer Removed and replaced by Bottom Navigation Bar */}
       </header>
     </div>

      {/* Main Core Container */}
      <main className="flex-1 max-w-[1800px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">

        {/* Navigation Tabs - Switched Order and made scrollable on Mobile for extreme responsiveness */}
        <div className="app-sticky-tabs border-b border-[#262626] hidden md:block">
          <nav className="flex overflow-x-auto whitespace-nowrap scrollbar-none-x space-x-2 md:space-x-4 -mb-px" aria-label="Tabs Selector">

            {/* Tab 1: Customer Management (Now First!) */}
            {hasTabAccess('customers') && (
            <button
              id="tab-cust-trigger"
              onClick={() => changeTab('customers')}
              className={`py-1.5 px-2.5 border-b-2 font-medium font-sans text-xs flex items-center gap-1.5 cursor-pointer transition-colors rounded-none ${
                activeTab === 'customers'
                  ? 'border-[#ee317b] text-white'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-[#ee317b]/40'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Customer Management
              <span className={`text-[9px] px-1 py-0.2 rounded-full font-sans font-medium ${activeTab === 'customers' ? 'bg-[#ee317b]/10 text-[#ee317b]' : 'bg-[#181818] text-gray-400'}`}>
                {customers.length}
              </span>
            </button>
            )}

            {/* Tab 2: Inventory Dashboard */}
            {hasTabAccess('inventory') && (
            <button
              id="tab-inv-trigger"
              onClick={() => changeTab('inventory')}
              className={`py-1.5 px-2.5 border-b-2 font-medium font-sans text-xs flex items-center gap-1.5 cursor-pointer transition-colors rounded-none ${
                activeTab === 'inventory'
                  ? 'border-[#ee317b] text-white'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-[#ee317b]/40'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              Inventory Dashboard
              <span className={`text-[9px] px-1 py-0.2 rounded-full font-sans font-medium ${activeTab === 'inventory' ? 'bg-[#ee317b]/10 text-[#ee317b]' : 'bg-[#181818] text-gray-400'}`}>
                {paperStocks.length}
              </span>
            </button>
            )}

            {/* Tab 3: Purchased Items & Services */}
            {hasTabAccess('purchases') && (
            <button
              id="tab-purchases-trigger"
              onClick={() => changeTab('purchases')}
              className={`py-1.5 px-2.5 border-b-2 font-medium font-sans text-xs flex items-center gap-1.5 cursor-pointer transition-colors rounded-none ${
                activeTab === 'purchases'
                  ? 'border-[#ee317b] text-white'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-[#ee317b]/30'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              Purchases &amp; Expenses Ledger
              <span className={`text-[9px] px-1 py-0.2 rounded-full font-sans font-medium ${activeTab === 'purchases' ? 'bg-[#ee317b]/10 text-[#ee317b]' : 'bg-[#181818] text-gray-400'}`}>
                {purchases.length}
              </span>
            </button>
            )}

            {/* Tab 4: Business Performance Summary */}
            {hasTabAccess('performance') && (
            <button
              id="tab-perf-trigger"
              onClick={() => changeTab('performance')}
              className={`py-1.5 px-2.5 border-b-2 font-medium font-sans text-xs flex items-center gap-1.5 cursor-pointer transition-colors rounded-none ${
                activeTab === 'performance'
                  ? 'border-[#ee317b] text-white'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-[#ee317b]/30'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Business Performance Summary
            </button>
            )}

          </nav>
        </div>

        {/* ACTIVE MODULE CONTAINER */}
        <div className="transition-all duration-300">
          {dbValidationError && (
            <div className="mb-6 bg-[#160b0e] border-l-4 border-[#ee317b] p-5 font-sans text-xs text-left max-w-7xl mx-auto space-y-4">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="animate-pulse h-2.5 w-2.5 bg-[#ee317b] rounded-full inline-block"></span>
                  <span className="text-white font-bold uppercase tracking-wide text-sm">Supabase Database Synchronizer Notice</span>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowDbConfigModal(true)} 
                  className="text-[10px] text-[#71b536] hover:underline uppercase font-bold"
                >
                  View Bootstrapping SQL ↗
                </button>
              </div>

              {/* Step-by-Step explanation of what to do */}
              <div className="text-gray-300 space-y-2 leading-relaxed font-sans text-xs">
                <p className="font-semibold text-[#ee317b] font-sans text-xs">
                  ⚠️ Live Error: <code className="bg-[#240c11] px-1.5 py-0.5 text-white font-sans break-all">{dbValidationError}</code>
                </p>
                <p className="pt-1">
                  Because the database tables are either missing, <strong>Row Level Security (RLS)</strong> is blocking access, or Supabase <strong>Data API</strong> is not exposing the <strong>public</strong> schema, your app has <strong>automatically and safely loaded all data from local JSON storage</strong> so that you don't lose any of your progress.
                </p>
                
                <div className="mt-3 bg-[#0a0a0a] p-4 border border-[#202020] rounded-md space-y-3 font-sans text-xs">
                  <div className="text-[#71b536] font-bold font-sans uppercase tracking-wider text-[11px]">⚙️ Step-by-Step Fix (Takes 30 seconds):</div>
                  <ol className="list-decimal list-inside space-y-2 text-gray-400">
                    <li>
                      Log into your <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-[#71b536] underline hover:text-[#8ce644]">Supabase Dashboard</a>.
                    </li>
                    <li>
                      Open <strong>Project Settings &gt; Data API</strong>, make sure Data API is enabled, and make sure the <strong>public</strong> schema is exposed.
                    </li>
                    <li>
                      Then open <strong>"SQL Editor"</strong> (the terminal icon), click <strong>"New query"</strong>, click the green button top right <strong className="text-white cursor-pointer hover:underline" onClick={() => setShowDbConfigModal(true)}>"View Bootstrapping SQL"</strong>, copy the complete script, paste it in, and click <strong>"Run"</strong>.
                    </li>
                    <li className="text-yellow-400 font-semibold font-sans text-[11px]">
                      • IMPORTANT: The script contains commands to disable Row Level Security (RLS) on each table (e.g. <code>ALTER TABLE public.paper_stocks DISABLE ROW LEVEL SECURITY;</code>). Supabase enables RLS by default, which blocks insertions unless disabled!
                    </li>
                    <li>
                      Once Data API is enabled, the public schema is exposed, and the SQL statement successfully completes, **reload this page**! The app will automatically connect and sync with the database.
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'inventory' && (
            <InventoryTab
              paperStocks={paperStocks}
              customers={customers}
              onUpdateStocks={handleUpdateStocks}
              currentUser={currentUser}
              highlightedSearchResult={globalSearchTarget?.type === 'stock' ? globalSearchTarget : null}
            />
          )}

          {activeTab === 'performance' && (
            <PerformanceTab
              customers={customers}
              bankAccounts={bankAccounts}
              onAddBankAccount={handleAddBankAccount}
              onUpdateBankAccount={handleEditBankAccount}
              onDeleteBankAccount={handleDeleteBankAccount}
              purchases={purchases}
              loans={loans}
              categories={categories}
              paperStocks={paperStocks}
              currentUser={currentUser}
              highlightedSearchResult={globalSearchTarget?.type === 'bank' ? globalSearchTarget : null}
              onNavigateFromSummary={navigateFromReportsSummary}
              onAuditLog={logAuditEntry}
            />
          )}

          <div className={activeTab === 'customers' ? 'block' : 'hidden'}>
            <CustomerTab
              isLoading={isLoading}
              customers={customers}
              paperStocks={paperStocks}
              bankAccounts={bankAccounts}
              productTypes={productTypes}
              clientTypes={clientTypes}
              onAddProductType={handleAddProductType}
              onUpdateProductType={handleUpdateProductType}
              onDeleteProductType={handleDeleteProductType}
              onAddClientType={handleAddClientType}
              onUpdateClientType={handleUpdateClientType}
              onDeleteClientType={handleDeleteClientType}
              onAddCustomer={handleAddCustomer}
              onUpdateCustomer={handleEditCustomer}
              onDeleteCustomer={handleDeleteCustomer}
              onBulkUpdateCustomers={handleBulkUpdateCustomers}
              onUpdateStocks={handleUpdateStocks}
              currentUser={currentUser}
              employees={employees}
              showGlobalProforma={showGlobalProforma}
              setShowGlobalProforma={setShowGlobalProforma}
              highlightedSearchResult={globalSearchTarget?.type === 'customer' ? globalSearchTarget : null}
            />
          </div>

          {activeTab === 'purchases' && (
            <PurchasesTab
              purchases={purchases}
              onUpdatePurchases={handleUpdatePurchases}
              loans={loans}
              onUpdateLoans={handleUpdateLoans}
              categories={categories}
              onUpdateCategories={handleUpdateCategories}
              bankAccounts={bankAccounts}
              currentUser={currentUser}
              employees={employees}
              highlightedSearchResult={globalSearchTarget?.type === 'purchase' ? globalSearchTarget : null}
            />
          )}
        </div>

      </main>

      {/* Corporate Footnotes */}
      <footer className="hidden md:block bg-[#121212] border-t border-[#262626] mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center text-gray-500 text-xs font-sans gap-4 ">
          <p>© 2026 Mena Inc. All Rights Reserved. Fully integrated v2 paper ledger engine.</p>
          <div className="flex gap-4">
            <span className="flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-[#ee317b]" />
              Secure CRM &amp; Inventory Engine
            </span>
          </div>
        </div>
      </footer>

      {/* 📦 UNDO TRANSACTION TOAST POPUP */}
      <AnimatePresence>
        {deletedHistory && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-4 right-4 left-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 bg-[#121212] border border-[#ee317b] text-white p-4 shadow-2xl flex flex-col gap-3 max-w-[calc(100vw-2rem)] sm:max-w-sm w-full font-sans text-xs  overscroll-contain"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-[#ee317b] tracking-wider uppercase text-[11px]">
                  {deletedHistory.type === 'bulk-customers' ? 'Multiple Orders Disposed' : 
                   deletedHistory.type === 'bulk-loans' ? 'Multiple Loans Deleted' : 
                   deletedHistory.type === 'employee' ? 'Staff Member Deleted' : 
                   deletedHistory.type === 'loan' ? 'Loan Record Deleted' : 
                   'Ledger Record Disposed'}
                </p>
                <p className="text-gray-400 text-[10px] mt-1">
                  {deletedHistory.type === 'customer' && `Deleted "${deletedHistory.data.clientName}"`}
                  {deletedHistory.type === 'bulk-customers' && `Deleted ${deletedHistory.data.length} client logs`}
                  {deletedHistory.type === 'bank' && `Deleted account "${deletedHistory.data.name}"`}
                  {deletedHistory.type === 'stock' && `Deleted ${deletedHistory.data.length} stock items`}
                  {deletedHistory.type === 'employee' && `Deleted "${deletedHistory.data.name}" in app and marked deleted in database by ${deletedHistory.data.deletedBy || 'unknown user'}`}
                  {deletedHistory.type === 'loan' && `Deleted loan for "${deletedHistory.data.personName}"`}
                  {deletedHistory.type === 'bulk-loans' && `Deleted ${deletedHistory.data.length} loan records`}
                </p>
              </div>
              <span className="text-[10px] bg-[#ee317b]/10 text-[#ee317b] border border-[#ee317b]/25 px-1.5 py-0.5 font-bold">
                {undoCountdown}s
              </span>
            </div>

            <div className="h-1 bg-[#262626] w-full overflow-hidden">
              <motion.div 
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 30, ease: 'linear' }}
                className="h-full bg-[#ee317b]"
              />
            </div>

            <div className="flex items-center justify-between gap-2 mt-1">
              <button
                type="button"
                onClick={() => setDeletedHistory(null)}
                className="text-gray-400 hover:text-white uppercase tracking-wider text-[10px] bg-[#181818] border border-[#262626] px-2.5 py-1.5 cursor-pointer transition-colors"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={handleUndoDelete}
                className="bg-[#71b536] hover:bg-white text-black font-bold uppercase tracking-widest text-[10px] px-4 py-1.5 flex items-center gap-1 cursor-pointer transition-colors"
              >
                ↩️ Undo Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 👤 STAFF SETTINGS MODAL */}
      <AnimatePresence>
        {showStaffModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm ">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121212] border border-[#262626] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col relative rounded-2xl"
            >
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-[#ee317b] to-[#71b536]" />
              
              {/* Modal header */}
              <div className="px-6 py-4 border-b border-[#262626] flex justify-between items-center bg-[#181818]/60">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#ee317b]" />
                  <h3 className="text-sm font-bold font-sans tracking-wider uppercase text-white">Staff passkey &amp; Access Controls</h3>
                </div>
                <button
                  onClick={() => { 
                    setShowStaffModal(false); 
                    setStaffError(''); 
                    setEditingEmployee(null);
                    setNewStaffName('');
                    setNewStaffUser('');
                    setNewStaffPass('');
                    setNewStaffRole('employee');
                  }}
                  className="text-gray-400 hover:text-white cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5 flex-shrink-0" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[80vh] space-y-6">
                
                {/* Add/Edit dynamic worker form */}
                <form onSubmit={handleCreateStaffSubmit} className="bg-[#181818] border border-[#262626] p-4 space-y-4 font-sans">
                  <span className="text-[10px] text-[#71b536] tracking-wider uppercase font-bold block">
                    {editingEmployee ? `Edit Staff Member: ${editingEmployee.name}` : 'Add Staff Member'}
                  </span>
                  
                  {staffError && (
                    <div className="bg-[#31111E] border border-[#ee317b]/15 p-2.5 text-xs text-[#F87171] border-l border-[#ee317b]">
                      {staffError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase text-gray-500 mb-1">Staff Name</label>
                      <input
                        type="text"
                        required
                        value={newStaffName}
                        onChange={(e) => setNewStaffName(e.target.value)}
                        className="w-full bg-[#121212] border border-[#262626] text-xs px-2.5 py-1.5 focus:border-[#ee317b] focus:border outline-none text-white font-sans rounded-md"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase text-gray-500 mb-1">Username</label>
                      <input
                        type="text"
                        required
                        value={newStaffUser}
                        onChange={(e) => setNewStaffUser(e.target.value)}
                        className="w-full bg-[#121212] border border-[#262626] text-xs px-2.5 py-1.5 focus:border-[#ee317b] focus:border outline-none text-white font-sans rounded-md"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase text-gray-500 mb-1">Passkey</label>
                      <input
                        type="password"
                        required
                        value={newStaffPass}
                        onChange={(e) => setNewStaffPass(e.target.value)}
                        className="w-full bg-[#121212] border border-[#262626] text-xs px-2.5 py-1.5 focus:border-[#ee317b] focus:border outline-none text-white font-sans tracking-widest rounded-md"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase text-gray-500 mb-1">Role</label>
                      <SearchableSelect
                        value={newStaffRole}
                        onChange={(e) => setNewStaffRole(e.target.value as 'admin' | 'employee')}
                      >
                        <option value="employee">Employee</option>
                        <option value="admin">Admin</option>
                      </SearchableSelect>
                    </div>
                  </div>
                  {newStaffRole === 'employee' && (
                    <div className="pt-2 border-t border-[#262626]">
                      <label className="block text-[10px] uppercase text-gray-500 mb-2">Module Access Permissions</label>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
                        {(['customers', 'inventory', 'purchases', 'performance'] as const).map((tab) => (
                          <label key={tab} className="flex items-center gap-2 cursor-pointer ">
                            <input
                              type="checkbox"
                              className="accent-[#ee317b]"
                              checked={newStaffAllowedTabs.includes(tab)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewStaffAllowedTabs(prev => [...prev, tab]);
                                } else {
                                  setNewStaffAllowedTabs(prev => prev.filter(t => t !== tab));
                                }
                              }}
                            />
                            <span className="capitalize">{tab === 'purchases' ? 'Ledger / Purchases' : tab}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    {editingEmployee && (
                      <button
                        type="button"
                        onClick={handleCancelEditEmployee}
                        className="bg-[#262626] hover:bg-stone-850 text-white font-bold text-xs uppercase px-4 py-1.5 rounded-md font-sans transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      className="bg-[#71b536] hover:bg-white text-black font-bold text-xs uppercase px-4 py-1.5 rounded-md font-sans transition-colors cursor-pointer"
                    >
                      {editingEmployee ? 'Save Changes' : 'Add Staff Member'}
                    </button>
                  </div>
                </form>

                {/* Registered Workers List */}
                <div className="space-y-3 font-sans">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-500 tracking-wider uppercase font-bold block">Current Staff ({activeEmployees.length})</span>
                    <input
                      type="text"
                      placeholder="Search staff..."
                      value={staffSearchQuery}
                      onChange={(e) => setStaffSearchQuery(e.target.value)}
                      className="bg-[#121212] border border-[#262626] text-[10px] px-2 py-1 focus:border-[#ee317b] outline-none text-white rounded-md w-1/3 font-sans"
                    />
                  </div>
                  
                  <div className="border border-[#262626] bg-[#141414] divide-y divide-[#232323] overflow-hidden rounded-md">
                    {activeEmployees.filter(emp => emp.name.toLowerCase().includes(staffSearchQuery.toLowerCase()) || emp.username.toLowerCase().includes(staffSearchQuery.toLowerCase()) || emp.role.toLowerCase().includes(staffSearchQuery.toLowerCase())).map(emp => (
                      <div key={emp.username} className="px-4 py-3 flex items-center justify-between text-xs font-sans">
                        <div>
                          <span className="font-semibold text-white font-sans">{emp.name}</span>
                          <span className="text-[10px] text-gray-550 block">Username: <span className="text-gray-300">{emp.username}</span> | Role: <span className="text-gray-400 capitalize">{emp.role}</span></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-[9px] uppercase font-bold rounded-md ${
                            emp.role === 'admin' 
                              ? 'bg-[#31111E] text-[#ee317b] border border-[#ee317b]/20' 
                              : 'bg-[#1b2b1a] text-[#71b536] border border-[#71b536]/20'
                          }`}>
                            {emp.role}
                          </span>
                          {currentUser && currentUser.role === 'admin' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleStartEditEmployee(emp)}
                                className="px-2 py-0.5 bg-[#262626] text-gray-300 hover:text-white border border-[#262626] rounded-md cursor-pointer text-[9px] font-bold font-sans transition-colors"
                              >
                                Edit
                              </button>
                            </>
                          )}
                          {currentUser && currentUser.role === 'admin' && currentUser.username !== emp.username && (
                            <button
                              type="button"
                              onClick={() => setPendingDeleteEmployee(emp)}
                              className="px-2 py-0.5 bg-[#31111E] text-[#F87171] hover:text-[#EF4444] border border-[#F87171]/20 rounded-md cursor-pointer text-[9px] font-bold font-sans transition-colors"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>



              </div>


            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🔮 SUPABASE DATABASE CONFIGURATION MODAL */}
      {/* Audit Log Modal */}
      <AnimatePresence>
        {showAuditLogModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setShowAuditLogModal(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121212] border border-[#262626] w-full max-w-6xl overflow-hidden shadow-2xl flex flex-col relative rounded-2xl"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-[#71b536] to-[#ee317b]" />
              <div className="px-6 py-4 border-b border-[#262626] flex justify-between items-center bg-[#181818]/60">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#71b536]" />
                  <div>
                    <h3 className="text-sm font-bold font-sans tracking-wider uppercase text-white">Audit Log</h3>
                    <p className="text-[10px] text-gray-500 font-sans">{auditLogs.length} recorded actions</p>
                  </div>
                </div>
                <button type="button" onClick={() => setShowAuditLogModal(false)} className="text-gray-400 hover:text-white cursor-pointer transition-colors">
                  <X className="w-5 h-5 flex-shrink-0" />
                </button>
              </div>
              <div className="p-4 border-b border-[#262626] grid grid-cols-1 md:grid-cols-[220px_1fr] gap-3 bg-[#121212]">
                <SearchableSelect value={auditFilterType} onChange={(e) => setAuditFilterType(e.target.value)}>
                  {auditFilterOptions.map(type => (
                    <option key={type} value={type}>{type === 'All' ? 'All event types' : auditEventLabels[type] || type}</option>
                  ))}
                </SearchableSelect>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={auditSearchQuery}
                    onChange={(e) => setAuditSearchQuery(e.target.value)}
                    placeholder="Search actor, action, entity, or details..."
                    className="w-full bg-[#181818] border border-[#262626] rounded-md pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-[#71b536] font-sans"
                  />
                </div>
              </div>
              <div className="max-h-[70vh] overflow-auto">
                <table className="w-full min-w-[1120px] text-xs font-sans">
                  <thead className="sticky top-0 z-10 bg-[#181818] border-b border-[#262626]">
                    <tr className="text-left text-gray-500 uppercase tracking-wider text-[10px]">
                      <th className="px-3 py-2 border-r border-[#262626]">Time</th>
                      <th className="px-3 py-2 border-r border-[#262626]">Event</th>
                      <th className="px-3 py-2 border-r border-[#262626]">Action</th>
                      <th className="px-3 py-2 border-r border-[#262626]">Entity</th>
                      <th className="px-3 py-2 border-r border-[#262626]">Staff</th>
                      <th className="px-3 py-2 border-r border-[#262626]">Details</th>
                      <th className="px-3 py-2">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#262626]">
                    {visibleAuditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-10 text-center text-gray-500 italic">
                          No audit log entries match this view.
                        </td>
                      </tr>
                    ) : (
                      visibleAuditLogs.map((log, index) => {
                        const detailText = getAuditDetailText(log);
                        const reasonText = getAuditReasonText(log);
                        const entityLabel = getResolvedAuditEntityLabel(log);
                        return (
                          <tr key={log.id} className={`${index % 2 === 0 ? 'bg-[#101010]' : 'bg-[#161616]'} hover:bg-[#1f1f1f] text-gray-300 align-top transition-colors`}>
                            <td className="px-3 py-2 border-r border-[#262626] whitespace-nowrap text-gray-400">{formatAuditDate(log.performedAt)}</td>
                            <td className="px-3 py-2 border-r border-[#262626] whitespace-nowrap">
                              <span className="inline-flex px-2 py-0.5 rounded border border-[#71b536]/25 bg-[#1b2b1a] text-[#71b536] text-[10px] font-bold uppercase">
                                {auditEventLabels[log.eventType] || log.eventType}
                              </span>
                            </td>
                            <td className="px-3 py-2 border-r border-[#262626] text-white font-semibold">{getResolvedAuditAction(log)}</td>
                            <td className="px-3 py-2 border-r border-[#262626]">
                              <div className="text-white">{entityLabel}</div>
                              <div className="text-[10px] text-gray-500">
                                {log.entityType} record
                              </div>
                            </td>
                            <td className="px-3 py-2 border-r border-[#262626] text-gray-400">{getStaffDisplayName(log.performedBy)}</td>
                            <td className="px-3 py-2 border-r border-[#262626] max-w-[420px] whitespace-pre-wrap break-words text-[11px] leading-relaxed text-gray-400">
                              {detailText || <span className="text-gray-600 italic">No details recorded</span>}
                            </td>
                            <td className="px-3 py-2 max-w-[300px] whitespace-pre-wrap break-words text-[11px] leading-relaxed text-gray-400">
                              {reasonText || <span className="text-gray-600 italic">No reason recorded</span>}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingDeleteEmployee && (
          <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm p-0 md:p-4">
            <motion.div
              initial={{ y: 60, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 60, opacity: 0, scale: 0.98 }}
              className="w-full md:max-w-md bg-[#121212] border-t md:border border-[#ee317b]/60 shadow-2xl rounded-t-2xl md:rounded-2xl p-5 font-sans"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-wider font-bold text-[#ee317b]">Delete Staff Member</p>
                  <h3 className="mt-1 text-base font-bold text-white">{pendingDeleteEmployee.name}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingDeleteEmployee(null)}
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-gray-300">
                This staff member will be removed from the app and marked as deleted in the database. The database record will keep <span className="font-bold text-white">deleted by {currentUser?.username || 'current user'}</span> for audit history.
              </p>
              <div className="mt-4 rounded-md border border-[#262626] bg-[#181818] p-3 text-[11px] text-gray-400">
                You will have 30 seconds to undo this after deletion.
              </div>
              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPendingDeleteEmployee(null)}
                  className="px-4 py-2 rounded-md bg-[#181818] border border-[#262626] text-xs font-bold uppercase tracking-wider text-gray-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteEmployee(pendingDeleteEmployee.username)}
                  className="px-4 py-2 rounded-md bg-[#31111E] border border-[#ee317b]/40 text-xs font-bold uppercase tracking-wider text-[#F87171] hover:bg-[#4a1a2d] transition-colors"
                >
                  Delete Staff
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDbConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm ">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121212] border border-[#262626] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col relative"
            >
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-[#ee317b] to-[#71b536]" />
              
              {/* Modal header */}
              <div className="px-6 py-4 border-b border-[#262626] flex justify-between items-center bg-[#181818]/60">
                <div className="flex items-center gap-2 font-sans">
                  <Database className="w-4 h-4 text-[#71b536]" />
                  <h3 className="text-sm font-bold tracking-wider uppercase text-white">Supabase Cloud Database Setup Guide</h3>
                </div>
                <button
                  onClick={() => setShowDbConfigModal(false)}
                  className="text-gray-400 hover:text-white cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5 flex-shrink-0" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[75vh] space-y-6 text-gray-200">
                
                <div className="space-y-4">
                  <p className="text-xs text-gray-400 leading-relaxed font-sans">
                    The Supabase credentials are now **permanently configured directly within our codebase files**. 
                    There is no need to copy or paste variables!
                  </p>
                  
                  <div className="bg-[#1E1215] border border-[#ee317b]/15 p-4 font-sans text-[11px] text-gray-300 space-y-2 leading-relaxed">
                     <span className="text-[#ee317b] font-bold uppercase block">⚡ Setup Checklist (How to Link Database Successfully):</span>
                    <div>1. Log into your **Supabase Dashboard** for the project.</div>
                    <div>2. Open **Project Settings &gt; Data API**, enable Data API, and expose the **public** schema so supabase-js/PostgREST can read the app tables.</div>
                    <div>3. Open the **SQL Editor** in the left menu.</div>
                    <div>4. Click **New query**, paste the complete SQL script shown below, and hit **Run**.</div>
                    <div className="text-yellow-400 font-semibold">• IMPORTANT: The script disables Row Level Security (RLS) on each table. This lets the web app initialize and sync records instantly! If you already created tables earlier but got errors, running this script now will disable RLS and fix the issue immediately.</div>
                  </div>

                  {dbValidationError && (
                    <div className="bg-[#240A10] border border-[#ee317b]/50 p-4 font-sans text-[11px] text-[#ee317b] space-y-1 rounded-md text-left">
                      <span className="text-[#ee317b] font-bold uppercase flex items-center gap-1.5">
                        ⚠️ Database Synchronizer Alert:
                      </span>
                      <div className="text-gray-300 select-all font-sans leading-relaxed pt-1 whitespace-pre-wrap text-xs font-sans">
                        {dbValidationError}
                      </div>
                      <div className="text-gray-400 text-[10px] font-sans pt-2 leading-relaxed">
                        💡 Since the tables are either empty or not initialised yet, please run the SQL script below on your Supabase project. The app is falling back to safe Local JSON storage in the meantime to protect your work!
                      </div>
                    </div>
                  )}
                </div>

                {/* SQL setup schema script */}
                <div className="border-t border-[#262626] pt-4 font-sans text-left">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase text-[#71b536] tracking-wider font-bold block">📋 Supabase Bootstrapping SQL Schema</span>
                    <button
                      type="button"
                      onClick={handleCopySql}
                      className="text-[9px] bg-[#1d1d1d] hover:bg-[#2a2a2a] border border-[#2d2d2d] text-gray-200 font-sans px-2 py-1 transition-colors flex items-center gap-1 cursor-pointer rounded-md active:scale-95"
                    >
                      {sqlCopied ? '✅ Copied!' : '📋 Copy SQL Code'}
                    </button>
                  </div>
                  <div className="text-[10px] text-gray-400 mb-2 font-sans leading-relaxed">
                    Copy and run this schema code directly inside your **Supabase SQL Editor**:
                  </div>
                  <div className="relative bg-[#0a0a0a] border border-[#202020] p-3 text-[10px] text-gray-300 max-h-56 overflow-y-auto selection:bg-[#71b536]/25 rounded-md">
                    <pre className="whitespace-pre overflow-x-auto text-[9px] text-left leading-normal font-sans text-gray-300">
                      {bootstrapSqlText}
                    </pre>
                  </div>
                </div>

              </div>

              {/* Modal footer */}
              <div className="px-6 py-4 border-t border-[#262626] bg-[#181818]/60 flex justify-end">
                <button
                  onClick={() => setShowDbConfigModal(false)}
                  className="bg-[#242424] hover:bg-[#323232] text-white text-xs font-sans font-medium px-4 py-1.5 transition-colors cursor-pointer rounded-md"
                >
                  Close Settings
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ⚡ BUFFERING NETWORK LOADER banner */}
      <AnimatePresence>
        {isBuffering && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 left-4 sm:left-auto sm:right-4 z-50 flex items-center justify-between sm:justify-start gap-3 bg-[#121212]/95 border border-[#ee317b] text-white px-4 py-2.5 shadow-2xl font-sans text-xs  max-w-[calc(100vw-2rem)] sm:max-w-xs w-full sm:w-auto overscroll-contain"
          >
            <div className="relative flex items-center justify-center">
              <svg className="animate-spin h-4 w-4 text-[#ee317b]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="absolute animate-ping h-2 w-2 rounded-full bg-[#ee317b] opacity-75 animate-none"></span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-wider uppercase text-[10px] text-white">Buffering Synchronizer...</span>
              <span className="text-[9px] text-[#71b536] tracking-wider uppercase">Streaming Mena Ledger</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* 📱 PWA DOWNLOAD & MOBILE INSTALLATION GUIDE MODAL */}
      <AnimatePresence>
        {showInstallGuideModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm ">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121212] border border-[#262626] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col relative font-sans"
            >
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-[#71b536] to-[#ee317b]" />
              
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-[#262626] flex justify-between items-center bg-[#181818]/60">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-[#71b536]" />
                  <h3 className="text-sm font-bold tracking-wider uppercase text-white">Install Mena CRM WebApp</h3>
                </div>
                <button
                  onClick={() => setShowInstallGuideModal(false)}
                  className="text-gray-400 hover:text-white cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5 flex-shrink-0" />
                </button>
              </div>

              {/* Platform Selector Tabs */}
              <div className="grid grid-cols-2 border-b border-[#262626]">
                <button
                  type="button"
                  onClick={() => setInstallGuideTab('ios')}
                  className={`py-3 text-xs md:text-sm font-bold uppercase transition-all tracking-wider flex items-center justify-center gap-2 cursor-pointer ${
                    installGuideTab === 'ios'
                      ? 'bg-[#181818] text-[#ee317b] border-b-2 border-[#ee317b]'
                      : 'text-gray-400 hover:text-white hover:bg-[#151515]'
                  }`}
                >
                  <span>🍏 iOS (iPhone / iPad)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInstallGuideTab('android')}
                  className={`py-3 text-xs md:text-sm font-bold uppercase transition-all tracking-wider flex items-center justify-center gap-2 cursor-pointer ${
                    installGuideTab === 'android'
                      ? 'bg-[#181818] text-[#71b536] border-b-2 border-[#71b536]'
                      : 'text-gray-400 hover:text-white hover:bg-[#151515]'
                  }`}
                >
                  <span>🤖 Android &amp; Chrome OS</span>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 text-gray-200 text-left space-y-4 max-h-[60vh] overflow-y-auto">
                
                {installGuideTab === 'ios' ? (
                  <div className="space-y-4">
                    <p className="text-xs text-gray-400 leading-relaxed font-sans">
                      Safari on iOS does not support fully automated PWA download prompts. Follow these <strong>3 quick taps</strong> to install Mena CRM as a high-performance native-feeling application on your Home Screen:
                    </p>

                    <ol className="space-y-4 text-xs">
                      <li className="flex items-start gap-3 bg-[#181818] p-3 border border-[#262626]">
                        <span className="bg-[#ee317b] text-white w-5 h-5 flex items-center justify-center rounded-md text-[10px] font-bold shrink-0">1</span>
                        <div className="space-y-1 font-sans">
                          <p className="font-bold text-gray-200 font-sans text-[11px]">Open the Safari Share Sheet</p>
                          <p className="text-gray-400 leading-normal text-[11px]">
                            Tap the <strong>Share button</strong> <span className="inline-flex items-center gap-1 p-1 bg-[#242424] text-white rounded-md font-sans text-[10px]">Share <Share2 className="w-3 h-3 text-[#ee317b]" /></span> standard control at the bottom (on iPhone) or top (on iPad) of Safari.
                          </p>
                        </div>
                      </li>

                      <li className="flex items-start gap-3 bg-[#181818] p-3 border border-[#262626]">
                        <span className="bg-[#ee317b] text-white w-5 h-5 flex items-center justify-center rounded-md text-[10px] font-bold shrink-0">2</span>
                        <div className="space-y-1 font-sans">
                          <p className="font-bold text-gray-200 font-sans text-[11px]">Select &apos;Add to Home Screen&apos;</p>
                          <p className="text-gray-400 leading-normal text-[11px]">
                            Scroll down the options list and find the item marked with a plus icon <span className="bg-[#242424] text-white font-sans px-1.5 py-0.5 font-bold text-[10px] border border-[#333]">+ Add to Home Screen</span>.
                          </p>
                        </div>
                      </li>

                      <li className="flex items-start gap-3 bg-[#181818] p-3 border border-[#262626]">
                        <span className="bg-[#ee317b] text-white w-5 h-5 flex items-center justify-center rounded-md text-[10px] font-bold shrink-0">3</span>
                        <div className="space-y-1 font-sans">
                          <p className="font-bold text-gray-200 font-sans text-[11px]">Confirm Setup Name</p>
                          <p className="text-gray-400 leading-normal text-[11px]">
                            Check the title (<strong>Mena CRM</strong>) and tap <strong className="text-[#ee317b]">Add</strong> in the top-right corner.
                          </p>
                        </div>
                      </li>
                    </ol>

                    <div className="bg-[#1E1215] border border-[#ee317b]/15 p-3 text-[10px] text-gray-400 font-sans leading-relaxed">
                      💡 <strong>WHY INSTALL:</strong> This enables immersive fullscreen operation without Safari URL search bars, loads instantly, and runs with fast gesture response times!
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-xs text-gray-400 leading-relaxed font-sans">
                      For Android and Chromium Desktop, you can instantly install the offline-first Mena Inc. WebApp database into your application drawer.
                    </p>

                    {deferredPrompt ? (
                      <div className="bg-[#112918] border border-[#71b536]/30 p-4 space-y-3">
                        <span className="text-xs font-bold text-[#71b536] uppercase block">🟢 Automatic Setup Ready!</span>
                        <p className="text-[11px] text-gray-300 font-sans leading-normal">
                          Your Chromium-based browser has successfully loaded the Progressive App triggers. Let&apos;s finalize setup with a single tap:
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            // Call synchronously to satisfy browser user gesture requirements
                            triggerPwaInstall();
                          }}
                          className="w-full bg-[#71b536] hover:bg-[#5f9c2d] text-black text-xs font-bold uppercase py-2.5 transition-colors cursor-pointer text-center rounded-md"
                        >
                          📲 Trigger Instant App Download
                        </button>
                      </div>
                    ) : (
                      <ol className="space-y-4 text-xs font-sans">
                        <li className="flex items-start gap-3 bg-[#181818] p-3 border border-[#262626]">
                          <span className="bg-[#71b536] text-black w-5 h-5 flex items-center justify-center rounded-md font-sans text-[10px] font-bold shrink-0">1</span>
                          <div className="space-y-1">
                            <p className="font-bold text-gray-200 font-sans text-[11px]">Open Browser Settings</p>
                            <p className="text-gray-400 leading-normal text-[11px]">
                              Tap your browser menu (the <strong>three vertical dots icon</strong> at the top right of Chrome/Edge).
                            </p>
                          </div>
                        </li>

                        <li className="flex items-start gap-3 bg-[#181818] p-3 border border-[#262626]">
                          <span className="bg-[#71b536] text-black w-5 h-5 flex items-center justify-center rounded-md font-sans text-[10px] font-bold shrink-0">2</span>
                          <div className="space-y-1">
                            <p className="font-bold text-gray-200 font-sans text-[11px]">Tap &apos;Install app&apos; / &apos;Add to Home screen&apos;</p>
                            <p className="text-gray-400 leading-normal text-[11px]">
                              Locate and tap either <strong className="text-white">Install App</strong>, <strong className="text-white">Add Page to...</strong> or <strong className="text-white">Add to Home Screen</strong>.
                            </p>
                          </div>
                        </li>

                        <li className="flex items-start gap-3 bg-[#181818] p-3 border border-[#262626]">
                          <span className="bg-[#71b536] text-black w-5 h-5 flex items-center justify-center rounded-md font-sans text-[10px] font-bold shrink-0">3</span>
                          <div className="space-y-1">
                            <p className="font-bold text-gray-200 font-sans text-[11px]">Launch From Launcher Tray</p>
                            <p className="text-gray-400 leading-normal text-[11px]">
                              The application launches from your offline desktop or application list as a standalone database client, bypassing generic web frames!
                            </p>
                          </div>
                        </li>
                      </ol>
                    )}

                    <div className="bg-[#1C201A] border border-[#71b536]/15 p-3 text-[10px] text-gray-400 font-sans leading-relaxed">
                      💡 <strong>WHY INSTALL:</strong> Installs offline ledger features, delivers seamless database response matrices, and acts as an independent application.
                    </div>
                  </div>
                )}

              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-[#262626] bg-[#181818]/60 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowInstallGuideModal(false)}
                  className="bg-[#242424] hover:bg-[#323232] text-white text-xs font-sans font-medium px-4 py-1.5 transition-colors cursor-pointer rounded-md"
                >
                  Dismiss Guide
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#121212] border-t border-[#262626] z-40 pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around items-center h-12">
          {hasTabAccess('customers') && (
            <button
              onClick={() => changeTab('customers')}
              className={`flex flex-col items-center justify-center w-full h-full space-y-0.5 ${activeTab === 'customers' ? 'text-[#ee317b]' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <Users className="w-4 h-4" />
              <span className="text-[9px] font-medium tracking-tight">Customers</span>
            </button>
          )}
          {hasTabAccess('inventory') && (
            <button
              onClick={() => changeTab('inventory')}
              className={`flex flex-col items-center justify-center w-full h-full space-y-0.5 ${activeTab === 'inventory' ? 'text-[#ee317b]' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <Package className="w-4 h-4" />
              <span className="text-[9px] font-medium tracking-tight">Inventory</span>
            </button>
          )}
          {hasTabAccess('purchases') && (
            <button
              onClick={() => changeTab('purchases')}
              className={`flex flex-col items-center justify-center w-full h-full space-y-0.5 ${activeTab === 'purchases' ? 'text-[#ee317b]' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <Database className="w-4 h-4" />
              <span className="text-[9px] font-medium tracking-tight">Expenses</span>
            </button>
          )}
          {hasTabAccess('performance') && (
            <button
              onClick={() => changeTab('performance')}
              className={`flex flex-col items-center justify-center w-full h-full space-y-0.5 ${activeTab === 'performance' ? 'text-[#ee317b]' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <TrendingUp className="w-4 h-4" />
              <span className="text-[9px] font-medium tracking-tight">Reports</span>
            </button>
          )}
        </div>
      </nav>

    </div>
  );
}


