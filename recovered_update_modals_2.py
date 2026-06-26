import re

with open('src/components/CustomerTab.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

new_modals = """      {/* PAYMENTS MODAL */}
      <AnimatePresence>
        {managingPaymentsFor && (() => {
          const combinedPayments = [...(managingPaymentsFor.payments || [])];
          if (
            managingPaymentsFor.advancePayment > 0 && 
            !combinedPayments.some(p => p.amount === managingPaymentsFor.advancePayment && (p.date === managingPaymentsFor.advancePaymentDate || p.date === managingPaymentsFor.deliveryDate))
          ) {
            combinedPayments.unshift({
              id: 'legacy_advance',
              amount: managingPaymentsFor.advancePayment,
              date: managingPaymentsFor.advancePaymentDate || managingPaymentsFor.deliveryDate || '',
              paymentMethodId: managingPaymentsFor.bankAdvanceId || '',
              recordedBy: 'Initial Advance'
            });
          }
          const totalPaid = computeCustomerTotalPaid(managingPaymentsFor);
          const totalOrderValue = computeCustomerTotalInvoice(managingPaymentsFor);
          const remainingBalance = Math.max(0, totalOrderValue - totalPaid);

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
              className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-gray-200 dark:border-[#333] flex items-center justify-between bg-gradient-to-r from-gray-50 to-white dark:from-[#1a1a1a] dark:to-[#111]">
                <h3 className="text-gray-900 dark:text-white font-bold text-base flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-[#71b536]" />
                  Manage Payments
                </h3>
                <button onClick={() => {
                  setManagingPaymentsFor(null);
                  setEditingPaymentId(null);
                  setNewPaymentAmount('');
                }} className="text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[60vh] custom-scrollbar">
                
                <div className="flex items-center justify-between bg-gray-50 dark:bg-[#1a1a1a] p-3 rounded-lg border border-gray-200 dark:border-[#333] mb-4">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Total Order Value</div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white">{totalOrderValue.toLocaleString()} {managingPaymentsFor.currency || 'ETB'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Remaining Balance</div>
                    <div className={`text-sm font-bold ${remainingBalance === 0 ? 'text-[#71b536]' : 'text-orange-500'}`}>
                      {remainingBalance.toLocaleString()} {managingPaymentsFor.currency || 'ETB'}
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Previous Payments</h4>
                  {combinedPayments.length > 0 ? (
                    <div className="space-y-2">
                      {combinedPayments.map((p, idx) => {
                        const bank = bankAccounts.find(b => b.id === p.paymentMethodId) || bankAccounts.find(b => b.name === p.paymentMethodId);
                        const isLegacy = p.id === 'legacy_advance';
                        return (
                          <div key={idx} className={`flex justify-between items-center bg-white dark:bg-[#1a1a1a] p-2 rounded border ${editingPaymentId === p.id ? 'border-[#71b536]' : 'border-gray-200 dark:border-[#2a2a2a]'}`}>
                            <div>
                              <div className="text-gray-900 dark:text-white text-xs font-bold">{Number(p.amount).toLocaleString()} {managingPaymentsFor.currency || 'ETB'}</div>
                              <div className="text-gray-500 text-[10px]">{formatDateFriendly(p.date)} &bull; {bank?.name || p.paymentMethodId || 'Unknown Bank'}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 text-[10px] mr-2">By {p.recordedBy}</span>
                              {!isLegacy && (
                                <>
                                  <button onClick={() => {
                                    setEditingPaymentId(p.id);
                                    setNewPaymentAmount(p.amount.toString());
                                    setNewPaymentDate(p.date);
                                    
                                    const matchedBank = bankAccounts.find(b => b.id === p.paymentMethodId) || bankAccounts.find(b => b.name === p.paymentMethodId);
                                    setNewPaymentMethodId(matchedBank ? matchedBank.name : (p.paymentMethodId || ''));
                                  }} className="text-gray-400 hover:text-blue-500 transition-colors" title="Edit Payment">
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => {
                                    if(confirm('Are you sure you want to delete this payment?')) {
                                      const updatedPayments = managingPaymentsFor.payments.filter(pay => pay.id !== p.id);
                                      const updatedCustomer = { ...managingPaymentsFor, payments: updatedPayments };
                                      onUpdateCustomer(updatedCustomer);
                                      setManagingPaymentsFor(updatedCustomer);
                                      if(editingPaymentId === p.id) {
                                        setEditingPaymentId(null);
                                        setNewPaymentAmount('');
                                      }
                                    }
                                  }} className="text-gray-400 hover:text-red-500 transition-colors" title="Delete Payment">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-xs italic">No payments recorded.</div>
                  )}
                </div>
                
                <div className="border-t border-gray-200 dark:border-[#333] pt-4 mt-2">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-[#71b536] uppercase tracking-wider">{editingPaymentId ? 'Edit Payment' : 'Add New Payment'}</h4>
                    {editingPaymentId && (
                      <button onClick={() => {
                        setEditingPaymentId(null);
                        setNewPaymentAmount('');
                      }} className="text-[10px] text-gray-500 hover:text-gray-800 dark:hover:text-white uppercase font-bold">
                        Cancel Edit
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-[10px] uppercase text-gray-600 dark:text-gray-500">Amount ({managingPaymentsFor.currency || 'ETB'})</label>
                        {remainingBalance > 0 && !editingPaymentId && (
                           <button 
                             onClick={() => setNewPaymentAmount(remainingBalance.toString())}
                             className="text-[9px] text-[#71b536] font-bold hover:underline"
                           >
                             Use Remaining Balance
                           </button>
                        )}
                      </div>
                      <input
                        type="number"
                        value={newPaymentAmount}
                        onChange={(e) => setNewPaymentAmount(e.target.value)}
                        className="w-full bg-white dark:bg-[#0a0a0a] border border-gray-300 dark:border-[#333] rounded px-3 py-2 text-gray-900 dark:text-white text-sm focus:border-[#71b536] focus:outline-none transition-colors"
                        placeholder="e.g. 5000"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase text-gray-600 dark:text-gray-500 mb-1">Date</label>
                        <input
                          type="date"
                          value={newPaymentDate}
                          onChange={(e) => setNewPaymentDate(e.target.value)}
                          className="w-full bg-white dark:bg-[#0a0a0a] border border-gray-300 dark:border-[#333] rounded px-3 py-2 text-gray-900 dark:text-white text-sm focus:border-[#71b536] focus:outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase text-gray-600 dark:text-gray-500 mb-1">Bank Account</label>
                        <input
                          list="bank-options"
                          value={newPaymentMethodId}
                          onChange={(e) => setNewPaymentMethodId(e.target.value)}
                          className="w-full bg-white dark:bg-[#0a0a0a] border border-gray-300 dark:border-[#333] rounded px-3 py-2 text-gray-900 dark:text-white text-sm focus:border-[#71b536] focus:outline-none transition-colors"
                          placeholder="Type or select bank..."
                        />
                        <datalist id="bank-options">
                          {bankAccounts.filter(b => !b.isDeleted).map(b => (
                            <option key={b.id} value={b.name} />
                          ))}
                        </datalist>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] flex justify-end gap-2">
                <button
                  onClick={() => {
                    setManagingPaymentsFor(null);
                    setEditingPaymentId(null);
                    setNewPaymentAmount('');
                  }}
                  className="px-4 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    if (!newPaymentAmount || !newPaymentDate || !newPaymentMethodId) {
                      setToastMessage("Please fill in all payment fields.");
                      setToastType("error");
                      return;
                    }
                    
                    let updatedPayments;
                    // Try to match the typed bank name to an ID, otherwise save the typed name
                    const matchedBank = bankAccounts.find(b => b.name === newPaymentMethodId || b.id === newPaymentMethodId);
                    const finalPaymentMethodId = matchedBank ? matchedBank.id : newPaymentMethodId;

                    if (editingPaymentId) {
                      updatedPayments = managingPaymentsFor.payments.map(p => 
                        p.id === editingPaymentId ? { ...p, amount: Number(newPaymentAmount), date: newPaymentDate, paymentMethodId: finalPaymentMethodId } : p
                      );
                      setToastMessage("Payment updated successfully.");
                    } else {
                      const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                      const newPayment = {
                        id: paymentId,
                        amount: Number(newPaymentAmount),
                        date: newPaymentDate,
                        paymentMethodId: finalPaymentMethodId,
                        recordedBy: currentUser?.username || 'Unknown'
                      };
                      updatedPayments = [...(managingPaymentsFor.payments || []), newPayment];
                      setToastMessage("Payment added successfully.");
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
              className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-gray-200 dark:border-[#333] flex items-center justify-between bg-gradient-to-r from-gray-50 to-white dark:from-[#1a1a1a] dark:to-[#111]">
                <h3 className="text-gray-900 dark:text-white font-bold text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#ee317b]" />
                  Increase Order Size
                </h3>
                <button onClick={() => setManagingAdjustmentsFor(null)} className="text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[60vh] custom-scrollbar">
                <div className="mb-4">
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
                </div>
                
                <div className="border-t border-gray-200 dark:border-[#333] pt-4 mt-2">
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
      </AnimatePresence>"""

start_marker = '{/* PAYMENTS MODAL */}'
end_marker = '<AppToast message={toastMessage}'
start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    new_content = content[:start_idx] + new_modals + '\n      ' + content[end_idx:]
    with open('src/components/CustomerTab.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('Replaced successfully')
else:
    print('Failed to find markers')
