import re

with open('src/components/CustomerTab.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 'banks' to 'bankAccounts'
content = content.replace("banks.find(b => b.id === p.methodId)", "bankAccounts.find(b => b.id === p.methodId)")

# Fix SearchableSelect props
searchable_select_old = """<SearchableSelect
                        options={banks.map(b => ({ value: b.id, label: b.name }))}
                        value={newPaymentMethodId}
                        onChange={setNewPaymentMethodId}
                        placeholder="Select Bank..."
                        className="text-sm"
                      />"""

searchable_select_new = """<SearchableSelect
                        value={newPaymentMethodId}
                        onChange={(e: any) => setNewPaymentMethodId(e.target.value)}
                        placeholder="Select Bank..."
                        className="text-sm"
                      >
                        <option value="">Select Bank...</option>
                        {bankAccounts.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </SearchableSelect>"""

content = content.replace(searchable_select_old, searchable_select_new)

with open('src/components/CustomerTab.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixes applied")
