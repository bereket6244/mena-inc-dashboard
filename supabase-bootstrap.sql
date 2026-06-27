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
  "initialBalance" numeric DEFAULT 0,
  currency text DEFAULT 'ETB'
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
  "currency" text DEFAULT 'ETB',
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

CREATE TABLE IF NOT EXISTS public.loans (
  id text PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('given', 'received')),
  "personName" text NOT NULL,
  phone text,
  "principalAmount" numeric DEFAULT 0,
  currency text DEFAULT 'ETB',
  "loanDate" text,
  "dueDate" text,
  "paymentMethodId" text,
  "interestAmount" numeric DEFAULT 0,
  notes text,
  "recordedBy" text,
  payments jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'open',
  "isDeleted" boolean DEFAULT false,
  "deletedBy" text
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
  "currency" text DEFAULT 'ETB',
  "advancePayment" numeric DEFAULT 0,
  "paymentMethodId" text,
  "paperType1" text,
  "paperType1Id" text REFERENCES public.paper_stocks(id),
  amount1 numeric DEFAULT 0,
  "paperType2" text,
  "paperType2Id" text REFERENCES public.paper_stocks(id),
  amount2 numeric DEFAULT 0,
  "paperType3" text,
  "paperType3Id" text REFERENCES public.paper_stocks(id),
  amount3 numeric DEFAULT 0,
  "entrancePaper" text,
  "entrancePaperId" text REFERENCES public.paper_stocks(id),
  amount16 numeric DEFAULT 0,
  "ajabiPaper" text,
  "ajabiPaperId" text REFERENCES public.paper_stocks(id),
  amount9 numeric DEFAULT 0,
  "deliveryDate" text,
  "advancePaymentDate" text,
  "bankRemainingId" text,
  "incompletionReason" text,
  "isVatAdded" boolean DEFAULT false,
  "baseUnitPrice" numeric DEFAULT 0,
  payments jsonb DEFAULT '[]'::jsonb,
  refunds jsonb DEFAULT '[]'::jsonb,
  "orderAdjustments" jsonb DEFAULT '[]'::jsonb
);

-- Disable Row Level Security (RLS) on each table so the web app can read and write records instantly
ALTER TABLE public.paper_stocks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.employees (
  id text PRIMARY KEY,
  name text NOT NULL,
  username text UNIQUE NOT NULL,
  password text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'employee'))
);

ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.product_types (
  id text PRIMARY KEY,
  name text UNIQUE NOT NULL
);

ALTER TABLE public.product_types DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.lead_channels (
  id text PRIMARY KEY,
  name text UNIQUE NOT NULL,
  "isDeleted" boolean DEFAULT false,
  "deletedBy" text
);

ALTER TABLE public.lead_channels DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.bank_account_adjustments (
  id text PRIMARY KEY,
  bank_account_id text,
  bank_account_name text,
  adjustment_type text,
  amount numeric DEFAULT 0,
  previous_initial_balance numeric DEFAULT 0,
  new_initial_balance numeric DEFAULT 0,
  reason text,
  edited_by text,
  edited_at text
);

ALTER TABLE public.bank_account_adjustments DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id text PRIMARY KEY,
  event_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  entity_label text,
  action text NOT NULL,
  performed_by text,
  performed_at text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;

-- Relationship columns for stock consumption. New records store stock IDs here;
-- the older paper name columns are kept only so legacy rows can still be read.
ALTER TABLE IF EXISTS public.customers ADD COLUMN IF NOT EXISTS "acquisitionSource" text;
ALTER TABLE IF EXISTS public.customers ADD COLUMN IF NOT EXISTS "paperType1Id" text REFERENCES public.paper_stocks(id);
ALTER TABLE IF EXISTS public.customers ADD COLUMN IF NOT EXISTS "paperType2Id" text REFERENCES public.paper_stocks(id);
ALTER TABLE IF EXISTS public.customers ADD COLUMN IF NOT EXISTS "paperType3Id" text REFERENCES public.paper_stocks(id);
ALTER TABLE IF EXISTS public.customers ADD COLUMN IF NOT EXISTS "entrancePaperId" text REFERENCES public.paper_stocks(id);
ALTER TABLE IF EXISTS public.customers ADD COLUMN IF NOT EXISTS "ajabiPaperId" text REFERENCES public.paper_stocks(id);
ALTER TABLE IF EXISTS public.customers ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'ETB';
ALTER TABLE IF EXISTS public.customers ADD COLUMN IF NOT EXISTS "payments" jsonb DEFAULT '[]'::jsonb;
ALTER TABLE IF EXISTS public.customers ADD COLUMN IF NOT EXISTS "refunds" jsonb DEFAULT '[]'::jsonb;
ALTER TABLE IF EXISTS public.customers ADD COLUMN IF NOT EXISTS "orderAdjustments" jsonb DEFAULT '[]'::jsonb;
ALTER TABLE IF EXISTS public.purchases ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'ETB';

INSERT INTO public.lead_channels (id, name)
VALUES
  ('lc_tiktok', 'TikTok'),
  ('lc_instagram', 'Instagram'),
  ('lc_telegram', 'Telegram'),
  ('lc_word_of_mouth', 'Word of Mouth'),
  ('lc_repeat', 'Repeat')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    "isDeleted" = false,
    "deletedBy" = null;
