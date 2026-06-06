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

export const DEFAULT_BANK_ACCOUNTS: BankAccount[] = [
  { id: 'b1', name: 'Commercial Bank of Ethiopia (CBE)', accountNumber: '1000123456789', initialBalance: 0 },
  { id: 'b2', name: 'Telebirr', accountNumber: '251911223344', initialBalance: 0 },
  { id: 'b3', name: 'Cash', initialBalance: 0 },
  { id: 'b4', name: 'Awash Bank', accountNumber: '01320123456700', initialBalance: 0 }
];

export const DEFAULT_PAPER_STOCKS: PaperStock[] = [
  { id: 'p1', name: 'Big flower', initialStock: 0 },
  { id: 'p2', name: 'Small flower', initialStock: 0 },
  { id: 'p3', name: 'White wave', initialStock: 0 },
  { id: 'p4', name: 'Gold', initialStock: 0 },
  { id: 'p5', name: 'Silver', initialStock: 0 },
  { id: 'p6', name: 'Kraft Matte', initialStock: 0 },
  { id: 'p7', name: 'Entrance Paper', initialStock: 0 },
  { id: 'p8', name: 'Ajabi Paper', initialStock: 0 }
];

export const CLIENT_TYPES = ['Individual', 'Organization'] as const;
export const ACQUISITION_SOURCES = ['TikTok', 'Instagram', 'Telegram', 'Word of Mouth', 'Repeat'] as const;
export const AGENTS = ['Bereket', 'Yeabsra', 'Yordanos'] as const;

export const PRODUCT_TYPES = [
  'Pocket Card',
  'Sliding Card',
  'Velvet Card',
  'Acrylic Card',
  'Trifold Invitation',
  'Standard Envelope',
  'Premium Wedding Folio',
  'Custom Floral Box'
];

export interface EmployeeUser {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: 'admin' | 'employee';
}

export const DEFAULT_USERS: EmployeeUser[] = [
  { id: 'u1', name: 'Bereket (Admin)', username: 'admin', password: 'admin', role: 'admin' },
  { id: 'u2', name: 'Bereket', username: 'bereket', password: '1234', role: 'employee' },
  { id: 'u3', name: 'Yeabsra', username: 'yeabsra', password: '1234', role: 'employee' },
  { id: 'u4', name: 'Yordanos', username: 'yordanos', password: '1234', role: 'employee' }
];

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

export const INITIAL_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  {
    id: 'cat1',
    name: 'Raw Paper Stocks',
    items: [
      'Big flower premium sheets',
      'Small flower premium sheets',
      'White wave textured paper',
      'Gold foil sheets',
      'Silver foil sheets',
      'Kraft Matte stock',
      'Entrance cardboard sheets',
      'Ajabi classic backing'
    ]
  },
  {
    id: 'cat2',
    name: 'Machinery & Tooling',
    items: [
      'Laser engraver focal lens',
      'Foil plate mold carving',
      'Heavy duty cutting blades',
      'Creasing machine rubber belts'
    ]
  },
  {
    id: 'cat3',
    name: 'Consumption Supplies',
    items: [
      'Toner cartridges',
      'Hot stamping foils',
      'Premium wax sticks',
      'Silk cord ribbons',
      'Scented wedding spray oils'
    ]
  },
  {
    id: 'cat4',
    name: 'Office & Admin',
    items: [
      'High-speed internet router subscription',
      'Stationery pens & glues',
      'Utility tea/coffee boxes',
      'Rent and workspace electricity contribution'
    ]
  },
  {
    id: 'cat5',
    name: 'Marketing & Ads',
    items: [
      'TikTok video promotion credit',
      'Instagram sponsored page ads',
      'Wedding planner networking commission',
      'In-person expo booth decoration accessories'
    ]
  }
];

export const INITIAL_PURCHASES: Purchase[] = [];

