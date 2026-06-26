import re

with open('src/components/CustomerTab.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix grid view action menu to use portal
grid_old = '''                            <div className="relative">
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

grid_new = '''                            <div>
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
                                className="text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#262626] p-1.5 rounded-md transition-colors cursor-pointer"
                                title="More Options"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>
                            </div>'''

if grid_old in content:
    content = content.replace(grid_old, grid_new)
    print("Grid menu portal trigger applied!")
else:
    print("WARNING: Grid menu NOT found.")

# 2. Add green/yellow background logic to Table Row
tr_old = '''                      className={`transition-colors ${isSearchHighlighted ? 'global-search-highlight' : ''} ${
                        isSelected
                          ? 'selected-row'
                          : ''
                      } ${
                        isCompleted
                          ? 'completed-order-row'
                          : c.incompletionReason
                            ? 'incomplete-order-row'
                            : 'hover:bg-[#1a1a1a]'
                      }`}'''

tr_new = '''                      className={`transition-colors ${isSearchHighlighted ? 'global-search-highlight' : ''} ${
                        isSelected
                          ? 'selected-row'
                          : ''
                      } ${
                        isCompleted
                          ? 'completed-order-row'
                          : c.incompletionReason
                            ? 'incomplete-order-row'
                            : (computeCustomerTotalPaid(c) > computeCustomerTotalInvoice(c))
                              ? 'bg-yellow-500/10 border-l-2 border-l-yellow-500'
                              : (computeCustomerTotalPaid(c) === computeCustomerTotalInvoice(c) && computeCustomerTotalInvoice(c) > 0)
                                ? 'bg-[#71b536]/10 border-l-2 border-l-[#71b536]'
                                : 'hover:bg-gray-50 dark:hover:bg-[#1a1a1a]'
                      }`}'''

if tr_old in content:
    content = content.replace(tr_old, tr_new)
    print("Table row background logic applied!")
else:
    print("WARNING: Table row NOT found.")


# 3. Add green/yellow background logic to Grid Card
card_old = '''                className={`border rounded-xl p-3.5 shadow-sm flex flex-col justify-between transition-all duration-300 ${isSearchHighlighted ? 'global-search-highlight' : ''} ${
                  isSelected
                    ? 'bg-sky-950/20 border-sky-600/60 text-sky-300'
                    : isCompleted
                      ? 'bg-[#112918]/25 border-green-800/40 text-green-300'
                      : c.incompletionReason
                        ? 'bg-[#2E181D]/30 border-red-800/40 text-red-300'
                        : 'bg-[#121212] border-[#262626] hover:border-[#ee317b]'
                }`}'''

card_new = '''                className={`border rounded-xl p-3.5 shadow-sm flex flex-col justify-between transition-all duration-300 ${isSearchHighlighted ? 'global-search-highlight' : ''} ${
                  isSelected
                    ? 'bg-sky-950/20 border-sky-600/60 text-sky-300'
                    : isCompleted
                      ? 'bg-[#112918]/25 border-green-800/40 text-green-300'
                      : c.incompletionReason
                        ? 'bg-[#2E181D]/30 border-red-800/40 text-red-300'
                        : (computeCustomerTotalPaid(c) > computeCustomerTotalInvoice(c))
                          ? 'bg-yellow-500/10 border-yellow-500/50'
                          : (computeCustomerTotalPaid(c) === computeCustomerTotalInvoice(c) && computeCustomerTotalInvoice(c) > 0)
                            ? 'bg-[#71b536]/10 border-[#71b536]/50'
                            : 'bg-white dark:bg-[#121212] border-gray-200 dark:border-[#262626] hover:border-[#ee317b] dark:hover:border-[#ee317b]'
                }`}'''

if card_old in content:
    content = content.replace(card_old, card_new)
    print("Grid card background logic applied!")
else:
    print("WARNING: Grid card NOT found.")

# Let's also check the card footer three dots menu
card_dots_old = '''                  <button
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
                  </button>'''
if card_dots_old in content:
    print("Card dots uses portal (correct).")
else:
    # Check if old card dots is there
    old_card_dots = '''                  <button
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
    new_card_dots = '''                  <button
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
                  </button>'''
    if old_card_dots in content:
        content = content.replace(old_card_dots, new_card_dots)
        print("Card dots portal trigger applied!")

with open('src/components/CustomerTab.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
