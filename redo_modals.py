import re

with open('src/components/CustomerTab.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. IMPORTS
if "import { createPortal } from 'react-dom';" not in content:
    content = content.replace("import React, { useState, useEffect, useRef } from 'react';", "import React, { useState, useEffect, useRef } from 'react';\nimport { createPortal } from 'react-dom';")

if "  Pencil," not in content:
    content = content.replace("} from 'lucide-react';", "  Pencil,\n} from 'lucide-react';")

# 2. STATE
state_vars = '''
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [actionMenuRect, setActionMenuRect] = useState<DOMRect | null>(null);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [showAdjustmentHistory, setShowAdjustmentHistory] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);'''

target_state = "const [newPaymentMethodId, setNewPaymentMethodId] = useState('');"
if "const [showPaymentHistory" not in content:
    content = content.replace(target_state, target_state + state_vars)

# 3. MODALS
new_modals = '''{/* PAYMENTS MODAL */}
      <AnimatePresence>
        {managingPaymentsFor && (() => {
          const totalPaid = computeCustomerTotalPaid(managingPaymentsFor);
          const totalInvoice = computeCustomerTotalInvoice(managingPaymentsFor);
          const rawRemaining = totalInvoice - totalPaid;
          const remainingAmount = Math.max(0, rawRemaining);

          return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-sans"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-4 border-b border-gray-200 dark:border-[#333] flex flex-col gap-3 bg-gradient-to-r from-gray-50 to-white dark:from-[#1a1a1a] dark:to-[#111]">
                <div className="flex items-center justify-between">
                  <h3 className="text-gray-900 dark:text-white font-bold text-base flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-[#71b536]" />
                    Manage Payments
                  </h3>
                  <button onClick={() => {
                    setManagingPaymentsFor(null);
                    setEditingPaymentId(null);
                    setNewPaymentAmount('');
                    setNewPaymentMethodId('');
                  }} className="text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-4 text-sm bg-white dark:bg-[#111] p-3 rounded-lg border border-gray-200 dark:border-[#262626]">
                  <div><span className="text-gray-500 block text-[10px] uppercase tracking-wider mb-0.5">Total Value</span><span className="font-bold text-gray-900 dark:text-white">{formatMoney(totalInvoice, managingPaymentsFor.currency)}</span></div>
                  <div><span className="text-gray-500 block text-[10px] uppercase tracking-wider mb-0.5">Total Paid</span><span className="font-bold text-[#71b536]">{formatMoney(totalPaid, managingPaymentsFor.currency)}</span></div>
                  <div><span className="text-gray-500 block text-[10px] uppercase tracking-wider mb-0.5">Remaining</span><span className={`font-bold ${remainingAmount > 0 ? 'text-[#ee317b]' : 'text-gray-900 dark:text-white'}`}>{formatMoney(remainingAmount, managingPaymentsFor.currency)}</span></div>
                </div>
                <button 
                  type="button" 
                  onClick={() => setShowPaymentHistory(!showPaymentHistory)}
                  className="text-xs font-bold text-[#ee317b] hover:text-[#c62060] self-start"
                >
                  {showPaymentHistory ? "Hide Payment History" : "View Payment History"}
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <AnimatePresence>
                  {showPaymentHistory && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mb-6 overflow-hidden"
                    >
                      <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">All Payments Made</h4>
                      <div className="space-y-2">
                        {managingPaymentsFor.advancePayment && Number(managingPaymentsFor.advancePayment) > 0 && (
                          <div className="flex justify-between items-center bg-gray-50 dark:bg-[#1a1a1a] p-3 rounded-lg border border-gray-200 dark:border-[#2a2a2a]">
                            <div>
                              <div className="text-gray-900 dark:text-white text-sm font-bold">{formatMoney(Number(managingPaymentsFor.advancePayment), managingPaymentsFor.currency)}</div>
                              <div className="text-gray-500 text-xs">Advance Payment</div>
                            </div>
                            <div className="text-gray-500 text-xs italic">Initial</div>
                          </div>
                        )}
                        {managingPaymentsFor.payments && managingPaymentsFor.payments.length > 0 ? (
                          managingPaymentsFor.payments.map((p) => (
                            <div key={p.id} className="flex justify-between items-center bg-white dark:bg-[#1a1a1a] p-3 rounded-lg border border-gray-200 dark:border-[#2a2a2a]">
                              <div>
                                <div className="text-gray-900 dark:text-white text-sm font-bold flex items-center gap-2">
                                  {formatMoney(Number(p.amount), managingPaymentsFor.currency)}
                                  {p.methodId && (
                                    <span className="text-[10px] font-normal bg-gray-100 dark:bg-[#262626] text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">
                                      {banks.find(b => b.id === p.methodId)?.name || 'Unknown Bank'}
                                    </span>
                                  )}
                                </div>
                                <div className="text-gray-500 text-xs">{formatDateFriendly(p.date)}</div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-gray-500 text-xs text-right">
                                  <div>By {p.recordedBy}</div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingPaymentId(p.id);
                                    setNewPaymentAmount(p.amount.toString());
                                    setNewPaymentDate(p.date);
                                    setNewPaymentMethodId(p.methodId || '');
                                    setShowPaymentHistory(false);
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-white hover:bg-[#333] rounded transition-colors"
                                  title="Edit Payment"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          !managingPaymentsFor.advancePayment && <div className="text-gray-500 text-sm italic">No additional payments recorded.</div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <div className="bg-white dark:bg-[#1a1a1a] p-4 rounded-xl border border-gray-200 dark:border-[#2a2a2a]">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-bold text-[#71b536] uppercase tracking-wider">
                      {editingPaymentId ? 'Edit Payment' : 'Record New Payment'}
                    </h4>
                    {editingPaymentId && (
                      <button 
                        type="button"
                        onClick={() => {
                          setEditingPaymentId(null);
                          setNewPaymentAmount('');
                        }}
                        className="text-[10px] font-bold text-gray-500 hover:text-white"
                      >
                        CANCEL EDIT
                      </button>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex justify-between items-end mb-1">
                          <label className="block text-[10px] uppercase text-gray-600 dark:text-gray-500">Amount</label>
                          {!editingPaymentId && remainingAmount > 0 && (
                            <button 
                              type="button" 
                              onClick={() => setNewPaymentAmount(remainingAmount.toString())}
                              className="text-[9px] text-[#ee317b] hover:text-[#c62060] font-bold"
                            >
                              Write remaining balance
                            </button>
                          )}
                        </div>
                        <input
                          type="number"
                          value={newPaymentAmount}
                          onChange={(e) => setNewPaymentAmount(e.target.value)}
                          className="w-full bg-gray-50 dark:bg-[#0a0a0a] border border-gray-300 dark:border-[#333] rounded-lg px-3 py-2.5 text-gray-900 dark:text-white text-sm focus:border-[#71b536] focus:outline-none transition-colors"
                          placeholder="e.g. 500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase text-gray-600 dark:text-gray-500 mb-1">Date</label>
                        <input
                          type="date"
                          value={newPaymentDate}
                          onChange={(e) => setNewPaymentDate(e.target.value)}
                          className="w-full bg-gray-50 dark:bg-[#0a0a0a] border border-gray-300 dark:border-[#333] rounded-lg px-3 py-2.5 text-gray-900 dark:text-white text-sm focus:border-[#71b536] focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-gray-600 dark:text-gray-500 mb-1">Bank / Method</label>
                      <SearchableSelect
                        options={banks.map(b => ({ value: b.id, label: b.name }))}
                        value={newPaymentMethodId}
                        onChange={setNewPaymentMethodId}
                        placeholder="Select Bank..."
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] flex justify-end gap-3">
                <button
                  onClick={() => {
                    setManagingPaymentsFor(null);
                    setEditingPaymentId(null);
                    setNewPaymentAmount('');
                    setNewPaymentMethodId('');
                  }}
                  className="px-4 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!newPaymentAmount || !newPaymentDate) {
                      setToastMessage("Please fill in amount and date.");
                      setToastType("error");
                      return;
                    }
                    
                    let updatedPayments = managingPaymentsFor.payments || [];
                    
                    if (editingPaymentId) {
                      updatedPayments = updatedPayments.map(p => 
                        p.id === editingPaymentId 
                          ? { ...p, amount: Number(newPaymentAmount), date: newPaymentDate, methodId: newPaymentMethodId }
                          : p
                      );
                    } else {
                      const payId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                      const newPay = {
                        id: payId,
                        amount: Number(newPaymentAmount),
                        date: newPaymentDate,
                        methodId: newPaymentMethodId,
                        recordedBy: currentUser?.username || 'Unknown'
                      };
                      updatedPayments = [...updatedPayments, newPay];
                    }
                    
                    const updatedCustomer = {
                      ...managingPaymentsFor,
                      payments: updatedPayments
                    };
                    onUpdateCustomer(updatedCustomer);
                    setManagingPaymentsFor(updatedCustomer);
                    setEditingPaymentId(null);
                    setNewPaymentAmount('');
                    setNewPaymentMethodId('');
                    setToastType("success");
                  }}
                  className="px-4 py-2 text-xs font-bold bg-[#71b536] hover:bg-[#5a912a] text-white rounded transition-colors cursor-pointer"
                >
                  {editingPaymentId ? 'Update Payment' : 'Save Payment'}
                </button>
              </div>
            </motion.div>
          </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ADJUSTMENTS MODAL */}
      <AnimatePresence>
        {managingAdjustmentsFor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-sans"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-4 border-b border-gray-200 dark:border-[#333] flex flex-col gap-3 bg-gradient-to-r from-gray-50 to-white dark:from-[#1a1a1a] dark:to-[#111]">
                <div className="flex items-center justify-between">
                  <h3 className="text-gray-900 dark:text-white font-bold text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#ee317b]" />
                    Increase Order Size
                  </h3>
                  <button onClick={() => setManagingAdjustmentsFor(null)} className="text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <button 
                  type="button" 
                  onClick={() => setShowAdjustmentHistory(!showAdjustmentHistory)}
                  className="text-xs font-bold text-[#ee317b] hover:text-[#c62060] self-start"
                >
                  {showAdjustmentHistory ? "Hide Addition History" : "View Addition History"}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <AnimatePresence>
                  {showAdjustmentHistory && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mb-6 overflow-hidden"
                    >
                      <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Previous Additions</h4>
                      {managingAdjustmentsFor.orderAdjustments && managingAdjustmentsFor.orderAdjustments.length > 0 ? (
                        <div className="space-y-2">
                          {managingAdjustmentsFor.orderAdjustments.map((adj, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-white dark:bg-[#1a1a1a] p-2 rounded border border-gray-200 dark:border-[#2a2a2a]">
                              <div>
                                <div className="text-gray-900 dark:text-white text-xs font-bold">+{adj.additionalQuantity} qty</div>
                                <div className="text-gray-500 text-[10px]">{formatDateFriendly(adj.date)}</div>
                              </div>
                              <div className="text-gray-500 text-[10px]">By {adj.recordedBy}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-gray-500 text-xs italic">No order additions recorded.</div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <div className="bg-white dark:bg-[#1a1a1a] p-4 rounded-xl border border-gray-200 dark:border-[#2a2a2a]">
                  <h4 className="text-xs font-bold text-[#ee317b] uppercase tracking-wider mb-3">Add Quantity</h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase text-gray-600 dark:text-gray-500 mb-1">Additional Amount (Qty)</label>
                        <input
                          type="number"
                          value={newAdjustmentQuantity}
                          onChange={(e) => setNewAdjustmentQuantity(e.target.value)}
                          className="w-full bg-white dark:bg-[#0a0a0a] border border-gray-300 dark:border-[#333] rounded px-3 py-2 text-gray-900 dark:text-white text-sm focus:border-[#ee317b] focus:outline-none transition-colors"
                          placeholder="e.g. 50"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase text-gray-600 dark:text-gray-500 mb-1">Date</label>
                        <input
                          type="date"
                          value={newAdjustmentDate}
                          onChange={(e) => setNewAdjustmentDate(e.target.value)}
                          className="w-full bg-white dark:bg-[#0a0a0a] border border-gray-300 dark:border-[#333] rounded px-3 py-2 text-gray-900 dark:text-white text-sm focus:border-[#ee317b] focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] flex justify-end gap-2">
                <button
                  onClick={() => setManagingAdjustmentsFor(null)}
                  className="px-4 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!newAdjustmentQuantity || !newAdjustmentDate) {
                      setToastMessage("Please fill in quantity and date.");
                      setToastType("error");
                      return;
                    }
                    const addQty = Number(newAdjustmentQuantity);
                    const adjId = `adj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    const newAdj = {
                      id: adjId,
                      additionalQuantity: addQty,
                      unitPrice: Number(managingAdjustmentsFor.unitPrice),
                      date: newAdjustmentDate,
                      notes: '',
                      recordedBy: currentUser?.username || 'Unknown'
                    };
                    const updatedCustomer = {
                      ...managingAdjustmentsFor,
                      quantity: (managingAdjustmentsFor.quantity || 0) + addQty,
                      orderAdjustments: [...(managingAdjustmentsFor.orderAdjustments || []), newAdj]
                    };
                    onUpdateCustomer(updatedCustomer);
                    setManagingAdjustmentsFor(updatedCustomer);
                    setNewAdjustmentQuantity('');
                    setToastMessage("Order increased successfully.");
                    setToastType("success");
                  }}
                  className="px-4 py-2 text-xs font-bold bg-[#ee317b] hover:bg-[#c62060] text-white rounded transition-colors cursor-pointer"
                >
                  Save Addition
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>'''

start_marker = '{/* PAYMENTS MODAL */}'
end_marker = '<AppToast message={toastMessage}'
start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + new_modals + '\n      ' + content[end_idx:]

with open('src/components/CustomerTab.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Modals replaced successfully')
