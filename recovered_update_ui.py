import sys
import re

with open('src/components/CustomerTab.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update isCompleted logic (done earlier, just verifying)

# Remove the 'Delivery / Status' header from table
content = content.replace(
    '<SortableCustomerHeader field="deliveryDate" className="min-w-[210px] bg-[#31111E]/5">Delivery / Status</SortableCustomerHeader>',
    '<SortableCustomerHeader field="deliveryDate" className="min-w-[210px] bg-[#31111E]/5">Delivery</SortableCustomerHeader>'
)

# Remove the Status from Grid view
grid_status_pattern = r'\{/\*\s*Status\s*\*/\}.*?\{getStatusLabel\(c\)\}\s*</div>'
content = re.sub(grid_status_pattern, '', content, flags=re.DOTALL)

# Same for List view status cell
list_status_pattern = r'<div className="flex-1 min-w-\[120px\]">\s*<span className="block text-\[8px\] uppercase tracking-wider text-gray-500 leading-tight">Status</span>\s*<div className="mt-0\.5 flex flex-col gap-1">\s*\{getStatusLabel\(c\)\}\s*(?:\{c\.incompletionReason.*?\})?\s*</div>\s*</div>'
content = re.sub(list_status_pattern, '', content, flags=re.DOTALL)

# And remove Incompletion Reason box in List View
list_incompletion_pattern = r'<div className="w-\[140px\] pl-2 flex flex-col justify-center">\s*<span className="block text-\[8px\] uppercase tracking-wider text-gray-500 leading-tight mb-0\.5">Incompletion Reason</span>.*?</div>\s*</div>'
content = re.sub(list_incompletion_pattern, '', content, flags=re.DOTALL)

# Now update the 'Paid' miniLabel in Grid view to include overpaid flag
grid_paid_pattern = r"\{miniLabel\('Paid', formatMoney\(computeCustomerTotalPaid\(c\), c\.currency\), '', 'text-\[\#71b536\]'\)\}"
grid_paid_replacement = '''<div className="flex items-center gap-1">
                            {miniLabel('Paid', formatMoney(totalPaidVal, c.currency), '', 'text-[#71b536]')}
                            {overpaidVal > 0 && <span className="text-[8px] font-bold text-orange-500 bg-orange-500/10 px-1 py-0.5 rounded border border-orange-500/20 whitespace-nowrap">OVERPAID {formatMoney(overpaidVal, c.currency)}</span>}
                          </div>'''
content = content.replace(grid_paid_pattern, grid_paid_replacement)

# Same for List view Paid
list_paid_pattern = r'<span className="font-bold text-\[\#71b536\] text-xs mt-1 block whitespace-nowrap">\{computeCustomerTotalPaid\(c\)\.toLocaleString\(\)\} \{c\.currency \|\| \'ETB\'\}</span>'
list_paid_replacement = '''<span className="font-bold text-[#71b536] text-xs mt-1 block whitespace-nowrap flex items-center gap-1">
                        {totalPaidVal.toLocaleString()} {c.currency || 'ETB'}
                        {overpaidVal > 0 && <span className="text-[9px] font-bold text-orange-500 bg-orange-500/10 px-1 py-0.5 rounded border border-orange-500/20 whitespace-nowrap">OVERPAID {formatMoney(overpaidVal, c.currency)}</span>}
                      </span>'''
content = content.replace(list_paid_pattern, list_paid_replacement)

with open('src/components/CustomerTab.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('UI modifications applied')