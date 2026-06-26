import re

with open('src/components/CustomerTab.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

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
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(c)}
                              className="text-gray-400 hover:text-[#ee317b] hover:bg-[#262626] p-1.5 rounded-md transition-colors cursor-pointer"
                              title="Edit Record"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeletingCustomerId(c.id)}
                              className="text-gray-500 hover:text-[#F87171] hover:bg-[#262626] p-1.5 rounded-md transition-colors cursor-pointer"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>'''

grid_replacement = '''<div className="flex items-center gap-1 pt-0.5 font-sans">
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

content = content.replace(grid_pattern, grid_replacement)

list_pattern = '''<div className="flex items-center gap-1.5 justify-end pl-2">
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
                    onClick={() => handleOpenEdit(c)}
                    className="text-[10px] border border-rose-900/40 hover:bg-rose-950/10 text-rose-500 font-sans font-bold py-1.5 px-0.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer bg-transparent"
                  >
                    <Edit3 className="w-3 h-3 shrink-0" />
                    <span className="truncate">Modify</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenDuplicate(c)}
                    className="text-[10px] border border-blue-900/40 hover:bg-blue-950/10 text-blue-500 font-sans font-bold py-1.5 px-0.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer bg-transparent"
                    title="Copy details to add another order for this client"
                  >
                    <Plus className="w-3 h-3 shrink-0" />
                    <span className="truncate">Order</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setDeletingCustomerId(c.id)}
                    className="text-[10px] bg-[#a61f17] hover:bg-[#8f1a13] text-white keep-text-white font-sans font-bold py-1.5 px-0.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3 shrink-0 text-white keep-text-white" />
                    <span className="truncate">Remove</span>
                  </button>
                </div>'''

list_replacement = '''<div className="flex items-center gap-1.5 justify-end pl-2 relative">
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

content = content.replace(list_pattern, list_replacement)

with open('src/components/CustomerTab.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('UI refactored')
