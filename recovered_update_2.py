import re

with open('src/components/CustomerTab.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Payments Modal replace
payments_start_str = '''<div className="mb-4">
                  <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Previous Payments</h4>'''
payments_end_str = '''<div className="border-t border-gray-200 dark:border-[#333] pt-4 mt-2">'''

payments_start = content.find(payments_start_str)
payments_end = content.find(payments_end_str, payments_start)
if payments_start != -1 and payments_end != -1:
    old_payments_section = content[payments_start:payments_end]
    new_payments_section = '''{showPaymentHistory ? (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Previous Payments</h4>
                      <button onClick={() => setShowPaymentHistory(false)} className="text-[10px] text-gray-500 hover:text-gray-900 dark:hover:text-white uppercase font-bold">Back to Add Payment</button>
                    </div>
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
                                      setShowPaymentHistory(false);
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
                ) : (
                  <div className="mb-4 flex justify-between items-center">
                    <button onClick={() => setShowPaymentHistory(true)} className="text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors underline decoration-dotted underline-offset-2">
                      View Payment History ({combinedPayments.length})
                    </button>
                  </div>
                )}
                
                <div className={`border-t border-gray-200 dark:border-[#333] pt-4 mt-2 ${showPaymentHistory ? 'hidden' : 'block'}`}>'''
    content = content[:payments_start] + new_payments_section + content[payments_end + len(payments_end_str):]


# Adjustments Modal replace
adj_start_str = '''<div className="mb-4">
                  <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Previous Additions</h4>'''
adj_end_str = '''<div className="border-t border-gray-200 dark:border-[#333] pt-4 mt-2">'''

adj_start = content.find(adj_start_str)
adj_end = content.find(adj_end_str, adj_start)
if adj_start != -1 and adj_end != -1:
    old_adj_section = content[adj_start:adj_end]
    new_adj_section = '''{showAdjustmentHistory ? (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Previous Additions</h4>
                      <button onClick={() => setShowAdjustmentHistory(false)} className="text-[10px] text-gray-500 hover:text-gray-900 dark:hover:text-white uppercase font-bold">Back to Add Quantity</button>
                    </div>
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
                ) : (
                  <div className="mb-4 flex justify-between items-center">
                    <button onClick={() => setShowAdjustmentHistory(true)} className="text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors underline decoration-dotted underline-offset-2">
                      View Additions History ({managingAdjustmentsFor.orderAdjustments?.length || 0})
                    </button>
                  </div>
                )}
                
                <div className={`border-t border-gray-200 dark:border-[#333] pt-4 mt-2 ${showAdjustmentHistory ? 'hidden' : 'block'}`}>'''
    content = content[:adj_start] + new_adj_section + content[adj_end + len(adj_end_str):]


with open('src/components/CustomerTab.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Phase 2 complete')
