import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add currentUser?.username to delete calls
content = re.sub(
    r'deletePaperStockDoc\(([^,)]+)\)',
    r'deletePaperStockDoc(\1, currentUser?.username)',
    content
)

content = re.sub(
    r'deleteCustomerDoc\(([^,)]+)\)',
    r'deleteCustomerDoc(\1, currentUser?.username)',
    content
)

content = re.sub(
    r'deleteEmployeeDoc\(([^,)]+)\)',
    r'deleteEmployeeDoc(\1, currentUser?.username)',
    content
)

content = re.sub(
    r'deleteBankAccountDoc\(([^,)]+)\)',
    r'deleteBankAccountDoc(\1, currentUser?.username)',
    content
)

content = re.sub(
    r'deletePurchaseDoc\(([^,)]+)\)',
    r'deletePurchaseDoc(\1, currentUser?.username)',
    content
)

content = re.sub(
    r'deleteExpenseCategoryDoc\(([^,)]+)\)',
    r'deleteExpenseCategoryDoc(\1, currentUser?.username)',
    content
)

content = re.sub(
    r'deleteProductTypes\(([^,)]+)\)',
    r'deleteProductTypes(\1, currentUser?.username)',
    content
)

content = re.sub(
    r'deleteClientTypes\(([^,)]+)\)',
    r'deleteClientTypes(\1, currentUser?.username)',
    content
)

# Update Undo Logic to set isDeleted: false
content = content.replace(
    'await saveCustomerDoc(item);',
    'await saveCustomerDoc({ ...item, isDeleted: false, deletedBy: undefined });'
)

content = content.replace(
    'await saveBankAccountDoc(item);',
    'await saveBankAccountDoc({ ...item, isDeleted: false, deletedBy: undefined });'
)

content = content.replace(
    'await savePaperStockDoc(stock);',
    'await savePaperStockDoc({ ...stock, isDeleted: false, deletedBy: undefined });'
)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
