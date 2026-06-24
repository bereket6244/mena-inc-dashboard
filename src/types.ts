export interface ClientType {
  id: string;
  name: string;
  isDeleted?: boolean;
  deletedBy?: string;
}

export interface BankAccount {
  id: string;
  name: string;
  accountNumber?: string;
  initialBalance: number;
  currency?: string;
  isDeleted?: boolean;
  deletedBy?: string;
}

export interface BankAccountAdjustment {
  id: string;
  bankAccountId: string;
  bankAccountName: string;
  adjustmentType: 'add' | 'subtract';
  amount: number;
  previousInitialBalance: number;
  newInitialBalance: number;
  reason: string;
  editedBy?: string;
  editedAt: string;
}

export type AuditEventType =
  | 'delete'
  | 'customer_update'
  | 'stock_update'
  | 'staff_create'
  | 'staff_update'
  | 'staff_delete'
  | 'bank_account_update'
  | 'bank_adjustment'
  | 'expense_category_update'
  | 'product_type_update'
  | 'client_type_update'
  | 'purchase_create'
  | 'purchase_update'
  | 'purchase_delete'
  | 'loan_create'
  | 'loan_update'
  | 'loan_delete'
  | 'order_completion';

export interface AuditLogEntry {
  id: string;
  eventType: AuditEventType;
  entityType: string;
  entityId: string;
  entityLabel: string;
  action: string;
  performedBy: string;
  performedAt: string;
  details?: Record<string, any>;
}

export const DEFAULT_CLIENT_TYPES: ClientType[] = [
  { id: 'ct_1', name: 'Individual' },
  { id: 'ct_2', name: 'Organization' }
];

export interface PaperStock {
  id: string;
  name: string;
  initialStock: number;
  isDeleted?: boolean;
  deletedBy?: string;
}

export interface CustomerPayment {
  id: string;
  amount: number;
  date: string;
  paymentMethodId: string;
  recordedBy: string;
}

export interface OrderAdjustment {
  id: string;
  additionalQuantity: number;
  unitPrice: number;
  date: string;
  recordedBy: string;
  notes?: string;
}

export interface Customer {
  id: string;
  clientType: string;
  clientName: string;
  phone: string;
  acquisitionSource: string;
  orderTakenBy: 'Bereket' | 'Yeabsra' | 'Yordanos';
  productType: string;
  quantity: number;
  unitPrice: number;
  advancePayment: number;
  paymentMethodId?: string; // references a BankAccount id (e.g. 'b1', 'b2', etc.)
  currency?: string;
  
  // New flexible payment and adjustment tracking
  payments?: CustomerPayment[];
  orderAdjustments?: OrderAdjustment[];

  // Paper specs
  paperType1: string;
  paperType1Id?: string;
  amount1: number;
  paperType2: string;
  paperType2Id?: string;
  amount2: number;
  paperType3: string;
  paperType3Id?: string;
  amount3: number;
  
  // Special papers
  entrancePaper: string;
  entrancePaperId?: string;
  amount16: number; // divided by 16
  ajabiPaper: string;
  ajabiPaperId?: string;
  amount9: number;  // divided by 9
  
  deliveryDate: string;
  
  // Custom Google Sheets mapping fields
  advancePaymentDate?: string;
  bankRemainingId?: string;       // references a BankAccount id for remaining balance
  incompletionReason?: string;    // Incompletion Reason text
  isVatAdded?: boolean;           // Whether 15% VAT is added
  baseUnitPrice?: number;         // Unit Price before VAT

  isDeleted?: boolean;
  deletedBy?: string;
}

export interface ProductType {
  id: string;
  name: string;
  isDeleted?: boolean;
  deletedBy?: string;
}

export const DEFAULT_BANK_ACCOUNTS: BankAccount[] = [
  {
    id: 'b_cbe_default',
    name: 'CBE (Mena INK Trading PLC)',
    accountNumber: '1000632725896',
    initialBalance: 0
  }
];

export const DEFAULT_PAPER_STOCKS: PaperStock[] = [];

export const CLIENT_TYPES = ['Individual', 'Organization'] as const;
export const ACQUISITION_SOURCES = ['TikTok', 'Instagram', 'Telegram', 'Word of Mouth', 'Repeat'] as const;
export const AGENTS = ['Bereket', 'Yeabsra', 'Yordanos'] as const;

export const DEFAULT_PRODUCT_TYPES: ProductType[] = [
  { id: 'pt1', name: 'Pocket Card' },
  { id: 'pt2', name: 'Sliding Card' },
  { id: 'pt3', name: 'Velvet Card' },
  { id: 'pt4', name: 'Acrylic Card' },
  { id: 'pt5', name: 'Trifold Invitation' },
  { id: 'pt6', name: 'Standard Envelope' },
  { id: 'pt7', name: 'Premium Wedding Folio' },
  { id: 'pt8', name: 'Custom Floral Box' }
];

export interface EmployeeUser {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: 'admin' | 'employee';
  allowedTabs?: ('customers' | 'inventory' | 'performance' | 'purchases')[];
  isDeleted?: boolean;
  deletedBy?: string;
}

export const DEFAULT_USERS: EmployeeUser[] = [];

export const INITIAL_CUSTOMERS: Customer[] = [];

export interface Purchase {
  id: string;
  purchasedBy: string;
  itemOrService: string;
  quantity: number;
  unitPrice: number;
  currency?: string;
  purchaseDate: string;
  paymentMethodId: string; // references a BankAccount id
  totalPrice: number; // calculated according to VAT/Withholding or quantity * unitPrice
  notesOrDescription: string;
  recordedBy: string;
  expenseCategory: string;
  hasVat?: boolean;
  vatAmount?: number;
  hasWithholding?: boolean;
  withholdingAmount?: number;
  baseAmount?: number;
  isDeleted?: boolean;
  deletedBy?: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  items: string[];
  isDeleted?: boolean;
  deletedBy?: string;
}

export const INITIAL_EXPENSE_CATEGORIES: ExpenseCategory[] = [];

export const INITIAL_PURCHASES: Purchase[] = [];

export interface LoanPayment {
  id: string;
  loanId: string;
  amount: number;
  paymentDate: string;
  paymentMethodId: string;
  recordedBy: string;
  notes?: string;
}

export interface Loan {
  id: string;
  type: 'given' | 'received';
  personName: string;
  phone?: string;
  principalAmount: number;
  currency?: string;
  loanDate: string;
  dueDate?: string;
  paymentMethodId: string;
  interestAmount?: number;
  notes?: string;
  recordedBy: string;
  payments: LoanPayment[];
  status?: 'open' | 'partially_paid' | 'paid' | 'written_off';
  isDeleted?: boolean;
  deletedBy?: string;
}

export const INITIAL_LOANS: Loan[] = [];
