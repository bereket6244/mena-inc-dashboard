import re
import sys

file_path = r'c:\Users\ROG\Downloads\New folder (4)\src\components\CustomerTab.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add state variables at line 164
state_vars = """
  const [isProductRowsExpanded, setIsProductRowsExpanded] = useState(true);
  const [isTermsExpanded, setIsTermsExpanded] = useState(false);
  const [proformaTerms, setProformaTerms] = useState([
    { id: '1', content: '1. Delivery Term: Within 7 to 10 days from order receipt validation.' },
    { id: '2', content: '2. Payment Term: Requires at least 50% deposit ledger record, balance due prior to packaging release.' },
    { id: '3', content: '3. Validity: This proforma remains valid and conversion rates locked for 10 days from the dates above.' },
  ]);
"""
content = content.replace(
    "const lastShowProformaModalRef = useRef(false);",
    "const lastShowProformaModalRef = useRef(false);" + state_vars
)

# 2. Add Terms Editor UI below Product Rows Editor
product_rows_old = """                    <div className="bg-[#181818] border border-[#2d2024] p-4 rounded-md shadow-sm space-y-3 flex-1 flex flex-col min-h-[300px]">
                      <div className="flex items-center justify-between border-b border-[#2d2024] pb-2 mb-1">
                        <h3 className="text-[#ee317b] font-bold uppercase tracking-widest text-[10px] flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#ee317b]"></span>
                          Product Rows
                        </h3>
                        <button
                          type="button"
                          onClick={() => {
                            setStandaloneProformaItems(prev => [
                              ...prev,
                              {
                                id: `temp-${Date.now()}`,
                                productType: '',
                                quantity: '',
                                unitPrice: '',
                                advancePayment: ''
                              }
                            ]);
                            setTimeout(() => {
                              const container = document.getElementById('standalone-proforma-list');
                              if (container) {
                                container.scrollTop = container.scrollHeight;
                              }
                            }, 50);
                          }}
                          className="bg-[#ee317b] hover:bg-[#d61e63] text-white px-2.5 py-1 text-[10px] font-bold uppercase cursor-pointer rounded-sm transition-colors"
                        >
                          + Add Row
                        </button>
                      </div>"""

product_rows_new = """                    <div className="bg-[#181818] border border-[#2d2024] p-4 rounded-md shadow-sm space-y-3 flex-1 flex flex-col min-h-max">
                      <div className="flex items-center justify-between border-b border-[#2d2024] pb-2 mb-1 cursor-pointer select-none group" onClick={() => setIsProductRowsExpanded(!isProductRowsExpanded)}>
                        <h3 className="text-[#ee317b] font-bold uppercase tracking-widest text-[10px] flex items-center gap-1.5 transition-colors">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#ee317b]"></span>
                          Product Rows
                          <span className={`transform transition-transform text-gray-500 ml-1 ${isProductRowsExpanded ? 'rotate-180' : ''}`}>▼</span>
                        </h3>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsProductRowsExpanded(true);
                            setStandaloneProformaItems(prev => [
                              ...prev,
                              {
                                id: `temp-${Date.now()}`,
                                productType: '',
                                quantity: '',
                                unitPrice: '',
                                advancePayment: ''
                              }
                            ]);
                            setTimeout(() => {
                              const container = document.getElementById('standalone-proforma-list');
                              if (container) {
                                container.scrollTop = container.scrollHeight;
                              }
                            }, 50);
                          }}
                          className="bg-[#ee317b] hover:bg-[#d61e63] text-white px-2.5 py-1 text-[10px] font-bold uppercase cursor-pointer rounded-sm transition-colors"
                        >
                          + Add Row
                        </button>
                      </div>
                      
                      {isProductRowsExpanded && (
                        <>"""

if product_rows_old not in content:
    print('Product rows editor not found!')
    sys.exit(1)

content = content.replace(product_rows_old, product_rows_new)

