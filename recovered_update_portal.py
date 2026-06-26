import re

with open('src/components/CustomerTab.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Import createPortal
if 'createPortal' not in content:
    content = content.replace('import React, { useState, useMemo, useEffect, useRef } from \'react\';', 
                              'import React, { useState, useMemo, useEffect, useRef } from \'react\';\nimport { createPortal } from \'react-dom\';')
    if 'import { createPortal }' not in content:
        # Fallback if the first replace failed
        content = content.replace('import React', 'import { createPortal } from "react-dom";\nimport React')

# Add actionMenuRect state
if 'const [actionMenuRect' not in content:
    content = content.replace('const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);',
                              'const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);\n  const [actionMenuRect, setActionMenuRect] = useState<DOMRect | null>(null);')

# Replace Grid Action Buttons completely
grid_pattern = '''<button
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

grid_replacement = '''<button
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
                                <div className="fixed inset-0 z-[9999]" onClick={() => setOpenActionMenuId(null)}>
                                  <motion.div 
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    style={{ position: 'fixed', top: actionMenuRect.bottom + 5, left: actionMenuRect.left }}
                                    className="w-36 bg-[#181818] border border-[#262626] rounded-md shadow-2xl overflow-hidden flex flex-col py-1 font-sans"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button onClick={() => { handleOpenEdit(c); setOpenActionMenuId(null); }} className="px-3 py-2 text-left text-[11px] font-bold text-gray-300 hover:text-white hover:bg-[#2a2a2a] flex items-center gap-2"><Edit3 className="w-3.5 h-3.5"/> Modify</button>
                                    <button onClick={() => { handleOpenDuplicate(c); setOpenActionMenuId(null); }} className="px-3 py-2 text-left text-[11px] font-bold text-gray-300 hover:text-white hover:bg-[#2a2a2a] flex items-center gap-2"><Copy className="w-3.5 h-3.5"/> Copy</button>
                                    <div className="h-px bg-[#333] my-1"></div>
                                    <button onClick={() => { setDeletingCustomerId(c.id); setOpenActionMenuId(null); }} className="px-3 py-2 text-left text-[11px] font-bold text-[#F87171] hover:text-[#ff9999] hover:bg-[#2a2a2a] flex items-center gap-2"><Trash2 className="w-3.5 h-3.5"/> Delete</button>
                                  </motion.div>
                                </div>,
                                document.body
                              )}
                            </AnimatePresence>'''

content = content.replace(grid_pattern, grid_replacement)

# Replace List Action Buttons completely
list_pattern = '''<button
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

list_replacement = '''<button
                    type="button"
                    onClick={(e) => {
                      setActionMenuRect(e.currentTarget.getBoundingClientRect());
                      setOpenActionMenuId(openActionMenuId === c.id ? null : c.id);
                    }}
                    className="text-[10px] border border-gray-300 dark:border-gray-600/40 hover:bg-gray-100 dark:hover:bg-[#262626] text-gray-600 dark:text-gray-400 font-sans font-bold py-1.5 px-1 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer bg-transparent relative z-0"
                  >
                    <MoreVertical className="w-3 h-3 shrink-0" />
                  </button>
                  <AnimatePresence>
                  {openActionMenuId === c.id && actionMenuRect && createPortal(
                    <div className="fixed inset-0 z-[9999]" onClick={() => setOpenActionMenuId(null)}>
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        style={{ position: 'fixed', top: actionMenuRect.bottom + 5, right: window.innerWidth - actionMenuRect.right }}
                        className="w-36 bg-[#181818] border border-[#262626] rounded-md shadow-2xl overflow-hidden flex flex-col py-1 font-sans"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button onClick={() => { handleOpenEdit(c); setOpenActionMenuId(null); }} className="px-3 py-2 text-left text-[11px] font-bold text-gray-300 hover:text-white hover:bg-[#2a2a2a] flex items-center gap-2"><Edit3 className="w-3.5 h-3.5"/> Modify</button>
                        <button onClick={() => { handleOpenDuplicate(c); setOpenActionMenuId(null); }} className="px-3 py-2 text-left text-[11px] font-bold text-gray-300 hover:text-white hover:bg-[#2a2a2a] flex items-center gap-2"><Copy className="w-3.5 h-3.5"/> Copy</button>
                        <div className="h-px bg-[#333] my-1"></div>
                        <button onClick={() => { setDeletingCustomerId(c.id); setOpenActionMenuId(null); }} className="px-3 py-2 text-left text-[11px] font-bold text-[#F87171] hover:text-[#ff9999] hover:bg-[#2a2a2a] flex items-center gap-2"><Trash2 className="w-3.5 h-3.5"/> Delete</button>
                      </motion.div>
                    </div>,
                    document.body
                  )}
                  </AnimatePresence>'''

content = content.replace(list_pattern, list_replacement)

with open('src/components/CustomerTab.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('UI refactored with Portal and fixed rect coordinates.')
