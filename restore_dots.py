import re

with open('src/components/CustomerTab.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add states
state_target = r"const \[activeTab, setActiveTab\] = useState<'orders' | 'completed'>\('orders'\);"
state_new = r"""const [activeTab, setActiveTab] = useState<'orders' | 'completed'>('orders');
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [actionMenuRect, setActionMenuRect] = useState<DOMRect | null>(null);"""

if not 'const [openActionMenuId' in content:
    content = re.sub(state_target, state_new, content, 1)

# 2. Add click handler to three dots in Table View
td_dots_target = r"""<button className="p-1 hover:bg-[#2a2a2a] rounded transition-colors text-gray-400 hover:text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                          </button>"""
td_dots_new = r"""<button onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              setActionMenuRect(rect);
                              setOpenActionMenuId(openActionMenuId === c.id ? null : c.id);
                            }} className="p-1 hover:bg-[#2a2a2a] rounded transition-colors text-gray-400 hover:text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                          </button>"""

content = content.replace(td_dots_target, td_dots_new)

# 3. Add click handler to three dots in Grid View
grid_dots_target = r"""<button className="p-1.5 hover:bg-[#2a2a2a] rounded-md transition-colors text-gray-400 hover:text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                </button>"""
grid_dots_new = r"""<button onClick={(e) => {
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  setActionMenuRect(rect);
                  setOpenActionMenuId(openActionMenuId === c.id ? null : c.id);
                }} className="p-1.5 hover:bg-[#2a2a2a] rounded-md transition-colors text-gray-400 hover:text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                </button>"""

content = content.replace(grid_dots_target, grid_dots_new)

with open('src/components/CustomerTab.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Dots click handlers restored!")
