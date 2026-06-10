import re
import sys

file_path = r'c:\Users\ROG\Downloads\New folder (4)\src\components\CustomerTab.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Change wrapper's bg-white to bg-transparent
content = content.replace(
    'className="shadow-2xl rounded-sm origin-top flex justify-center bg-white"',
    'className="shadow-2xl rounded-sm origin-top flex justify-center bg-transparent"'
)

# 2. Find start of proforma-print-container using regex
start_match = re.search(r'<div[^>]*id="proforma-print-container"[^>]*>', content)
if not start_match:
    print('Could not find start index')
    sys.exit(1)

start_idx = start_match.start()
start_str = start_match.group(0)

# Find end of proforma-print-container using div stack
stack = 0
end_idx = -1
i = start_idx
while i < len(content):
    if content[i:i+4] == '<div':
        stack += 1
    elif content[i:i+5] == '</div':
        stack -= 1
        if stack == 0:
            end_idx = i + 6
            break
    i += 1

if end_idx == -1:
    print('Could not find end index')
    sys.exit(1)

original_container = content[start_idx:end_idx]

# Extract style block
style_match = re.search(r'<style dangerouslySetInnerHTML={{__html: [\s\S]*?}}\s*/>', original_container)
style_block = style_match.group(0) if style_match else ''
inner_content = original_container.replace(style_block, '')

# Replace proformaItemsToRender.map with pageItems.map
inner_content = inner_content.replace('proformaItemsToRender.map', 'pageItems.map')
inner_content = inner_content.replace('proformaItemsToRender.length === 0', 'pageItems.length === 0')

# Split totals and signoff
totals_start_str = '{/* Totals & Deductions summaries */}'
totals_end_str = '{/* Sign-Off Letterhead Block with Corporate Ink Stamp overlapping Authorized signature */}'

totals_idx = inner_content.find(totals_start_str)
signoff_idx = inner_content.find(totals_end_str)

if totals_idx == -1 or signoff_idx == -1:
    print('Could not find totals or signoff')
    sys.exit(1)

before_totals = inner_content[:totals_idx]
totals_and_terms = inner_content[totals_idx:signoff_idx]
signoff = inner_content[signoff_idx:]

inner_content_no_wrapper = before_totals.replace(start_str, '')
signoff = signoff[:signoff.rfind('</div>')]

pagination_wrapper = """{(() => {
  const MAX_ROWS_NON_LAST = 15;
  const MAX_ROWS_LAST = 8;
  const proformaPages = [];
  let items = [...proformaItemsToRender];

  if (items.length === 0) {
    proformaPages.push([]);
  } else {
    while (items.length > 0) {
      if (items.length <= MAX_ROWS_LAST) {
        proformaPages.push(items);
        break;
      } else if (items.length <= MAX_ROWS_NON_LAST) {
        proformaPages.push(items);
        proformaPages.push([]);
        break;
      } else {
        proformaPages.push(items.splice(0, MAX_ROWS_NON_LAST));
      }
    }
  }

  return (
    <div id="proforma-print-container" className="flex flex-col gap-8 print:gap-0 bg-transparent max-w-none w-max mx-auto">
      """ + style_block + """
      {proformaPages.map((pageItems, pageIndex) => {
        const isLastPage = pageIndex === proformaPages.length - 1;
        return (
          <div key={pageIndex} className="proforma-page relative bg-white text-black pl-16 pr-10 pt-6 pb-24 shadow-inner border border-gray-300 select-text font-sans w-[800px] min-h-[1131px] max-w-none flex flex-col" style={{ pageBreakAfter: isLastPage ? 'auto' : 'always', breakInside: 'avoid' }}>
            """ + inner_content_no_wrapper + """
            {isLastPage ? (
              <div className="flex-1 shrink-0 w-full">
                """ + totals_and_terms + """
              </div>
            ) : (
              <div className="flex-1 shrink-0 w-full"></div>
            )}
            """ + signoff + """
          </div>
        );
      })}
    </div>
  );
})()}"""

new_content = content[:start_idx] + pagination_wrapper + content[end_idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print('Pagination injected successfully!')
