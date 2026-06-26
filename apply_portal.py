import re

with open('src/components/CustomerTab.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add createPortal import
if "import { createPortal }" not in content:
    content = "import { createPortal } from 'react-dom';\n" + content

# 1. Update the grid action menu button
grid_pattern = '''<div className="flex items-center gap-1 pt-0.5 font-sans">
                            <button
                              type="button"
                              onClick={() => handleOpenDuplicate(c)}
                              className="text-gray-400 hover:text-sky-400 hover:bg-[#262626] p-1.5 rounded-md transition-colors cursor-pointer"
                              title="Copy details to add another order for this client"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
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
                            </div>
                          </div>'''

grid_replacement = '''<div className="flex items-center gap-1 pt-0.5 font-sans">
                            <button
                              type="button"
                              onClick={() => handleOpenDuplicate(c)}
                              className="text-gray-400 hover:text-sky-400 hover:bg-[#262626] p-1.5 rounded-md transition-colors cursor-pointer"
                              title="Copy details to add another order for this client"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
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
                            <div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  if (openActionMenuId === c.id) {
                                    setOpenActionMenuId(null);
                                  } else {
                                    setActionMenuRect(e.currentTarget.getBoundingClientRect());
                                    setOpenActionMenuId(c.id);
                                  }
                                }}
                                className="text-gray-400 hover:text-white hover:bg-[#262626] p-1.5 rounded-md transition-colors cursor-pointer"
                                title="More Options"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>'''

# 2. Update list action menu button
list_pattern = '''<div className="flex items-center gap-1.5 justify-end pl-2 relative">
                  <button
                    type="button"
                    onClick={() => setManagingPaymentsFor(c)}
                    className="text-[10px] border border-[#71b536]/40 hover:bg-[#71b536]/10 text-[#71b536] font-sans font-bold py-1.5 px-0.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer bg-transparent"
                  >
                    <Banknote className="w-3 h-3 shrink-0" />
                    <span className="truncate">Pay</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setManagingAdjustmentsFor(c)}
                    className="text-[10px] border border-[#ee317b]/40 hover:bg-[#ee317b]/10 text-[#ee317b] font-sans font-bold py-1.5 px-0.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer bg-transparent"
                  >
                    <TrendingUp className="w-3 h-3 shrink-0" />
                    <span className="truncate">Adjust</span>
                  </button>

                  <button
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
                  )}
                </div>'''

list_replacement = '''<div className="flex items-center gap-1.5 justify-end pl-2">
                  <button
                    type="button"
                    onClick={() => setManagingPaymentsFor(c)}
                    className="text-[10px] border border-[#71b536]/40 hover:bg-[#71b536]/10 text-[#71b536] font-sans font-bold py-1.5 px-0.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer bg-transparent"
                  >
                    <Banknote className="w-3 h-3 shrink-0" />
                    <span className="truncate">Pay</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setManagingAdjustmentsFor(c)}
                    className="text-[10px] border border-[#ee317b]/40 hover:bg-[#ee317b]/10 text-[#ee317b] font-sans font-bold py-1.5 px-0.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer bg-transparent"
                  >
                    <TrendingUp className="w-3 h-3 shrink-0" />
                    <span className="truncate">Adjust</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      if (openActionMenuId === c.id) {
                        setOpenActionMenuId(null);
                      } else {
                        setActionMenuRect(e.currentTarget.getBoundingClientRect());
                        setOpenActionMenuId(c.id);
                      }
                    }}
                    className="text-[10px] border border-gray-600/40 hover:bg-gray-600/10 text-gray-400 font-sans font-bold py-1.5 px-1 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer bg-transparent"
                  >
                    <MoreVertical className="w-3 h-3 shrink-0" />
                  </button>
                </div>'''

content = content.replace(grid_pattern, grid_replacement)
content = content.replace(list_pattern, list_replacement)

# 3. Add portal renderer at the end
portal_code = '''
      {openActionMenuId && actionMenuRect && (() => {
        const c = filteredCustomers.find(cust => cust.id === openActionMenuId);
        if (!c) return null;
        
        // Calculate position based on button rect
        const top = actionMenuRect.bottom + window.scrollY;
        // Position right-aligned if close to right edge, else left-aligned
        const isRightEdge = actionMenuRect.right > window.innerWidth - 150;
        const style: React.CSSProperties = {
          position: 'fixed',
          top: `${actionMenuRect.bottom + 4}px`,
          ...(isRightEdge ? { right: `${window.innerWidth - actionMenuRect.right}px` } : { left: `${actionMenuRect.left}px` }),
          zIndex: 9999
        };

        return createPortal(
          <>
            <div className="fixed inset-0 z-[9998]" onClick={() => setOpenActionMenuId(null)} />
            <div 
              className="bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#333] rounded-md shadow-lg flex flex-col py-1 min-w-[140px]"
              style={style}
            >
              <button onClick={() => { handleOpenEdit(c); setOpenActionMenuId(null); }} className="px-3 py-2 text-left text-[11px] font-bold text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#2a2a2a] flex items-center gap-2 transition-colors"><Edit3 className="w-3.5 h-3.5"/> Modify</button>
              <button onClick={() => { handleOpenDuplicate(c); setOpenActionMenuId(null); }} className="px-3 py-2 text-left text-[11px] font-bold text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#2a2a2a] flex items-center gap-2 transition-colors"><Copy className="w-3.5 h-3.5"/> Copy</button>
              <div className="h-px bg-gray-200 dark:bg-[#333] my-1"></div>
              <button onClick={() => { setDeletingCustomerId(c.id); setOpenActionMenuId(null); }} className="px-3 py-2 text-left text-[11px] font-bold text-[#F87171] hover:text-[#ff9999] hover:bg-gray-100 dark:hover:bg-[#2a2a2a] flex items-center gap-2 transition-colors"><Trash2 className="w-3.5 h-3.5"/> Delete</button>
            </div>
          </>,
          document.body
        );
      })()}
'''

# Insert portal before closing main div wrapper
last_div_idx = content.rfind('</div>\n    </div>\n  );\n}')
if last_div_idx != -1:
    content = content[:last_div_idx] + portal_code + content[last_div_idx:]

with open('src/components/CustomerTab.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Portal fix applied cleanly')
