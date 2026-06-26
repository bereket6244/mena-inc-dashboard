import re

with open('src/components/CustomerTab.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Grid view block finding
grid_marker = 'className="flex items-center gap-1 pt-0.5 font-sans"'
start = content.find(grid_marker)
start = content.rfind('<div', 0, start)
end = content.find('</td>', start)
end = content.rfind('</div>', start, end) + 6

grid_block = content[start:end]

# 2. List view block finding
list_marker = 'className="flex items-center gap-1.5 justify-end pl-2 relative"'
start_l = content.find(list_marker)
start_l = content.rfind('<div', 0, start_l)
end_l = content.find('</div>\n              </div>\n            );', start_l)
end_l = content.rfind('</div>', start_l, end_l) + 6

list_block = content[start_l:end_l]

grid_replacement = '''<div className="flex items-center gap-1 pt-0.5 font-sans">
                            <button
                              type="button"
                              onClick={() => { setManagingPaymentsFor(c); setShowPaymentHistory(false); }}
                              className="text-gray-400 hover:text-[#71b536] hover:bg-gray-100 dark:hover:bg-[#262626] p-1.5 rounded-md transition-colors cursor-pointer"
                              title="Add Payment"
                            >
                              <Banknote className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => { setManagingAdjustmentsFor(c); setShowAdjustmentHistory(false); }}
                              className="text-gray-400 hover:text-[#ee317b] hover:bg-gray-100 dark:hover:bg-[#262626] p-1.5 rounded-md transition-colors cursor-pointer"
                              title="Increase Order"
                            >
                              <TrendingUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                setActionMenuRect(e.currentTarget.getBoundingClientRect());
                                setOpenActionMenuId(openActionMenuId === c.id ? null : c.id);
                              }}
                              className="text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#262626] p-1.5 rounded-md transition-colors cursor-pointer relative z-0"
                              title="More Options"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                            <AnimatePresence>
                              {openActionMenuId === c.id && actionMenuRect && createPortal(
                                <div className="fixed inset-0 z-[9999]" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenActionMenuId(null); }}>
                                  <motion.div 
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    style={{ position: 'fixed', top: actionMenuRect.bottom + 5, left: actionMenuRect.left }}
                                    className="w-36 bg-[#181818] border border-[#262626] rounded-md shadow-2xl overflow-hidden flex flex-col py-1 font-sans"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button onClick={() => { handleOpenEdit(c); setOpenActionMenuId(null); }} className="px-3 py-2 text-left text-[11px] font-bold text-gray-300 hover:text-white hover:bg-[#2a2a2a] flex items-center gap-2 transition-colors cursor-pointer"><Edit3 className="w-3.5 h-3.5"/> Modify</button>
                                    <button onClick={() => { handleOpenDuplicate(c); setOpenActionMenuId(null); }} className="px-3 py-2 text-left text-[11px] font-bold text-gray-300 hover:text-white hover:bg-[#2a2a2a] flex items-center gap-2 transition-colors cursor-pointer"><Copy className="w-3.5 h-3.5"/> Copy</button>
                                    <div className="h-px bg-[#333] my-1"></div>
                                    <button onClick={() => { setDeletingCustomerId(c.id); setOpenActionMenuId(null); }} className="px-3 py-2 text-left text-[11px] font-bold text-[#F87171] hover:text-[#ff9999] hover:bg-[#2a2a2a] flex items-center gap-2 transition-colors cursor-pointer"><Trash2 className="w-3.5 h-3.5"/> Delete</button>
                                  </motion.div>
                                </div>,
                                document.body
                              )}
                            </AnimatePresence>
                          </div>'''

list_replacement = '''<div className="flex items-center gap-1.5 justify-end pl-2">
                  <button
                    type="button"
                    onClick={() => { setManagingPaymentsFor(c); setShowPaymentHistory(false); }}
                    className="text-[10px] border border-[#71b536]/40 hover:bg-[#71b536]/10 text-[#71b536] font-sans font-bold py-1.5 px-0.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer bg-transparent"
                  >
                    <Banknote className="w-3 h-3 shrink-0" />
                    <span className="truncate">Pay</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setManagingAdjustmentsFor(c); setShowAdjustmentHistory(false); }}
                    className="text-[10px] border border-[#ee317b]/40 hover:bg-[#ee317b]/10 text-[#ee317b] font-sans font-bold py-1.5 px-0.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer bg-transparent"
                  >
                    <TrendingUp className="w-3 h-3 shrink-0" />
                    <span className="truncate">Adjust</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      setActionMenuRect(e.currentTarget.getBoundingClientRect());
                      setOpenActionMenuId(openActionMenuId === c.id ? null : c.id);
                    }}
                    className="text-[10px] border border-gray-300 dark:border-gray-600/40 hover:bg-gray-100 dark:hover:bg-[#262626] text-gray-500 dark:text-gray-400 font-sans font-bold py-1.5 px-1 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer bg-transparent"
                  >
                    <MoreVertical className="w-3 h-3 shrink-0" />
                  </button>
                  <AnimatePresence>
                  {openActionMenuId === c.id && actionMenuRect && createPortal(
                    <div className="fixed inset-0 z-[9999]" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenActionMenuId(null); }}>
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        style={{ position: 'fixed', top: actionMenuRect.bottom + 5, right: window.innerWidth - actionMenuRect.right }}
                        className="w-36 bg-[#181818] border border-[#262626] rounded-md shadow-2xl overflow-hidden flex flex-col py-1 font-sans"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button onClick={() => { handleOpenEdit(c); setOpenActionMenuId(null); }} className="px-3 py-2 text-left text-[11px] font-bold text-gray-300 hover:text-white hover:bg-[#2a2a2a] flex items-center gap-2 transition-colors cursor-pointer"><Edit3 className="w-3.5 h-3.5"/> Modify</button>
                        <button onClick={() => { handleOpenDuplicate(c); setOpenActionMenuId(null); }} className="px-3 py-2 text-left text-[11px] font-bold text-gray-300 hover:text-white hover:bg-[#2a2a2a] flex items-center gap-2 transition-colors cursor-pointer"><Copy className="w-3.5 h-3.5"/> Copy</button>
                        <div className="h-px bg-[#333] my-1"></div>
                        <button onClick={() => { setDeletingCustomerId(c.id); setOpenActionMenuId(null); }} className="px-3 py-2 text-left text-[11px] font-bold text-[#F87171] hover:text-[#ff9999] hover:bg-[#2a2a2a] flex items-center gap-2 transition-colors cursor-pointer"><Trash2 className="w-3.5 h-3.5"/> Delete</button>
                      </motion.div>
                    </div>,
                    document.body
                  )}
                  </AnimatePresence>
                </div>'''

content = content.replace(grid_block, grid_replacement)
content = content.replace(list_block, list_replacement)

with open('src/components/CustomerTab.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('UI perfectly refactored.')
