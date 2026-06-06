import { supabase, isSupabaseConfigured, setSupabaseValidationError } from './supabase';
import { Customer, PaperStock, BankAccount, Purchase, ExpenseCategory } from '../types';

// ============================================
// 1. PAPER STOCKS OPERATIONS
// ============================================

export async function fetchAllPaperStocks(localFallback: PaperStock[]): Promise<PaperStock[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('paper_stocks')
        .select('*');

      if (error) throw error;

      if (!data || data.length === 0) {
        // Seed Supabase if empty
        const { error: seedError } = await supabase
          .from('paper_stocks')
          .insert(localFallback);
        if (seedError) {
          console.error("Supabase paper_stocks seeding error: ", seedError.message, seedError);
          setSupabaseValidationError(`Seeding paper_stocks failed: ${seedError.message}. Did you run the SQL bootstrapping script and disable RLS?`);
        }
        return localFallback;
      }
      return data as PaperStock[];
    } catch (err: any) {
      console.error("Supabase fetchAllPaperStocks failed, falling back:", err);
      setSupabaseValidationError(`Database Query Error: ${err?.message || String(err)}. Check if you pasted and executed the bootstrapping script in your Supabase SQL Editor.`);
    }
  }
  return localFallback;
}

export async function savePaperStockDoc(stock: PaperStock): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('paper_stocks')
        .upsert(stock);
      if (error) throw error;
    } catch (err) {
      console.error("Supabase savePaperStockDoc failed:", err);
    }
  }
}

export async function deletePaperStockDoc(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('paper_stocks')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error("Supabase deletePaperStockDoc failed:", err);
    }
  }
}

// ============================================
// 2. CUSTOMERS OPERATIONS
// ============================================

export async function fetchAllCustomers(localFallback: Customer[]): Promise<Customer[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*');

      if (error) throw error;

      if (!data || data.length === 0) {
        const { error: seedError } = await supabase
          .from('customers')
          .insert(localFallback);
        if (seedError) {
          console.error("Supabase customers seeding error: ", seedError.message, seedError);
          setSupabaseValidationError(`Seeding customers failed: ${seedError.message}`);
        }
        return localFallback;
      }
      return data as Customer[];
    } catch (err: any) {
      console.error("Supabase fetchAllCustomers failed, falling back:", err);
      setSupabaseValidationError(`Database Query Error: ${err?.message || String(err)}`);
    }
  }
  return localFallback;
}

export async function saveCustomerDoc(customer: Customer): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('customers')
        .upsert(customer);
      if (error) throw error;
    } catch (err) {
      console.error("Supabase saveCustomerDoc failed:", err);
    }
  }
}

export async function deleteCustomerDoc(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error("Supabase deleteCustomerDoc failed:", err);
    }
  }
}

// ============================================
// 3. BANK ACCOUNTS OPERATIONS
// ============================================

export async function fetchAllBankAccounts(localFallback: BankAccount[]): Promise<BankAccount[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*');

      if (error) throw error;

      if (!data || data.length === 0) {
        const { error: seedError } = await supabase
          .from('bank_accounts')
          .insert(localFallback);
        if (seedError) {
          console.error("Supabase bank_accounts seeding error: ", seedError.message, seedError);
          setSupabaseValidationError(`Seeding bank_accounts failed: ${seedError.message}`);
        }
        return localFallback;
      }
      return data as BankAccount[];
    } catch (err: any) {
      console.error("Supabase fetchAllBankAccounts failed, falling back:", err);
      setSupabaseValidationError(`Database Query Error: ${err?.message || String(err)}`);
    }
  }
  return localFallback;
}

export async function saveBankAccountDoc(account: BankAccount): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('bank_accounts')
        .upsert(account);
      if (error) throw error;
    } catch (err) {
      console.error("Supabase saveBankAccountDoc failed:", err);
    }
  }
}

export async function deleteBankAccountDoc(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error("Supabase deleteBankAccountDoc failed:", err);
    }
  }
}

// ============================================
// 4. PURCHASES OPERATIONS
// ============================================

export async function fetchAllPurchases(localFallback: Purchase[]): Promise<Purchase[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('*');

      if (error) throw error;

      if (!data || data.length === 0) {
        const { error: seedError } = await supabase
          .from('purchases')
          .insert(localFallback);
        if (seedError) {
          console.error("Supabase purchases seeding error: ", seedError.message, seedError);
          setSupabaseValidationError(`Seeding purchases failed: ${seedError.message}`);
        }
        return localFallback;
      }
      return data as Purchase[];
    } catch (err: any) {
      console.error("Supabase fetchAllPurchases failed, falling back:", err);
      setSupabaseValidationError(`Database Query Error: ${err?.message || String(err)}`);
    }
  }
  return localFallback;
}

export async function savePurchaseDoc(purchase: Purchase): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('purchases')
        .upsert(purchase);
      if (error) throw error;
    } catch (err) {
      console.error("Supabase savePurchaseDoc failed:", err);
    }
  }
}

export async function deletePurchaseDoc(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('purchases')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error("Supabase deletePurchaseDoc failed:", err);
    }
  }
}

// ============================================
// 5. EXPENSE CATEGORIES OPERATIONS
// ============================================

export async function fetchAllExpenseCategories(localFallback: ExpenseCategory[]): Promise<ExpenseCategory[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*');

      if (error) throw error;

      if (!data || data.length === 0) {
        const { error: seedError } = await supabase
          .from('expense_categories')
          .insert(localFallback);
        if (seedError) {
          console.error("Supabase expense_categories seeding error: ", seedError.message, seedError);
          setSupabaseValidationError(`Seeding expense_categories failed: ${seedError.message}`);
        }
        return localFallback;
      }
      return data as ExpenseCategory[];
    } catch (err: any) {
      console.error("Supabase fetchAllExpenseCategories failed, falling back:", err);
      setSupabaseValidationError(`Database Query Error: ${err?.message || String(err)}`);
    }
  }
  return localFallback;
}

export async function saveExpenseCategoryDoc(cat: ExpenseCategory): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('expense_categories')
        .upsert(cat);
      if (error) throw error;
    } catch (err) {
      console.error("Supabase saveExpenseCategoryDoc failed:", err);
    }
  }
}
