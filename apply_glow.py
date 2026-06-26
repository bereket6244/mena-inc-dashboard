import re

with open('src/components/CustomerTab.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Inject the glow variables right after rawRemainingVal logic
target_vars = '''                  const fullVal = computeCustomerTotalInvoice(c);
                  const rawRemainingVal = Math.max(0, fullVal - computeCustomerTotalPaid(c));
                  const remainingVal = isCompleted ? 0 : rawRemainingVal;

                  const isSelected = selectedCustomerIds.includes(c.id);
                  const isSearchHighlighted = highlightedSearchResult?.id === c.id;'''

new_vars = '''                  const fullVal = computeCustomerTotalInvoice(c);
                  const totalPaidAmount = computeCustomerTotalPaid(c);
                  const rawRemainingVal = Math.max(0, fullVal - totalPaidAmount);
                  const remainingVal = isCompleted ? 0 : rawRemainingVal;

                  const isSelected = selectedCustomerIds.includes(c.id);
                  const isSearchHighlighted = highlightedSearchResult?.id === c.id;
                  
                  const isOverPaid = totalPaidAmount > fullVal;
                  const isExactlyPaid = totalPaidAmount === fullVal && fullVal > 0;
                  const isGlowing = isOverPaid || isExactlyPaid;'''

content = content.replace(target_vars, new_vars)

# Do it for the second map loop (grid view) too
target_vars_grid = '''            const fullVal = computeCustomerTotalInvoice(c);
            const rawRemainingVal = Math.max(0, fullVal - computeCustomerTotalPaid(c));
            const remainingVal = isCompleted ? 0 : rawRemainingVal;
            const isSelected = selectedCustomerIds.includes(c.id);
            const isSearchHighlighted = highlightedSearchResult?.id === c.id;'''

new_vars_grid = '''            const fullVal = computeCustomerTotalInvoice(c);
            const totalPaidAmount = computeCustomerTotalPaid(c);
            const rawRemainingVal = Math.max(0, fullVal - totalPaidAmount);
            const remainingVal = isCompleted ? 0 : rawRemainingVal;
            const isSelected = selectedCustomerIds.includes(c.id);
            const isSearchHighlighted = highlightedSearchResult?.id === c.id;
            
            const isOverPaid = totalPaidAmount > fullVal;
            const isExactlyPaid = totalPaidAmount === fullVal && fullVal > 0;
            const isGlowing = isOverPaid || isExactlyPaid;'''

content = content.replace(target_vars_grid, new_vars_grid)


# 2. Update TR class in Table View
tr_old = re.compile(r"className={`transition-colors \${isSearchHighlighted \? 'global-search-highlight' : ''} \${\s*isSelected\s*\?\s*'selected-row'\s*:\s*''\s*} \${\s*isCompleted\s*\?\s*'completed-order-row'\s*:\s*c\.incompletionReason\s*\?\s*'incomplete-order-row'\s*:\s*\(computeCustomerTotalPaid\(c\) > computeCustomerTotalInvoice\(c\)\)\s*\?\s*'bg-yellow-500/10 border-l-2 border-l-yellow-500'\s*:\s*\(computeCustomerTotalPaid\(c\) === computeCustomerTotalInvoice\(c\) && computeCustomerTotalInvoice\(c\) > 0\)\s*\?\s*'bg-\[#71b536\]/10 border-l-2 border-l-\[#71b536\]'\s*:\s*'hover:bg-\[#1a1a1a\]'\s*}`}")
tr_new = r"""className={`transition-colors ${isSearchHighlighted ? 'global-search-highlight' : ''} ${
                        isSelected
                          ? 'selected-row'
                          : ''
                      } ${
                        isCompleted
                          ? 'completed-order-row'
                          : c.incompletionReason
                            ? 'incomplete-order-row'
                            : isOverPaid
                              ? 'bg-yellow-500/10 border-l-2 border-l-yellow-500'
                              : isExactlyPaid
                                ? 'bg-[#71b536]/10 border-l-2 border-l-[#71b536]'
                                : 'hover:bg-[#1a1a1a]'
                      }`}"""
if tr_old.search(content):
    content = tr_old.sub(tr_new, content, 1)

# 3. Update Grid Card in Grid View
card_old = re.compile(r"className={`border rounded-xl p-3\.5 shadow-sm flex flex-col justify-between transition-all duration-300 \${isSearchHighlighted \? 'global-search-highlight' : ''} \${\s*isSelected\s*\?\s*'bg-sky-950/20 border-sky-600/60 text-sky-300'\s*:\s*isCompleted\s*\?\s*'bg-\[#112918\]/25 border-green-800/40 text-green-300'\s*:\s*c\.incompletionReason\s*\?\s*'bg-\[#2E181D\]/30 border-red-800/40 text-red-300'\s*:\s*\(computeCustomerTotalPaid\(c\) > computeCustomerTotalInvoice\(c\)\)\s*\?\s*'bg-yellow-500/10 border-yellow-500/50'\s*:\s*\(computeCustomerTotalPaid\(c\) === computeCustomerTotalInvoice\(c\) && computeCustomerTotalInvoice\(c\) > 0\)\s*\?\s*'bg-\[#71b536\]/10 border-\[#71b536\]/50'\s*:\s*'bg-\[#121212\] border-\[#262626\] hover:border-\[#ee317b\]'\s*}`}")
card_new = r"""className={`border rounded-xl p-3.5 shadow-sm flex flex-col justify-between transition-all duration-300 ${isSearchHighlighted ? 'global-search-highlight' : ''} ${
                  isSelected
                    ? 'bg-sky-950/20 border-sky-600/60 text-sky-300'
                    : isCompleted
                      ? 'bg-[#112918]/25 border-green-800/40 text-green-300'
                      : c.incompletionReason
                        ? 'bg-[#2E181D]/30 border-red-800/40 text-red-300'
                        : isOverPaid
                          ? 'bg-yellow-500/10 border-yellow-500/50'
                          : isExactlyPaid
                            ? 'bg-[#71b536]/10 border-[#71b536]/50'
                            : 'bg-[#121212] border-[#262626] hover:border-[#ee317b]'
                }`}"""
if card_old.search(content):
    content = card_old.sub(card_new, content, 1)

# 4. Make the TD backgrounds conditionally transparent
td1 = '<td className="py-1.5 px-1 text-center font-sans text-gray-500 border-r border-[#262626] bg-[#181818]">'
td1_new = '<td className={`py-1.5 px-1 text-center font-sans text-gray-500 border-r border-[#262626] ${isGlowing ? \'bg-transparent\' : \'bg-[#181818]\'}`}>'
content = content.replace(td1, td1_new)

td2 = '<td className="py-1.5 px-2 border-r border-[#262626] text-center bg-[#151515]/45">'
td2_new = '<td className={`py-1.5 px-2 border-r border-[#262626] text-center ${isGlowing ? \'bg-transparent\' : \'bg-[#151515]/45\'}`}>'
content = content.replace(td2, td2_new)

td3 = '<td className="py-1.5 px-2.5 border-r border-[#262626] bg-[#31111E]/10 font-sans align-top min-w-[210px]">'
td3_new = '<td className={`py-1.5 px-2.5 border-r border-[#262626] font-sans align-top min-w-[210px] ${isGlowing ? \'bg-transparent\' : \'bg-[#31111E]/10\'}`}>'
content = content.replace(td3, td3_new)

td4 = '<td className="py-1.5 px-2.5 border-r border-[#262626] font-sans align-top bg-[#1c1c1c]/10 min-w-[245px]">'
td4_new = '<td className={`py-1.5 px-2.5 border-r border-[#262626] font-sans align-top min-w-[245px] ${isGlowing ? \'bg-transparent\' : \'bg-[#1c1c1c]/10\'}`}>'
content = content.replace(td4, td4_new)

with open('src/components/CustomerTab.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Finished applying TD background fixes!")
