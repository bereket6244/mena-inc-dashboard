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
  Menu,
  FolderDown,
  Type,
  MoreVertical,
  Printer
} from 'lucide-react';
import { exportAllDataToExcel } from './utils/excelExport';
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
  DEFAULT_CLIENT_TYPES
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
const LOCAL_STORAGE_CATEGORIES_KEY = 'mena_inc_categories_v2';
const LOCAL_STORAGE_PRODUCT_TYPES_KEY = 'mena_inc_product_types_v3';
const LOCAL_STORAGE_CLIENT_TYPES_KEY = 'mena_inc_client_types_v1';

export default function App() {
  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('mena_inc_theme_v3') as 'dark' | 'light') || 'dark';
  });

  // Font size state
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>(() => {
    return (localStorage.getItem('mena_inc_font_size') as 'sm' | 'base' | 'lg') || 'base';
  });

  useEffect(() => {
    if (fontSize === 'sm') document.documentElement.style.fontSize = '14px';
    else if (fontSize === 'lg') document.documentElement.style.fontSize = '18px';
    else document.documentElement.style.fontSize = '16px';
    localStorage.setItem('mena_inc_font_size', fontSize);
  }, [fontSize]);

  useEffect(() => {
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
  const [activeTab, setActiveTab] = useState<'customers' | 'inventory' | 'performance' | 'purchases'>('customers');
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
  const [liveDbLinked, setLiveDbLinked] = useState(false);
  const [showDbConfigModal, setShowDbConfigModal] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

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
  const [tempDbUrl, setTempDbUrl] = useState('https://kfscegrozkxvuacgihtc.supabase.co');
  const [tempDbKey, setTempDbKey] = useState('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtmc2NlZ3Jvemt4dnVhY2dpaHRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMzk2OTcsImV4cCI6MjA5NjgxNTY5N30.YSsvt9aYhK5PWgpwAlxfwjYDoaEIc1zDoL409x3fkBk');
  const [installGuideTab, setInstallGuideTab] = useState<'ios' | 'android'>('android');
  const [dbValidationError, setDbValidationError] = useState<string | null>(null);

  const hasTabAccess = (tab: 'customers' | 'inventory' | 'performance' | 'purchases') => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    if (!currentUser.allowedTabs) return true; // legacy support
    return currentUser.allowedTabs.includes(tab);
  };

  useEffect(() => {
    if (currentUser && !hasTabAccess(activeTab)) {
      const allowed = (['customers', 'inventory', 'purchases', 'performance'] as const).find(t => hasTabAccess(t));
      if (allowed) setActiveTab(allowed);
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
    type: 'customer' | 'bulk-customers' | 'bank' | 'stock';
    data: any;
    timestamp: number;
  } | null>(null);
  const [undoCountdown, setUndoCountdown] = useState(30);

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

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.key !== 'Escape') return;

      if (isMobileMenuOpen) {
        event.preventDefault();
        setIsMobileMenuOpen(false);
      } else if (showStaffModal) {
        event.preventDefault();
        setShowStaffModal(false);
        setEditingEmployee(null);
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
  }, [isMobileMenuOpen, showStaffModal, showDbConfigModal, showInstallGuideModal]);

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
    if (!isBackgroundRefresh) setIsBuffering(true);
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
      const savedCategories = localStorage.getItem(LOCAL_STORAGE_CATEGORIES_KEY);
      const savedProductTypes = localStorage.getItem(LOCAL_STORAGE_PRODUCT_TYPES_KEY);
      
      let initialS = DEFAULT_PAPER_STOCKS;
      let initialC = INITIAL_CUSTOMERS;
      let initialB = DEFAULT_BANK_ACCOUNTS;
      let initialP = INITIAL_PURCHASES;
      let initialCat = INITIAL_EXPENSE_CATEGORIES;
      let initialProd = DEFAULT_PRODUCT_TYPES;
      
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
        fetchAllExpenseCategories,
        fetchAllEmployees,
        saveEmployeeDoc,
        fetchAllProductTypes,
        saveProductTypeDoc,
        fetchAllClientTypes,
        saveClientTypeDoc
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
      updateIfChanged(setCategories, finalCat, LOCAL_STORAGE_CATEGORIES_KEY);
      updateIfChanged(setEmployees, finalEmployees);
      updateIfChanged(setProductTypes, finalProd, LOCAL_STORAGE_PRODUCT_TYPES_KEY);
      updateIfChanged(setClientTypes, finalClientTypes);

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
      if (!isBackgroundRefresh) setTimeout(() => setIsBuffering(false), 500);
    }
  };

  // Initial load on mount
  useEffect(() => {
    loadData(false);
  }, []);

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
    }

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
    const updated = customers.map(item => item.id === c.id ? c : item);
    handleUpdateCustomers(updated);
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
    }

    handleUpdateCustomers(updatedList);
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

  const handleDeleteEmployee = (username: string) => {
    if (currentUser?.role !== 'admin') {
      setStaffError('Only administrators can remove workforce members.');
      return;
    }
    if (currentUser?.username === username) {
      setStaffError('You cannot remove your own active operator account.');
      return;
    }
    const updated = employees.filter(emp => emp.username !== username);
    setEmployees(updated);
    localStorage.setItem('mena_inc_employees_v3', JSON.stringify(updated));

    // Sync deletion to live database
    import('./lib/dbService').then(({ deleteEmployeeDoc }) => {
      deleteEmployeeDoc(username, currentUser?.username).catch(() => {});
    }).catch(() => {});
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
    setPurchases(newPurchases);
    localStorage.setItem(LOCAL_STORAGE_PURCHASES_KEY, JSON.stringify(newPurchases));
    try {
      const { savePurchaseDoc, deletePurchaseDoc } = await import('./lib/dbService');
      
      const oldIds = new Set<string>(purchases.map(p => p.id));
      const newIds = new Set<string>(newPurchases.map(p => p.id));
      
      const promises: Promise<any>[] = [];
      // Delete removed purchases from database
      for (const oldId of oldIds) {
        if (!newIds.has(oldId)) {
          promises.push(deletePurchaseDoc(oldId, currentUser?.username).catch(() => {}));
        }
      }
      
      // Save added/changed purchases to database
      const oldMap = new Map(purchases.map(p => [p.id, p]));
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

  const handleUpdateCategories = async (newCategories: ExpenseCategory[]) => {
    setIsBuffering(true);
    // Find deleted categories by comparing state with newCategories list
    const deletedCats = categories.filter(oldCat => !newCategories.some(newCat => newCat.id === oldCat.id));
    
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
      }
    } catch (e) {
      console.error("Undo action failed", e);
    } finally {
      setTimeout(() => setIsBuffering(false), 500);
    }
  };

  const handleAddProductType = (newProd: ProductType) => {
    const updated = [...productTypes, newProd];
    setProductTypes(updated);
    localStorage.setItem(LOCAL_STORAGE_PRODUCT_TYPES_KEY, JSON.stringify(updated));
    
    import('./lib/dbService').then(({ saveProductTypeDoc }) => {
      saveProductTypeDoc(newProd).catch(() => {});
    }).catch(() => {});
  };

  const handleUpdateProductType = (updatedProd: ProductType) => {
    const updated = productTypes.map(prod => prod.id === updatedProd.id ? updatedProd : prod);
    setProductTypes(updated);
    localStorage.setItem(LOCAL_STORAGE_PRODUCT_TYPES_KEY, JSON.stringify(updated));

    import('./lib/dbService').then(({ saveProductTypeDoc }) => {
      saveProductTypeDoc(updatedProd).catch(() => {});
    }).catch(() => {});
  };

  const handleDeleteProductType = async (ids: string[]) => {
    if (ids.length === 0) return;
    try {
      const { deleteProductTypes } = await import('./lib/dbService');
      await deleteProductTypes(ids, currentUser?.username);
    } catch (e) {
      console.warn('DB delete product type failed, continuing local update');
    }
    const updated = productTypes.filter(p => !ids.includes(p.id));
    setProductTypes(updated);
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
    const updated = clientTypes.map(type => type.id === updatedType.id ? updatedType : type);
    setClientTypes(updated);
    localStorage.setItem(LOCAL_STORAGE_CLIENT_TYPES_KEY, JSON.stringify(updated));

    import('./lib/dbService').then(({ saveClientTypeDoc }) => {
      saveClientTypeDoc(updatedType).catch(() => {});
    }).catch(() => {});
  };

  const handleDeleteClientType = async (ids: string[]) => {
    if (ids.length === 0) return;
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

-- Safely migrate existing tables by adding any new columns
ALTER TABLE IF EXISTS public.employees ADD COLUMN IF NOT EXISTS "allowedTabs" jsonb DEFAULT '[]'::jsonb;
ALTER TABLE IF EXISTS public.customers ADD COLUMN IF NOT EXISTS "acquisitionSource" text;
ALTER TABLE IF EXISTS public.customers ADD COLUMN IF NOT EXISTS "paperType1Id" text REFERENCES public.paper_stocks(id);
ALTER TABLE IF EXISTS public.customers ADD COLUMN IF NOT EXISTS "paperType2Id" text REFERENCES public.paper_stocks(id);
ALTER TABLE IF EXISTS public.customers ADD COLUMN IF NOT EXISTS "paperType3Id" text REFERENCES public.paper_stocks(id);
ALTER TABLE IF EXISTS public.customers ADD COLUMN IF NOT EXISTS "entrancePaperId" text REFERENCES public.paper_stocks(id);
ALTER TABLE IF EXISTS public.customers ADD COLUMN IF NOT EXISTS "ajabiPaperId" text REFERENCES public.paper_stocks(id);

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
  FOR t IN SELECT unnest(ARRAY['paper_stocks', 'bank_accounts', 'expense_categories', 'purchases', 'customers', 'employees', 'product_types', 'client_types', 'lead_channels'])
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
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_channels DISABLE ROW LEVEL SECURITY;`;

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
  const collectionsRef = React.useRef({ paperStocks, customers, bankAccounts, purchases, categories, employees });
  
  useEffect(() => {
    collectionsRef.current = { paperStocks, customers, bankAccounts, purchases, categories, employees };
  }, [paperStocks, customers, bankAccounts, purchases, categories, employees]);

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
          fetchAllExpenseCategories,
          fetchAllEmployees
        } = await import('./lib/dbService');

        const current = collectionsRef.current;

        // Fetch all tables concurrently in parallel
        const [newS, newC, newB, newP, newCat, newE] = await Promise.all([
          fetchAllPaperStocks(current.paperStocks),
          fetchAllCustomers(current.customers),
          fetchAllBankAccounts(current.bankAccounts),
          fetchAllPurchases(current.purchases),
          fetchAllExpenseCategories(current.categories),
          fetchAllEmployees(current.employees)
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

        const recCat = reconcileCollection(current.categories, newCat);
        if (recCat.hasChanges) {
          setCategories(recCat.list);
          localStorage.setItem(LOCAL_STORAGE_CATEGORIES_KEY, JSON.stringify(recCat.list));
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
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          const getBankName = (id?: string) => bankAccounts.find(b => b.id === id)?.name || 'CBE / System Default';
                          exportAllDataToExcel(customers, purchases, bankAccounts, paperStocks, getBankName);
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs text-gray-300 hover:text-white hover:bg-[#202020] transition-colors flex items-center gap-2"
                      >
                        <FolderDown className="w-4 h-4 text-sky-400" />
                        Export All Data
                      </button>

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
              onClick={() => setActiveTab('customers')}
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
              onClick={() => setActiveTab('inventory')}
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
              onClick={() => setActiveTab('purchases')}
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
              onClick={() => setActiveTab('performance')}
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
              categories={categories}
              paperStocks={paperStocks}
            />
          )}

          <div className={activeTab === 'customers' ? 'block' : 'hidden'}>
            <CustomerTab
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
            />
          </div>

          {activeTab === 'purchases' && (
            <PurchasesTab
              purchases={purchases}
              onUpdatePurchases={handleUpdatePurchases}
              categories={categories}
              onUpdateCategories={handleUpdateCategories}
              bankAccounts={bankAccounts}
              currentUser={currentUser}
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
                  {deletedHistory.type === 'bulk-customers' ? 'Multiple Orders Disposed' : 'Ledger Record Disposed'}
                </p>
                <p className="text-gray-400 text-[10px] mt-1">
                  {deletedHistory.type === 'customer' && `Deleted "${deletedHistory.data.clientName}"`}
                  {deletedHistory.type === 'bulk-customers' && `Deleted ${deletedHistory.data.length} client logs`}
                  {deletedHistory.type === 'bank' && `Deleted account "${deletedHistory.data.name}"`}
                  {deletedHistory.type === 'stock' && `Deleted ${deletedHistory.data.length} stock items`}
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
                    <span className="text-[10px] text-gray-500 tracking-wider uppercase font-bold block">Current Staff ({employees.length})</span>
                    <input
                      type="text"
                      placeholder="Search staff..."
                      value={staffSearchQuery}
                      onChange={(e) => setStaffSearchQuery(e.target.value)}
                      className="bg-[#121212] border border-[#262626] text-[10px] px-2 py-1 focus:border-[#ee317b] outline-none text-white rounded-md w-1/3 font-sans"
                    />
                  </div>
                  
                  <div className="border border-[#262626] bg-[#141414] divide-y divide-[#232323] overflow-hidden rounded-md">
                    {employees.filter(emp => emp.name.toLowerCase().includes(staffSearchQuery.toLowerCase()) || emp.username.toLowerCase().includes(staffSearchQuery.toLowerCase()) || emp.role.toLowerCase().includes(staffSearchQuery.toLowerCase())).map(emp => (
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
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Reset passkey for ${emp.name} to '1234'?`)) {
                                     handleStartEditEmployee(emp);
                                     setNewStaffPass('1234');
                                     setStaffError('Passkey reset to 1234. Click Save Changes to confirm.');
                                  }
                                }}
                                className="px-2 py-0.5 bg-[#262626] text-gray-300 hover:text-white border border-[#262626] rounded-md cursor-pointer text-[9px] font-bold font-sans transition-colors"
                              >
                                Reset Passkey
                              </button>
                            </>
                          )}
                          {currentUser && currentUser.role === 'admin' && currentUser.username !== emp.username && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to permanently delete staff member "${emp.name}"?`)) {
                                  handleDeleteEmployee(emp.username);
                                }
                              }}
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
              onClick={() => setActiveTab('customers')}
              className={`flex flex-col items-center justify-center w-full h-full space-y-0.5 ${activeTab === 'customers' ? 'text-[#ee317b]' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <Users className="w-4 h-4" />
              <span className="text-[9px] font-medium tracking-tight">Customers</span>
            </button>
          )}
          {hasTabAccess('inventory') && (
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex flex-col items-center justify-center w-full h-full space-y-0.5 ${activeTab === 'inventory' ? 'text-[#ee317b]' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <Package className="w-4 h-4" />
              <span className="text-[9px] font-medium tracking-tight">Inventory</span>
            </button>
          )}
          {hasTabAccess('purchases') && (
            <button
              onClick={() => setActiveTab('purchases')}
              className={`flex flex-col items-center justify-center w-full h-full space-y-0.5 ${activeTab === 'purchases' ? 'text-[#ee317b]' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <Database className="w-4 h-4" />
              <span className="text-[9px] font-medium tracking-tight">Expenses</span>
            </button>
          )}
          {hasTabAccess('performance') && (
            <button
              onClick={() => setActiveTab('performance')}
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
