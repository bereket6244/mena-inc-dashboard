import re

with open('src/components/CustomerTab.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove inline copy button in Table view
copy_target = """                            <button
                              type="button"
                              onClick={() => handleOpenDuplicate(c)}
                              className="text-gray-400 hover:text-sky-400 hover:bg-[#262626] p-1.5 rounded-md transition-colors cursor-pointer"
                              title="Copy details to add another order for this client"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>"""
if copy_target in content:
    content = content.replace(copy_target, '')
    print('Removed inline Copy button from Table view.')
else:
    print('Inline Copy button not found in Table view.')

# 2. Make Table view rows fully green/yellow
tr_target = """                            : isOverPaid
                              ? 'bg-yellow-500/10 border-l-2 border-l-yellow-500'
                              : isExactlyPaid
                                ? 'bg-[#71b536]/10 border-l-2 border-l-[#71b536]'
                                : 'hover:bg-[#1a1a1a]'"""
tr_new = """                            : isOverPaid
                              ? 'bg-yellow-200 dark:bg-yellow-500/40'
                              : isExactlyPaid
                                ? 'bg-[#dcfce7] dark:bg-[#71b536]/40'
                                : 'hover:bg-[#1a1a1a]'"""
if tr_target in content:
    content = content.replace(tr_target, tr_new)
    print('Replaced Table row glow with fully solid background.')
else:
    print('Table row glow target not found.')

# 3. Make Grid view cards fully green/yellow
grid_target = """                        : isOverPaid
                          ? 'bg-yellow-500/10 border-yellow-500/50'
                          : isExactlyPaid
                            ? 'bg-[#71b536]/10 border-[#71b536]/50'
                            : 'bg-[#121212] border-[#262626] hover:border-[#ee317b]'"""
grid_new = """                        : isOverPaid
                          ? 'bg-yellow-200 dark:bg-yellow-500/40 border-yellow-500/50 text-yellow-900 dark:text-yellow-100'
                          : isExactlyPaid
                            ? 'bg-[#dcfce7] dark:bg-[#71b536]/40 border-[#71b536]/50 text-green-900 dark:text-green-100'
                            : 'bg-[#121212] border-[#262626] hover:border-[#ee317b]'"""
if grid_target in content:
    content = content.replace(grid_target, grid_new)
    print('Replaced Grid card glow with fully solid background.')
else:
    print('Grid card glow target not found.')

# 4. Make sure text is fully readable in Table view by removing text-gray-500 inside isGlowing
# In Table view, the text is inside `<td>`. Since we are adding dark text on light bg in light mode,
# we need to make sure the text isn't gray-500.
# The table data uses `<td className="...">`.
# We previously injected `isGlowing ? 'bg-transparent' : 'bg-[#181818]'` inside them.
# Let's adjust the text colors inside those TDs so they adapt to the glow!

with open('src/components/CustomerTab.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
