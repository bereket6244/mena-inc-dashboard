import re

with open('src/components/CustomerTab.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 2. Add green/yellow background logic to Table Row
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
                            : (computeCustomerTotalPaid(c) > computeCustomerTotalInvoice(c))
                              ? 'bg-yellow-500/10 border-l-2 border-l-yellow-500'
                              : (computeCustomerTotalPaid(c) === computeCustomerTotalInvoice(c) && computeCustomerTotalInvoice(c) > 0)
                                ? 'bg-[#71b536]/10 border-l-2 border-l-[#71b536]'
                                : 'hover:bg-[#1a1a1a]'
                      }`}"""
if tr_old.search(content):
    content = tr_old.sub(tr_new, content, 1)
    print("Table row background logic applied!")
else:
    print("WARNING: Table row NOT found.")


# 3. Add green/yellow background logic to Grid Card
card_old = re.compile(r"className={`border rounded-xl p-3\.5 shadow-sm flex flex-col justify-between transition-all duration-300 \${isSearchHighlighted \? 'global-search-highlight' : ''} \${\s*isSelected\s*\?\s*'bg-sky-950/20 border-sky-600/60 text-sky-300'\s*:\s*isCompleted\s*\?\s*'bg-\[#112918\]/25 border-green-800/40 text-green-300'\s*:\s*c\.incompletionReason\s*\?\s*'bg-\[#2E181D\]/30 border-red-800/40 text-red-300'\s*:\s*'bg-\[#121212\] border-\[#262626\] hover:border-\[#ee317b\]'\s*}`}")
card_new = r"""className={`border rounded-xl p-3.5 shadow-sm flex flex-col justify-between transition-all duration-300 ${isSearchHighlighted ? 'global-search-highlight' : ''} ${
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
                            : 'bg-[#121212] border-[#262626] hover:border-[#ee317b]'
                }`}"""

if card_old.search(content):
    content = card_old.sub(card_new, content, 1)
    print("Grid card background logic applied!")
else:
    print("WARNING: Grid card NOT found.")

with open('src/components/CustomerTab.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
