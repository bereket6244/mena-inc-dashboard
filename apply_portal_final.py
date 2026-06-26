import re

with open('src/components/CustomerTab.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

portal_code = """
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
"""

if 'openActionMenuId && actionMenuRect' not in content:
    target = '</SharedDataTableLayout>'
    if target in content:
        content = content.replace(target, portal_code + '\n    ' + target)
        with open('src/components/CustomerTab.tsx', 'w', encoding='utf-8') as f:
            f.write(content)
        print('Portal appended to the end successfully!')
    else:
        print('Could not find </SharedDataTableLayout>')
else:
    print('Portal already exists.')
