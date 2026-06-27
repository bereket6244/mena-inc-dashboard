import * as XLSX from 'xlsx';
import { Customer, Purchase, BankAccount, PaperStock, ExpenseCategory, ProductType, ClientType, EmployeeUser, Loan, AuditLogEntry } from '../types';
import { computeStockConsumed, getCustomerStockDisplayName } from '../utils';
import {
  getCustomerEffectiveQuantity,
  getCustomerInvoiceSubtotal,
  getCustomerInvoiceTotal,
  getCustomerLatestPaymentDate,
  getCustomerPaymentEntries,
  getCustomerRefundEntries,
  getCustomerRemainingBalance,
  getCustomerTotalPaid,
} from './customerFinance';

interface FullBackupOptions {
  categories?: ExpenseCategory[];
  loans?: Loan[];
  productTypes?: ProductType[];
  clientTypes?: ClientType[];
  employees?: EmployeeUser[];
  auditLogs?: AuditLogEntry[];
  leadChannels?: string[];
  date?: string;
}

export interface AppDataImportBundle {
  customers?: Customer[];
  purchases?: Purchase[];
  bankAccounts?: BankAccount[];
  paperStocks?: PaperStock[];
  categories?: ExpenseCategory[];
  loans?: Loan[];
  productTypes?: ProductType[];
  clientTypes?: ClientType[];
  employees?: EmployeeUser[];
  auditLogs?: AuditLogEntry[];
  leadChannels?: string[];
}

const COLLECTION_LABELS: Record<keyof AppDataImportBundle, string> = {
  customers: 'Customers',
  purchases: 'Purchases',
  bankAccounts: 'Bank Accounts',
  paperStocks: 'Paper Stocks',
  categories: 'Expense Categories',
  loans: 'Loans',
  productTypes: 'Product Types',
  clientTypes: 'Client Types',
  employees: 'Staff',
  auditLogs: 'Audit Logs',
  leadChannels: 'Lead Channels'
};

const RAW_SHEET_TO_COLLECTION: Record<string, keyof AppDataImportBundle> = {
  'raw customers': 'customers',
  'raw purchases': 'purchases',
  'raw bank accounts': 'bankAccounts',
  'raw paper stocks': 'paperStocks',
  'raw loans': 'loans',
  'raw expense categories': 'categories',
  'raw product types': 'productTypes',
  'raw client types': 'clientTypes',
  'raw staff': 'employees',
  'raw audit logs': 'auditLogs',
  'raw lead channels': 'leadChannels'
};

const normalizeSheetName = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');

const isJsonLike = (value: any) => typeof value === 'string' && /^[\[{]/.test(value.trim());
const parseJsonCell = (value: any) => {
  if (!isJsonLike(value)) return value;
  try { return JSON.parse(value); } catch (_) { return value; }
};

const normalizeRawRow = (row: Record<string, any>) => {
  const normalized: Record<string, any> = {};
  Object.entries(row).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    normalized[key] = parseJsonCell(value);
  });
  return normalized;
};

const appendRawSheet = <T extends Record<string, any>>(wb: XLSX.WorkBook, sheetName: string, rows: T[]) => {
  const safeRows = rows.map(row => Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      Array.isArray(value) || (value && typeof value === 'object') ? JSON.stringify(value) : value
    ])
  ));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(safeRows), sheetName);
};

