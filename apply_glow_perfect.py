import re

with open('src/components/CustomerTab.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Inject the glow variables right after rawRemainingVal logic (MAP 1)
map1_old = '''                  const isCompleted = !!(c.deliveryDate && c.bankRemainingId);
                  const fullVal = computeCustomerTotalInvoice(c);
                  const rawRemainingVal = Math.max(0, fullVal - computeCustomerTotalPaid(c));
                  const remainingVal = isCompleted ? 0 : rawRemainingVal;
                  
                  const isSelected = selectedCustomerIds.includes(c.id);
                  const isSearchHighlighted = highlightedSearchResult?.id === c.id;'''

map1_new = '''                  const isCompleted = !!(c.deliveryDate && c.bankRemainingId);
                  const fullVal = computeCustomerTotalInvoice(c);
                  const totalPaidAmount = computeCustomerTotalPaid(c);
                  const rawRemainingVal = Math.max(0, fullVal - totalPaidAmount);
                  const remainingVal = isCompleted ? 0 : rawRemainingVal;
                  
                  const isSelected = selectedCustomerIds.includes(c.id);
                  const isSearchHighlighted = highlightedSearchResult?.id === c.id;
                  
                  const isOverPaid = totalPaidAmount > fullVal;
                  const isExactlyPaid = totalPaidAmount === fullVal && fullVal > 0;
                  const isGlowing = isOverPaid || isExactlyPaid;'''

if map1_old in content:
    content = content.replace(map1_old, map1_new)
    print("Map 1 variables applied!")

# 2. Inject the glow variables right after rawRemainingVal logic (MAP 2)
map2_old = '''            const isCompleted = !!(c.deliveryDate && c.bankRemainingId);
            const fullVal = computeCustomerTotalInvoice(c);
            const rawRemainingVal = Math.max(0, fullVal - computeCustomerTotalPaid(c));
            const remainingVal = isCompleted ? 0 : rawRemainingVal;
            const isSelected = selectedCustomerIds.includes(c.id);
            const isSearchHighlighted = highlightedSearchResult?.id === c.id;'''

map2_new = '''            const isCompleted = !!(c.deliveryDate && c.bankRemainingId);
            const fullVal = computeCustomerTotalInvoice(c);
            const totalPaidAmount = computeCustomerTotalPaid(c);
            const rawRemainingVal = Math.max(0, fullVal - totalPaidAmount);
            const remainingVal = isCompleted ? 0 : rawRemainingVal;
            const isSelected = selectedCustomerIds.includes(c.id);
            const isSearchHighlighted = highlightedSearchResult?.id === c.id;
            
            const isOverPaid = totalPaidAmount > fullVal;
            const isExactlyPaid = totalPaidAmount === fullVal && fullVal > 0;
            const isGlowing = isOverPaid || isExactlyPaid;'''

if map2_old in content:
    content = content.replace(map2_old, map2_new)
    print("Map 2 variables applied!")


# 3. Update TR class in Table View
tr_old = re.compile(r"className={`transition-colors \${isSearchHighlighted \? 'global-search-highlight' : ''} \${\s*isSelected\s*\?\s*'selected-row'\s*:\s*''\s*} \${\s*isCompleted\s*\?\s*'completed-order-row'\s*:\s*c\.incompletionReason\s*\?\s*'incomplete-order-row'\s*:\s*'hover:bg-\[#1a1a1a\]'\s*}`}")
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
    print("Table row background logic applied!")


# 4. Update Grid Card in Grid View
card_old = re.compile(r"className={`border rounded-xl p-3\.5 shadow-sm flex flex-col justify-between transition-all duration-300 \${isSearchHighlighted \? 'global-search-highlight' : ''} \${\s*isSelected\s*\?\s*'bg-sky-950/20 border-sky-600/60 text-sky-300'\s*:\s*isCompleted\s*\?\s*'bg-\[#112918\]/25 border-green-800/40 text-green-300'\s*:\s*c\.incompletionReason\s*\?\s*'bg-\[#2E181D\]/30 border-red-800/40 text-red-300'\s*:\s*'bg-\[#121212\] border-\[#262626\] hover:border-\[#ee317b\]'\s*}`}")
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
    print("Grid card background logic applied!")


# 5. Make the TD backgrounds conditionally transparent inside the FIRST MAP LOOP ONLY
# To do this safely, we will only replace TDs within the tr block that has the click handler.
# Let's find the tr block.
tr_block_match = re.search(r'(<tr[^>]*key={c\.id}[^>]*>[\s\S]*?</tr>)', content)
if tr_block_match:
    tr_block = tr_block_match.group(1)
    new_tr_block = tr_block
    
    td1 = '<td className="py-1.5 px-1 text-center font-sans text-gray-500 border-r border-[#262626] bg-[#181818]">'
    td1_new = '<td className={`py-1.5 px-1 text-center font-sans text-gray-500 border-r border-[#262626] ${isGlowing ? \'bg-transparent\' : \'bg-[#181818]\'}`}>'
    new_tr_block = new_tr_block.replace(td1, td1_new)

    td2 = '<td className="py-1.5 px-2 border-r border-[#262626] text-center bg-[#151515]/45">'
    td2_new = '<td className={`py-1.5 px-2 border-r border-[#262626] text-center ${isGlowing ? \'bg-transparent\' : \'bg-[#151515]/45\'}`}>'
    new_tr_block = new_tr_block.replace(td2, td2_new)

    td3 = '<td className="py-1.5 px-2.5 border-r border-[#262626] bg-[#31111E]/10 font-sans align-top min-w-[210px]">'
    td3_new = '<td className={`py-1.5 px-2.5 border-r border-[#262626] font-sans align-top min-w-[210px] ${isGlowing ? \'bg-transparent\' : \'bg-[#31111E]/10\'}`}>'
    new_tr_block = new_tr_block.replace(td3, td3_new)

    td4 = '<td className="py-1.5 px-2.5 border-r border-[#262626] font-sans align-top bg-[#1c1c1c]/10 min-w-[245px]">'
    td4_new = '<td className={`py-1.5 px-2.5 border-r border-[#262626] font-sans align-top min-w-[245px] ${isGlowing ? \'bg-transparent\' : \'bg-[#1c1c1c]/10\'}`}>'
    new_tr_block = new_tr_block.replace(td4, td4_new)

    content = content.replace(tr_block, new_tr_block)
    print("TD backgrounds replaced successfully!")


with open('src/components/CustomerTab.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
