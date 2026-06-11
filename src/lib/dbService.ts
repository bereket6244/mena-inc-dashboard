import { supabase, isSupabaseConfigured, setSupabaseValidationError } from './supabase';
import { Customer, PaperStock, BankAccount, Purchase, ExpenseCategory, EmployeeUser, ProductType } from '../types';

const getLeadChannelId = (name: string) =>
  `lc_${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || Date.now()}`;

// ============================================
// 1. PAPER STOCKS OPERATIONS
// ============================================

export async function fetchAllPaperStocks(localFallback: PaperStock[]): Promise<PaperStock[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('paper_stocks')
        .select('*')
        .or('isDeleted.is.null,isDeleted.eq.false')
        .order('id', { ascending: true });

      if (error) throw error;

      return (data || []) as PaperStock[];
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
      const payload: PaperStock = {
        id: stock.id,
        name: stock.name,
        initialStock: Number(stock.initialStock || 0),
        isDeleted: stock.isDeleted,
        deletedBy: stock.deletedBy,
      };

      const { error } = await supabase
        .from('paper_stocks')
        .upsert(payload, { onConflict: 'id' });

      if (error) throw error;
    } catch (err: any) {
      console.error("Supabase savePaperStockDoc failed:", err);
      setSupabaseValidationError(`Database Save Error: ${err?.message || String(err)}. Stock changes were kept locally but could not be written to Supabase.`);
      throw err;
    }
  }
}

export async function updatePaperStockDoc(stock: PaperStock): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      const payload: PaperStock = {
        id: stock.id,
        name: stock.name,
        initialStock: Number(stock.initialStock || 0),
        isDeleted: stock.isDeleted,
        deletedBy: stock.deletedBy,
      };

      const { error } = await supabase
        .from('paper_stocks')
        .update(payload)
        .eq('id', stock.id);

      if (error) throw error;
    } catch (err: any) {
      console.error("Supabase updatePaperStockDoc failed:", err);
      setSupabaseValidationError(`Database Update Error: ${err?.message || String(err)}. Stock changes were kept locally but could not be written to Supabase.`);
      throw err;
    }
  }
}

export async function deletePaperStockDoc(id: string, deletedBy?: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('paper_stocks')
        .update({ isDeleted: true, deletedBy })
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
        .select('*')
        .or('isDeleted.is.null,isDeleted.eq.false')
        .order('id', { ascending: true });

      if (error) throw error;

      return (data || []) as Customer[];
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

export async function deleteCustomerDoc(id: string, deletedBy?: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('customers')
        .update({ isDeleted: true, deletedBy })
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
        .select('*')
        .or('isDeleted.is.null,isDeleted.eq.false')
        .order('id', { ascending: true });

      if (error) throw error;

      return (data || []) as BankAccount[];
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

export async function deleteBankAccountDoc(idOrIds: string | string[], deletedBy?: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase.from('bank_accounts').update({ isDeleted: true, deletedBy });
      if (Array.isArray(idOrIds)) {
        query = query.in('id', idOrIds);
      } else {
        query = query.eq('id', idOrIds);
      }
      const { error } = await query;
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
        .select('*')
        .or('isDeleted.is.null,isDeleted.eq.false')
        .order('id', { ascending: true });

      if (error) throw error;

      return (data || []) as Purchase[];
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

export async function deletePurchaseDoc(id: string, deletedBy?: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('purchases')
        .update({ isDeleted: true, deletedBy })
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
        .select('*')
        .or('isDeleted.is.null,isDeleted.eq.false')
        .order('id', { ascending: true });

      if (error) throw error;

      return (data || []) as ExpenseCategory[];
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

export async function deleteExpenseCategoryDoc(id: string, deletedBy?: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('expense_categories')
        .update({ isDeleted: true, deletedBy })
        .eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error("Supabase deleteExpenseCategoryDoc failed:", err);
    }
  }
}

// ============================================
// 6. EMPLOYEES OPERATIONS
// ============================================

export async function fetchAllEmployees(localFallback: EmployeeUser[]): Promise<EmployeeUser[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .or('isDeleted.is.null,isDeleted.eq.false')
        .order('id', { ascending: true });

      if (error) throw error;

      return (data || []) as EmployeeUser[];
    } catch (err: any) {
      console.error("Supabase fetchAllEmployees failed, falling back:", err);
      setSupabaseValidationError(`Database Query Error: ${err?.message || String(err)}`);
    }
  }
  return localFallback;
}

export async function saveEmployeeDoc(emp: EmployeeUser): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('employees')
        .upsert(emp);
      if (error) throw error;
    } catch (err) {
      console.error("Supabase saveEmployeeDoc failed:", err);
    }
  }
}

