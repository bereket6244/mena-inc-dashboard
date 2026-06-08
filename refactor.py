import re

with open('src/lib/dbService.ts', 'r') as f:
    content = f.read()

# Update fetch commands to exclude deleted items
content = content.replace(".select('*')\n", ".select('*')\n        .or('isDeleted.is.null,isDeleted.eq.false')\n")

# Update signatures
content = re.sub(
    r'export async function delete([A-Za-z]+)\(id: string\): Promise<void> \{',
    r'export async function delete\1(id: string, deletedBy?: string): Promise<void> {',
    content
)

content = re.sub(
    r'export async function delete([A-Za-z]+)\(username: string\): Promise<void> \{',
    r'export async function delete\1(username: string, deletedBy?: string): Promise<void> {',
    content
)

content = re.sub(
    r'export async function delete([A-Za-z]+)\(ids: string\[\]\): Promise<void> \{',
    r'export async function delete\1(ids: string[], deletedBy?: string): Promise<void> {',
    content
)

content = re.sub(
    r'export async function delete([A-Za-z]+)\(idOrIds: string \| string\[\]\): Promise<void> \{',
    r'export async function delete\1(idOrIds: string | string[], deletedBy?: string): Promise<void> {',
    content
)

# Update the delete operations
content = content.replace(
    ".delete()\n        .eq('id', id);",
    ".update({ isDeleted: true, deletedBy })\n        .eq('id', id);"
)

content = content.replace(
    ".delete()\n        .eq('username', username);",
    ".update({ isDeleted: true, deletedBy })\n        .eq('username', username);"
)

content = content.replace(
    ".delete()\n        .in('id', ids);",
    ".update({ isDeleted: true, deletedBy })\n        .in('id', ids);"
)

content = content.replace(
    "let query = supabase.from('bank_accounts').delete();",
    "let query = supabase.from('bank_accounts').update({ isDeleted: true, deletedBy });"
)

content = content.replace(
    "const query = supabase.from('product_types').delete();",
    "const query = supabase.from('product_types').update({ isDeleted: true, deletedBy });"
)

with open('src/lib/dbService.ts', 'w') as f:
    f.write(content)
