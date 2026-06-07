import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Customer, BankAccount, Purchase, ExpenseCategory, PaperStock } from '../types';
import { parseFractionOrExpression, cleanLeadingZeros } from '../utils';
import { 
  exportCustomersCSV, 
  exportPurchasesCSV, 
  exportTreasuryCSV, 
  exportInventoryCSV 
} from '../utils/csvExport';
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
  Plus,
  Trash2,
  Lock,
  Edit2,
  X,
  Check,
  Calendar,
  Filter,
  RefreshCw,
  Download
} from 'lucide-react';

interface PerformanceTabProps {
  customers: Customer[];
  bankAccounts: BankAccount[];
  onAddBankAccount: (account: BankAccount) => void;
  onUpdateBankAccount: (account: BankAccount) => void;
  onDeleteBankAccount: (idOrIds: string | string[]) => void;
  purchases?: Purchase[];
  categories?: ExpenseCategory[];
  paperStocks?: PaperStock[];
}

export default function PerformanceTab({ 
  customers, 
  bankAccounts,
  onAddBankAccount,
  onUpdateBankAccount,
  onDeleteBankAccount,
  purchases = [],
  categories = [],
  paperStocks = []
}: PerformanceTabProps) {
  // New Bank dynamic form states
  const [bankName, setBankName] = useState('');
  const [bankNumber, setBankNumber] = useState('');
  const [bankInitial, setBankInitial] = useState<string>('0');
  const [isAddingBank, setIsAddingBank] = useState(false);
  const [bankError, setBankError] = useState('');

  // Inline editing variables
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editNumber, setEditNumber] = useState('');
  const [editInitial, setEditInitial] = useState<string>('0');

  // Deletion tracking state
  const [deletingBankId, setDeletingBankId] = useState<string | null>(null);

  // Multi-selection state for payment methods/bank accounts
  const [selectedBankIds, setSelectedBankIds] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Expense Period & Category Filter States
  const [expenseStartDate, setExpenseStartDate] = useState('');
  const [expenseEndDate, setExpenseEndDate] = useState('');
  const [deselectedCategories, setDeselectedCategories] = useState<string[]>([]);

  // Get all unique categories present either in setup configuration or active purchases
  const uniqueCategories = Array.from(new Set([
    ...(categories || []).map(cat => cat.name),
    ...purchases.map(p => p.expenseCategory || 'Uncategorized'),
    'Raw Paper Stocks',
    'Machinery & Tooling',
    'Consumption Supplies'
  ].filter(Boolean))).sort();

  const toggleCategory = (cat: string) => {
    setDeselectedCategories(prev => 
      prev.includes(cat) 
        ? prev.filter(c => c !== cat) 
        : [...prev, cat]
    );
  };

  const selectAllCategories = () => {
    setDeselectedCategories([]);
  };

  const deselectAllCategories = () => {
    setDeselectedCategories(uniqueCategories);
  };

  const applyDatePreset = (preset: 'all' | 'thisMonth' | 'last30' | 'thisYear') => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    if (preset === 'all') {
      setExpenseStartDate('');
      setExpenseEndDate('');
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      const tzOffset = firstDay.getTimezoneOffset() * 60000;
      const firstDayLocal = new Date(firstDay.getTime() - tzOffset).toISOString().split('T')[0];
      const lastDayLocal = new Date(lastDay.getTime() - tzOffset).toISOString().split('T')[0];
      
      setExpenseStartDate(firstDayLocal);
      setExpenseEndDate(lastDayLocal);
    } else if (preset === 'last30') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      
      const tzOffset = thirtyDaysAgo.getTimezoneOffset() * 60000;
      const thirtyDaysAgoStr = new Date(thirtyDaysAgo.getTime() - tzOffset).toISOString().split('T')[0];
      
      setExpenseStartDate(thirtyDaysAgoStr);
      setExpenseEndDate(todayStr);
    } else if (preset === 'thisYear') {
      const firstDay = new Date(today.getFullYear(), 0, 1);
      const lastDay = new Date(today.getFullYear(), 11, 31);
      
      const tzOffset = firstDay.getTimezoneOffset() * 60000;
      const firstDayLocal = new Date(firstDay.getTime() - tzOffset).toISOString().split('T')[0];
      const lastDayLocal = new Date(lastDay.getTime() - tzOffset).toISOString().split('T')[0];
      
      setExpenseStartDate(firstDayLocal);
      setExpenseEndDate(lastDayLocal);
    }
  };

  // Dynamic filtering of purchases for aggregate analysis
  const filteredPurchasesForInterval = purchases.filter(p => {
    const cat = p.expenseCategory || 'Uncategorized';
    if (deselectedCategories.includes(cat)) return false;
    if (expenseStartDate && p.purchaseDate < expenseStartDate) return false;
    if (expenseEndDate && p.purchaseDate > expenseEndDate) return false;
    return true;
  });

  const filteredExpenseSum = filteredPurchasesForInterval.reduce((sum, p) => sum + Number(p.totalPrice || 0), 0);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName.trim()) {
      setBankError('Account Name/Bank identifier is required.');
      return;
    }
    const cleanInitial = Math.max(0, parseFractionOrExpression(bankInitial));
    
    const newAcct: BankAccount = {
      id: 'b_' + Date.now().toString(),
      name: bankName.trim(),
      accountNumber: bankNumber.trim() || undefined,
      initialBalance: cleanInitial
    };
    
    onAddBankAccount(newAcct);
    setBankName('');
    setBankNumber('');
    setBankInitial('0');
    setIsAddingBank(false);
    setBankError('');
  };

  const startEditing = (b: BankAccount) => {
    setEditingBankId(b.id);
    setEditName(b.name);
    setEditNumber(b.accountNumber || '');
    setEditInitial(b.initialBalance.toString());
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) return;
    const cleanInitial = Math.max(0, parseFractionOrExpression(editInitial));

    onUpdateBankAccount({
      id,
      name: editName.trim(),
      accountNumber: editNumber.trim() || undefined,
      initialBalance: cleanInitial
    });
    setEditingBankId(null);
  };

  // --- CORE FINANCIALS ---
  
  // Total Gross Orders (ETB)
  const totalGrossOrders = customers.reduce((sum, c) => sum + (c.quantity * c.unitPrice), 0);

  // Total customer advances paid on books
  const totalAdvancePaid = customers.reduce((sum, c) => sum + Number(c.advancePayment || 0), 0);

  // Total completed client remaining balances paid on delivery
  const totalRemainingPaid = customers
    .filter(c => !!(c.deliveryDate && c.bankRemainingId))
    .reduce((sum, c) => {
      const base = c.quantity * c.unitPrice;
      const vat = c.isVatAdded ? base * 0.15 : 0;
      const invoice = base + vat;
      const remainingBytes = invoice - c.advancePayment;
      return sum + Math.max(0, remainingBytes);
    }, 0);

  // Total outgoing supplier material expenses & purchases
  const totalPurchaseExpenses = purchases.reduce((sum, p) => sum + Number(p.totalPrice || 0), 0);
  
  // Net liquid cash left in treasury = total customer intake - total supplier payments
  const collectedCashInHand = totalAdvancePaid + totalRemainingPaid - totalPurchaseExpenses;

  // Total Outstanding Debt (Active uncollected order receivables)
  const totalOutstandingDebt = customers.reduce((sum, c) => {
    // If completed order, remaining is paid (0 debt). If not, full invoice minus advance is outstanding.
    if (c.deliveryDate && c.bankRemainingId) return sum;
    const base = c.quantity * c.unitPrice;
    const vat = c.isVatAdded ? base * 0.15 : 0;
    const invoice = base + vat;
    const remaining = invoice - c.advancePayment;
    return sum + Math.max(0, remaining);
  }, 0);

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
    <div className="space-y-8 select-none" id="performance-tab-pnl">

      {/* 📅 EXPENSE PERIOD INTERVAL & CATEGORY ANALYTICS DESK */}
      <div className="bg-[#121212] border border-[#262626] rounded-md p-5 shadow-none space-y-4" id="expense-analytics-filter-desk">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#262626] pb-3 gap-3">
          <div>
            <h3 className="font-sans font-bold text-white flex items-center gap-2 uppercase tracking-wider text-sm">
              <TrendingUp className="w-5 h-5 text-[#ee317b]" />
              📊 Expense Category &amp; Interval Analysis Engine
            </h3>
            <p className="text-xs text-gray-400 mt-0.5 font-sans">
              Determine operational costs during custom date ranges and category parameters.
            </p>
          </div>
          {(expenseStartDate || expenseEndDate || deselectedCategories.length > 0) && (
            <button
              type="button"
              onClick={() => {
                setExpenseStartDate('');
                setExpenseEndDate('');
                setDeselectedCategories([]);
              }}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#2E181D] hover:bg-rose-900/40 border border-rose-900/40 text-rose-400 text-xs font-sans transition-all cursor-pointer rounded-md"
            >
              <RefreshCw className="w-3 h-3" />
              Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
          {/* Calendar boundaries */}
          <div className="lg:col-span-5 space-y-3">
            <h4 className="text-[11px] font-sans font-bold uppercase tracking-widest text-[#ee317b] flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Calendar Interval Boundaries
            </h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-gray-400 font-sans uppercase mb-1">Start Date</label>
                <input
                  type="date"
                  value={expenseStartDate}
                  onChange={(e) => setExpenseStartDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-[#181815] border border-[#262626] text-white rounded-md outline-none font-sans focus:border-[#ee317b]"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 font-sans uppercase mb-1">End Date</label>
                <input
                  type="date"
                  value={expenseEndDate}
                  onChange={(e) => setExpenseEndDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-[#181815] border border-[#262626] text-white rounded-md outline-none font-sans focus:border-[#ee317b]"
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-gray-500 font-sans mr-1">Presets:</span>
              <button
                type="button"
                onClick={() => applyDatePreset('all')}
                className={`px-2.5 py-1 text-[10px] font-sans border rounded-md cursor-pointer transition-all ${
                  !expenseStartDate && !expenseEndDate
                    ? 'bg-[#31111E] text-[#ee317b] border-[#ee317b]/45'
                    : 'bg-[#181818] text-gray-400 border-[#262626] hover:border-gray-500'
                }`}
              >
                All Time
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset('thisMonth')}
                className="px-2.5 py-1 text-[10px] font-sans bg-[#181818] text-gray-400 border border-[#262626] hover:border-gray-500 rounded-md cursor-pointer"
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset('last30')}
                className="px-2.5 py-1 text-[10px] font-sans bg-[#181818] text-gray-400 border border-[#262626] hover:border-gray-500 rounded-md cursor-pointer"
              >
                Last 30 Days
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset('thisYear')}
                className="px-2.5 py-1 text-[10px] font-sans bg-[#181818] text-gray-400 border border-[#262626] hover:border-gray-500 rounded-md cursor-pointer"
              >
                This Year
              </button>
            </div>
          </div>

          {/* Category toggles */}
          <div className="lg:col-span-7 space-y-3 border-t lg:border-t-0 lg:border-l border-[#262626] pt-4 lg:pt-0 lg:pl-6">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-sans font-bold uppercase tracking-widest text-[#71b536] flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                Operational Expense Categories
              </h4>
              <div className="flex items-center gap-2 text-[10px] font-sans">
                <button
                  type="button"
                  onClick={selectAllCategories}
                  className="text-[#71b536] hover:underline cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-gray-600">|</span>
                <button
                  type="button"
                  onClick={deselectAllCategories}
                  className="text-gray-400 hover:underline cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1.5">
              {uniqueCategories.map(cat => {
                const isSelected = !deselectedCategories.includes(cat);
                const countOfItem = purchases.filter(p => (p.expenseCategory || 'Uncategorized') === cat).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`px-3 py-1.5 text-xs font-sans font-medium border flex items-center gap-1.5 transition-all rounded-md cursor-pointer ${
                      isSelected
                        ? 'bg-[#182314] text-[#71b536] border-[#3e601d]'
                        : 'bg-[#181818] text-zinc-500 border-zinc-900 hover:border-zinc-700'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-md flex-shrink-0 ${isSelected ? 'bg-[#71b536]' : 'bg-transparent border border-zinc-700'}`}></span>
                    <span>{cat}</span>
                    <span className="text-[10px] text-zinc-500">({countOfItem})</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Dynamic status banner */}
        <div className="bg-[#181818] border border-[#262626] p-3 text-xs font-sans flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="text-gray-400">
            <span>Interval boundary: </span>
            <strong className="text-white">
              {expenseStartDate || 'All history'}
            </strong>
            <span> to </span>
            <strong className="text-white">
              {expenseEndDate || 'All history'}
            </strong>
            <span className="mx-2">|</span>
            <span>Including </span>
            <strong className="text-white">
              {uniqueCategories.length - deselectedCategories.length} of {uniqueCategories.length}
            </strong>
            <span> categories</span>
          </div>
          <div className="flex items-center gap-1.5 self-end sm:self-auto text-stone-300">
            <span>Interval Sum of Expenses:</span>
            <span className="text-[#ee317b] font-bold font-sans">
              {filteredExpenseSum.toLocaleString(undefined, { minimumFractionDigits: 1 })} ETB
            </span>
          </div>
        </div>
      </div>
      
      {/* Premium Scorecards representing precise calculations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Gross Orders (Cell V2 series equivalent) */}
        <div className="relative overflow-hidden bg-[#121212] text-white border border-[#262626] rounded-md p-6 shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-xs font-sans tracking-wider uppercase">Total Gross Orders</span>
            <span className="text-[10px] bg-[#31111E] text-[#ee317b] font-sans px-2 py-0.5 rounded-md border border-[#ee317b]/20">Sum of order values</span>
          </div>
          <p className="text-3xl font-sans font-bold leading-normal mt-3 tracking-tight">
            {totalGrossOrders.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
            <span className="text-sm font-semibold ml-1.5 text-gray-500 font-sans">ETB</span>
          </p>
          <div className="mt-4 pt-4 border-t border-[#262626] flex justify-between text-xs text-gray-405 font-sans">
            <span>Aggregated Order Values</span>
            <span>{customers.length} total sales entries</span>
          </div>
        </div>

        {/* Total Spent (Expenses) Scorecard */}
        <div className="relative overflow-hidden bg-[#121212] text-white border border-[#262626] rounded-md p-6 shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-xs font-sans tracking-wider uppercase">Total Spent (Expenses)</span>
            {deselectedCategories.length > 0 || expenseStartDate || expenseEndDate ? (
              <span className="text-[10px] bg-[#3B1E11] text-[#E07A5F] font-sans px-2 py-0.5 rounded-md border border-[#E07A5F]/20">Filtered interval</span>
            ) : (
              <span className="text-[10px] bg-[#1A1A40] text-[#7096FF] font-sans px-2 py-0.5 rounded-md border border-[#7096FF]/20">All-time sum</span>
            )}
          </div>
          <p className="text-3xl font-sans font-bold leading-normal mt-3 tracking-tight text-[#f87171]">
            {filteredExpenseSum.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
            <span className="text-xs font-semibold ml-1.5 text-gray-400 font-sans">ETB</span>
          </p>
          <div className="mt-4 pt-4 border-t border-[#262626] flex justify-between text-xs text-gray-450 font-sans">
            <span>
              {deselectedCategories.length > 0 || expenseStartDate || expenseEndDate ? 'Filtered Costs' : 'All Registered Costs'}
            </span>
            <span>
              {filteredPurchasesForInterval.length === purchases.length
                ? `${purchases.length} total entries`
                : `${filteredPurchasesForInterval.length} of ${purchases.length} entries`
              }
            </span>
          </div>
        </div>

        {/* Collected Cash In Hand */}
        <div className="relative overflow-hidden bg-[#121212] text-white border border-[#262626] rounded-md p-6 shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-xs font-sans tracking-wider uppercase">Collected Cash In-Hand</span>
            {deselectedCategories.length > 0 || expenseStartDate || expenseEndDate ? (
              <span className="text-[10px] bg-[#31111E] text-[#ee317b] font-sans px-2 py-0.5 rounded-md border border-[#ee317b]/20">Post-interval spent</span>
            ) : (
              <span className="text-[10px] bg-[#112918] text-[#71b536] font-sans px-2 py-0.5 rounded-md border border-[#71b536]/20">All-time net</span>
            )}
          </div>
          
          <div className="mt-3">
            <p className="text-3xl font-sans font-bold leading-normal tracking-tight text-[#71b536]">
              {(totalAdvancePaid + totalRemainingPaid - filteredExpenseSum).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
              <span className="text-xs font-semibold ml-1 text-gray-400 font-sans">ETB</span>
            </p>
            <span className="text-[10px] text-zinc-500 font-sans block -mt-1">
              (Total Intake minus Selected Expense)
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-[#262626] space-y-1 font-sans text-[11px] text-gray-400">
            <div className="flex justify-between">
              <span>Total Client Inflow:</span>
              <span className="text-emerald-500 font-bold">{(totalAdvancePaid + totalRemainingPaid).toLocaleString()} ETB</span>
            </div>
            <div className="flex justify-between">
              <span>Selected Expense:</span>
              <span className="text-[#f87171] font-bold">-{filteredExpenseSum.toLocaleString()} ETB</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-[#262626]/40 text-[10px] text-zinc-500">
              <span>All-Time Net Cash:</span>
              <span className="text-stone-300 font-bold">{collectedCashInHand.toLocaleString()} ETB</span>
            </div>
          </div>
        </div>

        {/* Outstanding Debt */}
        <div className="relative overflow-hidden bg-[#121212] text-[#E2E8F0] border border-[#262626] rounded-md p-6 shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-xs font-sans tracking-wider uppercase">Total Outstanding Debt</span>
            <span className="text-[10px] bg-[#2E181D] text-[#F87171] font-sans px-2 py-0.5 rounded-md border border-rose-550/20">Outstanding Balances</span>
          </div>
          <p className="text-3xl font-sans font-bold leading-normal mt-3 tracking-tight">
            {totalOutstandingDebt.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
            <span className="text-sm font-semibold ml-1.5 text-gray-400 font-sans">ETB</span>
          </p>
          <div className="mt-4 pt-4 border-t border-[#262626] flex justify-between text-xs text-gray-405 font-sans">
            <span>Uncollected Account Balances</span>
            <span>Requires active customer collection</span>
          </div>
        </div>

      </div>

      {/* 📥 GLOBAL BUSINESS LEDGER EXPORT CENTER */}
      <div className="bg-[#121212] border border-[#262626] rounded-md p-5 shadow-none space-y-4">
        <div>
          <h3 className="font-sans font-bold text-white flex items-center gap-2 uppercase tracking-wider text-sm">
            <Download className="w-5 h-5 text-[#ee317b]" />
            Business Ledger Export Center (CSV)
          </h3>
          <p className="text-xs text-gray-400 mt-0.5 font-sans">
            Download real-time operational datasets in highly compatible CSV formatting for Excel or Google Sheets.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1 font-sans">
          {/* Export Orders */}
          <button
            type="button"
            onClick={() => {
              const getBankName = (id?: string) => bankAccounts.find(b => b.id === id)?.name || 'Awash Bank / System Default';
              exportCustomersCSV(customers, getBankName);
            }}
            className="flex items-center justify-between gap-3 px-4 py-3 bg-[#181818] border border-[#262626] hover:border-[#ee317b] text-gray-200 hover:text-white text-xs cursor-pointer transition-all duration-200 text-left rounded-md group"
          >
            <div className="space-y-0.5">
              <span className="font-bold text-white block group-hover:text-[#ee317b] transition-colors text-xs">Customer Orders</span>
              <span className="text-[10px] text-gray-400 block">{customers.length} business entries</span>
            </div>
            <Download className="w-4 h-4 text-[#ee317b] flex-shrink-0" />
          </button>

          {/* Export Material Expenses */}
          <button
            type="button"
            onClick={() => {
              const getBankName = (id?: string) => bankAccounts.find(b => b.id === id)?.name || 'Awash Bank / System Default';
              exportPurchasesCSV(purchases, getBankName);
            }}
            className="flex items-center justify-between gap-3 px-4 py-3 bg-[#181818] border border-[#262626] hover:border-[#71b536] text-gray-200 hover:text-white text-xs cursor-pointer transition-all duration-200 text-left rounded-md group"
          >
            <div className="space-y-0.5">
              <span className="font-bold text-white block group-hover:text-[#71b536] transition-colors text-xs">Supplier Expenses</span>
              <span className="text-[10px] text-gray-400 block">{purchases.length} registered costs</span>
            </div>
            <Download className="w-4 h-4 text-[#71b536] flex-shrink-0" />
          </button>

          {/* Export Treasury */}
          <button
            type="button"
            onClick={() => {
              exportTreasuryCSV(bankAccounts, customers, purchases);
            }}
            className="flex items-center justify-between gap-3 px-4 py-3 bg-[#181818] border border-[#262626] hover:border-amber-500 text-gray-200 hover:text-white text-xs cursor-pointer transition-all duration-200 text-left rounded-md group"
          >
            <div className="space-y-0.5">
              <span className="font-bold text-white block group-hover:text-[#deb887] transition-colors text-xs">Treasury Accounts</span>
              <span className="text-[10px] text-gray-400 block">{bankAccounts.length} payment channels</span>
            </div>
            <Download className="w-4 h-4 text-amber-500 flex-shrink-0" />
          </button>

          {/* Export Stock Inventory */}
          <button
            type="button"
            onClick={() => {
              exportInventoryCSV(paperStocks, customers);
            }}
            className="flex items-center justify-between gap-3 px-4 py-3 bg-[#181818] border border-[#262626] hover:border-cyan-500 text-gray-200 hover:text-white text-xs cursor-pointer transition-all duration-200 text-left rounded-md group"
          >
            <div className="space-y-0.5">
              <span className="font-bold text-white block group-hover:text-cyan-400 transition-colors text-xs">Paper Stockpile</span>
              <span className="text-[10px] text-gray-400 block">{paperStocks.length} tracked items</span>
            </div>
            <Download className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          </button>
        </div>
      </div>

      {/* --- TREASURY DEPARTMENT & BANK ACCOUNTS MANAGER --- */}
      <div className="bg-[#121212] border border-[#262626] rounded-md p-5 shadow-none space-y-6" id="treasury-desk-pnl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#262626] pb-4 gap-4">
          <div>
            <h3 className="font-sans font-bold text-white flex items-center gap-2 uppercase tracking-wider text-sm">
              <Building className="w-5 h-5 text-[#71b536]" />
              🏛️ Corporate Treasury &amp; Payment Accounts ledger
            </h3>
            <p className="text-xs text-gray-400 mt-0.5 font-sans">
              Live balances showing (Initial Stockpile + Collected Client Payments) per bank account.
            </p>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {bankAccounts.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (selectedBankIds.length === bankAccounts.length) {
                    setSelectedBankIds([]);
                  } else {
                    setSelectedBankIds(bankAccounts.map(b => b.id));
                  }
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#181818] border border-[#262626] text-gray-300 font-sans text-xs cursor-pointer hover:border-gray-500 transition-all select-none"
              >
                <input
                  type="checkbox"
                  checked={selectedBankIds.length === bankAccounts.length && bankAccounts.length > 0}
                  ref={el => {
                    if (el) {
                      el.indeterminate = selectedBankIds.length > 0 && selectedBankIds.length < bankAccounts.length;
                    }
                  }}
                  readOnly
                  className="accent-[#71b536] w-3.5 h-3.5 cursor-pointer rounded-md pointer-events-none"
                />
                <span>{selectedBankIds.length === bankAccounts.length ? 'Deselect All' : 'Select All'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsAddingBank(!isAddingBank)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#181818] border border-[#262626] hover:border-[#71b536] text-[#71b536] font-sans text-xs cursor-pointer transition-all duration-200"
            >
              {isAddingBank ? (
                <>
                  <X className="w-3.5 h-3.5" />
                  Cancel Form
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  Add Bank Account / Payment Method
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dynamic Bank Creator Mini Dropdown Drawer */}
        {isAddingBank && (
          <form onSubmit={handleAddSubmit} className="bg-[#181818] border border-[#262626] p-4 space-y-4 animate-none">
            <h4 className="text-xs font-sans font-bold text-gray-300 uppercase tracking-wider border-b border-[#262626] pb-1">
              Add New Treasury Account / Payment Variant
            </h4>
            
            {bankError && (
              <p className="text-xs text-[#F87171] font-sans bg-[#2E181D]/30 p-2 border border-rose-500/25">{bankError}</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-sans font-medium text-gray-400 uppercase mb-1">Account &amp; Bank Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Awash Bank, Telebirr, cash"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-[#121212] border border-[#262626] text-white rounded-md outline-none font-sans focus:border-[#71b536]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-sans font-medium text-gray-400 uppercase mb-1">Account Number (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 10002938495"
                  value={bankNumber}
                  onChange={(e) => setBankNumber(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-[#121212] border border-[#262626] text-white rounded-md outline-none font-sans focus:border-[#71b536]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-sans font-medium text-gray-400 uppercase mb-1">Initial / Purchased Stockpile (ETB, expression enabled)</label>
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
                  className="w-full px-2.5 py-1.5 text-xs bg-[#121212] border border-[#262626] text-white rounded-md outline-none font-sans focus:border-[#71b536]"
                />
                <div className="text-[10px] text-gray-500 mt-1 font-sans">
                  Parsed: {parseFractionOrExpression(bankInitial)} ETB
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#71b536] hover:bg-[#5a932a] text-black font-semibold font-sans text-xs cursor-pointer tracking-wider"
              >
                Register &amp; Activate Account
              </button>
            </div>
          </form>
        )}

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-sans">
          {bankAccounts.map((b) => {
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
            
            const currentBalance = b.initialBalance + advancesForBank + completedRemainingForBank - purchasesOutOfBank;
            const isSystemDefault = ['b1', 'b2', 'b3'].includes(b.id);
            const isEditing = editingBankId === b.id;

            return (
              <div 
                key={b.id} 
                className={`relative bg-[#181812] border rounded-md p-4 hover:border-[#71b536] transition-all duration-300 md:min-h-[190px] flex flex-col justify-between ${
                  selectedBankIds.includes(b.id) ? 'border-[#71b536] bg-[#121912]/25' : 'border-[#262626]'
                }`}
              >
                {/* Account Details Header */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={selectedBankIds.includes(b.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBankIds(prev => [...prev, b.id]);
                          } else {
                            setSelectedBankIds(prev => prev.filter(id => id !== b.id));
                          }
                        }}
                        className="accent-[#71b536] w-3.5 h-3.5 cursor-pointer rounded-md flex-shrink-0"
                        title="Select payment method"
                      />
                      {isEditing ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="px-1.5 py-0.5 bg-[#121212] border border-[#71b536] text-white text-xs font-semibold rounded-md outline-none w-full min-w-0"
                        />
                      ) : (
                        <span className="font-bold text-white text-[13px] tracking-tight flex items-center gap-1 uppercase keep-text-white break-words min-w-0 flex-1" title={b.name}>
                          <Building className="w-3.5 h-3.5 text-[#71b536] flex-shrink-0" />
                          <span className="break-all">{b.name}</span>
                        </span>
                      )}
                    </div>

                    {/* Badge Indicator */}
                    <span className="text-[9px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-1.5 py-0.5 uppercase font-sans">
                      {isSystemDefault ? 'System Core' : 'Custom'}
                    </span>
                  </div>

                  <div className="text-xs text-gray-400 font-sans">
                    {isEditing ? (
                      <input
                        type="text"
                        placeholder="A/C: optional"
                        value={editNumber}
                        onChange={(e) => setEditNumber(e.target.value)}
                        className="px-1.5 py-0.5 mt-1 bg-[#121212] border border-[#71b536] text-white text-[11px] rounded-md outline-none w-full font-sans"
                      />
                    ) : b.accountNumber ? (
                      <span className="flex items-center gap-1 text-[11px]">
                        <CreditCard className="w-3.5 h-3.5 text-zinc-500" />
                        A/C: {b.accountNumber}
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-500 tracking-wider">NO ACCOUNT LISTED</span>
                    )}
                  </div>
                </div>

                {/* Account Balance Calculations */}
                <div className="mt-4 pt-3 border-t border-[#262626] space-y-1.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-500 uppercase tracking-widest text-[9px]">Initial Stockpiled:</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editInitial}
                        onChange={(e) => setEditInitial(cleanLeadingZeros(e.target.value))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            setEditInitial(parseFractionOrExpression(editInitial).toString());
                          }
                        }}
                        className="px-1.5 py-0.5 bg-[#121212] border border-[#71b536] text-white text-xs text-right rounded-md outline-none w-24 font-sans"
                      />
                    ) : (
                      <span className="text-stone-300 font-bold">{b.initialBalance.toLocaleString()} ETB</span>
                    )}
                  </div>

                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-500 uppercase tracking-widest text-[9px]">Advances Deposited:</span>
                    <span className="text-[#ee317b] font-bold">+{advancesForBank.toLocaleString()} ETB</span>
                  </div>

                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-500 uppercase tracking-widest text-[9px]">Completes Deposited:</span>
                    <span className="text-emerald-500 font-bold">+{completedRemainingForBank.toLocaleString()} ETB</span>
                  </div>

                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-500 uppercase tracking-widest text-[9px]">Purchases Deducted:</span>
                    <span className="text-red-400 font-bold">-{purchasesOutOfBank.toLocaleString()} ETB</span>
                  </div>

                  <div className="flex justify-between pt-2 border-t border-[#262626]/50 text-xs">
                    <span className="text-gray-400 font-sans font-medium uppercase tracking-wider">Net Available:</span>
                    <span className="text-[#71b536] font-bold text-sm tracking-tight">{currentBalance.toLocaleString()} ETB</span>
                  </div>
                </div>

                {/* Admin Management Actions */}
                <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-[#262626]/50">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(b.id)}
                        className="p-1 text-[#71b536] hover:bg-[#71b536]/10 border border-[#71b536]/20 bg-emerald-990/10 cursor-pointer"
                        title="Save Changes"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingBankId(null)}
                        className="p-1 text-gray-400 hover:bg-gray-800 border border-[#262626] cursor-pointer"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => startEditing(b)}
                        className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-850 cursor-pointer"
                        title="Edit Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      
                      {!isSystemDefault ? (
                        <button
                          type="button"
                          onClick={() => setDeletingBankId(b.id)}
                          className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-900/20 border border-rose-900/30 cursor-pointer"
                          title="Trash Account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="p-1 text-zinc-650 cursor-not-allowed" title="System accounts are locked for continuity">
                          <Lock className="w-3.5 h-3.5 text-zinc-700" />
                        </span>
                      )}
                    </>
                  )}
                </div>

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
          <div className="overflow-hidden border border-[#262626] rounded-md">
            <table className="w-full text-left text-sm font-sans border-collapse">
              <thead>
                <tr className="bg-[#181818] text-[11px] font-sans tracking-wider text-gray-400 border-b border-[#262626]">
                  <th className="py-2.5 px-3">Staff Member</th>
                  <th className="py-2.5 px-3 text-center">Orders Completed</th>
                  <th className="py-2.5 px-3 text-right">Total Gross (ETB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626] text-gray-350">
                {employeeLeaderboard.map((emp, idx) => (
                  <tr key={emp.name} className="hover:bg-[#1a1a1a] transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-white flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold font-sans ${
                        idx === 0 ? 'bg-[#31111E] text-[#ee317b]' : 
                        idx === 1 ? 'bg-[#262626] text-white' : 
                        'bg-[#1a1a1a] text-gray-455'
                      }`}>
                        {idx + 1}
                      </span>
                      {emp.name}
                    </td>
                    <td className="py-2.5 px-3 text-center font-sans text-gray-400">{emp.completed}</td>
                    <td className="py-2.5 px-3 text-right font-sans font-medium text-white">{emp.totalGross.toLocaleString()} ETB</td>
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
                      <span className="text-[#ee317b] font-semibold">{emp.totalGross.toLocaleString()} ETB</span>
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
          <div className="overflow-hidden border border-[#262626] rounded-md">
            <table className="w-full text-left text-sm font-sans border-collapse">
              <thead>
                <tr className="bg-[#181818] text-[11px] font-sans tracking-wider text-gray-400 border-b border-[#262626]">
                  <th className="py-2.5 px-3">Lead Channel</th>
                  <th className="py-2.5 px-3 text-center">Total Leads</th>
                  <th className="py-2.5 px-3 text-right">Total Revenue (ETB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626] text-gray-300">
                {marketingPerformance.map((lead) => (
                  <tr key={lead.channel} className="hover:bg-[#1a1a1a] transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-white flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-[#71b536] rounded-md"></span>
                      {lead.channel}
                    </td>
                    <td className="py-2.5 px-3 text-center font-sans text-gray-400">{lead.totalLeads}</td>
                    <td className="py-2.5 px-3 text-right font-sans font-medium text-white">{lead.totalRevenue.toLocaleString()} ETB</td>
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
                      <span className="text-[#71b536] font-semibold">{lead.totalRevenue.toLocaleString()} ETB</span>
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



      <AnimatePresence>
        {deletingBankId && (() => {
          const targetBank = bankAccounts.find(b => b.id === deletingBankId);
          if (!targetBank) return null;
          return (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 font-sans select-none"
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
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 font-sans select-none"
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
                  onClick={() => {
                    onDeleteBankAccount(selectedBankIds);
                    setSelectedBankIds([]);
                    setShowBulkDeleteConfirm(false);
                  }}
                  className="px-4 py-1.5 text-xs bg-[#ee317b] hover:bg-[#d61e63] text-white font-bold uppercase tracking-widest cursor-pointer font-sans"
                >
                  Delete Selected
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
