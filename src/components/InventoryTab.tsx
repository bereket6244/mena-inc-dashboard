import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SharedDataTableLayout, SharedTh, SharedTd, SharedTr } from './shared/SharedDataTableLayout';
import { FloatingAddButton } from './shared/TabLayout';
import { 
  Plus, 
  Minus,
  ArrowDown,
  ArrowUp,
  Sparkles, 
  Edit3, 
  TrendingDown, 
  Package, 
  AlertTriangle, 
  CheckCircle, 
  Search,
  X,
  RotateCcw,
  Info,
  Layers,
  Database,
  Lock,
  Trash2,
  CheckSquare,
  Download
} from 'lucide-react';

import { Customer, PaperStock, EmployeeUser } from '../types';
import { computeStockConsumed, parseFractionOrExpression, cleanLeadingZeros } from '../utils';

const INVENTORY_SORT_FIELDS = ['recordedOrder', 'name', 'remaining', 'initialStock', 'consumed'] as const;
type InventoryColumnSortField = Exclude<typeof INVENTORY_SORT_FIELDS[number], 'recordedOrder'>;
type InventorySortField = typeof INVENTORY_SORT_FIELDS[number];
const INVENTORY_SORT_BY_STORAGE_KEY = 'ui.inventory.sortBy';
const INVENTORY_SORT_DIRECTION_STORAGE_KEY = 'ui.inventory.sortDirection';

interface InventoryTabProps {
  paperStocks: PaperStock[];
  customers: Customer[];
  onUpdateStocks: (stocks: PaperStock[]) => void | Promise<void>;
  currentUser: EmployeeUser | null;
}

