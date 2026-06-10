import sys

file_path = r'c:\Users\ROG\Downloads\New folder (4)\src\components\CustomerTab.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace outer div wrapper
chunk1_old = '''                    <div 
                      style={{ 
                        transform: `scale(${proformaZoom})`, 
                        transition: 'transform 0.15s ease-out',
                        width: '800px', // matches print-container width
                        flexShrink: 0
                      }}
                      className="shadow-2xl rounded-sm origin-top flex justify-center bg-white"
                    >
                       {/* Printable Area - Rendered using White-Paper Theme */}
                       <div className="relative bg-white text-black pl-16 pr-10 py-16 shadow-inner border border-gray-300 select-text font-sans w-[800px] min-h-[1131px] max-w-none pb-24" id="proforma-print-container">'''

chunk1_new = '''                    <div 
                      style={{ 
                        transform: `scale(${proformaZoom})`, 
                        transition: 'transform 0.15s ease-out',
                        width: '800px', // matches print-container width
                        flexShrink: 0
                      }}
                      className="shadow-2xl rounded-sm origin-top flex justify-center bg-transparent"
                    >
                       {/* Printable Area - Rendered using White-Paper Theme */}
                       {(() => {
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
                             {proformaPages.map((pageItems, pageIndex) => {
                               const isLastPage = pageIndex === proformaPages.length - 1;
                               return (
                                 <div key={pageIndex} className="proforma-page relative bg-white text-black pl-16 pr-10 pt-6 pb-24 shadow-inner border border-gray-300 select-text font-sans w-[800px] min-h-[1131px] max-w-none flex flex-col" style={{ pageBreakAfter: isLastPage ? 'auto' : 'always', breakInside: 'avoid' }}>'''

if chunk1_old not in content:
    print('Chunk 1 not found!')
    sys.exit(1)

content = content.replace(chunk1_old, chunk1_new)

# 2. Replace style overrides for #proforma-print-container to .proforma-page
# since there are multiple .proforma-page divs now
content = content.replace('#proforma-print-container {', '.proforma-page {')
content = content.replace('#proforma-print-container .', '.proforma-page .')
content = content.replace('#proforma-print-container,', '.proforma-page,')
content = content.replace('#proforma-print-container *', '.proforma-page *')

# 3. Replace table mapping
chunk3_old = '''                      {proformaItemsToRender.map((item, idx) => {'''
chunk3_new = '''                      {pageItems.map((item, idx) => {'''
content = content.replace(chunk3_old, chunk3_new)

chunk4_old = '''                      {proformaItemsToRender.length === 0 && ('''
chunk4_new = '''                      {pageItems.length === 0 && ('''
content = content.replace(chunk4_old, chunk4_new)

# 4. Wrap totals and terms block
chunk5_old = '''                {/* Totals & Deductions summaries */}
                <div className="flex flex-row items-stretch justify-between gap-6 mb-8 text-[11px]">'''

chunk5_new = '''                {/* Totals & Deductions summaries */}
                {isLastPage ? (
                  <div className="flex-1 shrink-0 w-full flex flex-col justify-end">
                    <div className="flex flex-row items-stretch justify-between gap-6 mb-8 text-[11px]">'''

if chunk5_old not in content:
    print('Chunk 5 not found!')
    sys.exit(1)
content = content.replace(chunk5_old, chunk5_new)

# 5. Close the totals block correctly just before signoff
chunk6_old = '''                {/* Sign-Off Letterhead Block with Corporate Ink Stamp overlapping Authorized signature */}
                <div className="flex items-center justify-between mt-12 pt-8 border-t border-gray-200 relative">'''

chunk6_new = '''                {/* Sign-Off Letterhead Block with Corporate Ink Stamp overlapping Authorized signature */}
                  </div>
                ) : (
                  <div className="flex-1 shrink-0 w-full"></div>
                )}
                <div className="flex items-center justify-between mt-12 pt-8 border-t border-gray-200 relative mt-auto">'''

if chunk6_old not in content:
    print('Chunk 6 not found!')
    sys.exit(1)
content = content.replace(chunk6_old, chunk6_new)


# 6. Close the injected wrappers at the end
chunk7_old = '''              </div>
              </TransformComponent>'''

chunk7_new = '''              </div>
                                 </div>
                               );
                             })}
                           </div>
                         );
                       })()}
              </TransformComponent>'''

# Wait, in the original, proforma-print-container was closed right before </TransformComponent>
# Let's check if chunk7_old is unique enough
if content.count(chunk7_old) != 1:
    print('Chunk 7 count is', content.count(chunk7_old))
    # It might be 1, let's see

content = content.replace(chunk7_old, chunk7_new)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done!')
