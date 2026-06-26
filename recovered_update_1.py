import re

with open('src/components/CustomerTab.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add History State
if 'const [showPaymentHistory' not in content:
    state_pattern = 'const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);'
    state_replacement = state_pattern + '''\n  const [showPaymentHistory, setShowPaymentHistory] = useState(false);\n  const [showAdjustmentHistory, setShowAdjustmentHistory] = useState(false);'''
    content = content.replace(state_pattern, state_replacement)

# 2. Reset history state when opening modal
if 'setManagingPaymentsFor(null)' in content:
    content = content.replace('setManagingPaymentsFor(c)', '{ setManagingPaymentsFor(c); setShowPaymentHistory(false); }')
    content = content.replace('setManagingAdjustmentsFor(c)', '{ setManagingAdjustmentsFor(c); setShowAdjustmentHistory(false); }')
    
    # Close
    content = content.replace('''setManagingPaymentsFor(null);
                  setEditingPaymentId(null);
                  setNewPaymentAmount('');''', '''setManagingPaymentsFor(null);
                  setEditingPaymentId(null);
                  setNewPaymentAmount('');
                  setShowPaymentHistory(false);''')

# 3. Fix overflow-hidden on table row
row_pattern = 'sm:hover:bg-gray-50 dark:hover:bg-[#222] transition-colors mb-4 sm:mb-0 shadow-sm sm:shadow-none rounded-lg sm:rounded-none overflow-hidden"'
row_replace = 'sm:hover:bg-gray-50 dark:hover:bg-[#222] transition-colors mb-4 sm:mb-0 shadow-sm sm:shadow-none rounded-lg sm:rounded-none"'
content = content.replace(row_pattern, row_replace)

# 4. Replace Grid action buttons
grid_pattern = '''<button
                              type="button"
                              onClick={() => setManagingPaymentsFor(c)}
                              className="text-gray-400 hover:text-[#71b536] hover:bg-[#262626] p-1.5 rounded-md transition-colors cursor-pointer"
                              title="Add Payment"
                            >
                              <Banknote className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setManagingAdjustmentsFor(c)}
                              className="text-gray-400 hover:text-[#ee317b] hover:bg-[#262626] p-1.5 rounded-md transition-colors cursor-pointer"
                              title="Increase Order"
                            >
                              <TrendingUp className="w-3.5 h-3.5" />
                            </button>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setOpenActionMenuId(openActionMenuId === c.id ? null : c.id)}
                                className="text-gray-400 hover:text-white hover:bg-[#262626] p-1.5 rounded-md transition-colors cursor-pointer"
                                title="More Options"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>
                              {openActionMenuId === c.id && (
                                <div className="absolute left-full ml-1 bottom-0 w-32 bg-[#1f1f1f] border border-[#333] rounded-md shadow-lg z-50 overflow-hidden flex flex-col py-1">
                                  <button onClick={() => { handleOpenEdit(c); setOpenActionMenuId(null); }} className="px-3 py-2 text-left text-[11px] font-bold text-gray-300 hover:text-white hover:bg-[#2a2a2a] flex items-center gap-2"><Edit3 className="w-3.5 h-3.5"/> Modify</button>
                                  <button onClick={() => { handleOpenDuplicate(c); setOpenActionMenuId(null); }} className="px-3 py-2 text-left text-[11px] font-bold text-gray-300 hover:text-white hover:bg-[#2a2a2a] flex items-center gap-2"><Copy className="w-3.5 h-3.5"/> Copy</button>
                                  <div className="h-px bg-[#333] my-1"></div>
                                  <button onClick={() => { setDeletingCustomerId(c.id); setOpenActionMenuId(null); }} className="px-3 py-2 text-left text-[11px] font-bold text-[#F87171] hover:text-[#ff9999] hover:bg-[#2a2a2a] flex items-center gap-2"><Trash2 className="w-3.5 h-3.5"/> Delete</button>
                                </div>
                              )}
                            </div>'''

grid_replace = '''<button
                              type="button"
                              onClick={() => { setManagingPaymentsFor(c); setShowPaymentHistory(false); }}
                              className="text-gray-500 dark:text-gray-400 hover:text-[#71b536] dark:hover:text-[#71b536] hover:bg-green-50 dark:hover:bg-[#262626] p-1.5 rounded-md transition-colors cursor-pointer"
                              title="Add Payment"
                            >
                              <Banknote className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => { setManagingAdjustmentsFor(c); setShowAdjustmentHistory(false); }}
                              className="text-gray-500 dark:text-gray-400 hover:text-[#ee317b] dark:hover:text-[#ee317b] hover:bg-pink-50 dark:hover:bg-[#262626] p-1.5 rounded-md transition-colors cursor-pointer"
                              title="Increase Order"
                            >
                              <TrendingUp className="w-3.5 h-3.5" />
                            </button>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setOpenActionMenuId(openActionMenuId === c.id ? null : c.id)}
                                className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#262626] p-1.5 rounded-md transition-colors cursor-pointer relative z-[60]"
                                title="More Options"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>
                              <AnimatePresence>
                              {openActionMenuId === c.id && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => setOpenActionMenuId(null)} />
                                  <motion.div 
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute left-full ml-1 bottom-0 w-32 bg-white dark:bg-[#181818] border border-gray-200 dark:border-[#262626] rounded-md shadow-2xl z-[60] overflow-hidden flex flex-col py-1">
                                    <button onClick={() => { handleOpenEdit(c); setOpenActionMenuId(null); }} className="px-3 py-2 text-left text-[11px] font-bold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#2a2a2a] flex items-center gap-2"><Edit3 className="w-3.5 h-3.5"/> Modify</button>
                                    <button onClick={() => { handleOpenDuplicate(c); setOpenActionMenuId(null); }} className="px-3 py-2 text-left text-[11px] font-bold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#2a2a2a] flex items-center gap-2"><Copy className="w-3.5 h-3.5"/> Copy</button>
                                    <div className="h-px bg-gray-200 dark:bg-[#333] my-1"></div>
                                    <button onClick={() => { setDeletingCustomerId(c.id); setOpenActionMenuId(null); }} className="px-3 py-2 text-left text-[11px] font-bold text-red-500 hover:text-red-600 dark:text-[#F87171] dark:hover:text-[#ff9999] hover:bg-red-50 dark:hover:bg-[#2a2a2a] flex items-center gap-2"><Trash2 className="w-3.5 h-3.5"/> Delete</button>
                                  </motion.div>
                                </>
                              )}
                              </AnimatePresence>
                            </div>'''
content = content.replace(grid_pattern, grid_replace)

# 5. Replace List action buttons
list_pattern = '''<button
                    type="button"
                    onClick={() => setOpenActionMenuId(openActionMenuId === c.id ? null : c.id)}
                    className="text-[10px] border border-gray-600/40 hover:bg-gray-600/10 text-gray-400 font-sans font-bold py-1.5 px-1 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer bg-transparent"
                  >
                    <MoreVertical className="w-3 h-3 shrink-0" />
                  </button>
                  
                  {openActionMenuId === c.id && (
                    <div className="absolute right-0 top-full mt-1 w-32 bg-[#1f1f1f] border border-[#333] rounded-md shadow-lg z-50 overflow-hidden flex flex-col py-1">
                      <button onClick={() => { handleOpenEdit(c); setOpenActionMenuId(null); }} className="px-3 py-2 text-left text-[11px] font-bold text-gray-300 hover:text-white hover:bg-[#2a2a2a] flex items-center gap-2"><Edit3 className="w-3.5 h-3.5"/> Modify</button>
                      <button onClick={() => { handleOpenDuplicate(c); setOpenActionMenuId(null); }} className="px-3 py-2 text-left text-[11px] font-bold text-gray-300 hover:text-white hover:bg-[#2a2a2a] flex items-center gap-2"><Copy className="w-3.5 h-3.5"/> Copy</button>
                      <div className="h-px bg-[#333] my-1"></div>
                      <button onClick={() => { setDeletingCustomerId(c.id); setOpenActionMenuId(null); }} className="px-3 py-2 text-left text-[11px] font-bold text-[#F87171] hover:text-[#ff9999] hover:bg-[#2a2a2a] flex items-center gap-2"><Trash2 className="w-3.5 h-3.5"/> Delete</button>
                    </div>
                  )}'''

list_replace = '''<button
                    type="button"
                    onClick={() => setOpenActionMenuId(openActionMenuId === c.id ? null : c.id)}
                    className="text-[10px] border border-gray-300 dark:border-gray-600/40 hover:bg-gray-100 dark:hover:bg-gray-600/10 text-gray-600 dark:text-gray-400 font-sans font-bold py-1.5 px-1 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer bg-transparent relative z-[60]"
                  >
                    <MoreVertical className="w-3 h-3 shrink-0" />
                  </button>
                  <AnimatePresence>
                  {openActionMenuId === c.id && (
                    <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpenActionMenuId(null)} />
                    <motion.div 
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-[#181818] border border-gray-200 dark:border-[#262626] rounded-md shadow-2xl z-[60] overflow-hidden flex flex-col py-1">
                      <button onClick={() => { handleOpenEdit(c); setOpenActionMenuId(null); }} className="px-3 py-2 text-left text-[11px] font-bold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#2a2a2a] flex items-center gap-2"><Edit3 className="w-3.5 h-3.5"/> Modify</button>
                      <button onClick={() => { handleOpenDuplicate(c); setOpenActionMenuId(null); }} className="px-3 py-2 text-left text-[11px] font-bold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#2a2a2a] flex items-center gap-2"><Copy className="w-3.5 h-3.5"/> Copy</button>
                      <div className="h-px bg-gray-200 dark:bg-[#333] my-1"></div>
                      <button onClick={() => { setDeletingCustomerId(c.id); setOpenActionMenuId(null); }} className="px-3 py-2 text-left text-[11px] font-bold text-red-500 hover:text-red-600 dark:text-[#F87171] dark:hover:text-[#ff9999] hover:bg-red-50 dark:hover:bg-[#2a2a2a] flex items-center gap-2"><Trash2 className="w-3.5 h-3.5"/> Delete</button>
                    </motion.div>
                    </>
                  )}
                  </AnimatePresence>'''

content = content.replace(list_pattern, list_replace)

with open('src/components/CustomerTab.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Phase 1 complete')
