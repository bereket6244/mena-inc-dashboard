import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PageLayout, TableToolbar, DataTableWrapper, DataTable, FloatingAddButton } from './shared/TabLayout';
import { 
  Plus, 
  Sparkles, 
  Edit3, 
  TrendingDown, 
  Package, 
  AlertTriangle, 
  CheckCircle, 
  Search,
  X,
  RefreshCw,
  Info,
  Layers,
  Database,
  Lock,
  Trash2,
  CheckSquare,
  Download
} from 'lucide-react';

import { Customer, PaperStock, EmployeeUser } from '../types';
import { parseFractionOrExpression, cleanLeadingZeros } from '../utils';

interface InventoryTabProps {
  paperStocks: PaperStock[];
  customers: Customer[];
  onUpdateStocks: (stocks: PaperStock[]) => void;
  currentUser: EmployeeUser | null;
}

export default function InventoryTab({ 
  paperStocks, 
  customers, 
  onUpdateStocks,
  currentUser
}: InventoryTabProps) {
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchWrapperRef = useRef<HTMLDivElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input on expansion
  useEffect(() => {
    if (isSearchExpanded) {
      if (searchInputRef.current) searchInputRef.current.focus();
      if (mobileSearchInputRef.current) mobileSearchInputRef.current.focus();
    }
  }, [isSearchExpanded]);

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
      if (outsideDesktop && outsideMobile && !searchQuery) {
        setIsSearchExpanded(false);
      }
    };
    if (isSearchExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSearchExpanded, searchQuery]);

  // Handle escape key to close search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSearchExpanded(false);
      }
    };
    if (isSearchExpanded) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSearchExpanded]);

  // State for Add/Edit Stock
  const [editingStock, setEditingStock] = useState<PaperStock | null>(null);
  const [newStockName, setNewStockName] = useState('');
  const [newStockInitial, setNewStockInitial] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Math expression string inputs for the numerical inventory editing fields
  const [editInitialInput, setEditInitialInput] = useState<string>('');

  // Non-blocking custom delete tracking ID for paper stocks
  const [deletingStockId, setDeletingStockId] = useState<string | null>(null);

  // Multi-selection state for paper stocks
  const [selectedStockIds, setSelectedStockIds] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  // Quick replenishment state
  const [replenishingStockId, setReplenishingStockId] = useState<string | null>(null);
  const [replenishAmount, setReplenishAmount] = useState<string>('');

  const isAdmin = currentUser?.role === 'admin';

  // Helper to compute Total Consumed for a specific stock name
  const computeTotalConsumed = (name: string): number => {
    let consumed = 0;
    const lowerName = name.trim().toLowerCase();
    
    customers.forEach(c => {
      const orderQty = Number(c.quantity || 0);

      // Paper 1 (multiplied by order quantity for 1-for-1 cards, rounded up if not natural / whole number)
      if (c.paperType1 && c.paperType1.trim().toLowerCase() === lowerName) {
        consumed += Math.ceil(Number(c.amount1 || 0) * orderQty);
      }
      // Paper 2 (multiplied by order quantity, rounded up if not natural / whole)
      if (c.paperType2 && c.paperType2.trim().toLowerCase() === lowerName) {
        consumed += Math.ceil(Number(c.amount2 || 0) * orderQty);
      }
      // Paper 3 (multiplied by order quantity, rounded up if not natural / whole)
      if (c.paperType3 && c.paperType3.trim().toLowerCase() === lowerName) {
        consumed += Math.ceil(Number(c.amount3 || 0) * orderQty);
      }
      // Entrance Paper (divided by 16 - rounded up to next whole number)
      if (c.entrancePaper && c.entrancePaper.trim().toLowerCase() === lowerName) {
        consumed += Math.ceil(Number(c.amount16 || 0) / 16);
      }
      // Ajabi Paper (divided by 9 - rounded up to next whole number)
      if (c.ajabiPaper && c.ajabiPaper.trim().toLowerCase() === lowerName) {
        consumed += Math.ceil(Number(c.amount9 || 0) / 9);
      }
    });

    return consumed;
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

  const filteredStocks = paperStocks.filter(stock => 
    stock.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const handleEditStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStock) return;

    const evaluatedVal = Math.max(0, parseFractionOrExpression(editInitialInput));
    const finalStockItem = { ...editingStock, initialStock: evaluatedVal };

    const updated = paperStocks.map(s => 
      s.id === editingStock.id ? finalStockItem : s
    );
    onUpdateStocks(updated);
    setEditingStock(null);
  };

  const handleDeleteStock = (id: string) => {
    const updated = paperStocks.filter(s => s.id !== id);
    onUpdateStocks(updated);
    setDeletingStockId(null);
  };

  // High-level statistics
  const totalItems = paperStocks.length;
  const calculatedStocks = paperStocks.map(s => {
    const consumed = computeTotalConsumed(s.name);
    const remaining = s.initialStock - consumed;
    return { ...s, consumed, remaining };
  });

  const lowStockCount = calculatedStocks.filter(s => s.remaining < 50 && s.remaining > 0).length;
  const outOfStockCount = calculatedStocks.filter(s => s.remaining <= 0).length;
  const totalInitial = paperStocks.reduce((sum, s) => sum + s.initialStock, 0);
  const totalRemaining = calculatedStocks.reduce((sum, s) => sum + Math.max(0, s.remaining), 0);

  return (
    <PageLayout id="inventory-tab-pnl">

      <TableToolbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        mobileLeftControls={null}
        mobileRightControls={null}
        desktopLeftControls={null}
        desktopRightControls={
          <>
            <div className="h-4 w-px bg-[#262626] mx-1 hidden md:block"></div>
            {isAdmin ? (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="hidden md:flex items-center gap-1.5 bg-[#ee317b] text-black px-2.5 py-1.5 rounded text-[11px] font-bold font-sans shadow-lg shadow-[#ee317b]/10 hover:bg-white hover:text-black transition-all cursor-pointer group"
              >
                <Plus className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                <span>Create</span>
              </button>
            ) : (
              <div className="text-[11px] font-bold font-sans text-gray-500 bg-[#151515] border border-[#262626] px-3 py-1.5 flex items-center gap-1.5 rounded-md">
                <Lock className="w-3 h-3 text-[#ee317b]" />
                <span>READ-ONLY</span>
              </div>
            )}
          </>
        }
      />

      {/* Selected Stock Bulk Action Ribbon */}
      {/* Selected Stock Bulk Action Ribbon removed */}

      {/* Quick Create New Stock Variant Modal */}
      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#121212] border border-[#ee317b]/50 rounded-md p-6 max-w-md w-full shadow-none"
            >
              <div className="flex justify-between items-center border-b border-[#262626] pb-3 mb-4 ">
                <span className="font-sans font-bold text-white text-xs uppercase flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-[#ee317b]" />
                  Restock Item
                </span>
                <button 
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

      {/* Main Inventory Board Grid */}
      <div className="w-full">
        
        {/* List of Stocks - Responsive scroll table */}
        <DataTableWrapper className="mb-28 md:mb-0 !border-t md:!border md:!rounded-md">

          <DataTable>
            
              <thead>
                <tr className="bg-[#181818] border-b border-[#262626] text-gray-400 font-sans tracking-wider uppercase text-center">
                  <th className="py-1.5 md:py-2.5 px-2.5 md:px-3 border-r border-[#262626] bg-[#1C1C1C] sticky left-0 z-20 font-bold text-[#ee317b] font-sans text-center w-8 text-[11px] md:text-xs">#</th>
                  <th className="py-2.5 px-3 font-semibold text-gray-300 border-r border-[#262626] text-left">Stock Name</th>
                  <th className="py-2.5 px-3 font-semibold text-gray-300 border-r border-[#262626] text-right">Stock on Hand</th>
                  <th className="hidden md:table-cell py-2.5 px-3 font-semibold text-gray-300 border-r border-[#262626] text-right">Initial</th>
                  <th className="py-2.5 px-3 font-semibold text-gray-300 border-r border-[#262626] text-right">Total Consumed</th>
                  <th className="py-2.5 px-3 font-semibold text-gray-300 border-r border-[#262626] text-left">Status Alert</th>
                  <th className="py-2.5 px-3 font-semibold text-gray-300 border-r border-[#262626] text-center w-40">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626] text-gray-300 font-sans">
                {calculatedStocks.filter(stock => stock.name.toLowerCase().includes(searchQuery.toLowerCase())).map((stock, index) => {
                  const status = getStatus(stock.remaining);
                  const isSelected = selectedStockIds.includes(stock.id);
                  const isOutOfStock = stock.remaining <= 0;
                  const isLowStock = stock.remaining < 50 && stock.remaining > 0;
                  
                  let rowClass = 'group transition-colors border-b border-[#262626]';
                  if (isSelected) {
                    rowClass += ' bg-[#121912]/20 border-l-2 border-[#71b536]';
                  } else if (isOutOfStock) {
                    rowClass += ' bg-[#2E181D]/40 hover:bg-[#2E181D]/60';
                  } else if (isLowStock) {
                    rowClass += ' bg-[#112918]/20 hover:bg-[#112918]/40';
                  } else {
                    rowClass += ' hover:bg-[#1a1a1a]';
                  }

                  return (
                    <tr 
                      key={stock.id} 
                      className={rowClass}
                    >
                      {/* Index */}
                      <td className="py-2 px-1 text-center font-sans text-gray-500 border-r border-[#262626] bg-[#181818] sticky left-0 z-10">
                        {index + 1}
                      </td>

                      {/* Name */}
                      <td className="py-2 px-3 border-r border-[#262626] font-semibold text-white whitespace-nowrap bg-transparent group-hover:bg-[#1a1a1a] transition-colors">{stock.name}</td>
                      
                      {/* Remaining On Hand */}
                      <td className={`py-2 px-3 border-r border-[#262626] font-sans text-right font-bold group-hover:bg-[#1a1a1a] transition-colors ${stock.remaining <= 0 ? 'text-[#F87171] bg-[#2E181D]/10' : 'text-[#71b536]'}`}>
                        {stock.remaining.toLocaleString()}
                      </td>

                      {/* Initial */}
                      <td className="hidden md:table-cell py-2 px-3 border-r border-[#262626] text-right font-sans text-gray-300 group-hover:bg-[#1a1a1a] transition-colors">{stock.initialStock.toLocaleString()}</td>
                      
                      {/* Consumed */}
                      <td className="py-2 px-3 border-r border-[#262626] text-right font-sans text-yellow-400/90 font-medium bg-yellow-950/5 group-hover:bg-[#1a1a1a] transition-colors">
                        {stock.consumed > 0 ? stock.consumed.toLocaleString() : '0'}
                      </td>
                      
                      {/* Status badge */}
                      <td className="py-2 px-3 border-r border-[#262626] font-sans text-left group-hover:bg-[#1a1a1a] transition-colors">
                        <span className={`inline-block px-2 py-0.5 border text-[10px] font-bold ${status.classes}`}>
                          {status.text}
                        </span>
                      </td>

                      {/* EDIT & DELETE & REPLENISH buttons */}
                      <td className="py-2 px-3 border-r border-[#262626] font-sans text-center group-hover:bg-[#1a1a1a] transition-colors">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setReplenishingStockId(stock.id);
                              setReplenishAmount('');
                            }}
                            className="bg-transparent text-[#71b536] hover:bg-[#71b536]/10 p-1 rounded-md border border-[#71b536]/20 text-[10px] tracking-wider transition-colors font-sans cursor-pointer flex items-center gap-0.5"
                            title={`Add to "${stock.name}" Stock`}
                          >
                            <Plus className="w-3 h-3" />
                            Refill
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingStock(stock);
                              setEditInitialInput(stock.initialStock.toString());
                            }}
                            className="text-gray-400 hover:text-[#ee317b] hover:bg-[#262626] p-1 rounded-md transition-colors cursor-pointer"
                            title={`Update Initial Purchase of "${stock.name}"`}
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </DataTable>
          </DataTableWrapper>

        {/* CONTROLLER MODALS */}
        <div>
          
          {/* Quick Edit Sheet Stock Initial State */}
          <AnimatePresence>
            {editingStock && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-[#121212] border border-[#262626] rounded-md p-6 max-w-md w-full shadow-none"
                >
                <div className="flex justify-between items-center border-b border-[#262626] pb-3 mb-4 ">
                  <span className="font-sans font-bold text-white text-xs uppercase flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-[#ee317b]" />
                    Adjust Initial Stock
                  </span>
                  <button 
                    onClick={() => setEditingStock(null)} 
                    className="text-gray-500 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleEditStockSubmit} className="space-y-4 font-sans text-xs text-gray-300">
                  <div>
                    <span className="text-gray-500 block mb-1 uppercase tracking-wider">Stock Name (Read-Only)</span>
                    <p className="bg-[#181818] px-3 py-2 text-white border border-[#262626]">
                      {editingStock.name}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider" htmlFor="field-initial-stock">Initial Quantity (expression enabled)</label>
                    <input
                      id="field-initial-stock"
                      type="text"
                      required
                      placeholder="e.g. 500 or 100 * 5"
                      value={editInitialInput}
                      onChange={(e) => setEditInitialInput(cleanLeadingZeros(e.target.value))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = parseFractionOrExpression(editInitialInput);
                          setEditInitialInput(val.toString());
                        }
                      }}
                      className="w-full px-3 py-2 text-sm bg-[#121212] border border-[#262626] text-white rounded-md outline-none focus:border-[#ee317b]"
                    />
                    <div className="text-[10px] text-gray-500 mt-1 font-sans">
                      Parsed: {parseFractionOrExpression(editInitialInput)}
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-2 ">
                    <button
                      type="button"
                      onClick={() => setEditingStock(null)}
                      className="px-3 py-1.5 bg-transparent border border-transparent text-gray-400 hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-[#ee317b] hover:bg-[#d61e63] text-white font-bold cursor-pointer"
                    >
                      Save Stock
                    </button>
                  </div>
                </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Quick Replenish Sheet Stock */}
          <AnimatePresence>
            {replenishingStockId && (() => {
              const stock = paperStocks.find(s => s.id === replenishingStockId);
              if (!stock) return null;
              return (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-[#121212] border border-[#71b536]/30 rounded-md p-6 max-w-md w-full shadow-none space-y-4"
                  >
                  <div className="flex justify-between items-center border-b border-[#262626] pb-3 ">
                    <span className="font-sans font-bold text-[#71b536] text-xs uppercase flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5" />
                      Add More to Stock
                    </span>
                    <button
                      type="button"
                      onClick={() => setReplenishingStockId(null)}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-gray-400 font-sans">
                    Refill warehouse category <strong className="text-white">"{stock.name}"</strong> by adding directly to current initial count.
                  </p>

                  <div className="space-y-3 font-sans">
                    <div>
                      <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Quantity to Add (expression enabled)</label>
                      <input
                        type="text"
                        placeholder="e.g. 500 or 1000"
                        value={replenishAmount}
                        onChange={(e) => setReplenishAmount(cleanLeadingZeros(e.target.value))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = parseFractionOrExpression(replenishAmount);
                            setReplenishAmount(val.toString());
                          }
                        }}
                        className="w-full px-3 py-2 text-sm bg-[#121212] border border-[#262626] text-white rounded-md outline-none focus:border-[#71b536]"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const parsedAmt = Math.max(0, parseFractionOrExpression(replenishAmount));
                        if (parsedAmt > 0) {
                          const updatedList = paperStocks.map(s => {
                            if (s.id === replenishingStockId) {
                              return {
                                ...s,
                                initialStock: s.initialStock + parsedAmt
                              };
                            }
                            return s;
                          });
                          onUpdateStocks(updatedList);
                          setReplenishingStockId(null);
                        }
                      }}
                      className="w-full py-1.5 bg-[#71b536] hover:bg-[#5a932a] text-black text-xs font-bold font-sans tracking-wider cursor-pointer"
                    >
                      Confirm Stock Replenishment
                    </button>
                  </div>
                  </motion.div>
                </div>
              );
            })()}
          </AnimatePresence>



          {/* Guidelines info card helper */}


        </div>

      </div>

      {/* Non-blocking premium delete confirmation modal for inventory paper stocks */}
      <AnimatePresence>
        {deletingStockId && (() => {
          const targetStock = paperStocks.find(s => s.id === deletingStockId);
          if (!targetStock) return null;
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm ">
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

      {/* Non-blocking bulk delete confirmation modal for inventory paper stocks */}
      <AnimatePresence>
        {showBulkDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm ">
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
                  onClick={() => {
                    const remainingStocks = paperStocks.filter(s => !selectedStockIds.includes(s.id));
                    onUpdateStocks(remainingStocks);
                    setSelectedStockIds([]);
                    setShowBulkDeleteConfirm(false);
                  }}
                  className="px-4 py-1.5 bg-[#F87171] hover:bg-[#EF4444] text-black font-bold transition-all cursor-pointer"
                >
                  Yes, Delete Selected
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    {/* Mobile FAB for Add Stock */}
      {isAdmin && (
        <FloatingAddButton onClick={() => setShowAddForm(true)} title="Restock Item" />
      )}

    </PageLayout>
  );
}
