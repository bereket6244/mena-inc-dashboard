import re

with open('src/components/CustomerTab.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Table View action buttons replacement
table_old = """                            <button
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
                            </button>"""

table_new = """                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                setActionMenuRect(rect);
                                setOpenActionMenuId(openActionMenuId === c.id ? null : c.id);
                              }}
                              className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#262626] p-1.5 rounded-md transition-colors cursor-pointer relative z-[60]"
                              title="More Options"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>"""

if table_old in content:
    content = content.replace(table_old, table_new)
    print('Table view buttons replaced with 3 dots!')
else:
    print('Table view old buttons NOT FOUND')

# 2. Grid View action buttons replacement
grid_old = """                  <button
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
                  >
                    <Copy className="w-3 h-3 shrink-0" />
                    <span className="truncate">Copy</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeletingCustomerId(c.id)}
                    className="text-[10px] border border-red-900/40 hover:bg-red-950/10 text-red-500 font-sans font-bold py-1.5 px-0.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer bg-transparent"
                  >
                    <Trash2 className="w-3 h-3 shrink-0" />
                    <span className="truncate">Delete</span>
                  </button>"""

grid_new = """                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      setActionMenuRect(rect);
                      setOpenActionMenuId(openActionMenuId === c.id ? null : c.id);
                    }}
                    className="text-[10px] border border-gray-300 dark:border-gray-600/40 hover:bg-gray-100 dark:hover:bg-gray-600/10 text-gray-600 dark:text-gray-400 font-sans font-bold py-1.5 px-1 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer bg-transparent relative z-[60]"
                    title="More Options"
                  >
                    <MoreVertical className="w-3 h-3 shrink-0" />
                  </button>"""

if grid_old in content:
    content = content.replace(grid_old, grid_new)
    print('Grid view buttons replaced with 3 dots!')
else:
    print('Grid view old buttons NOT FOUND')

with open('src/components/CustomerTab.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
