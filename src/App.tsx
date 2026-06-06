import React, { useState, useEffect } from 'react';
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
  Menu
} from 'lucide-react';
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
  INITIAL_PURCHASES
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

export default function App() {
  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('mena_inc_theme_v3') as 'dark' | 'light') || 'dark';
  });

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
  const [paperStocks, setPaperStocks] = useState<PaperStock[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [liveDbLinked, setLiveDbLinked] = useState(false);
  const [showDbConfigModal, setShowDbConfigModal] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showResetOverlay, setShowResetOverlay] = useState<false | 'demo' | 'stocks'>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Login & RBAC personnel state
  const [employees, setEmployees] = useState<EmployeeUser[]>([]);
  const [currentUser, setCurrentUser] = useState<EmployeeUser | null>(null);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [tempDbUrl, setTempDbUrl] = useState(() => localStorage.getItem('VITE_SUPABASE_URL') || 'https://qppigftbbkhcjisnpwmr.supabase.co');
  const [tempDbKey, setTempDbKey] = useState(() => localStorage.getItem('VITE_SUPABASE_ANON_KEY') || 'sb_publishable_lBrgsXkNL5AwXvOQmhGqEw_1Jfn6eU9');
  const [installGuideTab, setInstallGuideTab] = useState<'ios' | 'android'>('android');
  const [dbValidationError, setDbValidationError] = useState<string | null>(null);

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
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User installation outcome: ${outcome}`);
        setDeferredPrompt(null);
      } catch (err) {
        console.error("Installation prompting failed:", err);
        setShowInstallGuideModal(true);
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
  const [newStaffRole, setNewStaffRole] = useState<'admin' | 'employee'>('employee');
  const [staffError, setStaffError] = useState('');

  const handleCreateStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffUser.trim() || !newStaffPass.trim()) {
      setStaffError('Please fill out all registration inputs.');
      return;
    }
    if (employees.some(emp => emp.username.toLowerCase() === newStaffUser.trim().toLowerCase())) {
      setStaffError('Username already exists on record.');
      return;
    }
    const newWorker: EmployeeUser = {
      id: 'emp-' + Math.random().toString(36).substring(2, 9),
      username: newStaffUser.trim().toLowerCase(),
      password: newStaffPass,
      name: newStaffName.trim(),
      role: newStaffRole
    };
    handleAddNewEmployee(newWorker);
    setNewStaffName('');
    setNewStaffUser('');
    setNewStaffPass('');
    setNewStaffRole('employee');
    setStaffError('');
    alert(`Successfully registered staff member "${newWorker.name}" as ${newWorker.role}!`);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
  useEffect(() => {
    const loadData = async () => {
      setIsBuffering(true);
      try {
        // Load and seed employees
        const savedEmployees = localStorage.getItem('mena_inc_employees_v3');
        let initialEmployees = DEFAULT_USERS;
        if (savedEmployees) {
          try {
            initialEmployees = JSON.parse(savedEmployees);
          } catch (_) {}
        }
        setEmployees(initialEmployees);

        // Load active login session
        const savedUser = localStorage.getItem('mena_inc_current_user_v3');
        if (savedUser) {
          try {
            setCurrentUser(JSON.parse(savedUser));
          } catch (_) {}
        }

        const savedStocks = localStorage.getItem(LOCAL_STORAGE_STOCKS_KEY);
        const savedCustomers = localStorage.getItem(LOCAL_STORAGE_CUSTOMERS_KEY);
        const savedBanks = localStorage.getItem(LOCAL_STORAGE_BANKS_KEY);
        const savedPurchases = localStorage.getItem(LOCAL_STORAGE_PURCHASES_KEY);
        const savedCategories = localStorage.getItem(LOCAL_STORAGE_CATEGORIES_KEY);
        
        let initialS = DEFAULT_PAPER_STOCKS;
        let initialC = INITIAL_CUSTOMERS;
        let initialB = DEFAULT_BANK_ACCOUNTS;
        let initialP = INITIAL_PURCHASES;
        let initialCat = INITIAL_EXPENSE_CATEGORIES;
        
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

        const { isSupabaseConfigured } = await import('./lib/supabase');
        setLiveDbLinked(isSupabaseConfigured);

        const { 
          fetchAllPaperStocks, 
          fetchAllCustomers, 
          fetchAllBankAccounts,
          fetchAllPurchases,
          fetchAllExpenseCategories
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
          const full = (repaired.quantity || 0) * (repaired.unitPrice || 0);
          const remaining = full - (repaired.advancePayment || 0);
          if (remaining > 0) {
            repaired.bankRemainingId = '';
          }
          return repaired;
        });
        const finalB = await fetchAllBankAccounts(initialB);
        const finalP = await fetchAllPurchases(initialP);
        const finalCat = await fetchAllExpenseCategories(initialCat);
        
        setPaperStocks(finalS);
        setCustomers(finalC);
        setBankAccounts(finalB);
        setPurchases(finalP);
        setCategories(finalCat);
        
        const { supabaseValidationError } = await import('./lib/supabase');
        setDbValidationError(supabaseValidationError);
        
        localStorage.setItem(LOCAL_STORAGE_STOCKS_KEY, JSON.stringify(finalS));
        localStorage.setItem(LOCAL_STORAGE_CUSTOMERS_KEY, JSON.stringify(finalC));
        localStorage.setItem(LOCAL_STORAGE_BANKS_KEY, JSON.stringify(finalB));
        localStorage.setItem(LOCAL_STORAGE_PURCHASES_KEY, JSON.stringify(finalP));
        localStorage.setItem(LOCAL_STORAGE_CATEGORIES_KEY, JSON.stringify(finalCat));
      } catch (err) {
        // Fallback
      } finally {
        setTimeout(() => setIsBuffering(false), 500);
      }
    };

    loadData();
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
      const deletePromises = deletedStocks.map(ds => deletePaperStockDoc(ds.id).catch(() => {}));
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
      await deleteCustomerDoc(id);
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
      const deletePromises = deletedItems.map(item => deleteCustomerDoc(item.id).catch(() => {}));
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

  const handleDeleteBankAccount = async (id: string) => {
    setIsBuffering(true);
    const target = bankAccounts.find(item => item.id === id);
    if (target) {
      setDeletedHistory({
        type: 'bank',
        data: target,
        timestamp: Date.now()
      });
    }
    const updated = bankAccounts.filter(item => item.id !== id);
    handleUpdateBankAccountsLocal(updated);
    try {
      const { deleteBankAccountDoc } = await import('./lib/dbService');
      await deleteBankAccountDoc(id);
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
          promises.push(deletePurchaseDoc(oldId).catch(() => {}));
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
      const deletePromises = deletedCats.map(cat => deleteExpenseCategoryDoc(cat.id).catch(() => {}));
      
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
        await saveCustomerDoc(item);
      } else if (type === 'bulk-customers') {
        const items = data as Customer[];
        const updated = [...items, ...customers];
        handleUpdateCustomers(updated);
        const { saveCustomerDoc } = await import('./lib/dbService');
        for (const item of items) {
          await saveCustomerDoc(item);
        }
      } else if (type === 'bank') {
        const item = data as BankAccount;
        const updated = [...bankAccounts, item];
        handleUpdateBankAccountsLocal(updated);
        const { saveBankAccountDoc } = await import('./lib/dbService');
        await saveBankAccountDoc(item);
      } else if (type === 'stock') {
        const items = data as PaperStock[];
        const updated = [...paperStocks, ...items];
        setPaperStocks(updated);
        localStorage.setItem(LOCAL_STORAGE_STOCKS_KEY, JSON.stringify(updated));
        const { savePaperStockDoc } = await import('./lib/dbService');
        for (const stock of items) {
          await savePaperStockDoc(stock);
        }
      }
    } catch (e) {
      console.error("Undo action failed", e);
    } finally {
      setTimeout(() => setIsBuffering(false), 500);
    }
  };

  // Safe non-blocking visual implementation of database overwrite
  const executeResetToDemo = async () => {
    setShowResetOverlay(false);
    setIsBuffering(true);
    try {
      setPaperStocks(DEFAULT_PAPER_STOCKS);
      setCustomers(INITIAL_CUSTOMERS);
      setBankAccounts(DEFAULT_BANK_ACCOUNTS);
      localStorage.setItem(LOCAL_STORAGE_STOCKS_KEY, JSON.stringify(DEFAULT_PAPER_STOCKS));
      localStorage.setItem(LOCAL_STORAGE_CUSTOMERS_KEY, JSON.stringify(INITIAL_CUSTOMERS));
      localStorage.setItem(LOCAL_STORAGE_BANKS_KEY, JSON.stringify(DEFAULT_BANK_ACCOUNTS));

      const { savePaperStockDoc, saveCustomerDoc, saveBankAccountDoc } = await import('./lib/dbService');
      const stockPromises = DEFAULT_PAPER_STOCKS.map(stock => savePaperStockDoc(stock).catch(() => {}));
      const custPromises = INITIAL_CUSTOMERS.map(cust => saveCustomerDoc(cust).catch(() => {}));
      const bankPromises = DEFAULT_BANK_ACCOUNTS.map(acct => saveBankAccountDoc(acct).catch(() => {}));
      
      await Promise.allSettled([...stockPromises, ...custPromises, ...bankPromises]);
    } catch (_) {} finally {
      setTimeout(() => setIsBuffering(false), 600);
    }
  };

  // Staff and Authentication mutators
  const handleAddNewEmployee = (newEmp: EmployeeUser) => {
    const updated = [...employees, newEmp];
    setEmployees(updated);
    localStorage.setItem('mena_inc_employees_v3', JSON.stringify(updated));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('mena_inc_current_user_v3');
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
  const collectionsRef = React.useRef({ paperStocks, customers, bankAccounts, purchases, categories });
  
  useEffect(() => {
    collectionsRef.current = { paperStocks, customers, bankAccounts, purchases, categories };
  }, [paperStocks, customers, bankAccounts, purchases, categories]);

  // Background database polling to fetch updates when online and linked
  useEffect(() => {
    if (!liveDbLinked || !isOnline) return;

    const intervalId = setInterval(async () => {
      // Skip sync if the browser tab is in the background
      if (document.hidden) return;

      try {
        const { 
          fetchAllPaperStocks, 
          fetchAllCustomers, 
          fetchAllBankAccounts,
          fetchAllPurchases,
          fetchAllExpenseCategories
        } = await import('./lib/dbService');

        const current = collectionsRef.current;

        // Fetch all tables concurrently in parallel
        const [newS, newC, newB, newP, newCat] = await Promise.all([
          fetchAllPaperStocks(current.paperStocks),
          fetchAllCustomers(current.customers),
          fetchAllBankAccounts(current.bankAccounts),
          fetchAllPurchases(current.purchases),
          fetchAllExpenseCategories(current.categories)
        ]);

        const isDifferent = (a: any[], b: any[]) => JSON.stringify(a) !== JSON.stringify(b);

        // Update states only if new data was fetched and differs from current state
        if (isDifferent(newS, current.paperStocks)) {
          setPaperStocks(newS);
          localStorage.setItem(LOCAL_STORAGE_STOCKS_KEY, JSON.stringify(newS));
        }
        if (isDifferent(newC, current.customers)) {
          // Apply repaired mappings to customers
          const repairedC = newC.map(cust => {
            const repaired = { ...cust };
            if (!repaired.advancePaymentDate) {
              repaired.advancePaymentDate = repaired.deliveryDate || new Date().toISOString().split('T')[0];
            }
            return repaired;
          });
          setCustomers(repairedC);
          localStorage.setItem(LOCAL_STORAGE_CUSTOMERS_KEY, JSON.stringify(repairedC));
        }
        if (isDifferent(newB, current.bankAccounts)) {
          setBankAccounts(newB);
          localStorage.setItem(LOCAL_STORAGE_BANKS_KEY, JSON.stringify(newB));
        }
        if (isDifferent(newP, current.purchases)) {
          setPurchases(newP);
          localStorage.setItem(LOCAL_STORAGE_PURCHASES_KEY, JSON.stringify(newP));
        }
        if (isDifferent(newCat, current.categories)) {
          setCategories(newCat);
          localStorage.setItem(LOCAL_STORAGE_CATEGORIES_KEY, JSON.stringify(newCat));
        }
      } catch (err) {
        console.warn("Background database synchronization failed:", err);
      }
    }, 10000); // Sync check every 10 seconds

    return () => clearInterval(intervalId);
  }, [liveDbLinked, isOnline]);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-4 selection:bg-[#ee317b]/30 font-sans">
        <div className="w-full max-w-md bg-[#121212] border border-[#262626] p-8 shadow-2xl relative">
          <div className="absolute top-0 left-0 w-2 h-2 bg-[#ee317b]" />
          <div className="absolute top-0 right-0 w-2 h-2 bg-[#71b536]" />
          <div className="absolute bottom-0 left-0 w-2 h-2 bg-[#71b536]" />
          <div className="absolute bottom-0 right-0 w-2 h-2 bg-[#ee317b]" />
          
          <div className="text-center mb-8">
            <div className="relative inline-block mb-3">
              <img 
                src="https://lh3.googleusercontent.com/d/1bpYlthdXFMnenMktbIvvyRghAooaBh8r" 
                alt="Mena Logo" 
                className="w-16 h-16 object-contain bg-[#181818] border border-[#262626] p-1 mx-auto"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -bottom-1 -right-1 bg-[#ee317b] text-black p-1 text-[9px] font-bold leading-none">
                <Lock className="w-3 h-3" />
              </div>
            </div>
            <h2 className="text-xl font-bold tracking-tight uppercase">AUTHENTICATED GATEWAY</h2>
            <p className="text-xs text-gray-500 font-mono tracking-widest uppercase mt-1">Mena Inc. Corporate Security</p>
          </div>

          {loginError && (
            <div className="bg-[#31111E] border border-[#ee317b]/25 text-[#F87171] p-3 text-xs mb-5 font-mono border-l-2 border-l-[#ee317b]">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1 font-bold">Username / Operator ID</label>
              <input
                type="text"
                required
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full bg-[#181818] border border-[#262626] px-3.5 py-2 text-sm text-white focus:border-[#ee317b] outline-none font-mono"
                placeholder="e.g. bereket"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1 font-bold">Passkey Keyphrase</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full bg-[#181818] border border-[#262626] px-3.5 py-2 text-sm text-white focus:border-[#ee317b] outline-none font-mono font-sans"
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
              className="w-full bg-[#ee317b] text-black font-bold font-mono py-2.5 hover:bg-white hover:text-black transition-all cursor-pointer text-xs uppercase"
            >
              Verify &amp; Unlock Space
            </button>
          </form>

          <div className="mt-4">
            <button
              type="button"
              onClick={triggerPwaInstall}
              className="w-full bg-[#181818] text-[#71b536] hover:text-white border border-[#71b536]/30 hover:border-[#71b536] font-bold font-mono py-2 hover:bg-[#71b536]/10 transition-all cursor-pointer text-xs uppercase flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Download Web App
            </button>
          </div>

          <div className="mt-8 border-t border-[#232323] pt-5">
            <span className="block text-[9px] uppercase tracking-wider font-mono text-[#71b536] mb-2 font-bold">Standard Demorun Credentials:</span>
            <div className="bg-[#181818] p-3 rounded-none text-[11px] font-mono text-gray-400 space-y-1 bg-opacity-40">
              <div className="flex justify-between">
                <span>🛡️ Admin:</span>
                <span className="text-white">admin / admin</span>
              </div>
              <div className="flex justify-between border-t border-[#232323] pt-1 mt-1">
                <span>👤 Employee (Restricted):</span>
                <span className="text-[#ee317b]">bereket / 1234</span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>👤 Employee (Restricted):</span>
                <span>yeabsra / 1234</span>
              </div>
            </div>
            <p className="text-[9px] text-gray-600 mt-3 font-mono leading-relaxed">
              * Employees possess full read/write customer logs capabilities, but deletions, inventory initial values updates, and financials are guarded exclusively for Admins.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E2E8F0] flex flex-col font-sans select-none antialiased" style={{ lineSpacing: "1.15" }}>

      {/* Telegram-style Connection Status indicator bar */}
      {!isOnline && (
        <div className="bg-[#C53030] text-white text-center py-1 px-3 text-xs font-mono font-bold flex items-center justify-center gap-2 animate-pulse sticky top-0 z-50 shadow-md">
          <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
          <span>CONNECTING TO DIRECT DIGITAL LEDGER... (WORKING OFFLINE)</span>
        </div>
      )}

      {/* Top Executive Header */}
      <header className="bg-[#121212] border-b border-[#262626] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">

            {/* Branding Logo - Utilizing the Premium Custom Logo */}
            <div className="flex items-center gap-3">
              <img 
                src="https://lh3.googleusercontent.com/d/1bpYlthdXFMnenMktbIvvyRghAooaBh8r" 
                alt="Mena Logo" 
                className="w-10 h-10 object-contain bg-[#121212] border border-[#262626] p-0.5 rounded-none"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                  const fallback = document.getElementById('branding-icon-fallback');
                  if (fallback) fallback.classList.remove('hidden');
                }}
              />
              <div id="branding-icon-fallback" className="w-9 h-9 rounded-none bg-[#ee317b] flex items-center justify-center text-white shadow-sm font-bold hidden">
                <Database className="w-5 h-5 text-black" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white tracking-tight font-sans">
                  MENA INC. <span className="font-medium text-[#ee317b] font-mono text-xs">V2.1</span>
                </h1>
                <p className="text-[10px] text-gray-500 font-mono tracking-wider uppercase hidden sm:block">Advanced Database &amp; Inventory System</p>
              </div>
            </div>

              {/* Utility Status, Clock & Reset */}
             <div className="hidden md:flex items-center gap-2 sm:gap-4 select-none flex-wrap py-2">
               
               {/* Logged in User Tag */}
               <div className="flex items-center gap-1.5 bg-[#181818] border border-[#262626] px-2.5 py-1 text-xs">
                 {currentUser.role === 'admin' ? (
                   <Shield className="w-3.5 h-3.5 text-[#ee317b]" />
                 ) : (
                   <User className="w-3.5 h-3.5 text-[#71b536]" />
                 )}
                 <span className="text-gray-200 font-mono tracking-wide font-medium">{currentUser.name}</span>
                 <span className={`text-[8px] uppercase tracking-wider px-1 border font-bold font-mono py-0.5 ml-1 hidden xs:inline ${
                   currentUser.role === 'admin' ? 'bg-[#31111E] text-[#ee317b] border-[#ee317b]/15' : 'bg-[#1b2b1a] text-[#71b536] border-[#71b536]/15'
                 }`}>
                   {currentUser.role}
                 </span>
               </div>

               {/* Staff Settings Trigger for Admins */}
               {currentUser.role === 'admin' && (
                 <button
                   type="button"
                   onClick={() => setShowStaffModal(true)}
                   className="bg-[#181818] hover:bg-[#202020] border border-[#262626] text-xs hover:text-[#ee317b] text-gray-300 px-2.5 py-1.5 rounded-none font-mono flex items-center gap-1 cursor-pointer transition-colors"
                   title="Manage Employee passkeys and register workers"
                 >
                   <UserPlus className="w-3.5 h-3.5 text-[#ee317b]" />
                   <span className="hidden md:inline">Staff Settings</span>
                 </button>
               )}

               <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400 font-mono bg-[#181818] border border-[#262626] px-2.5 py-1 rounded-none">
                 <Clock className="w-3.5 h-3.5 text-[#ee317b] animate-pulse" />
                 <span>UTC: {timeStr || '08:12'}</span>
               </div>

               <button
                 type="button"
                 onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                 className="text-xs text-gray-300 hover:text-[#ee317b] bg-[#181818] hover:bg-[#202020] border border-[#262626] p-1.5 rounded-none transition-all cursor-pointer flex items-center gap-1.5"
                 title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
               >
                 {theme === 'dark' ? (
                   <>
                     <Sun className="w-3.5 h-3.5 text-amber-400" />
                     <span className="hidden md:inline">Light</span>
                   </>
                 ) : (
                   <>
                     <Moon className="w-3.5 h-3.5 text-sky-450" />
                     <span className="hidden md:inline">Dark</span>
                   </>
                 )}
               </button>

               <button
                 type="button"
                 onClick={handleLogout}
                 className="text-xs text-gray-400 hover:text-[#ee317b] bg-[#181818] hover:bg-[#202020] border border-[#262626] p-1.5 rounded-none transition-all cursor-pointer"
                 title="Log Out Operator"
               >
                 <LogOut className="w-3.5 h-3.5" />
               </button>
             </div>

             {/* Mobile hamburger icon trigger button */}
             <button
               type="button"
               onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
               className="md:hidden p-2 text-stone-400 hover:text-white bg-[#181818] border border-[#262626] rounded-none focus:outline-none transition-colors cursor-pointer flex items-center justify-center"
               aria-label="Toggle Navigation Menu"
             >
               {isMobileMenuOpen ? (
                 <X className="w-5 h-5 text-[#ee317b]" />
               ) : (
                 <Menu className="w-5 h-5 text-white" />
               )}
             </button>

           </div>
         </div>

         {/* Mobile Dropdown Menu Drawer */}
         <AnimatePresence>
           {isMobileMenuOpen && (
             <motion.div
               initial={{ height: 0, opacity: 0 }}
               animate={{ height: 'auto', opacity: 1 }}
               exit={{ height: 0, opacity: 0 }}
               transition={{ duration: 0.2, ease: 'easeInOut' }}
               className="absolute left-0 right-0 top-16 md:hidden border-b border-[#262626] bg-[#121212]/95 backdrop-blur-md overflow-hidden shadow-2xl z-50"
             >
               <div className="px-4 py-4 space-y-4 font-mono">
                 
                 {/* Logged in User Tag */}
                 <div className="flex items-center justify-between bg-[#181818] border border-[#262626] px-3 py-2 text-xs">
                   <div className="flex items-center gap-1.5">
                     {currentUser.role === 'admin' ? (
                       <Shield className="w-3.5 h-3.5 text-[#ee317b]" />
                     ) : (
                       <User className="w-3.5 h-3.5 text-[#71b536]" />
                     )}
                     <span className="text-gray-200 tracking-wide font-medium">{currentUser.name}</span>
                   </div>
                   <span className={`text-[8px] uppercase tracking-wider px-1.5 border font-bold py-0.5 ${
                     currentUser.role === 'admin' ? 'bg-[#31111E] text-[#ee317b] border-[#ee317b]/15' : 'bg-[#1b2b1a] text-[#71b536] border-[#71b536]/15'
                   }`}>
                     {currentUser.role}
                   </span>
                 </div>

                 {/* Clock / Time Info */}
                 <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-[#181818] border border-[#262626] px-3 py-2">
                   <Clock className="w-3.5 h-3.5 text-[#ee317b] animate-pulse" />
                   <span>UTC: {timeStr || '08:12'}</span>
                 </div>

                 {/* Vertical Tab Navigation */}
                 <div className="space-y-1.5">
                   <span className="block text-[9px] uppercase tracking-wider text-gray-500 font-bold mb-1">Navigation</span>
                   
                   {/* Tab 1: Customer Management */}
                   <button
                     onClick={() => {
                       setActiveTab('customers');
                       setIsMobileMenuOpen(false);
                     }}
                     className={`w-full py-2.5 px-3 border border-[#262626] text-left font-sans text-xs flex items-center justify-between cursor-pointer transition-colors rounded-none ${
                       activeTab === 'customers'
                         ? 'bg-[#31111E]/40 border-[#ee317b] text-[#ee317b] font-bold'
                         : 'bg-[#181818] text-gray-400 hover:text-white'
                     }`}
                   >
                     <div className="flex items-center gap-2">
                       <Users className="w-4 h-4" />
                       <span>Customer Management</span>
                     </div>
                     <span className={`text-[9px] px-1.5 py-0.5 rounded-none font-mono ${activeTab === 'customers' ? 'bg-[#ee317b] text-black font-extrabold' : 'bg-[#222222] text-gray-400'}`}>
                       {customers.length}
                     </span>
                   </button>

                   {/* Tab 2: Inventory Dashboard */}
                   <button
                     onClick={() => {
                       setActiveTab('inventory');
                       setIsMobileMenuOpen(false);
                     }}
                     className={`w-full py-2.5 px-3 border border-[#262626] text-left font-sans text-xs flex items-center justify-between cursor-pointer transition-colors rounded-none ${
                       activeTab === 'inventory'
                         ? 'bg-[#31111E]/40 border-[#ee317b] text-[#ee317b] font-bold'
                         : 'bg-[#181818] text-gray-400 hover:text-white'
                     }`}
                   >
                     <div className="flex items-center gap-2">
                       <Package className="w-4 h-4" />
                       <span>Inventory Dashboard</span>
                     </div>
                     <span className={`text-[9px] px-1.5 py-0.5 rounded-none font-mono ${activeTab === 'inventory' ? 'bg-[#ee317b] text-black font-extrabold' : 'bg-[#222222] text-gray-400'}`}>
                       {paperStocks.length}
                     </span>
                   </button>

                   {/* Tab 3: Purchases Ledger */}
                   <button
                     onClick={() => {
                       setActiveTab('purchases');
                       setIsMobileMenuOpen(false);
                     }}
                     className={`w-full py-2.5 px-3 border border-[#262626] text-left font-sans text-xs flex items-center justify-between cursor-pointer transition-colors rounded-none ${
                       activeTab === 'purchases'
                         ? 'bg-[#31111E]/40 border-[#ee317b] text-[#ee317b] font-bold'
                         : 'bg-[#181818] text-gray-400 hover:text-white'
                     }`}
                   >
                     <div className="flex items-center gap-2">
                       <Database className="w-4 h-4" />
                       <span>Purchases &amp; Expenses</span>
                     </div>
                     <span className={`text-[9px] px-1.5 py-0.5 rounded-none font-mono ${activeTab === 'purchases' ? 'bg-[#ee317b] text-black font-extrabold' : 'bg-[#222222] text-gray-400'}`}>
                       {purchases.length}
                     </span>
                   </button>

                   {/* Tab 4: Performance Summary */}
                   <button
                     onClick={() => {
                       setActiveTab('performance');
                       setIsMobileMenuOpen(false);
                     }}
                     className={`w-full py-2.5 px-3 border border-[#262626] text-left font-sans text-xs flex items-center justify-between cursor-pointer transition-colors rounded-none ${
                       activeTab === 'performance'
                         ? 'bg-[#31111E]/40 border-[#ee317b] text-[#ee317b] font-bold'
                         : 'bg-[#181818] text-gray-400 hover:text-white'
                     }`}
                   >
                     <div className="flex items-center gap-2">
                       <TrendingUp className="w-4 h-4" />
                       <span>Performance Summary</span>
                     </div>
                   </button>
                 </div>

                 {/* System Actions */}
                 <div className="space-y-2 pt-2 border-t border-[#222222]">
                   <span className="block text-[9px] uppercase tracking-wider text-gray-500 font-bold mb-1">Actions</span>
                   
                   <div className="grid grid-cols-2 gap-2">
                     {/* Theme Toggle */}
                     <button
                       type="button"
                       onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                       className="w-full text-left text-xs text-gray-300 hover:text-[#ee317b] bg-[#181818] border border-[#262626] px-3 py-2 rounded-none transition-all cursor-pointer flex items-center gap-1.5 justify-center"
                     >
                       {theme === 'dark' ? (
                         <>
                           <Sun className="w-3.5 h-3.5 text-amber-400" />
                           <span>Light Mode</span>
                         </>
                       ) : (
                         <>
                           <Moon className="w-3.5 h-3.5 text-sky-400" />
                           <span>Dark Mode</span>
                         </>
                       )}
                     </button>

                     {/* Logout */}
                     <button
                       type="button"
                       onClick={() => {
                         setIsMobileMenuOpen(false);
                         handleLogout();
                       }}
                       className="w-full text-left text-xs text-gray-350 hover:text-rose-400 bg-[#181818] border border-[#262626] px-3 py-2 rounded-none transition-all cursor-pointer flex items-center gap-1.5 justify-center"
                     >
                       <LogOut className="w-3.5 h-3.5 text-rose-500" />
                       <span>Log Out</span>
                     </button>
                   </div>

                   {/* Staff Settings for Admins */}
                   {currentUser.role === 'admin' && (
                     <button
                       type="button"
                       onClick={() => {
                         setIsMobileMenuOpen(false);
                         setShowStaffModal(true);
                       }}
                       className="w-full bg-[#181818] hover:bg-[#202020] border border-[#262626] text-xs hover:text-[#ee317b] text-gray-250 py-2 rounded-none font-mono flex items-center justify-center gap-1.5 cursor-pointer transition-colors mt-2"
                     >
                       <UserPlus className="w-3.5 h-3.5 text-[#ee317b]" />
                       <span>Manage Staff Settings</span>
                     </button>
                   )}
                 </div>

               </div>
             </motion.div>
           )}
         </AnimatePresence>
       </header>

      {/* Main Core Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Navigation Tabs - Switched Order and made scrollable on Mobile for extreme responsiveness */}
        <div className="border-b border-[#262626] hidden md:block">
          <nav className="flex overflow-x-auto whitespace-nowrap scrollbar-none-x space-x-4 md:space-x-6 -mb-px" aria-label="Tabs Selector">

            {/* Tab 1: Customer Management (Now First!) */}
            <button
              id="tab-cust-trigger"
              onClick={() => setActiveTab('customers')}
              className={`py-4 px-1 border-b-2 font-medium font-sans text-sm flex items-center gap-2 cursor-pointer transition-colors rounded-none ${
                activeTab === 'customers'
                  ? 'border-[#ee317b] text-[#ee317b]'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-[#ee317b]/40'
              }`}
            >
              <Users className="w-4 h-4" />
              Customer Management
              <span className={`text-[10px] px-1.5 py-0.5 rounded-none font-mono ${activeTab === 'customers' ? 'bg-[#31111E] text-[#ee317b]' : 'bg-[#181818] text-gray-400'}`}>
                {customers.length}
              </span>
            </button>

            {/* Tab 2: Inventory Dashboard */}
            <button
              id="tab-inv-trigger"
              onClick={() => setActiveTab('inventory')}
              className={`py-4 px-1 border-b-2 font-medium font-sans text-sm flex items-center gap-2 cursor-pointer transition-colors rounded-none ${
                activeTab === 'inventory'
                  ? 'border-[#ee317b] text-[#ee317b]'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-[#ee317b]/40'
              }`}
            >
              <Package className="w-4 h-4" />
              Inventory Dashboard
              <span className={`text-[10px] px-1.5 py-0.5 rounded-none font-mono ${activeTab === 'inventory' ? 'bg-[#31111E] text-[#ee317b]' : 'bg-[#181818] text-gray-400'}`}>
                {paperStocks.length}
              </span>
            </button>

            {/* Tab 3: Purchased Items & Services */}
            <button
              id="tab-purchases-trigger"
              onClick={() => setActiveTab('purchases')}
              className={`py-4 px-1 border-b-2 font-medium font-sans text-sm flex items-center gap-2 cursor-pointer transition-colors rounded-none ${
                activeTab === 'purchases'
                  ? 'border-[#ee317b] text-[#ee317b]'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-[#ee317b]/30'
              }`}
            >
              <Database className="w-4 h-4" />
              Purchases &amp; Expenses Ledger
              <span className={`text-[10px] px-1.5 py-0.5 rounded-none font-mono ${activeTab === 'purchases' ? 'bg-[#31111E] text-[#ee317b]' : 'bg-[#181818] text-gray-400'}`}>
                {purchases.length}
              </span>
            </button>

            {/* Tab 4: Business Performance Summary */}
            <button
              id="tab-perf-trigger"
              onClick={() => setActiveTab('performance')}
              className={`py-4 px-1 border-b-2 font-medium font-sans text-sm flex items-center gap-2 cursor-pointer transition-colors rounded-none ${
                activeTab === 'performance'
                  ? 'border-[#ee317b] text-[#ee317b]'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-[#ee317b]/30'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Business Performance Summary
            </button>

          </nav>
        </div>

        {/* ACTIVE MODULE CONTAINER */}
        <div className="transition-all duration-300">
          {dbValidationError && (
            <div className="mb-6 bg-[#160b0e] border-l-4 border-[#ee317b] p-5 font-mono text-xs text-left max-w-7xl mx-auto space-y-4">
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
                <p className="font-semibold text-[#ee317b] font-mono text-xs">
                  ⚠️ Live Error: <code className="bg-[#240c11] px-1.5 py-0.5 text-white font-mono break-all">{dbValidationError}</code>
                </p>
                <p className="pt-1">
                  Because the database tables are either missing or have <strong>Row Level Security (RLS)</strong> enabled, your app has <strong>automatically and safely loaded all data from local JSON storage</strong> so that you don't lose any of your progress.
                </p>
                
                <div className="mt-3 bg-[#0a0a0a] p-4 border border-[#202020] rounded-none space-y-3 font-sans text-xs">
                  <div className="text-[#71b536] font-bold font-mono uppercase tracking-wider text-[11px]">⚙️ Step-by-Step Fix (Takes 30 seconds):</div>
                  <ol className="list-decimal list-inside space-y-2 text-gray-400">
                    <li>
                      Log into your <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-[#71b536] underline hover:text-[#8ce644]">Supabase Dashboard</a>.
                    </li>
                    <li>
                      Open your project, look at the left sidebar, and click <strong>"SQL Editor"</strong> (the terminal icon).
                    </li>
                    <li>
                      Click <strong>"New query"</strong>, click the green button top right <strong className="text-white cursor-pointer hover:underline" onClick={() => setShowDbConfigModal(true)}>"View Bootstrapping SQL"</strong>, copy the complete script, paste it in, and click <strong>"Run"</strong>.
                    </li>
                    <li className="text-yellow-400 font-semibold font-mono text-[11px]">
                      • IMPORTANT: The script contains commands to disable Row Level Security (RLS) on each table (e.g. <code>ALTER TABLE public.paper_stocks DISABLE ROW LEVEL SECURITY;</code>). Supabase enables RLS by default, which blocks insertions unless disabled!
                    </li>
                    <li>
                      Once the SQL statement successfully completes, **reload this page**! The app will automatically connect, sync, and seed the default database.
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
              onResetStocks={() => setShowResetOverlay('stocks')}
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

          {activeTab === 'customers' && (
            <CustomerTab
              customers={customers}
              paperStocks={paperStocks}
              bankAccounts={bankAccounts}
              onAddCustomer={handleAddCustomer}
              onUpdateCustomer={handleEditCustomer}
              onDeleteCustomer={handleDeleteCustomer}
              onBulkUpdateCustomers={handleBulkUpdateCustomers}
              currentUser={currentUser}
              employees={employees}
            />
          )}

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
      <footer className="bg-[#121212] border-t border-[#262626] mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center text-gray-500 text-xs font-sans gap-4 select-none">
          <p>© 2026 Mena Inc. All Rights Reserved. Fully integrated v2 paper ledger engine.</p>
          <div className="flex gap-4">
            <span className="flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-[#ee317b]" />
              Secure CRM &amp; Inventory Engine (V2.1)
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
            className="fixed bottom-4 right-4 left-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 bg-[#121212] border border-[#ee317b] text-white p-4 shadow-2xl flex flex-col gap-3 max-w-[calc(100vw-2rem)] sm:max-w-sm w-full font-mono text-xs select-none overscroll-contain"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121212] border border-[#262626] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col relative"
            >
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-[#ee317b] to-[#71b536]" />
              
              {/* Modal header */}
              <div className="px-6 py-4 border-b border-[#262626] flex justify-between items-center bg-[#181818]/60">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#ee317b]" />
                  <h3 className="text-sm font-bold font-mono tracking-wider uppercase text-white">Staff passkey &amp; Access Controls</h3>
                </div>
                <button
                  onClick={() => { setShowStaffModal(false); setStaffError(''); }}
                  className="text-gray-400 hover:text-white cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5 flex-shrink-0" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[80vh] space-y-6">
                
                {/* Add dynamic worker form */}
                <form onSubmit={handleCreateStaffSubmit} className="bg-[#181818] border border-[#262626] p-4 space-y-4 font-mono">
                  <span className="text-[10px] text-[#71b536] tracking-wider uppercase font-bold block">Add Staff Personnel / Operator</span>
                  
                  {staffError && (
                    <div className="bg-[#31111E] border border-[#ee317b]/15 p-2.5 text-xs text-[#F87171] border-l border-[#ee317b]">
                      {staffError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase text-gray-500 mb-1">Human Worker Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Samuel Kebede"
                        value={newStaffName}
                        onChange={(e) => setNewStaffName(e.target.value)}
                        className="w-full bg-[#121212] border border-[#262626] text-xs px-2.5 py-1.5 focus:border-[#ee317b] focus:border outline-none text-white font-sans"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase text-gray-500 mb-1">Login Username</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. samuel"
                        value={newStaffUser}
                        onChange={(e) => setNewStaffUser(e.target.value)}
                        className="w-full bg-[#121212] border border-[#262626] text-xs px-2.5 py-1.5 focus:border-[#ee317b] focus:border outline-none text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase text-gray-500 mb-1">Passkey Keyphrase</label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={newStaffPass}
                        onChange={(e) => setNewStaffPass(e.target.value)}
                        className="w-full bg-[#121212] border border-[#262626] text-xs px-2.5 py-1.5 focus:border-[#ee317b] focus:border outline-none text-white font-mono tracking-widest"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase text-gray-500 mb-1">System clearance Role</label>
                      <select
                        value={newStaffRole}
                        onChange={(e) => setNewStaffRole(e.target.value as 'admin' | 'employee')}
                        className="w-full bg-[#121212] border border-[#262626] text-xs px-2.5 py-1.5 focus:border-[#ee317b] focus:border outline-none text-white font-mono cursor-pointer"
                      >
                        <option value="employee">Employee - Read/Write, NO Deletes</option>
                        <option value="admin">Admin - Full access</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="bg-[#71b536] hover:bg-white text-black font-bold text-xs uppercase px-4 py-1.5 rounded-none font-mono transition-colors cursor-pointer"
                    >
                      Authorize Operator
                    </button>
                  </div>
                </form>

                {/* Registered Workers List */}
                <div className="space-y-3 font-mono">
                  <span className="text-[10px] text-gray-500 tracking-wider uppercase font-bold block">Current Registered Workforce ({employees.length})</span>
                  
                  <div className="border border-[#262626] bg-[#141414] divide-y divide-[#232323] overflow-hidden">
                    {employees.map(emp => (
                      <div key={emp.username} className="px-4 py-3 flex items-center justify-between text-xs font-mono">
                        <div>
                          <span className="font-semibold text-white font-sans">{emp.name}</span>
                          <span className="text-[10px] text-gray-550 block">Username ID: <span className="text-gray-300">{emp.username}</span> | Passkey: <span className="text-gray-400">{emp.password}</span></span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 text-[9px] uppercase font-bold ${
                            emp.role === 'admin' 
                              ? 'bg-[#31111E] text-[#ee317b] border border-[#ee317b]/20' 
                              : 'bg-[#1b2b1a] text-[#71b536] border border-[#71b536]/20'
                          }`}>
                            {emp.role}
                          </span>
                          {currentUser && currentUser.role === 'admin' && currentUser.username !== emp.username && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to remove operator "${emp.name}"?`)) {
                                  handleDeleteEmployee(emp.username);
                                }
                              }}
                              className="p-1 text-gray-500 hover:text-red-400 border border-transparent hover:border-[#F87171]/20 rounded-none cursor-pointer transition-colors"
                              title="Delete worker credentials"
                            >
                              <span className="text-red-500 hover:text-red-400 font-bold font-mono">✕</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* System Admin Settings (Seed Defaults & Database Override) */}
                <div className="border-t border-[#262626] pt-5 space-y-3 font-mono">
                  <span className="text-[10px] text-gray-500 tracking-wider uppercase font-bold block">🔧 System Administrative Controls</span>
                  <div className="flex flex-wrap gap-2.5">
                    {/* Database Config Trigger */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowStaffModal(false);
                        setShowDbConfigModal(true);
                      }}
                      className={`flex items-center gap-1.5 text-xs font-mono px-3 py-2 rounded-none border cursor-pointer transition-all outline-none ${
                        liveDbLinked && !dbValidationError
                          ? 'bg-[#112918] text-[#71b536] border-[#71b536]/30 hover:border-[#71b536]' 
                          : 'bg-[#1E1215] text-[#ee317b] border-[#ee317b]/20 hover:border-[#ee317b]'
                      }`}
                    >
                      <Wifi className={`w-3.5 h-3.5 ${(liveDbLinked && !dbValidationError) ? 'animate-pulse' : ''}`} />
                      <span>Configure Relational Database Link</span>
                    </button>

                    {/* Seed Defaults Trigger */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowStaffModal(false);
                        setShowResetOverlay('demo');
                      }}
                      className="text-xs text-[#ee317b] hover:bg-[#ee317b] hover:text-white border border-[#ee317b]/30 font-medium px-3 py-2 rounded-none flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Seed Demo Defaults</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* Modal footer */}
              <div className="px-6 py-4 border-t border-[#262626] bg-[#181818]/60 flex justify-end">
                <button
                  onClick={() => { setShowStaffModal(false); setStaffError(''); }}
                  className="bg-[#242424] hover:bg-[#323232] text-white text-xs font-mono font-medium px-4 py-1.5 transition-colors cursor-pointer rounded-none"
                >
                  Done
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🔮 SUPABASE DATABASE CONFIGURATION MODAL */}
      <AnimatePresence>
        {showDbConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121212] border border-[#262626] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col relative"
            >
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-[#ee317b] to-[#71b536]" />
              
              {/* Modal header */}
              <div className="px-6 py-4 border-b border-[#262626] flex justify-between items-center bg-[#181818]/60">
                <div className="flex items-center gap-2 font-mono">
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
                  
                  <div className="bg-[#1E1215] border border-[#ee317b]/15 p-4 font-mono text-[11px] text-gray-300 space-y-2 leading-relaxed">
                    <span className="text-[#ee317b] font-bold uppercase block">⚡ Setup Checklist (How to Seed Successfully):</span>
                    <div>1. Log into your **Supabase Dashboard** for the project.</div>
                    <div>2. Open the **SQL Editor** in the left menu.</div>
                    <div>3. Click **New query**, paste the complete SQL script shown below, and hit **Run**.</div>
                    <div className="text-yellow-400 font-semibold">• IMPORTANT: The script disables Row Level Security (RLS) on each table. This lets the web app initialize and write seed records instantly! If you already created tables earlier but got errors, running this script now will disable RLS and fix the issue immediately.</div>
                  </div>

                  {dbValidationError && (
                    <div className="bg-[#240A10] border border-[#ee317b]/50 p-4 font-mono text-[11px] text-[#ee317b] space-y-1 rounded-none text-left">
                      <span className="text-[#ee317b] font-bold uppercase flex items-center gap-1.5">
                        ⚠️ Database Synchronizer Alert:
                      </span>
                      <div className="text-gray-300 select-all font-sans leading-relaxed pt-1 whitespace-pre-wrap text-xs font-mono">
                        {dbValidationError}
                      </div>
                      <div className="text-gray-400 text-[10px] font-sans pt-2 leading-relaxed">
                        💡 Since the tables are either empty or not initialised yet, please run the SQL script below on your Supabase project. The app is falling back to safe Local JSON storage in the meantime to protect your work!
                      </div>
                    </div>
                  )}
                </div>

                {/* SQL setup schema script */}
                <div className="border-t border-[#262626] pt-4 font-mono text-left">
                  <span className="text-[10px] uppercase text-[#71b536] tracking-wider font-bold block mb-2">📋 Supabase Bootstrapping SQL Schema</span>
                  <div className="text-[10px] text-gray-400 mb-2 font-sans leading-relaxed">
                    Copy and run this schema code directly inside your **Supabase SQL Editor**:
                  </div>
                  <div className="relative bg-[#0a0a0a] border border-[#202020] p-3 text-[10px] text-gray-300 max-h-56 overflow-y-auto selection:bg-[#71b536]/25 rounded-none">
                    <pre className="whitespace-pre overflow-x-auto text-[9px] text-left leading-normal font-mono text-gray-300">
{`-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.paper_stocks (
  id text PRIMARY KEY,
  name text NOT NULL,
  "initialStock" numeric DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id text PRIMARY KEY,
  name text NOT NULL,
  "accountNumber" text,
  "initialBalance" numeric DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.expense_categories (
  id text PRIMARY KEY,
  name text NOT NULL,
  items jsonb DEFAULT '[]'::jsonb
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
  "baseAmount" numeric DEFAULT 0
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
  amount1 numeric DEFAULT 0,
  "paperType2" text,
  amount2 numeric DEFAULT 0,
  "paperType3" text,
  amount3 numeric DEFAULT 0,
  "entrancePaper" text,
  amount16 numeric DEFAULT 0,
  "ajabiPaper" text,
  amount9 numeric DEFAULT 0,
  "deliveryDate" text,
  "advancePaymentDate" text,
  "bankRemainingId" text,
  "incompletionReason" text,
  "isVatAdded" boolean DEFAULT false,
  "baseUnitPrice" numeric DEFAULT 0
);

-- Disable Row Level Security (RLS) on each table so the web app can read and write records instantly
ALTER TABLE public.paper_stocks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;`}
                    </pre>
                  </div>
                </div>

              </div>

              {/* Modal footer */}
              <div className="px-6 py-4 border-t border-[#262626] bg-[#181818]/60 flex justify-end">
                <button
                  onClick={() => setShowDbConfigModal(false)}
                  className="bg-[#242424] hover:bg-[#323232] text-white text-xs font-mono font-medium px-4 py-1.5 transition-colors cursor-pointer rounded-none"
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
            className="fixed top-4 right-4 left-4 sm:left-auto sm:right-4 z-50 flex items-center justify-between sm:justify-start gap-3 bg-[#121212]/95 border border-[#ee317b] text-white px-4 py-2.5 shadow-2xl font-mono text-xs select-none max-w-[calc(100vw-2rem)] sm:max-w-xs w-full sm:w-auto overscroll-contain"
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

      {/* ⚠️ CUSTOM CONFIRM OVERLAYS FOR THE SYSTEM SENSITIVE TRANSACTIONS */}
      <AnimatePresence>
        {showResetOverlay && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 font-mono select-none"
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
                  <h3 className="text-white text-sm font-bold uppercase tracking-wider">
                    {showResetOverlay === 'demo' ? 'System Database Overwrite Request' : 'Initial Paper Stockroom Reset'}
                  </h3>
                  <p className="text-xs text-gray-400 font-sans font-normal leading-relaxed">
                    {showResetOverlay === 'demo' 
                      ? "You are requesting to overwrite Mena Inc.'s live database ledger with the default seed logs. This will flush your current customer logs, initial stockpiles, and treasury balances back to standard factory settings."
                      : "You are requesting to reset all paper stockroom variant sheet balances back to their factory startup quantities. This will modify historical inventory room status."
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#262626]">
                <button
                  onClick={() => setShowResetOverlay(false)}
                  className="px-3.5 py-1.5 text-xs text-gray-400 hover:text-white border border-[#262626] bg-[#181818] uppercase tracking-wider cursor-pointer"
                >
                  No, Abort
                </button>
                <button
                  onClick={() => {
                    if (showResetOverlay === 'demo') {
                      executeResetToDemo();
                    } else {
                      setShowResetOverlay(false);
                      handleUpdateStocks(DEFAULT_PAPER_STOCKS);
                    }
                  }}
                  className="px-4 py-1.5 text-xs bg-[#ee317b] hover:bg-[#d61e63] text-white font-bold uppercase tracking-widest cursor-pointer"
                >
                  Yes, Apply
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 📱 PWA DOWNLOAD & MOBILE INSTALLATION GUIDE MODAL */}
      <AnimatePresence>
        {showInstallGuideModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121212] border border-[#262626] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col relative font-mono"
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
                        <span className="bg-[#ee317b] text-white w-5 h-5 flex items-center justify-center rounded-none text-[10px] font-bold shrink-0">1</span>
                        <div className="space-y-1 font-sans">
                          <p className="font-bold text-gray-200 font-mono text-[11px]">Open the Safari Share Sheet</p>
                          <p className="text-gray-400 leading-normal text-[11px]">
                            Tap the <strong>Share button</strong> <span className="inline-flex items-center gap-1 p-1 bg-[#242424] text-white rounded-none font-mono text-[10px]">Share <Share2 className="w-3 h-3 text-[#ee317b]" /></span> standard control at the bottom (on iPhone) or top (on iPad) of Safari.
                          </p>
                        </div>
                      </li>

                      <li className="flex items-start gap-3 bg-[#181818] p-3 border border-[#262626]">
                        <span className="bg-[#ee317b] text-white w-5 h-5 flex items-center justify-center rounded-none text-[10px] font-bold shrink-0">2</span>
                        <div className="space-y-1 font-sans">
                          <p className="font-bold text-gray-200 font-mono text-[11px]">Select &apos;Add to Home Screen&apos;</p>
                          <p className="text-gray-400 leading-normal text-[11px]">
                            Scroll down the options list and find the item marked with a plus icon <span className="bg-[#242424] text-white font-mono px-1.5 py-0.5 font-bold text-[10px] border border-[#333]">+ Add to Home Screen</span>.
                          </p>
                        </div>
                      </li>

                      <li className="flex items-start gap-3 bg-[#181818] p-3 border border-[#262626]">
                        <span className="bg-[#ee317b] text-white w-5 h-5 flex items-center justify-center rounded-none text-[10px] font-bold shrink-0">3</span>
                        <div className="space-y-1 font-sans">
                          <p className="font-bold text-gray-200 font-mono text-[11px]">Confirm Setup Name</p>
                          <p className="text-gray-400 leading-normal text-[11px]">
                            Check the title (<strong>Mena CRM</strong>) and tap <strong className="text-[#ee317b]">Add</strong> in the top-right corner.
                          </p>
                        </div>
                      </li>
                    </ol>

                    <div className="bg-[#1E1215] border border-[#ee317b]/15 p-3 text-[10px] text-gray-400 font-mono leading-relaxed">
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
                          onClick={async () => {
                            setShowInstallGuideModal(false);
                            await triggerPwaInstall();
                          }}
                          className="w-full bg-[#71b536] hover:bg-[#5f9c2d] text-black text-xs font-bold uppercase py-2.5 transition-colors cursor-pointer text-center rounded-none"
                        >
                          📲 Trigger Instant App Download
                        </button>
                      </div>
                    ) : (
                      <ol className="space-y-4 text-xs font-sans">
                        <li className="flex items-start gap-3 bg-[#181818] p-3 border border-[#262626]">
                          <span className="bg-[#71b536] text-black w-5 h-5 flex items-center justify-center rounded-none font-mono text-[10px] font-bold shrink-0">1</span>
                          <div className="space-y-1">
                            <p className="font-bold text-gray-200 font-mono text-[11px]">Open Browser Settings</p>
                            <p className="text-gray-400 leading-normal text-[11px]">
                              Tap your browser menu (the <strong>three vertical dots icon</strong> at the top right of Chrome/Edge).
                            </p>
                          </div>
                        </li>

                        <li className="flex items-start gap-3 bg-[#181818] p-3 border border-[#262626]">
                          <span className="bg-[#71b536] text-black w-5 h-5 flex items-center justify-center rounded-none font-mono text-[10px] font-bold shrink-0">2</span>
                          <div className="space-y-1">
                            <p className="font-bold text-gray-200 font-mono text-[11px]">Tap &apos;Install app&apos; / &apos;Add to Home screen&apos;</p>
                            <p className="text-gray-400 leading-normal text-[11px]">
                              Locate and tap either <strong className="text-white">Install App</strong>, <strong className="text-white">Add Page to...</strong> or <strong className="text-white">Add to Home Screen</strong>.
                            </p>
                          </div>
                        </li>

                        <li className="flex items-start gap-3 bg-[#181818] p-3 border border-[#262626]">
                          <span className="bg-[#71b536] text-black w-5 h-5 flex items-center justify-center rounded-none font-mono text-[10px] font-bold shrink-0">3</span>
                          <div className="space-y-1">
                            <p className="font-bold text-gray-200 font-mono text-[11px]">Launch From Launcher Tray</p>
                            <p className="text-gray-400 leading-normal text-[11px]">
                              The application launches from your offline desktop or application list as a standalone database client, bypassing generic web frames!
                            </p>
                          </div>
                        </li>
                      </ol>
                    )}

                    <div className="bg-[#1C201A] border border-[#71b536]/15 p-3 text-[10px] text-gray-400 font-mono leading-relaxed">
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
                  className="bg-[#242424] hover:bg-[#323232] text-white text-xs font-mono font-medium px-4 py-1.5 transition-colors cursor-pointer rounded-none"
                >
                  Dismiss Guide
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
