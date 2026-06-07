export interface BankAccount {
  id: string;
  name: string;
  accountNumber?: string;
  initialBalance: number;
}

export interface PaperStock {
  id: string;
  name: string;
  initialStock: number;
}

export interface Customer {
  id: string;
  clientType: 'Individual' | 'Organization';
  clientName: string;
  phone: string;
  acquisitionSource: string;
  orderTakenBy: 'Bereket' | 'Yeabsra' | 'Yordanos';
  productType: string;
  quantity: number;
  unitPrice: number;
  advancePayment: number;
  paymentMethodId?: string; // references a BankAccount id (e.g. 'b1', 'b2', etc.)
  
  // Paper specs
  paperType1: string;
  amount1: number;
  paperType2: string;
  amount2: number;
  paperType3: string;
  amount3: number;
  
  // Special papers
  entrancePaper: string;
  amount16: number; // divided by 16
  ajabiPaper: string;
  amount9: number;  // divided by 9
  
  deliveryDate: string;
  
  // Custom Google Sheets mapping fields
  advancePaymentDate?: string;
  bankRemainingId?: string;       // references a BankAccount id for remaining balance
  incompletionReason?: string;    // Incompletion Reason text
  isVatAdded?: boolean;           // Whether 15% VAT is added
  baseUnitPrice?: number;         // Unit Price before VAT
}

export interface ProductType {
  id: string;
  name: string;
}

export const DEFAULT_BANK_ACCOUNTS: BankAccount[] = [];

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
}

export const DEFAULT_USERS: EmployeeUser[] = [];

export const INITIAL_CUSTOMERS: Customer[] = [];

export interface Purchase {
  id: string;
  purchasedBy: string;
  itemOrService: string;
  quantity: number;
  unitPrice: number;
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
}

export interface ExpenseCategory {
  id: string;
  name: string;
  items: string[];
}

export const INITIAL_EXPENSE_CATEGORIES: ExpenseCategory[] = [];

export const INITIAL_PURCHASES: Purchase[] = [];

