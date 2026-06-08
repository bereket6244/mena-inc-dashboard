import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
      
      alert(`Merged Stockpile: Added ${evaluatedInitial.toLocaleString()} sheets to existing paper stock category "${existingItem.name}" (Updated Total: ${updatedItem.initialStock.toLocaleString()}).`);
      
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
  const totalInitialSheets = paperStocks.reduce((sum, s) => sum + s.initialStock, 0);
  const totalRemainingSheets = calculatedStocks.reduce((sum, s) => sum + Math.max(0, s.remaining), 0);

  return (
    <div className="space-y-6 " id="inventory-tab-pnl">

      {/* Control Bar & Selection Bar */}
      <div className="bg-[#121212] border border-[#262626] rounded-md p-4 shadow-none flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search paper stocks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-sm bg-[#181818] text-white hover:bg-[#1C1C1C] focus:bg-[#1C1C1C] border border-[#262626] rounded-md outline-none focus:border-[#ee317b] transition-all font-sans"
            />
          </div>
          
          <button 
            type="button"
            onClick={() => {
              const allFilteredIds = filteredStocks.map(s => s.id);
              const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedStockIds.includes(id));
              if (allSelected) {
                setSelectedStockIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
              } else {
                setSelectedStockIds(prev => {
                  const next = [...prev];
                  allFilteredIds.forEach(id => {
                    if (!next.includes(id)) next.push(id);
                  });
                  return next;
                });
              }
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-sans text-gray-300 bg-[#181818] hover:bg-[#262626] border border-[#262626] rounded-md cursor-pointer transition-colors"
          >
            <CheckSquare className="w-3.5 h-3.5 text-[#ee317b]" />
            {filteredStocks.length > 0 && filteredStocks.every(s => selectedStockIds.includes(s.id))
              ? "Deselect All Stocks"
              : `Select All Stocks (${filteredStocks.length})`}
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">


          {isAdmin ? (
            <div className="flex items-stretch sm:items-center gap-2 ">
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="text-xs font-sans font-bold text-white bg-[#ee317b] hover:bg-[#d61e63] border border-[#ee317b] rounded-md px-3.5 py-1.5 flex items-center justify-center gap-1.5 shadow-none transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Paper Stock
              </button>
            </div>
          ) : (
            <div className="text-xs font-sans text-gray-500 bg-[#151515] border border-[#262626] px-3 py-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#ee317b]" />
              EMPLOYEE ACCESS: Inventory is READ-ONLY
            </div>
          )}
        </div>
      </div>

      {/* Selected Stock Bulk Action Ribbon */}
      {selectedStockIds.length > 0 && (
        <div className="bg-[#112918] border border-[#71b536]/30 p-3 rounded-md flex items-center justify-between text-xs font-sans animate-fadeIn mb-4">
          <div className="flex items-center gap-2 text-[#71b536]">
            <span className="w-2 h-2 rounded-full bg-[#71b536] animate-ping" />
            <span>Selected <strong>{selectedStockIds.length}</strong> paper stocks for action...</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="px-3 py-1 bg-[#421A1D] hover:bg-[#5a1c21] border border-rose-950 text-rose-400 font-bold cursor-pointer text-[10px] tracking-wider uppercase transition-all"
            >
              🗑️ Delete Selected Stocks
            </button>
            <button
              type="button"
              onClick={() => setSelectedStockIds([])}
              className="px-2 py-1 hover:text-white text-zinc-400 border border-[#262626] cursor-pointer text-[10px]"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Quick Create New Stock Variant */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-[#121212] border border-[#ee317b]/50 rounded-md p-4 shadow-none mb-6"
          >
            <div className="flex justify-between items-center border-b border-[#262626] pb-3 mb-4 ">
              <span className="font-sans font-bold text-white text-xs uppercase flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-[#ee317b]" />
                Register New Paper
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
                <label className="block text-gray-400 mb-1 uppercase tracking-wider" htmlFor="field-new-stock-name">Variant Name</label>
                <input
                  id="field-new-stock-name"
                  type="text"
                  required
                  placeholder="e.g. Bronze wave"
                  value={newStockName}
                  onChange={(e) => setNewStockName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#181818] border border-[#262626] text-white rounded-md outline-none focus:border-[#ee317b] placeholder-gray-600 font-sans"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1 uppercase tracking-wider" htmlFor="field-new-stock-initial">Initial Sheets on Hand (expression enabled)</label>
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
                  className="w-full px-3 py-2 bg-[#181818] border border-[#262626] text-white rounded-md outline-none focus:border-[#ee317b]"
                />
                <div className="text-[10px] text-gray-500 mt-1 font-sans">
                  Parsed: {parseFractionOrExpression(newStockInitial)} sheets
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2  items-center">
                <span className="text-gray-500 italic mr-auto">Form remains open after adding for multiple entries.</span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 bg-transparent border border-transparent text-gray-400 hover:text-white cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#ee317b] hover:bg-[#d61e63] text-white font-bold cursor-pointer"
                >
                  Add Stock
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Inventory Board Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* List of Stocks - Responsive scroll table */}
        <div className="bg-[#121212] border border-[#262626] rounded-md lg:col-span-2 overflow-hidden">
          <div className="px-5 py-4 border-b border-[#262626] flex items-center justify-between bg-[#181818]">
            <span className="font-sans font-bold text-white uppercase text-xs tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4 text-[#ee317b]" />
              Paper Warehouse ledger
            </span>
            <span className="text-[10px] font-sans text-gray-500 uppercase">Interactive Sheets Deduct System</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-sans">
              <thead>
                <tr className="bg-[#181818] border-b border-[#262626] text-gray-400 font-sans uppercase tracking-wider">
                  <th className="py-3 px-3 text-center w-10">
                    <input
                      type="checkbox"
                      checked={filteredStocks.length > 0 && selectedStockIds.length === filteredStocks.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStockIds(filteredStocks.map(s => s.id));
                        } else {
                          setSelectedStockIds([]);
                        }
                      }}
                      className="accent-[#71b536] cursor-pointer"
                      title="Select/Deselect all filtered rows"
                    />
                  </th>
                  <th className="py-3 px-4 font-semibold text-gray-400">Paper Stock Name</th>
                  <th className="py-3 px-4 font-semibold text-gray-400 text-right">Initial Sheets</th>
                  <th className="py-3 px-4 font-semibold text-gray-400 text-right">Total Consumed</th>
                  <th className="py-3 px-4 font-semibold text-gray-400 text-right">Stock on Hand</th>
                  <th className="py-3 px-4 font-semibold text-gray-400">Status Alert</th>
                  <th className="py-3 px-4 text-center w-40">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626] text-gray-300 font-sans">
                {calculatedStocks.filter(stock => stock.name.toLowerCase().includes(searchQuery.toLowerCase())).map((stock) => {
                  const status = getStatus(stock.remaining);
                  const isSelected = selectedStockIds.includes(stock.id);
                  const isOutOfStock = stock.remaining <= 0;
                  const isLowStock = stock.remaining < 50 && stock.remaining > 0;
                  
                  let rowClass = 'transition-colors';
                  if (isSelected) {
                    rowClass += ' bg-[#121912]/20 border-l-2 border-[#71b536]';
                  } else if (isOutOfStock) {
                    rowClass += ' out-of-stock-row';
                  } else if (isLowStock) {
                    rowClass += ' low-stock-row';
                  } else {
                    rowClass += ' hover:bg-[#181818]';
                  }

                  return (
                    <tr 
                      key={stock.id} 
                      className={rowClass}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center">
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
                          className="accent-[#71b536] cursor-pointer"
                        />
                      </td>

                      {/* Name */}
                      <td className="py-3 px-4 font-sans font-bold text-white">{stock.name}</td>
                      
                      {/* Initial sheets */}
                      <td className="py-3 px-4 text-right">{stock.initialStock.toLocaleString()}</td>
                      
                      {/* Consumed Sheets */}
                      <td className="py-3 px-4 text-right text-yellow-400/90 font-medium bg-yellow-950/5">
                        {stock.consumed > 0 ? stock.consumed.toLocaleString() : '0'}
                      </td>
                      
                      {/* Remaining On Hand */}
                      <td className={`py-3 px-4 text-right font-bold ${stock.remaining <= 0 ? 'text-[#F87171] bg-[#2E181D]/10' : 'text-[#71b536]'}`}>
                        {stock.remaining.toLocaleString()}
                      </td>
                      
                      {/* Status badge */}
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 border text-[10px] font-bold ${status.classes}`}>
                          {status.text}
                        </span>
                      </td>

                      {/* EDIT & DELETE & REPLENISH buttons */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setReplenishingStockId(stock.id);
                              setReplenishAmount('');
                            }}
                            className="bg-transparent text-[#71b536] hover:bg-[#71b536]/10 p-1 rounded-md border border-[#71b536]/20 text-[10px] tracking-wider transition-colors font-sans cursor-pointer flex items-center gap-0.5"
                            title={`Add Sheets to "${stock.name}" Stock`}
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
            </table>
          </div>
        </div>

        {/* SIDE BAR / SUBMIT FORMS CONTROLLER */}
        <div className="space-y-6">
          
          {/* Quick Edit Sheet Stock Initial State */}
          <AnimatePresence>
            {editingStock && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="bg-[#121212] border border-[#262626] rounded-md p-4 shadow-none"
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
                    <label className="block text-gray-400 mb-1 uppercase tracking-wider" htmlFor="field-initial-stock">Initial Quantity (Sheets, expression enabled)</label>
                    <input
                      id="field-initial-stock"
                      type="text"
                      required
                      placeholder="e.g. 500+250"
                      value={editInitialInput}
                      onChange={(e) => {
                        const cleaned = cleanLeadingZeros(e.target.value);
                        setEditInitialInput(cleaned);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = parseFractionOrExpression(editInitialInput);
                          setEditInitialInput(val.toString());
                        }
                      }}
                      className="w-full px-3 py-2 bg-[#181818] border border-[#262626] text-white rounded-md outline-none focus:border-[#ee317b]"
                    />
                    <div className="text-[10px] text-gray-500 mt-1 font-sans">
                      Parsed: {parseFractionOrExpression(editInitialInput)} sheets
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
            )}
          </AnimatePresence>

          {/* Quick Replenish Sheet Stock */}
          <AnimatePresence>
            {replenishingStockId && (() => {
              const stock = paperStocks.find(s => s.id === replenishingStockId);
              if (!stock) return null;
              return (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 15 }}
                  className="bg-[#121212] border border-[#71b536]/30 rounded-md p-4 shadow-none space-y-4"
                >
                  <div className="flex justify-between items-center border-b border-[#262626] pb-3 ">
                    <span className="font-sans font-bold text-[#71b536] text-xs uppercase flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5" />
                      Add More Sheets to Stock
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
                    Refill warehouse category <strong className="text-white">"{stock.name}"</strong> by adding sheets directly to current initial count.
                  </p>

                  <div className="space-y-3 font-sans">
                    <div>
                      <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Sheets to Add (expression enabled)</label>
                      <input
                        type="text"
                        placeholder="e.g. 500 or 1000"
                        value={replenishAmount}
                        onChange={(e) => setReplenishAmount(cleanLeadingZeros(e.target.value))}
                        className="w-full px-2.5 py-1.5 text-xs bg-[#181818] text-white border border-[#262626] rounded-md outline-none focus:border-[#71b536]"
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

    </div>
  );
}