live_totals_old = """                    {/* Live Totals Section */}"""
live_totals_new = """                        </>
                      )}
                    </div>
                    
                    {/* Terms & Conditions Editor */}
                    <div className="bg-[#181818] border border-[#2d2024] p-4 rounded-md shadow-sm flex flex-col shrink-0 min-h-max">
                      <div className="flex items-center justify-between border-b border-[#2d2024] pb-2 cursor-pointer select-none group" onClick={() => setIsTermsExpanded(!isTermsExpanded)}>
                        <h3 className="text-[#ee317b] font-bold uppercase tracking-widest text-[10px] flex items-center gap-1.5 transition-colors">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#ee317b]"></span>
                          Terms &amp; Conditions
                          <span className={`transform transition-transform text-gray-500 ml-1 ${isTermsExpanded ? 'rotate-180' : ''}`}>▼</span>
                        </h3>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsTermsExpanded(true);
                            setProformaTerms(prev => [...prev, { id: `term-${Date.now()}`, content: '' }]);
                          }}
                          className="bg-[#1a1a1a] hover:bg-[#262626] border border-[#2d2024] text-gray-300 px-2.5 py-1 text-[10px] font-bold uppercase cursor-pointer rounded-sm transition-colors"
                        >
                          + Add Term
                        </button>
                      </div>
                      
                      {isTermsExpanded && (
                        <div className="mt-3 space-y-2 overflow-y-auto custom-scrollbar max-h-[250px] pr-1">
                          {proformaTerms.map((term, idx) => (
                            <div key={term.id} className="flex items-start gap-2 group relative">
                               <div className="absolute -left-2 -top-1.5 bg-[#181818] w-3 h-3 flex items-center justify-center text-[7px] text-gray-600 font-bold z-10 rounded-full">{idx + 1}</div>
                               <textarea
                                 value={term.content}
                                 placeholder="Term content..."
                                 rows={2}
                                 onChange={(e) => {
                                   const val = e.target.value;
                                   setProformaTerms(prev => prev.map(t => t.id === term.id ? { ...t, content: val } : t));
                                 }}
                                 className="flex-1 bg-[#121212] text-gray-300 border border-[#262626] p-1.5 text-[10px] rounded-sm outline-none focus:border-[#ee317b] resize-none"
                               />
                               <button
                                 type="button"
                                 onClick={() => setProformaTerms(prev => prev.filter(t => t.id !== term.id))}
                                 className="w-5 h-5 flex items-center justify-center bg-[#2a111a] text-red-400 hover:bg-[#ee317b] hover:text-white rounded-sm transition-colors shrink-0 opacity-50 group-hover:opacity-100"
                               >
                                 ✕
                               </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Live Totals Section */}"""

content = content.replace("                      )}", "                      )}") # not needed
# Wait, let's use regex to find the end of the Product Rows div
# The product rows div is closed right before Live Totals Section
totals_block = """                        </div>
                      )}
                    </div>

                    {/* Live Totals Section */}"""
totals_block_new = """                        </div>
                      )}
                        </>
                      )}
                    </div>

                    {/* Terms & Conditions Editor */}
                    <div className="bg-[#181818] border border-[#2d2024] p-4 rounded-md shadow-sm flex flex-col shrink-0 min-h-max">
                      <div className="flex items-center justify-between border-b border-[#2d2024] pb-2 cursor-pointer select-none group" onClick={() => setIsTermsExpanded(!isTermsExpanded)}>
                        <h3 className="text-[#ee317b] font-bold uppercase tracking-widest text-[10px] flex items-center gap-1.5 transition-colors">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#ee317b]"></span>
                          Terms &amp; Conditions
                          <span className={`transform transition-transform text-gray-500 ml-1 ${isTermsExpanded ? 'rotate-180' : ''}`}>▼</span>
                        </h3>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsTermsExpanded(true);
                            setProformaTerms(prev => [...prev, { id: `term-${Date.now()}`, content: '' }]);
                          }}
                          className="bg-[#1a1a1a] hover:bg-[#262626] border border-[#2d2024] text-gray-300 px-2.5 py-1 text-[10px] font-bold uppercase cursor-pointer rounded-sm transition-colors"
                        >
                          + Add Term
                        </button>
                      </div>
                      
                      {isTermsExpanded && (
                        <div className="mt-3 space-y-2 overflow-y-auto custom-scrollbar max-h-[250px] pr-1">
                          {proformaTerms.map((term, idx) => (
                            <div key={term.id} className="flex items-start gap-2 group relative">
                               <div className="absolute -left-2 -top-1.5 bg-[#181818] w-3 h-3 flex items-center justify-center text-[7px] text-gray-600 font-bold z-10 rounded-full">{idx + 1}</div>
                               <textarea
                                 value={term.content}
                                 placeholder="Term content..."
                                 rows={2}
                                 onChange={(e) => {
                                   const val = e.target.value;
                                   setProformaTerms(prev => prev.map(t => t.id === term.id ? { ...t, content: val } : t));
                                 }}
                                 className="flex-1 bg-[#121212] text-gray-300 border border-[#262626] p-1.5 text-[10px] rounded-sm outline-none focus:border-[#ee317b] resize-none"
                               />
                               <button
                                 type="button"
                                 onClick={() => setProformaTerms(prev => prev.filter(t => t.id !== term.id))}
                                 className="w-5 h-5 flex items-center justify-center bg-[#2a111a] text-red-400 hover:bg-[#ee317b] hover:text-white rounded-sm transition-colors shrink-0 opacity-50 group-hover:opacity-100"
                               >
                                 ✕
                               </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Live Totals Section */}"""
content = content.replace(totals_block, totals_block_new)

# 3. Change terms and conditions rendering to map over proformaTerms!
# The existing terms block starts with {/* Terms and Conditions Block */}
terms_render_old = """                  {/* Terms and Conditions Block */}
                  <div className="border border-gray-300 bg-gray-50/50 p-4 font-sans text-[9px] text-gray-600 flex-1 rounded-md leading-relaxed text-left break-words">
                    <p className="font-bold text-gray-800 uppercase tracking-wider mb-1.5 text-[9.5px]">Terms &amp; General Conditions</p>
                    <p className="mb-1">1. <strong>Delivery Term:</strong> Within 7 to 10 days from order receipt validation.</p>
                    <p className="mb-1">2. <strong>Payment Term:</strong> Requires at least 50% deposit ledger record, balance due prior to packaging release.</p>
                    <p className="mb-1">3. <strong>Validity:</strong> This proforma remains valid and conversion rates locked for 10 days from the dates above.</p>
                    
                    {proformaBankId && (() => {"""

