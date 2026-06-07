import * as XLSX from 'xlsx';
import { Customer, Purchase, BankAccount, PaperStock } from '../types';

/**
 * Universal export function that generates a single .xlsx file 
 * containing multiple sheets for different data sets.
 */
export function exportAllDataToExcel(
  customers: Customer[],
  purchases: Purchase[],
  bankAccounts: BankAccount[],
  paperStocks: PaperStock[],
  getBankName: (id?: string) => string
) {
  const wb = XLSX.utils.book_new();

  // 1. Orders Ledger Sheet
  const orderHeaders = [
    'Order ID', 'Client Name', 'Client Type', 'Phone', 'Acquisition Source',
    'Order Taken By', 'Product Type', 'Quantity', 'Unit Price (ETB)',
    'Subtotal Gross (ETB)', 'VAT Added (15%)', 'Total Invoice Price (ETB)',
    'Advance Payment (ETB)', 'Remaining Balance Owed (ETB)', 'Advance Payment Channel',
    'Remaining Delivery Channel', 'Delivery/Status Date', 'Advance Receipt Date',
    'Incompletion Reason', 'Paper 1 Type', 'Paper 1 Amount/Card', 'Paper 2 Type',
    'Paper 2 Amount/Card', 'Paper 3 Type', 'Paper 3 Amount/Card', 'Entrance Paper Type',
    'Entrance Paper Amount (1/16)', 'Ajabi Paper Type', 'Ajabi Paper Amount (1/9)'
  ];

  const orderRows = customers.map(c => {
    const base = Number(c.quantity || 0) * Number(c.unitPrice || 0);
    const vat = c.isVatAdded ? base * 0.15 : 0;
    const invoiceTotal = base + vat;
    const remaining = invoiceTotal - Number(c.advancePayment || 0);
    
    return [
      c.id, c.clientName, c.clientType, c.phone, c.acquisitionSource,
      c.orderTakenBy, c.productType, c.quantity, c.unitPrice,
      base, c.isVatAdded ? 'Yes (15%)' : 'No', invoiceTotal,
      c.advancePayment, Math.max(0, remaining), getBankName(c.paymentMethodId),
      c.bankRemainingId ? getBankName(c.bankRemainingId) : 'N/A (Uncollected)',
      c.deliveryDate || 'N/A', c.advancePaymentDate || 'N/A', c.incompletionReason || 'N/A',
      c.paperType1 || 'None', c.amount1 || 0, c.paperType2 || 'None', c.amount2 || 0,
      c.paperType3 || 'None', c.amount3 || 0, c.entrancePaper || 'None', c.amount16 || 0,
      c.ajabiPaper || 'None', c.amount9 || 0
    ];
  });
  
  const wsOrders = XLSX.utils.aoa_to_sheet([orderHeaders, ...orderRows]);
  XLSX.utils.book_append_sheet(wb, wsOrders, "Orders Ledger");

  // 2. Purchases Ledger Sheet
  const purchaseHeaders = [
    'Purchase ID', 'Date', 'Item/Service Name', 'Expense Category', 'Quantity',
    'Unit Price (ETB)', 'Base Amount (ETB)', 'VAT 15% Added', 'VAT Amount (ETB)',
    'Withholding 2% Withheld', 'Withholding Amount (ETB)', 'Net Total Cost (ETB)',
    'Payment Account Sourced', 'Purchased By', 'Log Recorded By', 'Notes / Description'
  ];

  const purchaseRows = purchases.map(p => {
    return [
      p.id, p.purchaseDate, p.itemOrService, p.expenseCategory, p.quantity,
      p.unitPrice, p.baseAmount || (p.quantity * p.unitPrice),
      p.hasVat ? 'Yes' : 'No', p.vatAmount || 0,
      p.hasWithholding ? 'Yes' : 'No', p.withholdingAmount || 0,
      p.totalPrice, getBankName(p.paymentMethodId), p.purchasedBy,
      p.recordedBy, p.notesOrDescription || 'None'
    ];
  });
  
  const wsPurchases = XLSX.utils.aoa_to_sheet([purchaseHeaders, ...purchaseRows]);
  XLSX.utils.book_append_sheet(wb, wsPurchases, "Purchases Ledger");

  // 3. Treasury Ledger Sheet
  const treasuryHeaders = [
    'Account ID', 'Account & Bank Name', 'Account Number',
    'Initial Capital Stockpile (ETB)', 'Client Advances Received (ETB)',
    'Client Delivery Balances Received (ETB)', 'Supplier Purchases Deducted (ETB)',
    'Compute Current Liquidity Status'
  ];

  const treasuryRows = bankAccounts.map(b => {
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
      b.id, b.name, b.accountNumber || 'None', b.initialBalance,
      advancesForBank, completedRemainingForBank, purchasesOutOfBank, netBalance
    ];
  });
  
  const wsTreasury = XLSX.utils.aoa_to_sheet([treasuryHeaders, ...treasuryRows]);
  XLSX.utils.book_append_sheet(wb, wsTreasury, "Treasury Ledger");

  // 4. Inventory Ledger Sheet
  const inventoryHeaders = [
    'Stock ID', 'Paper Stock Type', 'Initial Stockpile (Sheets)',
    'Consumed Quantity (Sheets)', 'Available Inventory Balance (Sheets)',
    'Operational Stock Status'
  ];

  const inventoryRows = paperStocks.map(s => {
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

    return [s.id, s.name, s.initialStock, consumed, netStock, statusText];
  });

  const wsInventory = XLSX.utils.aoa_to_sheet([inventoryHeaders, ...inventoryRows]);
  XLSX.utils.book_append_sheet(wb, wsInventory, "Inventory Ledger");

  // Trigger download
  XLSX.writeFile(wb, `Mena_CRM_Full_Backup_${new Date().toISOString().split('T')[0]}.xlsx`);
}
