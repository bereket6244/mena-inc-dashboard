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
  { id: 'b1', name: 'Commercial Bank of Ethiopia (CBE)', accountNumber: '1000123456789', initialBalance: 12500 },
  { id: 'b2', name: 'Telebirr', accountNumber: '251911223344', initialBalance: 4500 },
  { id: 'b3', name: 'Cash', initialBalance: 1500 },
  { id: 'b4', name: 'Awash Bank', accountNumber: '01320123456700', initialBalance: 0 }
];

export const DEFAULT_PAPER_STOCKS: PaperStock[] = [
  { id: 'p1', name: 'Big flower', initialStock: 1200 },
  { id: 'p2', name: 'Small flower', initialStock: 800 },
  { id: 'p3', name: 'White wave', initialStock: 500 },
  { id: 'p4', name: 'Gold', initialStock: 1000 },
  { id: 'p5', name: 'Silver', initialStock: 600 },
  { id: 'p6', name: 'Kraft Matte', initialStock: 400 },
  { id: 'p7', name: 'Entrance Paper', initialStock: 2500 },
  { id: 'p8', name: 'Ajabi Paper', initialStock: 1800 }
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

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'c1',
    clientType: 'Individual',
    clientName: 'Almaz Tekle',
    phone: '+251911223344',
    acquisitionSource: 'TikTok',
    orderTakenBy: 'Bereket',
    productType: 'Pocket Card',
    quantity: 150,
    unitPrice: 85,
    advancePayment: 6000,
    paymentMethodId: 'b1',
    paperType1: 'Big flower',
    amount1: 75 / 150, // 0.5 sheets per card (75 sheets total)
    paperType2: 'Gold',
    amount2: 50 / 150, // ~0.33 sheets per card (50 sheets total)
    paperType3: 'None',
    amount3: 0,
    entrancePaper: 'Entrance Paper',
    amount16: 128, // 128 pieces total / 16 = 8 sheets
    ajabiPaper: 'None',
    amount9: 0,
    deliveryDate: '2026-06-12'
  },
  {
    id: 'c2',
    clientType: 'Organization',
    clientName: 'Sheraton Addis Event Dep',
    phone: '+251115171717',
    acquisitionSource: 'Repeat',
    orderTakenBy: 'Yeabsra',
    productType: 'Velvet Card',
    quantity: 300,
    unitPrice: 120,
    advancePayment: 20000,
    paymentMethodId: 'b1',
    paperType1: 'Gold',
    amount1: 150 / 300, // 0.5 sheets per card (150 sheets total)
    paperType2: 'Silver',
    amount2: 150 / 300, // 0.5 sheets per card (150 sheets total)
    paperType3: 'White wave',
    amount3: 100 / 300, // ~0.33 sheets per card (100 sheets total)
    entrancePaper: 'None',
    amount16: 0,
    ajabiPaper: 'Ajabi Paper',
    amount9: 180, // 180 pieces total / 9 = 20 sheets
    deliveryDate: '2026-06-20'
  },
  {
    id: 'c3',
    clientType: 'Individual',
    clientName: 'Yonas Kassa',
    phone: '+251912556677',
    acquisitionSource: 'Instagram',
    orderTakenBy: 'Yordanos',
    productType: 'Sliding Card',
    quantity: 200,
    unitPrice: 95,
    advancePayment: 10000,
    paymentMethodId: 'b2',
    paperType1: 'Small flower',
    amount1: 100 / 200, // 0.5 sheets per card (100 sheets total)
    paperType2: 'White wave',
    amount2: 50 / 200, // 0.25 sheets per card (50 sheets total)
    paperType3: 'None',
    amount3: 0,
    entrancePaper: 'Entrance Paper',
    amount16: 64, // 64 pieces / 16 = 4 sheets
    ajabiPaper: 'None',
    amount9: 0,
    deliveryDate: '2026-06-15'
  },
  {
    id: 'c4',
    clientType: 'Individual',
    clientName: 'Lidya Girma',
    phone: '+251920334455',
    acquisitionSource: 'Telegram',
    orderTakenBy: 'Bereket',
    productType: 'Acrylic Card',
    quantity: 100,
    unitPrice: 150,
    advancePayment: 15000, // Fully Paid (X = 100*150 = 15000, I = 15000, V = 0)
    paymentMethodId: 'b2',
    paperType1: 'Kraft Matte',
    amount1: 80 / 100, // 0.8 sheets per card (80 sheets total)
    paperType2: 'Gold',
    amount2: 40 / 100, // 0.4 sheets per card (40 sheets total)
    paperType3: 'None',
    amount3: 0,
    entrancePaper: 'None',
    amount16: 0,
    ajabiPaper: 'Ajabi Paper',
    amount9: 90, // 90 pieces / 9 = 10 sheets
    deliveryDate: '2026-06-10'
  },
  {
    id: 'c5',
    clientType: 'Organization',
    clientName: 'Abyssinia Corporate Solutions',
    phone: '+251116631122',
    acquisitionSource: 'Word of Mouth',
    orderTakenBy: 'Yordanos',
    productType: 'Trifold Invitation',
    quantity: 500,
    unitPrice: 75,
    advancePayment: 15000, // Total = 37500, Advance = 15000, Remaining = 22500
    paymentMethodId: 'b1',
    paperType1: 'White wave',
    amount1: 250 / 500, // 0.5 sheets per card (250 sheets total)
    paperType2: 'Silver',
    amount2: 120 / 500, // 0.24 sheets per card (120 sheets total)
    paperType3: 'Big flower',
    amount3: 50 / 500, // 0.1 sheets per card (50 sheets total)
    entrancePaper: 'Entrance Paper',
    amount16: 256, // 16 sheets
    ajabiPaper: 'Ajabi Paper',
    amount9: 270, // 30 sheets
    deliveryDate: '2026-06-25'
  },
  {
    id: 'c6',
    clientType: 'Individual',
    clientName: 'Selamawit Kebede',
    phone: '+251911445566',
    acquisitionSource: 'TikTok',
    orderTakenBy: 'Yeabsra',
    productType: 'Pocket Card',
    quantity: 120,
    unitPrice: 85,
    advancePayment: 10200, // Fully Paid (120*85 = 10200)
    paymentMethodId: 'b3',
    paperType1: 'Small flower',
    amount1: 60 / 120, // 0.5 sheets per card (60 sheets total)
    paperType2: 'None',
    amount2: 0,
    paperType3: 'None',
    amount3: 0,
    entrancePaper: 'None',
    amount16: 0,
    ajabiPaper: 'None',
    amount9: 0,
    deliveryDate: '2026-06-08'
  }
];

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

export const INITIAL_PURCHASES: Purchase[] = [
  {
    id: 'pur1',
    purchasedBy: 'Yeabsra',
    itemOrService: 'Gold foil sheets',
    quantity: 10,
    unitPrice: 150,
    purchaseDate: '2026-06-01',
    paymentMethodId: 'b1',
    totalPrice: 1500,
    notesOrDescription: 'Sourced premium quality gold foil sheets for organizing Velvet Cards',
    recordedBy: 'Bereket',
    expenseCategory: 'Raw Paper Stocks'
  },
  {
    id: 'pur2',
    purchasedBy: 'Bereket',
    itemOrService: 'Toner cartridges',
    quantity: 2,
    unitPrice: 1200,
    purchaseDate: '2026-06-04',
    paymentMethodId: 'b2',
    totalPrice: 2400,
    notesOrDescription: 'CMYK laser toner cartridges for high precision proofing prints',
    recordedBy: 'Bereket',
    expenseCategory: 'Consumption Supplies'
  }
];

