import re

with open('src/components/CustomerTab.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update the TR class logic
tr_old = """                            : isOverPaid
                              ? 'bg-yellow-200 dark:bg-yellow-500/40'
                              : isExactlyPaid
                                ? 'bg-[#dcfce7] dark:bg-[#71b536]/40'
                                : 'hover:bg-[#1a1a1a]'"""

tr_new = """                            : isOverPaid
                              ? 'overpaid-order-row'
                              : isExactlyPaid
                                ? 'fully-paid-order-row'
                                : 'hover:bg-[#1a1a1a]'"""
if tr_old in content:
    content = content.replace(tr_old, tr_new)
    print("Replaced TR class logic successfully.")
else:
    print("TR logic NOT FOUND!")

# 2. Clean up the `bg-transparent` hacks from the TDs, because our new CSS classes use !important on td backgrounds.
td1_old = "className={`py-1.5 px-1 text-center font-sans text-gray-500 border-r border-[#262626] ${isGlowing ? 'bg-transparent' : 'bg-[#181818]'}`}"
td1_new = 'className="py-1.5 px-1 text-center font-sans text-gray-500 border-r border-[#262626] bg-[#181818]"'
content = content.replace(td1_old, td1_new)

td2_old = "className={`py-1.5 px-2 border-r border-[#262626] text-center ${isGlowing ? 'bg-transparent' : 'bg-[#151515]/45'}`}"
td2_new = 'className="py-1.5 px-2 border-r border-[#262626] text-center bg-[#151515]/45"'
content = content.replace(td2_old, td2_new)

td3_old = "className={`py-1.5 px-2.5 border-r border-[#262626] font-sans align-top min-w-[210px] ${isGlowing ? 'bg-transparent' : 'bg-[#31111E]/10'}`}"
td3_new = 'className="py-1.5 px-2.5 border-r border-[#262626] bg-[#31111E]/10 font-sans align-top min-w-[210px]"'
content = content.replace(td3_old, td3_new)

td4_old = "className={`py-1.5 px-2.5 border-r border-[#262626] font-sans align-top min-w-[245px] ${isGlowing ? 'bg-transparent' : 'bg-[#1c1c1c]/10'}`}"
td4_new = 'className="py-1.5 px-2.5 border-r border-[#262626] font-sans align-top bg-[#1c1c1c]/10 min-w-[245px]"'
content = content.replace(td4_old, td4_new)

# Wait, what about isCompleted taking precedence? 
# The user wants "highlight the entire row green if paid amount == total".
# Let's reorder the logic so isOverPaid and isExactlyPaid come BEFORE isCompleted!

logic_old = """                      } ${
                        isCompleted
                          ? 'completed-order-row'
                          : c.incompletionReason
                            ? 'incomplete-order-row'
                            : isOverPaid
                              ? 'overpaid-order-row'
                              : isExactlyPaid
                                ? 'fully-paid-order-row'
                                : 'hover:bg-[#1a1a1a]'
                      }`"""

logic_new = """                      } ${
                        isOverPaid
                          ? 'overpaid-order-row'
                          : isExactlyPaid
                            ? 'fully-paid-order-row'
                            : isCompleted
                              ? 'completed-order-row'
                              : c.incompletionReason
                                ? 'incomplete-order-row'
                                : 'hover:bg-[#1a1a1a]'
                      }`"""

if logic_old in content:
    content = content.replace(logic_old, logic_new)
    print("Reordered precedence so payment status beats completed status.")
else:
    print("Precedence logic not found!")

with open('src/components/CustomerTab.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Finished updates.")
