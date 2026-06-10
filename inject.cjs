const fs = require('fs');
const file = 'c:\\\\Users\\\\ROG\\\\Downloads\\\\New folder (4)\\\\src\\\\components\\\\CustomerTab.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Change the wrapper's bg-white to bg-transparent
content = content.replace(
  'className="shadow-2xl rounded-sm origin-top flex justify-center bg-white"',
  'className="shadow-2xl rounded-sm origin-top flex justify-center bg-transparent"'
);

// 2. Locate the start and end of proforma-print-container
const startStr = '<div className="relative bg-white text-black pl-16 pr-10 pt-6 pb-24 shadow-inner border border-gray-300 select-text font-sans w-[800px] min-h-[1131px] max-w-none flex flex-col" id="proforma-print-container">';
const startIdx = content.indexOf(startStr);

if (startIdx === -1) {
  console.log('Could not find start index!');
  process.exit(1);
}

let stack = 0;
let endIdx = -1;
for (let i = startIdx; i < content.length; i++) {
  if (content.substr(i, 4) === '<div') stack++;
  if (content.substr(i, 5) === '</div') {
    stack--;
    if (stack === 0) {
      endIdx = i + 6;
      break;
    }
  }
}

if (endIdx === -1) {
  console.log('Could not find end index!');
  process.exit(1);
}

const originalContainer = content.substring(startIdx, endIdx);

const selfClosingStyleMatch = originalContainer.match(/<style dangerouslySetInnerHTML=\{\{__html: [\s\S]*?\}\}\s*\/>/);
let styleBlock = '';
let innerContent = originalContainer;

if (selfClosingStyleMatch) {
  styleBlock = selfClosingStyleMatch[0];
  innerContent = innerContent.replace(styleBlock, '');
}

innerContent = innerContent.replace(/proformaItemsToRender\.map/g, 'pageItems.map');
innerContent = innerContent.replace(/proformaItemsToRender\.length === 0/g, 'pageItems.length === 0');

const totalsStartStr = '{/* Totals & Deductions summaries */}';
const totalsEndStr = '{/* Sign-Off Letterhead Block with Corporate Ink Stamp overlapping Authorized signature */}';

let beforeTotals = '';
let totalsAndTerms = '';
let signOff = '';

const totalsIdx = innerContent.indexOf(totalsStartStr);
const signOffIdx = innerContent.indexOf(totalsEndStr);

if (totalsIdx !== -1 && signOffIdx !== -1) {
  beforeTotals = innerContent.substring(0, totalsIdx);
  totalsAndTerms = innerContent.substring(totalsIdx, signOffIdx);
  signOff = innerContent.substring(signOffIdx);
} else {
  console.log('Could not split totals and signoff');
  process.exit(1);
}

let innerContentNoWrapper = beforeTotals.replace(startStr, '');
signOff = signOff.substring(0, signOff.lastIndexOf('</div>'));

const paginationWrapper = `{(() => {
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
      ${styleBlock}
      {proformaPages.map((pageItems, pageIndex) => {
        const isLastPage = pageIndex === proformaPages.length - 1;
        return (
          <div key={pageIndex} className="proforma-page relative bg-white text-black pl-16 pr-10 pt-6 pb-24 shadow-inner border border-gray-300 select-text font-sans w-[800px] min-h-[1131px] max-w-none flex flex-col" style={{ pageBreakAfter: isLastPage ? 'auto' : 'always', breakInside: 'avoid' }}>
            ${innerContentNoWrapper}
            {isLastPage ? (
              <div className="flex-1 shrink-0">
                ${totalsAndTerms}
              </div>
            ) : (
              <div className="flex-1 shrink-0"></div>
            )}
            ${signOff}
          </div>
        );
      })}
    </div>
  );
})()}`;

const newContent = content.substring(0, startIdx) + paginationWrapper + content.substring(endIdx);
fs.writeFileSync(file, newContent);
console.log('Successfully injected pagination!');