terms_render_new = """                  {/* Terms and Conditions Block */}
                  <div className="border border-gray-300 bg-gray-50/50 p-4 font-sans text-[9px] text-gray-600 flex-1 rounded-md leading-relaxed text-left break-words w-full">
                    <p className="font-bold text-gray-800 uppercase tracking-wider mb-1.5 text-[9.5px]">Terms &amp; General Conditions</p>
                    {proformaTerms.map(term => (
                      <p key={term.id} className="mb-1">{term.content}</p>
                    ))}
                    
                    {proformaBankId && (() => {"""
content = content.replace(terms_render_old, terms_render_new)

# 4. Change Pagination Layout to move Terms under Subtotal Box and BOTH on ALL pages.
# Currently they are inside `isLastPage ? (...) : (...)`
# We want them to NOT be restricted to isLastPage.
# Also "move the terms and conditions be under the subtotal box"
# The current structure:
#             {isLastPage ? (
#               <div className="flex-1 shrink-0 w-full flex flex-col justify-end">
#                 <div className="flex flex-row items-stretch justify-between gap-6 mb-8 text-[11px]">
#                   {/* Terms and Conditions Block */}
#                   ...
#                   {/* Summary math table */}
#                   ...
#                 </div>
#               </div>
#             ) : (
#               <div className="flex-1 shrink-0 w-full"></div>
#             )}
# We will replace this entire section!

# To be safe, let's use regex to find `{isLastPage ? (` to `)}` wrapping the totals block.
# Actually, the user says "move the terms and conditions be under the subtotal box like it was before".
# "like it was before" => The user actually might have liked the flex-row layout side by side, but wait: "move the terms and conditions be under the subtotal box". That's a new request or clarifying a previous one.
# So:
# <div className="flex flex-col gap-6 mb-8 text-[11px]">
#   {/* Summary math table */} (right aligned or full width)
#   {/* Terms and Conditions Block */}
# </div>

# Let's adjust MAX_ROWS_NON_LAST and MAX_ROWS_LAST so the content fits without breaking the page.
content = content.replace("const MAX_ROWS_NON_LAST = 15;", "const MAX_ROWS_NON_LAST = 6;")
content = content.replace("const MAX_ROWS_LAST = 8;", "const MAX_ROWS_LAST = 6;")

# Now replace the isLastPage conditional wrapping the totals
# We need to remove `{isLastPage ? (` and the `) : (<div className="flex-1 shrink-0 w-full"></div>)}`.
is_last_page_start_old = """            {isLastPage ? (
              <div className="flex-1 shrink-0 w-full flex flex-col justify-end">
                <div className="flex flex-row items-stretch justify-between gap-6 mb-8 text-[11px]">"""

is_last_page_start_new = """            
              <div className="flex-1 shrink-0 w-full flex flex-col justify-end">
                <div className="flex flex-col gap-4 mb-4 text-[11px]">"""
content = content.replace(is_last_page_start_old, is_last_page_start_new)

# Now swap the order of the subtotal box and the terms box.
# Currently: 
# {/* Terms and Conditions Block */} ... 
# {/* Summary math table */} ...

terms_block_start = """                  {/* Terms and Conditions Block */}"""
summary_block_start = """                  {/* Summary math table */}"""

# The summary math table currently ends with:
summary_block_end = """                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 shrink-0 w-full"></div>
            )}
            {/* Sign-Off Letterhead Block"""

# We'll replace summary_block_end to remove the isLastPage ending
summary_block_end_new = """                      </span>
                    </div>
                  </div>
                </div>
              </div>
            {/* Sign-Off Letterhead Block"""
content = content.replace(summary_block_end, summary_block_end_new)

# Now let's extract the terms block and summary block to swap them
terms_idx = content.find(terms_block_start)
summary_idx = content.find(summary_block_start)
end_idx = content.find("                </div>\n              </div>\n            {/* Sign-Off Letterhead Block")

if terms_idx != -1 and summary_idx != -1 and end_idx != -1:
    terms_block = content[terms_idx:summary_idx]
    summary_block = content[summary_idx:end_idx]
    
    # We want summary block FIRST, right-aligned.
    # Make summary block take full width but align its content right, or just margin-left auto.
    summary_block_modified = summary_block.replace(
        """<div className="w-80 font-sans space-y-1.5 border border-gray-250 p-4 bg-gray-50/20">""",
        """<div className="w-80 font-sans space-y-1.5 border border-gray-250 p-4 bg-gray-50/20 ml-auto shadow-sm">"""
    )
    
    # Now replace the combined section
    combined_old = content[terms_idx:end_idx]
    combined_new = summary_block_modified + "\n" + terms_block
    content = content.replace(combined_old, combined_new)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("UI tweaks injected successfully!")
