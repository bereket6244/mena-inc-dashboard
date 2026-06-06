import { Customer, Purchase, BankAccount, PaperStock } from '../types';

/**
 * Escapes a cell for CSV formatting.
 * Handles double-quotes, commas, and newlines correctly.
 */
function escapeCSVCell(val: any): string {
  if (val === null || val === undefined) {
    return '';
  }
  let str = String(val).trim();
  // Double quotes need to be escaped by doubling them
  str = str.replace(/"/g, '""');
  // Wrap in double quotes if there are commas, double quotes, or newlines
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str}"`;
  }
  return str;
}

/**
 * Universally triggers a web browser download of a CSV file constructed using a Blob.
 */
export function downloadCSV(filename: string, headers: string[], rows: any[][]) {
  const headerLine = headers.map(escapeCSVCell).join(',');
  const rowLines = rows.map(row => row.map(escapeCSVCell).join(','));
  const csvContent = [headerLine, ...rowLines].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports customers/orders list to CSV
 */
export function exportCustomersCSV(customers: Customer[], getBankName: (id?: string) => string) {
  const headers = [
    'Order ID',
    'Client Name',
    'Client Type',
    'Phone',
    'Acquisition Source',
    'Order Taken By',
    'Product Type',
    'Quantity',
    'Unit Price (ETB)',
    'Subtotal Gross (ETB)',
    'VAT Added (15%)',
    'Total Invoice Price (ETB)',
    'Advance Payment (ETB)',
    'Remaining Balance Owed (ETB)',
    'Advance Payment Channel',
    'Remaining Delivery Channel',
    'Delivery/Status Date',
    'Advance Receipt Date',
    'Incompletion Reason',
    'Paper 1 Type',
    'Paper 1 Amount/Card',
    'Paper 2 Type',
    'Paper 2 Amount/Card',
    'Paper 3 Type',
    'Paper 3 Amount/Card',
    'Entrance Paper Type',
    'Entrance Paper Amount (1/16)',
    'Ajabi Paper Type',
    'Ajabi Paper Amount (1/9)'
  ];

  const rows = customers.map(c => {
    const base = Number(c.quantity || 0) * Number(c.unitPrice || 0);
    const vat = c.isVatAdded ? base * 0.15 : 0;
    const invoiceTotal = base + vat;
    const remaining = invoiceTotal - Number(c.advancePayment || 0);
    
    return [
      c.id,
      c.clientName,
      c.clientType,
      c.phone,
      c.acquisitionSource,
      c.orderTakenBy,
      c.productType,
      c.quantity,
      c.unitPrice,
      base,
      c.isVatAdded ? 'Yes (15%)' : 'No',
      invoiceTotal,
      c.advancePayment,
      Math.max(0, remaining),
      getBankName(c.paymentMethodId),
      c.bankRemainingId ? getBankName(c.bankRemainingId) : 'N/A (Uncollected)',
      c.deliveryDate || 'N/A',
      c.advancePaymentDate || 'N/A',
      c.incompletionReason || 'N/A',
      c.paperType1 || 'None',
      c.amount1 || 0,
      c.paperType2 || 'None',
      c.amount2 || 0,
      c.paperType3 || 'None',
      c.amount3 || 0,
      c.entrancePaper || 'None',
      c.amount16 || 0,
      c.ajabiPaper || 'None',
      c.amount9 || 0
    ];
  });

  downloadCSV(`customers_orders_ledger_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
}

/**
 * Exports purchases/expenses list to CSV
 */
export function exportPurchasesCSV(purchases: Purchase[], getBankName: (id?: string) => string) {
  const headers = [
    'Purchase ID',
    'Date',
    'Item/Service Name',
    'Expense Category',
    'Quantity',
    'Unit Price (ETB)',
    'Base Amount (ETB)',
    'VAT 15% Added',
    'VAT Amount (ETB)',
    'Withholding 2% Withheld',
    'Withholding Amount (ETB)',
    'Net Total Cost (ETB)',
    'Payment Account Sourced',
    'Purchased By',
    'Log Recorded By',
    'Notes / Description'
  ];

  const rows = purchases.map(p => {
    return [
      p.id,
      p.purchaseDate,
      p.itemOrService,
      p.expenseCategory,
      p.quantity,
      p.unitPrice,
      p.baseAmount || (p.quantity * p.unitPrice),
      p.hasVat ? 'Yes' : 'No',
      p.vatAmount || 0,
      p.hasWithholding ? 'Yes' : 'No',
      p.withholdingAmount || 0,
      p.totalPrice,
      getBankName(p.paymentMethodId),
      p.purchasedBy,
      p.recordedBy,
      p.notesOrDescription || 'None'
    ];
  });

  downloadCSV(`expenses_purchases_ledger_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
}

/**
 * Exports treasury bank accounts to CSV
 */
export function exportTreasuryCSV(
  bankAccounts: BankAccount[],
  customers: Customer[],
  purchases: Purchase[]
) {
  const headers = [
    'Account ID',
    'Account & Bank Name',
    'Account Number',
    'Initial Capital Stockpile (ETB)',
    'Client Advances Received (ETB)',
    'Client Delivery Balances Received (ETB)',
    'Supplier Purchases Deducted (ETB)',
    'Compute Current Liquidity Status'
  ];

  const rows = bankAccounts.map(b => {
    const advancesForBank = customers
      .filter(c => c.paymentMethodId === b.id || (!c.paymentMethodId && b.id === 'b1'))
      .reduce((sum, c) => sum + Number(c.advancePayment || 0), 0);

    const completedRemainingForBank = customers
      .filter(c => !!c.deliveryDate && (c.bankRemainingId === b.id || (!c.bankRemainingId && b.id === 'b1' && c.paymentMethodId === b.id)))
      .reduce((sum, c) => {
        const base = c.quantity * c.unitPrice;
        const vat = c.isVatAdded ? base * 0.15 : 0;
        const totalInvoice = base + vat;
        const remaining = totalInvoice - c.advancePayment;
        return sum + Math.max(0, remaining);
      }, 0);

    const purchasesOutOfBank = purchases
      .filter(p => p.paymentMethodId === b.id)
      .reduce((sum, p) => sum + Number(p.totalPrice || 0), 0);
    
    const netBalance = b.initialBalance + advancesForBank + completedRemainingForBank - purchasesOutOfBank;

    return [
      b.id,
      b.name,
      b.accountNumber || 'None',
      b.initialBalance,
      advancesForBank,
      completedRemainingForBank,
      purchasesOutOfBank,
      netBalance
    ];
  });

  downloadCSV(`treasury_payment_accounts_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
}

/**
 * Exports paper stock inventory to CSV
 */
export function exportInventoryCSV(
  paperStocks: PaperStock[],
  customers: Customer[]
) {
  const headers = [
    'Stock ID',
    'Paper Stock Type',
    'Initial Stockpile (Sheets)',
    'Consumed Quantity (Sheets)',
    'Available Inventory Balance (Sheets)',
    'Operational Stock Status'
  ];

  const rows = paperStocks.map(s => {
    // Helper to compute Total Consumed for a specific stock name
    let consumed = 0;
    const lowerName = s.name.trim().toLowerCase();
    
    customers.forEach(c => {
      const orderQty = Number(c.quantity || 0);

      if (c.paperType1 && c.paperType1.trim().toLowerCase() === lowerName) {
        consumed += Math.ceil(Number(c.amount1 || 0) * orderQty);
      }
      if (c.paperType2 && c.paperType2.trim().toLowerCase() === lowerName) {
        consumed += Math.ceil(Number(c.amount2 || 0) * orderQty);
      }
      if (c.paperType3 && c.paperType3.trim().toLowerCase() === lowerName) {
        consumed += Math.ceil(Number(c.amount3 || 0) * orderQty);
      }
      if (c.entrancePaper && c.entrancePaper.trim().toLowerCase() === lowerName) {
        consumed += Math.ceil(Number(c.amount16 || 0) / 16);
      }
      if (c.ajabiPaper && c.ajabiPaper.trim().toLowerCase() === lowerName) {
        consumed += Math.ceil(Number(c.amount9 || 0) / 9);
      }
    });

    const netStock = s.initialStock - consumed;
    
    let statusText = 'HEALTHY';
    if (netStock <= 0) {
      statusText = 'OUT OF STOCK';
    } else if (netStock < 50) {
      statusText = 'LOW STOCK - REORDER';
    }

    return [
      s.id,
      s.name,
      s.initialStock,
      consumed,
      netStock,
      statusText
    ];
  });

  downloadCSV(`paper_stock_inventory_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
}