const appendJsonBackupSheet = (wb: XLSX.WorkBook, bundle: AppDataImportBundle) => {
  const rows = (Object.keys(COLLECTION_LABELS) as Array<keyof AppDataImportBundle>)
    .map(key => ({
      collection: key,
      label: COLLECTION_LABELS[key],
      dataJson: JSON.stringify(bundle[key] || [])
    }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'App Data JSON');
};

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
  const fullBundle: AppDataImportBundle = {
    customers,
    purchases,
    bankAccounts,
    paperStocks,
    categories: options.categories || [],
    loans: options.loans || [],
    productTypes: options.productTypes || [],
    clientTypes: options.clientTypes || [],
    employees: options.employees || [],
    auditLogs: options.auditLogs || [],
    leadChannels: options.leadChannels || []
  };

  // 1. Orders Ledger Sheet
  const orderHeaders = [
    'Order ID', 'Client Name', 'Client Type', 'Phone', 'Acquisition Source',
    'Order Taken By', 'Product Type', 'Quantity', 'Unit Price (ETB)',
    'Subtotal Gross (ETB)', 'VAT Added (15%)', 'Total Invoice Price (ETB)',
    'Total Paid (ETB)', 'Remaining Balance Owed (ETB)', 'Payment Channels',
    'Remaining Delivery Channel', 'Delivery/Status Date', 'Latest Payment Date',
    'Incompletion Reason', 'Paper 1 Type', 'Paper 1 Amount/Card', 'Paper 2 Type',
    'Paper 2 Amount/Card', 'Paper 3 Type', 'Paper 3 Amount/Card', 'Entrance Paper Type',
    'Entrance Paper Amount (1/16)', 'Ajabi Paper Type', 'Ajabi Paper Amount (1/9)'
  ];

  const orderRows = customers.map(c => {
    const effectiveQuantity = getCustomerEffectiveQuantity(c);
    const subtotal = getCustomerInvoiceSubtotal(c);
    const invoiceTotal = getCustomerInvoiceTotal(c);
    const paymentEntries = getCustomerPaymentEntries(c);
    const paid = getCustomerTotalPaid(c);
    const paymentChannels = Array.from(new Set(paymentEntries.map(payment => getBankName(payment.bankId)).filter(Boolean))).join(' | ') || 'N/A';
    
    return [
      c.id, c.clientName, c.clientType, c.phone, c.acquisitionSource,
      c.orderTakenBy, c.productType, effectiveQuantity, c.unitPrice,
      subtotal, c.isVatAdded ? 'Yes (15%)' : 'No', invoiceTotal,
      paid, getCustomerRemainingBalance(c), paymentChannels,
      c.bankRemainingId ? getBankName(c.bankRemainingId) : 'N/A (Uncollected)',
      c.deliveryDate || 'N/A', getCustomerLatestPaymentDate(c) || 'N/A', c.incompletionReason || 'N/A',
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
    'Initial Capital Stockpile (ETB)', 'Client Payments Received (ETB)',
    'Supplier Purchases Deducted (ETB)', 'Loan Cash Movement (ETB)',
    'Compute Current Liquidity Status'
  ];

  const treasuryRows = bankAccounts.map(b => {
    const customerPaymentsForBank = customers
      .reduce((sum, c) => (
        sum + getCustomerPaymentEntries(c)
          .filter(payment => payment.bankId === b.id)
          .reduce((paymentSum, payment) => paymentSum + Number(payment.amount || 0), 0)
        - getCustomerRefundEntries(c)
          .filter(refund => refund.bankId === b.id)
          .reduce((refundSum, refund) => refundSum + Number(refund.amount || 0), 0)
      ), 0);
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
    
    const netBalance = b.initialBalance + customerPaymentsForBank - purchasesOutOfBank + loanCashMovement;

    return [
      b.id, b.name, b.accountNumber || 'None', b.initialBalance,
      customerPaymentsForBank, purchasesOutOfBank, loanCashMovement, netBalance
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

  const auditRows = (options.auditLogs || []).map(log => [
    log.id,
    log.performedAt,
    log.eventType,
    log.entityType,
    log.entityLabel || log.entityId,
    log.action,
    log.performedBy,
    JSON.stringify(log.details || {})
  ]);
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([['Audit ID', 'Performed At', 'Event Type', 'Entity Type', 'Entity', 'Action', 'Performed By', 'Details JSON'], ...auditRows]),
    'Audit Logs'
  );

  const leadChannelRows = (options.leadChannels || []).map(channel => [channel]);
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([['Lead Channel'], ...leadChannelRows]),
    'Lead Channels'
  );

  appendJsonBackupSheet(wb, fullBundle);
  appendRawSheet(wb, 'Raw Customers', customers as unknown as Record<string, any>[]);
  appendRawSheet(wb, 'Raw Purchases', purchases as unknown as Record<string, any>[]);
  appendRawSheet(wb, 'Raw Bank Accounts', bankAccounts as unknown as Record<string, any>[]);
  appendRawSheet(wb, 'Raw Paper Stocks', paperStocks as unknown as Record<string, any>[]);
  appendRawSheet(wb, 'Raw Loans', (options.loans || []) as unknown as Record<string, any>[]);
  appendRawSheet(wb, 'Raw Expense Categories', (options.categories || []) as unknown as Record<string, any>[]);
  appendRawSheet(wb, 'Raw Product Types', (options.productTypes || []) as unknown as Record<string, any>[]);
  appendRawSheet(wb, 'Raw Client Types', (options.clientTypes || []) as unknown as Record<string, any>[]);
  appendRawSheet(wb, 'Raw Staff', (options.employees || []) as unknown as Record<string, any>[]);
  appendRawSheet(wb, 'Raw Audit Logs', (options.auditLogs || []) as unknown as Record<string, any>[]);
  appendRawSheet(wb, 'Raw Lead Channels', (options.leadChannels || []).map(name => ({ name })));

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

const mergeBundle = (target: AppDataImportBundle, source: AppDataImportBundle) => {
  (Object.keys(COLLECTION_LABELS) as Array<keyof AppDataImportBundle>).forEach(key => {
    const value = source[key];
    if (Array.isArray(value)) {
      (target as Record<string, any>)[key] = value;
    }
  });
  return target;
};

const parseJsonBackupRows = (rows: Record<string, any>[]): AppDataImportBundle => {
  const bundle: AppDataImportBundle = {};
  rows.forEach(row => {
    const collection = String(row.collection || row.Collection || '').trim() as keyof AppDataImportBundle;
    const dataJson = row.dataJson || row['Data JSON'] || row.data || row.Data;
    if (!collection || !(collection in COLLECTION_LABELS) || typeof dataJson !== 'string') return;
    try {
      const parsed = JSON.parse(dataJson);
      if (Array.isArray(parsed)) (bundle as Record<string, any>)[collection] = parsed;
    } catch (_) {}
  });
  return bundle;
};

const inferCsvCollection = (filename: string, rows: Record<string, any>[]): keyof AppDataImportBundle | null => {
  const lowerName = filename.toLowerCase();
  const first = rows[0] || {};
  const keys = Object.keys(first);
  const has = (key: string) => keys.includes(key);
  if (lowerName.includes('customer') || lowerName.includes('order') || has('clientName') || has('Order ID')) return 'customers';
  if (lowerName.includes('purchase') || has('itemOrService') || has('Purchase ID')) return 'purchases';
  if (lowerName.includes('bank') || lowerName.includes('treasury') || has('accountNumber') || has('Account ID')) return 'bankAccounts';
  if (lowerName.includes('inventory') || lowerName.includes('paper') || lowerName.includes('stock') || has('initialStock') || has('Stock ID')) return 'paperStocks';
  if (lowerName.includes('loan') || has('personName') || has('Loan ID')) return 'loans';
  if (lowerName.includes('category') || has('items') || has('Category ID')) return 'categories';
  if (lowerName.includes('product') || has('productType') || has('Product Type ID')) return 'productTypes';
  if (lowerName.includes('client type')) return 'clientTypes';
  if (lowerName.includes('staff') || lowerName.includes('employee') || has('username') || has('Staff ID')) return 'employees';
  if (lowerName.includes('audit') || has('eventType') || has('Audit ID')) return 'auditLogs';
  if (lowerName.includes('lead') || has('Lead Channel')) return 'leadChannels';
  return null;
};

const normalizeCsvRowsForCollection = (collection: keyof AppDataImportBundle, rows: Record<string, any>[]) => {
  const value = (row: Record<string, any>, ...keys: string[]) => keys.map(key => row[key]).find(item => item !== undefined && item !== null && item !== '');
  if (collection === 'customers' && rows[0]?.['Order ID']) {
    return rows.map(row => ({
      id: value(row, 'Order ID'),
      clientName: value(row, 'Client Name') || '',
      clientType: value(row, 'Client Type') || '',
      phone: value(row, 'Phone') || '',
      acquisitionSource: value(row, 'Acquisition Source') || '',
      orderTakenBy: value(row, 'Order Taken By') || '',
      productType: value(row, 'Product Type') || '',
      quantity: Number(value(row, 'Quantity') || 0),
      unitPrice: Number(value(row, 'Unit Price (ETB)') || 0),
      advancePayment: Number(value(row, 'Advance Payment (ETB)') || 0),
      paymentMethodId: value(row, 'Advance Payment Channel') || '',
      bankRemainingId: value(row, 'Remaining Delivery Channel') || '',
      deliveryDate: value(row, 'Delivery/Status Date') === 'N/A' ? '' : value(row, 'Delivery/Status Date') || '',
      advancePaymentDate: value(row, 'Advance Receipt Date') === 'N/A' ? '' : value(row, 'Advance Receipt Date') || '',
      incompletionReason: value(row, 'Incompletion Reason') === 'N/A' ? '' : value(row, 'Incompletion Reason') || '',
      paperType1: value(row, 'Paper 1 Type') || '',
      amount1: Number(value(row, 'Paper 1 Amount/Card') || 0),
      paperType2: value(row, 'Paper 2 Type') || '',
      amount2: Number(value(row, 'Paper 2 Amount/Card') || 0),
      paperType3: value(row, 'Paper 3 Type') || '',
      amount3: Number(value(row, 'Paper 3 Amount/Card') || 0),
      entrancePaper: value(row, 'Entrance Paper Type') || '',
      amount16: Number(value(row, 'Entrance Paper Amount (1/16)') || 0),
      ajabiPaper: value(row, 'Ajabi Paper Type') || '',
      amount9: Number(value(row, 'Ajabi Paper Amount (1/9)') || 0),
      isVatAdded: String(value(row, 'VAT Added (15%)') || '').toLowerCase().startsWith('yes'),
      currency: 'ETB'
    }));
  }
  if (collection === 'paperStocks' && rows[0]?.['Stock ID']) {
    return rows.map(row => ({
      id: value(row, 'Stock ID'),
      name: value(row, 'Paper Stock Type') || '',
      initialStock: Number(value(row, 'Initial Stockpile (Sheets)') || 0)
    }));
  }
  if (collection === 'bankAccounts' && rows[0]?.['Account ID']) {
    return rows.map(row => ({
      id: value(row, 'Account ID'),
      name: value(row, 'Account & Bank Name') || '',
      accountNumber: value(row, 'Account Number') || '',
      initialBalance: Number(value(row, 'Initial Capital Stockpile (ETB)') || 0)
    }));
  }
  return rows.map(normalizeRawRow);
};

const parseWorkbook = (wb: XLSX.WorkBook): AppDataImportBundle => {
  const bundle: AppDataImportBundle = {};
  const jsonSheet = wb.Sheets['App Data JSON'];
  if (jsonSheet) {
    mergeBundle(bundle, parseJsonBackupRows(XLSX.utils.sheet_to_json(jsonSheet, { defval: '' }) as Record<string, any>[]));
  }

  wb.SheetNames.forEach(sheetName => {
    const collection = RAW_SHEET_TO_COLLECTION[normalizeSheetName(sheetName)];
    if (!collection) return;
    const rows = (XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' }) as Record<string, any>[])
      .map(normalizeRawRow);
    if (collection === 'leadChannels') {
      bundle.leadChannels = rows
        .map(row => String(row.name || row['Lead Channel'] || '').trim())
        .filter(Boolean);
    } else {
      (bundle as Record<string, any>)[collection] = rows;
    }
  });

  return bundle;
};

export async function parseAppDataImportFile(file: File): Promise<AppDataImportBundle> {
  const filename = file.name || '';
  const lowerName = filename.toLowerCase();
  if (lowerName.endsWith('.csv')) {
    const text = await file.text();
    const wb = XLSX.read(text, { type: 'string' });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' }) as Record<string, any>[];
    const jsonBundle = parseJsonBackupRows(rows);
    if (Object.keys(jsonBundle).length > 0) return jsonBundle;
    const collection = inferCsvCollection(filename, rows);
    if (!collection) throw new Error('Could not identify which app table this CSV belongs to. Use a CSV exported from a Raw sheet, or import the full .xlsx backup.');
    if (collection === 'leadChannels') {
      return { leadChannels: rows.map(row => String(row.name || row['Lead Channel'] || Object.values(row)[0] || '').trim()).filter(Boolean) };
    }
    return { [collection]: normalizeCsvRowsForCollection(collection, rows) } as AppDataImportBundle;
  }

  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const bundle = parseWorkbook(wb);
  if (Object.keys(bundle).length === 0) {
    throw new Error('No importable app data was found. Use a Mena CRM backup workbook or a CSV from one of its Raw sheets.');
  }
  return bundle;
}
