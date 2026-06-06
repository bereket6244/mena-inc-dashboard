-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.paper_stocks (
  id text PRIMARY KEY,
  name text NOT NULL,
  "initialStock" numeric DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id text PRIMARY KEY,
  name text NOT NULL,
  "accountNumber" text,
  "initialBalance" numeric DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.expense_categories (
  id text PRIMARY KEY,
  name text NOT NULL,
  items jsonb DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS public.purchases (
  id text PRIMARY KEY,
  "purchasedBy" text,
  "itemOrService" text,
  quantity numeric DEFAULT 0,
  "unitPrice" numeric DEFAULT 0,
  "purchaseDate" text,
  "paymentMethodId" text,
  "totalPrice" numeric DEFAULT 0,
  "notesOrDescription" text,
  "recordedBy" text,
  "expenseCategory" text,
  "hasVat" boolean DEFAULT false,
  "vatAmount" numeric DEFAULT 0,
  "hasWithholding" boolean DEFAULT false,
  "withholdingAmount" numeric DEFAULT 0,
  "baseAmount" numeric DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.customers (
  id text PRIMARY KEY,
  "clientType" text,
  "clientName" text,
  phone text,
  "acquisitionSource" text,
  "orderTakenBy" text,
  "productType" text,
  quantity numeric DEFAULT 0,
  "unitPrice" numeric DEFAULT 0,
  "advancePayment" numeric DEFAULT 0,
  "paymentMethodId" text,
  "paperType1" text,
  amount1 numeric DEFAULT 0,
  "paperType2" text,
  amount2 numeric DEFAULT 0,
  "paperType3" text,
  amount3 numeric DEFAULT 0,
  "entrancePaper" text,
  amount16 numeric DEFAULT 0,
  "ajabiPaper" text,
  amount9 numeric DEFAULT 0,
  "deliveryDate" text,
  "advancePaymentDate" text,
  "bankRemainingId" text,
  "incompletionReason" text,
  "isVatAdded" boolean DEFAULT false,
  "baseUnitPrice" numeric DEFAULT 0
);

-- Disable Row Level Security (RLS) on each table so the web app can read and write records instantly
ALTER TABLE public.paper_stocks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.employees (
  id text PRIMARY KEY,
  name text NOT NULL,
  username text UNIQUE NOT NULL,
  password text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'employee'))
);

ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;

