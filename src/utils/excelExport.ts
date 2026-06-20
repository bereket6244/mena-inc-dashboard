import * as XLSX from 'xlsx';
import { Customer, Purchase, BankAccount, PaperStock, ExpenseCategory, ProductType, ClientType, EmployeeUser, Loan } from '../types';
import { computeStockConsumed, getCustomerStockDisplayName } from '../utils';

interface FullBackupOptions {
  categories?: ExpenseCategory[];
  loans?: Loan[];
  productTypes?: ProductType[];
  clientTypes?: ClientType[];
  employees?: EmployeeUser[];
  date?: string;
}

export const getLocalBackupDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getBackupFilename = (date = getLocalBackupDate()) => `Mena_CRM_Full_Backup_${date}.xlsx`;

/**
 * Universal workbook builder for downloads and automated backups.
 */
export function buildAllDataWorkbook(
  customers: Customer[],
  purchases: Purchase[],
  bankAccounts: BankAccount[],
  paperStocks: PaperStock[],
  getBankName: (id?: string) => string,
  options: FullBackupOptions = {}
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
      getCustomerStockDisplayName(c, 'paperType1', paperStocks), c.amount1 || 0,
      getCustomerStockDisplayName(c, 'paperType2', paperStocks), c.amount2 || 0,
      getCustomerStockDisplayName(c, 'paperType3', paperStocks), c.amount3 || 0,
      getCustomerStockDisplayName(c, 'entrancePaper', paperStocks), c.amount16 || 0,
      getCustomerStockDisplayName(c, 'ajabiPaper', paperStocks), c.amount9 || 0
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

  const loans = options.loans || [];
  const loanHeaders = [
    'Loan ID', 'Type', 'Person / Organization', 'Phone', 'Principal Amount',
    'Interest / Fee', 'Total Due', 'Total Repaid', 'Remaining Balance',
    'Currency', 'Loan Date', 'Due Date', 'Payment Account', 'Recorded By',
    'Status', 'Notes', 'Repayment History'
  ];
  const loanRows = loans.map(loan => {
    const totalDue = Number(loan.principalAmount || 0) + Number(loan.interestAmount || 0);
    const paid = (loan.payments || []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const remaining = Math.max(0, totalDue - paid);
    const repayments = (loan.payments || [])
      .map(payment => `${payment.paymentDate}: ${payment.amount} via ${getBankName(payment.paymentMethodId)} (${payment.recordedBy})`)
      .join(' | ');

    return [
      loan.id,
      loan.type === 'given' ? 'Loan Given Out' : 'Loan Received',
      loan.personName,
      loan.phone || '',
      loan.principalAmount,
      loan.interestAmount || 0,
      totalDue,
      paid,
      remaining,
      loan.currency || 'ETB',
      loan.loanDate,
      loan.dueDate || '',
      getBankName(loan.paymentMethodId),
      loan.recordedBy,
      loan.status || (remaining <= 0 ? 'paid' : paid > 0 ? 'partially_paid' : 'open'),
      loan.notes || '',
      repayments
    ];
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([loanHeaders, ...loanRows]), "Loans Ledger");

  // 3. Treasury Ledger Sheet
  const treasuryHeaders = [
    'Account ID', 'Account & Bank Name', 'Account Number',
    'Initial Capital Stockpile (ETB)', 'Client Advances Received (ETB)',
    'Client Delivery Balances Received (ETB)', 'Supplier Purchases Deducted (ETB)',
    'Loan Cash Movement (ETB)', 'Compute Current Liquidity Status'
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
    const loanCashMovement = loans.reduce((sum, loan) => {
      const principal = Number(loan.principalAmount || 0);
      const initialMovement = loan.paymentMethodId === b.id
        ? (loan.type === 'given' ? -principal : principal)
        : 0;
      const repaymentMovement = (loan.payments || [])
        .filter(payment => payment.paymentMethodId === b.id)
        .reduce((paymentSum, payment) => paymentSum + (loan.type === 'given' ? Number(payment.amount || 0) : -Number(payment.amount || 0)), 0);
      return sum + initialMovement + repaymentMovement;
    }, 0);
    
    const netBalance = b.initialBalance + advancesForBank + completedRemainingForBank - purchasesOutOfBank + loanCashMovement;

    return [
      b.id, b.name, b.accountNumber || 'None', b.initialBalance,
      advancesForBank, completedRemainingForBank, purchasesOutOfBank, loanCashMovement, netBalance
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
    const consumed = computeStockConsumed(s, customers, paperStocks);
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

  const categoryRows = (options.categories || []).map(cat => [
    cat.id,
    cat.name,
    (cat.items || []).join(', '),
    cat.isDeleted ? 'Yes' : 'No',
    cat.deletedBy || ''
  ]);
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([['Category ID', 'Category Name', 'Subitems', 'Deleted', 'Deleted By'], ...categoryRows]),
    'Expense Categories'
  );

  const productTypeRows = (options.productTypes || []).map(product => [
    product.id,
    product.name,
    product.isDeleted ? 'Yes' : 'No',
    product.deletedBy || ''
  ]);
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([['Product Type ID', 'Name', 'Deleted', 'Deleted By'], ...productTypeRows]),
    'Product Types'
  );

  const clientTypeRows = (options.clientTypes || []).map(type => [
    type.id,
    type.name,
    type.isDeleted ? 'Yes' : 'No',
    type.deletedBy || ''
  ]);
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([['Client Type ID', 'Name', 'Deleted', 'Deleted By'], ...clientTypeRows]),
    'Client Types'
  );

  const staffRows = (options.employees || []).map(employee => [
    employee.id,
    employee.name,
    employee.username,
    employee.role,
    (employee.allowedTabs || []).join(', '),
    employee.isDeleted ? 'Yes' : 'No',
    employee.deletedBy || ''
  ]);
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([['Staff ID', 'Name', 'Username', 'Role', 'Allowed Tabs', 'Deleted', 'Deleted By'], ...staffRows]),
    'Staff'
  );

  return wb;
}

export function createAllDataExcelBlob(
  customers: Customer[],
  purchases: Purchase[],
  bankAccounts: BankAccount[],
  paperStocks: PaperStock[],
  getBankName: (id?: string) => string,
  options: FullBackupOptions = {}
) {
  const date = options.date || getLocalBackupDate();
  const wb = buildAllDataWorkbook(customers, purchases, bankAccounts, paperStocks, getBankName, { ...options, date });
  const arrayBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  return {
    blob: new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    filename: getBackupFilename(date),
    date
  };
}

/**
 * Universal export function that generates a single .xlsx file
 * containing multiple sheets for different data sets.
 */
export function exportAllDataToExcel(
  customers: Customer[],
  purchases: Purchase[],
  bankAccounts: BankAccount[],
  paperStocks: PaperStock[],
  getBankName: (id?: string) => string,
  options: FullBackupOptions = {}
) {
  const date = options.date || getLocalBackupDate();
  const wb = buildAllDataWorkbook(customers, purchases, bankAccounts, paperStocks, getBankName, { ...options, date });

  // Trigger download
  XLSX.writeFile(wb, getBackupFilename(date));
}