export async function deleteEmployeeDoc(username: string, deletedBy?: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('employees')
        .update({ isDeleted: true, deletedBy })
        .eq('username', username);
      if (error) throw error;
    } catch (err) {
      console.error("Supabase deleteEmployeeDoc failed:", err);
    }
  }
}

// ============================================
// 7. PRODUCT TYPES OPERATIONS
// ============================================

export async function fetchAllProductTypes(localFallback: ProductType[]): Promise<ProductType[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('product_types')
        .select('*')
        .or('isDeleted.is.null,isDeleted.eq.false')
        .order('id', { ascending: true });

      if (error) throw error;

      return (data || []) as ProductType[];
    } catch (err: any) {
      console.error("Supabase fetchAllProductTypes failed, falling back:", err);
      setSupabaseValidationError(`Database Query Error: ${err?.message || String(err)}`);
    }
  }
  return localFallback;
}

export async function saveProductTypeDoc(prod: ProductType): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('product_types')
        .upsert(prod);
      if (error) throw error;
    } catch (err) {
      console.error("Supabase saveProductTypeDoc failed:", err);
    }
  }
}

export async function deleteProductTypeDoc(idOrIds: string | string[], deletedBy?: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      const isArray = Array.isArray(idOrIds);
      const query = supabase.from('product_types').update({ isDeleted: true, deletedBy });
      const { error } = isArray 
        ? await query.in('id', idOrIds)
        : await query.eq('id', idOrIds);
      if (error) throw error;
    } catch (err) {
      console.error("Supabase deleteProductTypeDoc failed:", err);
    }
  }
}

export async function deleteProductTypes(ids: string[], deletedBy?: string): Promise<void> {
  return deleteProductTypeDoc(ids, deletedBy);
}

// ============================================
// 8. CLIENT TYPES OPERATIONS
// ============================================

export async function fetchAllClientTypes(localFallback: any[]): Promise<any[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('client_types')
        .select('*')
        .or('isDeleted.is.null,isDeleted.eq.false')
        .order('id', { ascending: true });

      if (error) throw error;

      return (data || []) as any[];
    } catch (err: any) {
      console.error("Supabase fetchAllClientTypes failed, falling back:", err);
      setSupabaseValidationError(`Database Query Error: ${err?.message || String(err)}`);
    }
  }
  return localFallback;
}

export async function saveClientTypeDoc(type: any): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('client_types')
        .upsert(type);
      if (error) throw error;
    } catch (err) {
      console.error("Supabase saveClientTypeDoc failed:", err);
    }
  }
}

export async function deleteClientTypes(ids: string[], deletedBy?: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('client_types')
        .update({ isDeleted: true, deletedBy })
        .in('id', ids);
      if (error) throw error;
    } catch (err) {
      console.error("Supabase deleteClientTypes failed:", err);
    }
  }
}

// ============================================
// 9. LEAD CHANNEL OPERATIONS
// ============================================

export async function fetchAllLeadChannels(localFallback: string[]): Promise<string[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('lead_channels')
        .select('*')
        .or('isDeleted.is.null,isDeleted.eq.false')
        .order('name', { ascending: true });

      if (error) throw error;

      const names = (data || [])
        .map((row: any) => row.name)
        .filter((name: any): name is string => typeof name === 'string' && name.trim().length > 0);

      return names.length > 0 ? names : localFallback;
    } catch (err: any) {
      console.error("Supabase fetchAllLeadChannels failed, falling back:", err);
      setSupabaseValidationError(`Database Query Error: ${err?.message || String(err)}`);
    }
  }
  return localFallback;
}

export async function saveLeadChannelDoc(name: string): Promise<void> {
  const cleaned = name.trim();
  if (!cleaned) return;

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('lead_channels')
        .upsert({
          id: getLeadChannelId(cleaned),
          name: cleaned,
          isDeleted: false,
          deletedBy: null,
        }, { onConflict: 'name' });
      if (error) throw error;
    } catch (err: any) {
      console.error("Supabase saveLeadChannelDoc failed:", err);
      setSupabaseValidationError(`Database Save Error: ${err?.message || String(err)}`);
      throw err;
    }
  }
}

export async function deleteLeadChannels(names: string[], deletedBy?: string): Promise<void> {
  const cleanedNames = names.map(name => name.trim()).filter(Boolean);
  if (cleanedNames.length === 0) return;

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('lead_channels')
        .update({ isDeleted: true, deletedBy })
        .in('name', cleanedNames);
      if (error) throw error;
    } catch (err: any) {
      console.error("Supabase deleteLeadChannels failed:", err);
      setSupabaseValidationError(`Database Save Error: ${err?.message || String(err)}`);
      throw err;
    }
  }
}