export default function InventoryTab({ 
  paperStocks, 
  customers, 
  onUpdateStocks,
  currentUser
}: InventoryTabProps) {
  
  const [searchQuery, setSearchQuery] = useState('');

  // State for Add/Edit Stock
  const [editingStock, setEditingStock] = useState<PaperStock | null>(null);
  const [newStockName, setNewStockName] = useState('');
  const [newStockInitial, setNewStockInitial] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Math expression string inputs for the numerical inventory editing fields
  const [editStockNameInput, setEditStockNameInput] = useState<string>('');
  const [editStockError, setEditStockError] = useState<string>('');
  const [inventoryMessage, setInventoryMessage] = useState<string>('');

  // Non-blocking custom delete tracking ID for paper stocks
  const [deletingStockId, setDeletingStockId] = useState<string | null>(null);

  // Multi-selection state for paper stocks
  const [selectedStockIds, setSelectedStockIds] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  // Quick stock adjustment state
  const [adjustingStockId, setAdjustingStockId] = useState<string | null>(null);
  const [stockAdjustmentMode, setStockAdjustmentMode] = useState<'add' | 'subtract'>('add');
  const [stockAdjustmentAmount, setStockAdjustmentAmount] = useState<string>('');
  const [sortBy, setSortBy] = useState<InventorySortField>(() => {
    const savedSortBy = localStorage.getItem(INVENTORY_SORT_BY_STORAGE_KEY);
    return INVENTORY_SORT_FIELDS.includes(savedSortBy as InventorySortField) ? savedSortBy as InventorySortField : 'name';
  });
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(() => {
    return localStorage.getItem(INVENTORY_SORT_DIRECTION_STORAGE_KEY) === 'desc' ? 'desc' : 'asc';
  });

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    localStorage.setItem(INVENTORY_SORT_BY_STORAGE_KEY, sortBy);
    localStorage.setItem(INVENTORY_SORT_DIRECTION_STORAGE_KEY, sortDirection);
  }, [sortBy, sortDirection]);

  const handleRecordedOrderSort = () => {
    setSortBy('recordedOrder');
    setSortDirection('asc');
  };

  const handleSort = (field: InventoryColumnSortField) => {
    if (sortBy === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortBy(field);
    setSortDirection(field === 'name' ? 'asc' : 'desc');
  };

  const SortHeader = ({ field, children, align = 'left' }: { field: InventoryColumnSortField; children: React.ReactNode; align?: 'left' | 'right' }) => {
    const Icon = sortDirection === 'asc' ? ArrowUp : ArrowDown;
    const justifyClass = align === 'right' ? 'justify-end' : 'justify-start';

    return (
      <span className={`inline-flex w-full items-center ${justifyClass} gap-1 whitespace-nowrap`}>
        <span>{children}</span>
        <span className="inline-flex w-3 shrink-0 justify-center text-[#ee317b]" aria-hidden="true">
          {sortBy === field && <Icon className="h-3 w-3" strokeWidth={2.5} />}
        </span>
      </span>
    );
  };

  const getStatus = (current: number) => {
    if (current <= 0) {
      return { 
        text: '❌ OUT OF STOCK', 
        classes: 'bg-[#2E181D] text-[#F87171] border-[#5D2D35]' 
      };
    } else if (current < 50) {
      return { 
        text: '⚠️ LOW STOCK - REORDER', 
        classes: 'bg-[#2D210F] text-[#FACC15] border-[#5A4515] animate-pulse' 
      };
    } else {
      return { 
        text: '✅ HEALTHY', 
        classes: 'bg-[#112918] text-[#71b536] border-[#71b536]/20' 
      };
    }
  };

  const handleAddStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStockName.trim()) return;
    
    const trimmedName = newStockName.trim();
    const evaluatedInitial = Math.max(0, parseFractionOrExpression(newStockInitial));

    const existingIndex = paperStocks.findIndex(s => s.name.trim().toLowerCase() === trimmedName.toLowerCase());
    if (existingIndex >= 0) {
      // Stock already exists! Accumulate new stock volume automatically
      const existingItem = paperStocks[existingIndex];
      const updatedItem = {
        ...existingItem,
        initialStock: existingItem.initialStock + evaluatedInitial
      };
      
      const updatedList = [...paperStocks];
      updatedList[existingIndex] = updatedItem;
      
      onUpdateStocks(updatedList);
      
      alert(`Merged Stockpile: Added ${evaluatedInitial.toLocaleString()} to existing stock category "${existingItem.name}" (Updated Total: ${updatedItem.initialStock.toLocaleString()}).`);
      
      setNewStockName('');
      setNewStockInitial('');
      return;
    }

    const newStock: PaperStock = {
      id: 'p_' + Date.now(),
      name: trimmedName,
      initialStock: evaluatedInitial
    };

    onUpdateStocks([...paperStocks, newStock]);
    setNewStockName('');
    setNewStockInitial('');
  };

  const handleEditStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStock) return;

    const trimmedName = editStockNameInput.trim();
    if (!trimmedName) {
      setEditStockError('Stock name is required.');
      return;
    }

    const duplicateName = paperStocks.some(s =>
      s.id !== editingStock.id && s.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicateName) {
      setEditStockError('Another stock item already uses this name.');
      return;
    }

    const finalStockItem: PaperStock = {
      ...editingStock,
      name: trimmedName,
    };

    const updated = paperStocks.map(s => 
      s.id === editingStock.id ? finalStockItem : s
    );
    try {
      await Promise.resolve(onUpdateStocks(updated));
      const { updatePaperStockDoc } = await import('../lib/dbService');
      await updatePaperStockDoc(finalStockItem);
      setEditStockError('');
      setEditingStock(null);
      setInventoryMessage('Inventory item updated successfully.');
      window.setTimeout(() => setInventoryMessage(''), 3000);
    } catch (error: any) {
      setEditStockError(`Saved locally, but the database update failed: ${error?.message || String(error)}`);
    }
  };

  const handleDeleteStock = (id: string) => {
    const updated = paperStocks.filter(s => s.id !== id);
    onUpdateStocks(updated);
    setDeletingStockId(null);
  };

  const handleConfirmStockAdjustment = () => {
    if (!adjustingStockId) return;
    const parsedAmt = Math.max(0, parseFractionOrExpression(stockAdjustmentAmount));
    if (parsedAmt > 0) {
      const updatedList = paperStocks.map(s => {
        if (s.id !== adjustingStockId) return s;
        const nextInitialStock = stockAdjustmentMode === 'add'
          ? s.initialStock + parsedAmt
          : Math.max(0, s.initialStock - parsedAmt);
        return {
          ...s,
          initialStock: nextInitialStock
        };
      });
      onUpdateStocks(updatedList);
      setInventoryMessage(stockAdjustmentMode === 'add' ? 'Stock amount added successfully.' : 'Stock amount subtracted successfully.');
      window.setTimeout(() => setInventoryMessage(''), 3000);
      setAdjustingStockId(null);
      setStockAdjustmentAmount('');
    }
  };

  const handleConfirmBulkDelete = () => {
    const remainingStocks = paperStocks.filter(s => !selectedStockIds.includes(s.id));
    onUpdateStocks(remainingStocks);
    setSelectedStockIds([]);
    setShowBulkDeleteConfirm(false);
  };

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;

      if (event.key === 'Escape') {
        if (showBulkDeleteConfirm) {
          event.preventDefault();
          setShowBulkDeleteConfirm(false);
        } else if (deletingStockId) {
          event.preventDefault();
          setDeletingStockId(null);
        } else if (adjustingStockId) {
          event.preventDefault();
          setAdjustingStockId(null);
        } else if (editingStock) {
          event.preventDefault();
          setEditingStock(null);
        } else if (showAddForm) {
          event.preventDefault();
          setShowAddForm(false);
        }
      }

      if (event.key === 'Enter' && !(event.target instanceof HTMLTextAreaElement)) {
        if (showBulkDeleteConfirm) {
          event.preventDefault();
          handleConfirmBulkDelete();
        } else if (deletingStockId) {
          event.preventDefault();
          handleDeleteStock(deletingStockId);
        } else if (adjustingStockId) {
          event.preventDefault();
          handleConfirmStockAdjustment();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showBulkDeleteConfirm, deletingStockId, adjustingStockId, editingStock, showAddForm, paperStocks, selectedStockIds, stockAdjustmentAmount, stockAdjustmentMode]);

  // High-level statistics
  const calculatedStocks = paperStocks.map(s => {
    const consumed = computeStockConsumed(s, customers, paperStocks);
    const remaining = s.initialStock - consumed;
    return { ...s, consumed, remaining };
  });
  const filteredStocks = calculatedStocks
    .filter(stock => stock.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'recordedOrder') return 0;
      const direction = sortDirection === 'asc' ? 1 : -1;
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name) * direction;
      }
      return (a[sortBy] - b[sortBy]) * direction;
    });

  return (
    <SharedDataTableLayout
      id="inventory-tab-pnl"
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      tablePreferenceKey="ui.inventory.table"
      mobileRightControls={
        <button
          type="button"
          onClick={handleRecordedOrderSort}
          className={`bg-transparent p-1.5 rounded hover:bg-[#181818] transition-colors flex items-center justify-center cursor-pointer ${
            sortBy === 'recordedOrder' ? 'text-[#ee317b]' : 'text-gray-300'
          }`}
          title="Recorded order"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      }
      desktopRightControls={
        <>
          <button
            type="button"
            onClick={handleRecordedOrderSort}
            className={`flex items-center justify-center p-1.5 rounded hover:bg-[#202020] transition-colors cursor-pointer ${
              sortBy === 'recordedOrder' ? 'text-[#ee317b] bg-[#ee317b]/10' : 'text-gray-300'
            }`}
            title="Recorded order"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          {isAdmin ? (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="text-[11px] font-sans font-bold text-black bg-[#ee317b] hover:bg-[#ee317b]/80 rounded px-2.5 py-1.5 flex items-center justify-center gap-1 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="text-[11px] font-bold font-sans text-gray-500 bg-[#151515] border border-[#262626] px-3 py-1.5 flex items-center gap-1.5 rounded-md">
              <Lock className="w-3 h-3 text-[#ee317b]" />
              <span>READ-ONLY</span>
            </div>
          )}
        </>
      }
      selectedItemsBar={
        <div className="relative z-30">
          <AnimatePresence>
            {inventoryMessage && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mb-2 inline-flex items-center gap-1.5 rounded-md border border-[#71b536]/30 bg-[#112918] px-3 py-1.5 text-[11px] font-bold text-[#71b536]"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                {inventoryMessage}
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {selectedStockIds.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="hidden md:flex bg-[#ee317b]/10 border border-[#ee317b]/30 py-1.5 px-3 rounded-md items-center justify-between gap-4 text-xs font-sans z-30 overflow-x-auto"
              >
                <div className="flex items-center gap-2.5 text-white shrink-0">
                  <CheckSquare className="w-4 h-4 text-[#ee317b]" />
                  <span className="font-bold">{selectedStockIds.length} Selected</span>
                  <button
                    type="button"
                    onClick={() => setSelectedStockIds([])}
                    className="px-2 py-0.5 bg-[#1C1C1C] hover:bg-[#262626] border border-[#262626] text-gray-400 hover:text-white rounded text-[10px] uppercase font-sans font-bold cursor-pointer transition-colors ml-1"
                    title="Deselect All Selected Items"
                  >
                    Deselect All
                  </button>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowBulkDeleteConfirm(true)}
                    className="px-3 py-1 bg-[#31111E] hover:bg-[#4a1a2d] border border-rose-900/50 text-[#ee317b] font-bold rounded cursor-pointer transition-colors flex items-center gap-1 uppercase tracking-wider"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      }
      tableHeaders={
        <>
          <SharedTh isIndex>#</SharedTh>
          <SharedTh align="center" width="2.5rem" className="inventory-select-column bg-[#181818]">
            <input
              type="checkbox"
              checked={filteredStocks.length > 0 && selectedStockIds.length === filteredStocks.length}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedStockIds(filteredStocks.map(stock => stock.id));
                } else {
                  setSelectedStockIds([]);
                }
              }}
              className="accent-[#ee317b] cursor-pointer"
              title="Select/Deselect all rows"
            />
          </SharedTh>
          <SharedTh className="inventory-stock-name-column bg-[#181818] cursor-pointer select-none" onClick={() => handleSort('name')}>
            <SortHeader field="name">Stock Name</SortHeader>
          </SharedTh>
          <SharedTh align="right" className="cursor-pointer select-none" onClick={() => handleSort('remaining')}>
            <SortHeader field="remaining" align="right">Stock on Hand</SortHeader>
          </SharedTh>
          <SharedTh align="right" className="hidden md:table-cell cursor-pointer select-none" onClick={() => handleSort('initialStock')}>
            <SortHeader field="initialStock" align="right">Initial</SortHeader>
          </SharedTh>
          <SharedTh align="right" className="cursor-pointer select-none" onClick={() => handleSort('consumed')}>
            <SortHeader field="consumed" align="right">Total Consumed</SortHeader>
          </SharedTh>
          <SharedTh align="center" width="10rem">Actions</SharedTh>
        </>
      }
      tableBody={
        <>
          {filteredStocks.map((stock, index) => {
              const isSelected = selectedStockIds.includes(stock.id);
              const isOutOfStock = stock.remaining <= 0;
              const isLowStock = stock.remaining < 50 && stock.remaining > 0;

              let rowClass = '';
              if (isOutOfStock) {
                rowClass = 'out-of-stock-row bg-[#2E181D]/40 hover:bg-[#2E181D]/60';
              } else if (isLowStock) {
                rowClass = 'low-stock-row bg-[#112918]/20 hover:bg-[#112918]/40';
              }

              return (
                <React.Fragment key={stock.id}>
                <SharedTr isSelected={isSelected} className={rowClass}>
                  <SharedTd isIndex>{index + 1}</SharedTd>
                  <SharedTd align="center" className="inventory-select-column bg-[#151515]/45">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStockIds(prev => [...prev, stock.id]);
                        } else {
                          setSelectedStockIds(prev => prev.filter(id => id !== stock.id));
                        }
                      }}
                      className="accent-[#ee317b] cursor-pointer"
                      title="Select stock"
                    />
                  </SharedTd>
                  <SharedTd className="inventory-stock-name-column font-semibold text-white whitespace-nowrap bg-transparent group-hover:bg-[#1a1a1a] transition-colors">
                    {stock.name}
                  </SharedTd>
                  <SharedTd
                    align="right"
                    className={`font-bold group-hover:bg-[#1a1a1a] transition-colors ${stock.remaining <= 0 ? 'text-[#F87171] bg-[#2E181D]/10' : 'text-[#71b536]'}`}
                  >
                    {stock.remaining.toLocaleString()}
                  </SharedTd>
                  <SharedTd align="right" className="hidden md:table-cell text-gray-300 group-hover:bg-[#1a1a1a] transition-colors">
                    {stock.initialStock.toLocaleString()}
                  </SharedTd>
                  <SharedTd align="right" className="text-yellow-400/90 font-medium bg-yellow-950/5 group-hover:bg-[#1a1a1a] transition-colors">
                    {stock.consumed > 0 ? stock.consumed.toLocaleString() : '0'}
                  </SharedTd>
                  <SharedTd align="center" className="group-hover:bg-[#1a1a1a] transition-colors">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setAdjustingStockId(stock.id);
                          setStockAdjustmentMode('add');
                          setStockAdjustmentAmount('');
                        }}
                        className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-[#71b536]/25 bg-transparent text-[#71b536] hover:bg-[#71b536]/10 transition-colors cursor-pointer"
                        title={`Add quantity to "${stock.name}"`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAdjustingStockId(stock.id);
                          setStockAdjustmentMode('subtract');
                          setStockAdjustmentAmount('');
                        }}
                        className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-[#F87171]/25 bg-transparent text-[#F87171] hover:bg-[#2E181D]/40 transition-colors cursor-pointer"
                        title={`Subtract quantity from "${stock.name}"`}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingStock(stock);
                          setEditStockNameInput(stock.name);
                          setEditStockError('');
                        }}
                        className="text-gray-400 hover:text-[#ee317b] hover:bg-[#262626] p-1 rounded-md transition-colors cursor-pointer"
                        title={`Rename "${stock.name}"`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingStockId(stock.id)}
                        className="text-gray-500 hover:text-[#F87171] hover:bg-[#262626] p-1 rounded-md transition-colors cursor-pointer"
                        title={`Delete "${stock.name}" entirely from system`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </SharedTd>
                </SharedTr>
                </React.Fragment>
              );
            })}
          {filteredStocks.length === 0 && (
            <SharedTr>
              <SharedTd className="text-gray-500" align="center">
                <span className="block" style={{ minWidth: '48rem' }}>
                  No inventory records matching this criteria.
                </span>
              </SharedTd>
            </SharedTr>
          )}
        </>
      }
      modals={
        <>
          <AnimatePresence>
            {selectedStockIds.length > 0 && (
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                className="md:hidden fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 bg-[#121212] border-t border-[#ee317b] text-white z-40 p-3 flex flex-col gap-2 shadow-[0_-4px_15px_rgba(238,49,123,0.15)] pb-5"
              >
                <div className="flex justify-between items-center text-xs font-bold text-[#ee317b] mb-1 px-1">
                  <span>{selectedStockIds.length} Selected Stocks</span>
                  <button type="button" onClick={() => setSelectedStockIds([])} className="text-gray-400 font-normal underline">Clear Selection</button>
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

          <AnimatePresence>
            {showAddForm && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
                onClick={(e) => {
                  if (e.currentTarget === e.target) {
                    setShowAddForm(false);
                  }
                }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-[#121212] border border-[#ee317b]/50 rounded-md p-6 max-w-md w-full shadow-none"
                >
                  <div className="flex justify-between items-center border-b border-[#262626] pb-3 mb-4">
                    <span className="font-sans font-bold text-white text-xs uppercase flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-[#ee317b]" />
                      Add Stock Item
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="text-gray-500 hover:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleAddStock} className="space-y-4 font-sans text-xs text-gray-300">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider" htmlFor="field-new-stock-name">Variant Name</label>
                      <input
                        id="field-new-stock-name"
                        type="text"
                        required
                        placeholder="e.g. Bronze wave"
                        value={newStockName}
                        onChange={(e) => setNewStockName(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-[#121212] border border-[#262626] text-white rounded-md outline-none focus:border-[#ee317b] placeholder-gray-600 font-sans"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider" htmlFor="field-new-stock-initial">Initial on Hand (expression enabled)</label>
                      <input
                        id="field-new-stock-initial"
                        type="text"
                        required
                        placeholder="e.g. 500 or 100 * 5"
                        value={newStockInitial}
                        onChange={(e) => setNewStockInitial(cleanLeadingZeros(e.target.value))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = parseFractionOrExpression(newStockInitial);
                            setNewStockInitial(val.toString());
                          }
                        }}
                        className="w-full px-3 py-2 text-sm bg-[#121212] border border-[#262626] text-white rounded-md outline-none focus:border-[#ee317b]"
                      />
                      <div className="text-[10px] text-gray-500 mt-1 font-sans">
                        Parsed: {parseFractionOrExpression(newStockInitial)}
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-2 items-center">
                      <button
                        type="button"
                        onClick={() => setShowAddForm(false)}
                        className="px-3 py-1.5 bg-transparent border border-transparent text-gray-400 hover:text-white cursor-pointer"
                      >
                        Close
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-[#ee317b] hover:bg-[#d61e63] text-white font-bold cursor-pointer rounded"
                      >
                        Add Stock
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {editingStock && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-[#121212] border border-[#262626] rounded-md p-6 max-w-md w-full shadow-none"
                >
                  <div className="flex justify-between items-center border-b border-[#262626] pb-3 mb-4">
                    <span className="font-sans font-bold text-white text-xs uppercase flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-[#ee317b]" />
                      Rename Stock Item
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditStockError('');
                        setEditingStock(null);
                      }}
                      className="text-gray-500 hover:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleEditStockSubmit} className="space-y-4 font-sans text-xs text-gray-300">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider" htmlFor="field-edit-stock-name">Stock Name</label>
                      <input
                        id="field-edit-stock-name"
                        type="text"
                        required
                        value={editStockNameInput}
                        onChange={(e) => {
                          setEditStockNameInput(e.target.value);
                          setEditStockError('');
                        }}
                        className="w-full px-3 py-2 text-sm bg-[#121212] border border-[#262626] text-white rounded-md outline-none focus:border-[#ee317b] placeholder-gray-600 font-sans"
                      />
                      {paperStocks.some(s => s.id !== editingStock.id && s.name.trim().toLowerCase() === editStockNameInput.trim().toLowerCase()) && (
                        <div className="text-[10px] text-[#F87171] mt-1 font-sans">
                          Another stock item already uses this name.
                        </div>
                      )}
                      {editStockError && (
                        <div className="text-[10px] text-[#F87171] mt-1 font-sans">
                          {editStockError}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditStockError('');
                          setEditingStock(null);
                        }}
                        className="px-3 py-1.5 bg-transparent border border-transparent text-gray-400 hover:text-white cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-[#ee317b] hover:bg-[#d61e63] text-white font-bold cursor-pointer"
                      >
                        Save Name
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {adjustingStockId && (() => {
              const stock = paperStocks.find(s => s.id === adjustingStockId);
              if (!stock) return null;
              const modeClasses = stockAdjustmentMode === 'add'
                ? 'border-[#71b536]/30 text-[#71b536] focus:border-[#71b536]'
                : 'border-[#F87171]/30 text-[#F87171] focus:border-[#F87171]';
              const ActionIcon = stockAdjustmentMode === 'add' ? Plus : Minus;
              return (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`bg-[#121212] border rounded-md p-6 max-w-md w-full shadow-none space-y-4 ${stockAdjustmentMode === 'add' ? 'border-[#71b536]/30' : 'border-[#F87171]/30'}`}
                  >
                    <div className="flex justify-between items-center border-b border-[#262626] pb-3">
                      <span className={`font-sans font-bold text-xs uppercase flex items-center gap-1.5 ${stockAdjustmentMode === 'add' ? 'text-[#71b536]' : 'text-[#F87171]'}`}>
                        <ActionIcon className="w-3.5 h-3.5" />
                        {stockAdjustmentMode === 'add' ? 'Add Stock Amount' : 'Subtract Stock Amount'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setAdjustingStockId(null)}
                        className="text-gray-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-gray-400 font-sans">
                      {stockAdjustmentMode === 'add' ? 'Add to' : 'Subtract from'} <strong className="text-white">"{stock.name}"</strong> without renaming or duplicating the stock item.
                    </p>

                    <div className="space-y-3 font-sans">
                      <div>
                        <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">
                          Quantity to {stockAdjustmentMode === 'add' ? 'Add' : 'Subtract'} (expression enabled)
                        </label>
                        <input
                          type="text"
                          placeholder={stockAdjustmentMode === 'add' ? 'e.g. 500 or 1000' : 'e.g. 25 or 100 / 2'}
                          value={stockAdjustmentAmount}
                          onChange={(e) => setStockAdjustmentAmount(cleanLeadingZeros(e.target.value))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const val = parseFractionOrExpression(stockAdjustmentAmount);
                              setStockAdjustmentAmount(val.toString());
                            }
                          }}
                          className={`w-full px-3 py-2 text-sm bg-[#121212] border text-white rounded-md outline-none ${modeClasses}`}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleConfirmStockAdjustment}
                        className={`w-full py-1.5 text-xs font-bold font-sans tracking-wider cursor-pointer rounded ${stockAdjustmentMode === 'add' ? 'bg-[#71b536] hover:bg-[#5a932a] text-black' : 'bg-[#F87171] hover:bg-[#EF4444] text-black'}`}
                      >
                        {stockAdjustmentMode === 'add' ? 'Add Amount' : 'Subtract Amount'}
                      </button>
                    </div>
                  </motion.div>
                </div>
              );
            })()}
          </AnimatePresence>

          <AnimatePresence>
            {deletingStockId && (() => {
              const targetStock = paperStocks.find(s => s.id === deletingStockId);
              if (!targetStock) return null;
              return (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-[#121212] border border-[#F87171] p-6 max-w-md w-full text-gray-300 font-sans shadow-none rounded-md"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-[#2E181D] text-[#F87171] rounded-md">
                        <AlertTriangle className="w-6 h-6 animate-pulse" />
                      </div>
                      <div className="space-y-2 text-left">
                        <h3 className="font-sans text-base font-bold text-white uppercase tracking-wider">Remove Paper Stock?</h3>
                        <p className="text-xs text-gray-400 leading-relaxed font-sans">
                          Are you sure you want to completely remove the paper stock <span className="text-white font-semibold font-sans">"{targetStock.name}"</span>?
                        </p>
                        <p className="text-xs text-[#F87171] leading-relaxed font-sans">
                          Warning: Removing this paper variant from warehouse will break active visual automatic calculations for customers ordering this paper type.
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-6 font-sans text-xs">
                      <button
                        type="button"
                        onClick={() => setDeletingStockId(null)}
                        className="px-3.5 py-1.5 border border-[#262626] text-gray-400 hover:text-white hover:bg-[#1C1C1C] transition-all cursor-pointer"
                      >
                        Cancel Action
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteStock(deletingStockId)}
                        className="px-4 py-1.5 bg-[#F87171] hover:bg-[#EF4444] text-black font-bold transition-all cursor-pointer"
                      >
                        Confirm Delete
                      </button>
                    </div>
                  </motion.div>
                </div>
              );
            })()}
          </AnimatePresence>

          <AnimatePresence>
            {showBulkDeleteConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-[#121212] border border-[#F87171] p-6 max-w-md w-full text-gray-300 font-sans shadow-none rounded-md"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-[#2E181D] text-[#F87171] rounded-md">
                      <AlertTriangle className="w-6 h-6 animate-pulse" />
                    </div>
                    <div className="space-y-2 text-left">
                      <h3 className="font-sans text-base font-bold text-white uppercase tracking-wider">Bulk-Remove Stocks?</h3>
                      <p className="text-xs text-gray-400 leading-relaxed font-sans">
                        Are you absolutely sure you want to permanently delete the <span className="text-white font-bold font-sans">{selectedStockIds.length}</span> selected paper stockroom files?
                      </p>
                      <p className="text-xs text-[#F87171] leading-relaxed font-sans">
                        Warning: This action is irreversible. Deleting warehouses values will affect calculations for customer orders bound to these materials!
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-6 font-sans text-xs">
                    <button
                      type="button"
                      onClick={() => setShowBulkDeleteConfirm(false)}
                      className="px-3.5 py-1.5 border border-[#262626] text-gray-400 hover:text-white hover:bg-[#1C1C1C] transition-all cursor-pointer"
                    >
                      Cancel Action
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmBulkDelete}
                      className="px-4 py-1.5 bg-[#F87171] hover:bg-[#EF4444] text-black font-bold transition-all cursor-pointer"
                    >
                      Yes, Delete Selected
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </>
      }
      fab={
        isAdmin ? <FloatingAddButton onClick={() => setShowAddForm(true)} title="Add stock item" /> : undefined
      }
    />
  );
}
