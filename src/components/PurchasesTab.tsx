import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Calendar, 
  DollarSign, 
  User, 
  FileText, 
  FolderPlus, 
  Tag, 
  CheckSquare, 
  X, 
  Sparkles,
  ArrowUpDown, 
  Briefcase,
  Layers,
  Banknote,
  PlusCircle,
  Check,
  Lock,
  ArrowRight,
  Calculator,
  Percent,
  Download
} from 'lucide-react';

import { Purchase, ExpenseCategory, BankAccount, EmployeeUser } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import SearchableSelect from './SearchableSelect';

interface PurchasesTabProps {
  purchases: Purchase[];
  onUpdatePurchases: (updated: Purchase[]) => void;
  categories: ExpenseCategory[];
  onUpdateCategories: (updated: ExpenseCategory[]) => void;
  bankAccounts: BankAccount[];
  currentUser: EmployeeUser | null;
}

export default function PurchasesTab({
  purchases,
  onUpdatePurchases,
  categories,
  onUpdateCategories,
  bankAccounts,
  currentUser
}: PurchasesTabProps) {
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchWrapperRef = useRef<HTMLDivElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');
  const [selectedBankFilter, setSelectedBankFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<keyof Purchase>('purchaseDate');
  const [isSortAsc, setIsSortAsc] = useState(false);

  // Form management for custom Purchase
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);

  // New item from search suggestion flow state
  const [addingNewItemFromSearch, setAddingNewItemFromSearch] = useState<string | null>(null);

  // Lock body scroll when purchases form is open
  useEffect(() => {
    if (isFormOpen || addingNewItemFromSearch !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFormOpen, addingNewItemFromSearch]);

  // Focus search input on expansion
  useEffect(() => {
    if (isSearchExpanded) {
      if (searchInputRef.current) searchInputRef.current.focus();
      if (mobileSearchInputRef.current) mobileSearchInputRef.current.focus();
    }
  }, [isSearchExpanded]);

  // Click outside search container should close it if query is empty
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      let outsideDesktop = true;
      let outsideMobile = true;
      if (searchWrapperRef.current && searchWrapperRef.current.contains(e.target as Node)) {
        outsideDesktop = false;
      }
      if (mobileSearchWrapperRef.current && mobileSearchWrapperRef.current.contains(e.target as Node)) {
        outsideMobile = false;
      }
      if (outsideDesktop && outsideMobile && !searchQuery) {
        setIsSearchExpanded(false);
      }
    };
    if (isSearchExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSearchExpanded, searchQuery]);

  // Handle escape key to close search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSearchExpanded(false);
      }
    };
    if (isSearchExpanded) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSearchExpanded]);

  // Purchase Form inputs
  const [purchasedBy, setPurchasedBy] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [itemOrServiceInput, setItemOrServiceInput] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [unitPrice, setUnitPrice] = useState(0);
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [notesOrDescription, setNotesOrDescription] = useState('');
  const [recordedBy, setRecordedBy] = useState('');

  // Tax and Withholding states inside form
  const [hasVat, setHasVat] = useState(false);
  const [hasWithholding, setHasWithholding] = useState(false);

  // Autocomplete Suggestions State
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);

  // Batch purchase creation state
  interface PendingPurchaseItem {
    tempId: string;
    itemOrService: string;
    expenseCategory: string;
    quantity: number;
    unitPrice: number;
    hasVat: boolean;
    vatAmount: number;
    hasWithholding: boolean;
    withholdingAmount: number;
    baseAmount: number;
    totalPrice: number;
    notesOrDescription: string;
  }
  const [pendingBatchItems, setPendingBatchItems] = useState<PendingPurchaseItem[]>([]);

  // Category Configuration inputs
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [activeCategoryIdForNewItem, setActiveCategoryIdForNewItem] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');

  // Category inline editing states (Make categories editable)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryNameValue, setEditCategoryNameValue] = useState('');

  // Mobile categories collapse
  const [isMobileCategoriesCollapsed, setIsMobileCategoriesCollapsed] = useState(true);

  // New item from search suggestion flow state
  const [newItemTargetCategory, setNewItemTargetCategory] = useState<string>('');
  const [isNewCategoryModeInModal, setIsNewCategoryModeInModal] = useState(false);
  const [modalNewCategoryName, setModalNewCategoryName] = useState('');

  // Selection for bulk actions
  const [selectedPurchaseIds, setSelectedPurchaseIds] = useState<string[]>([]);
  const [deletingPurchaseId, setDeletingPurchaseId] = useState<string | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<ExpenseCategory | null>(null);

  const isAdmin = currentUser?.role === 'admin';

  // Listen for clicks outside suggestions box to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Pre-populate user persona name on opening of modal
  useEffect(() => {
    if (isFormOpen && !editingPurchase) {
      setPurchasedBy(currentUser?.name || '');
      setRecordedBy(currentUser?.name || '');
    }
  }, [isFormOpen, editingPurchase, currentUser]);

  // Toggle sorting
  const handleSort = (field: keyof Purchase) => {
    if (sortBy === field) {
      setIsSortAsc(!isSortAsc);
    } else {
      setSortBy(field);
      setIsSortAsc(true);
    }
  };

  // Open Form for addition
  const handleOpenAddForm = () => {
    setEditingPurchase(null);
    setPendingBatchItems([]); // reset batch creation
    setPurchasedBy(currentUser?.name || '');
    setExpenseCategory(categories[0]?.name || '');
    setItemOrServiceInput('');
    setQuantity(0);
    setUnitPrice(0);
    setHasVat(false);
    setHasWithholding(false);
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setPaymentMethodId(bankAccounts[0]?.id || 'b1');
    setNotesOrDescription('');
    setRecordedBy(currentUser?.name || '');
    setIsFormOpen(true);
  };

  // Open Form for editing
  const handleOpenEditForm = (p: Purchase) => {
    setEditingPurchase(p);
    setPendingBatchItems([]); // batch mode unavailable during editing
    setPurchasedBy(p.purchasedBy);
    setExpenseCategory(p.expenseCategory);
    setItemOrServiceInput(p.itemOrService);
    setQuantity(p.quantity);
    setUnitPrice(p.unitPrice);
    
    // Support pre-populating historical custom tax items
    setHasVat(!!p.hasVat);
    setHasWithholding(!!p.hasWithholding);
    
    setPurchaseDate(p.purchaseDate);
    setPaymentMethodId(p.paymentMethodId);
    setNotesOrDescription(p.notesOrDescription);
    setRecordedBy(p.recordedBy);
    setIsFormOpen(true);
  };

  // Extract all catalog subitems across all categories
  const allCatalogItems = categories.flatMap(cat => 
    cat.items.map(it => ({
      name: it,
      categoryName: cat.name
    }))
  );

  const isExactItemMatchedFromCatalog = allCatalogItems.some(
    catItem => catItem.name.toLowerCase() === itemOrServiceInput.trim().toLowerCase()
  );

  const hasExactSuggestionMatch = allCatalogItems.some(
    item => item.name.toLowerCase() === itemOrServiceInput.trim().toLowerCase()
  );

  // Suggestions filtered by what user is currently typing
  const filteredSuggestions = itemOrServiceInput.trim()
    ? allCatalogItems.filter(item => 
        item.name.toLowerCase().includes(itemOrServiceInput.toLowerCase())
      )
    : [];

  const handleSuggestionClick = (itemName: string, categoryName: string) => {
    setItemOrServiceInput(itemName);
    setExpenseCategory(categoryName);
    setShowSuggestions(false);
  };

  // Auto detect category if user typed text exactly matches a catalog item
  const handleItemInputChange = (text: string) => {
    setItemOrServiceInput(text);
    setShowSuggestions(true);
    
    const exactMatch = allCatalogItems.find(
      catItem => catItem.name.toLowerCase() === text.trim().toLowerCase()
    );
    if (exactMatch) {
      setExpenseCategory(exactMatch.categoryName);
    }
  };

  // Tax math breakdown for single item
  const baseAmount = quantity * unitPrice;
  const vatAmount = hasVat ? baseAmount * 0.15 : 0;
  const withholdingAmount = hasWithholding ? baseAmount * 0.03 : 0;
  const currentCalculatedTotalPrice = baseAmount + vatAmount - withholdingAmount;

  // Add Item to current Batch (temporary list)
  const handleAddCurrentRowToBatch = () => {
    const finalItemName = itemOrServiceInput.trim();
    if (!finalItemName) {
      alert('Please specify the Item or Service purchased.');
      return;
    }
    if (quantity <= 0) {
      alert('Quantity must be greater than zero.');
      return;
    }
    if (unitPrice < 0) {
      alert('Unit Price cannot be negative.');
      return;
    }

    const calculatedBase = quantity * unitPrice;
    const calculatedVat = hasVat ? calculatedBase * 0.15 : 0;
    const calculatedWithholding = hasWithholding ? calculatedBase * 0.03 : 0;
    const calculatedTotal = calculatedBase + calculatedVat - calculatedWithholding;

    const newBatchItem: PendingPurchaseItem = {
      tempId: `tmp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      itemOrService: finalItemName,
      expenseCategory: expenseCategory || categories[0]?.name || 'Uncategorized',
      quantity,
      unitPrice,
      hasVat,
      vatAmount: calculatedVat,
      hasWithholding,
      withholdingAmount: calculatedWithholding,
      baseAmount: calculatedBase,
      totalPrice: calculatedTotal,
      notesOrDescription: notesOrDescription.trim()
    };

    setPendingBatchItems(prev => [...prev, newBatchItem]);

    // Track state of dynamic catalog addition safely if custom item typed
    const existingInCatalog = allCatalogItems.some(
      item => item.name.toLowerCase() === finalItemName.toLowerCase()
    );
    if (!existingInCatalog && finalItemName) {
      const targetCat = expenseCategory || categories[0]?.name;
      const updatedCats = categories.map(c => {
        if (c.name === targetCat && !c.items.includes(finalItemName)) {
          return { ...c, items: [...c.items, finalItemName] };
        }
        return c;
      });
      onUpdateCategories(updatedCats);
    }

    // Reset item level form inputs for next catalog item
    setItemOrServiceInput('');
    setQuantity(0);
    setUnitPrice(0);
    setHasVat(false);
    setHasWithholding(false);
    setNotesOrDescription('');
  };

  // Remove individual row from Batch
  const handleRemoveItemFromBatch = (tempId: string) => {
    setPendingBatchItems(prev => prev.filter(item => item.tempId !== tempId));
  };

  // Save changes/Commit Purchases
  const handleSavePurchase = (e: React.FormEvent) => {
    e.preventDefault();

    const finalItemName = itemOrServiceInput.trim();
    let allItemsToSave = [...pendingBatchItems];

    // If there is a partially drafted item in the form, append it to the batch automatically
    if (finalItemName) {
      if (quantity <= 0) {
        alert('Quantity must be greater than zero for the pending item.');
        return;
      }
      if (unitPrice < 0) {
        alert('Unit Price cannot be negative for the pending item.');
        return;
      }

      const calculatedBase = quantity * unitPrice;
      const calculatedVat = hasVat ? calculatedBase * 0.15 : 0;
      const calculatedWithholding = hasWithholding ? calculatedBase * 0.03 : 0;
      const calculatedTotal = calculatedBase + calculatedVat - calculatedWithholding;

      const newBatchItem: PendingPurchaseItem = {
        tempId: `tmp-${Date.now()}-auto`,
        itemOrService: finalItemName,
        expenseCategory: expenseCategory || categories[0]?.name || 'Uncategorized',
        quantity,
        unitPrice,
        hasVat,
        vatAmount: calculatedVat,
        hasWithholding,
        withholdingAmount: calculatedWithholding,
        baseAmount: calculatedBase,
        totalPrice: calculatedTotal,
        notesOrDescription: notesOrDescription.trim()
      };
      
      allItemsToSave.push(newBatchItem);

      // Track dynamic additions for the automatically added item
      const existingInCatalog = allCatalogItems.some(
        item => item.name.toLowerCase() === finalItemName.toLowerCase()
      );
      if (!existingInCatalog) {
        const targetCat = expenseCategory || categories[0]?.name;
        const updatedCats = categories.map(c => {
          if (c.name === targetCat && !c.items.includes(finalItemName)) {
            return { ...c, items: [...c.items, finalItemName] };
          }
          return c;
        });
        onUpdateCategories(updatedCats);
      }
    }

    // If we have items in the batch (including the auto-added one)
    if (allItemsToSave.length > 0) {
      if (editingPurchase && allItemsToSave.length === 1) {
        // We are editing a single purchase
        const item = allItemsToSave[0];
        const shopperWorkerName = isAdmin ? purchasedBy.trim() : currentUser?.name;
        const loggerWorkerName = isAdmin ? recordedBy.trim() : currentUser?.name;

        const updated = purchases.map(p => {
          if (p.id === editingPurchase.id) {
            return {
              ...p,
              purchasedBy: shopperWorkerName || p.purchasedBy,
              itemOrService: item.itemOrService,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              purchaseDate,
              paymentMethodId,
              totalPrice: item.totalPrice,
              notesOrDescription: item.notesOrDescription,
              recordedBy: loggerWorkerName || p.recordedBy,
              expenseCategory: item.expenseCategory,
              hasVat: item.hasVat,
              vatAmount: item.vatAmount,
              hasWithholding: item.hasWithholding,
              withholdingAmount: item.withholdingAmount,
              baseAmount: item.baseAmount
            };
          }
          return p;
        });
        onUpdatePurchases(updated);
      } else {
        // We are creating new purchases
        const newItemsToCommit: Purchase[] = allItemsToSave.map((item, idx) => ({
          id: `pur-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
          purchasedBy: (isAdmin ? purchasedBy.trim() : currentUser?.name) || 'Staff',
          itemOrService: item.itemOrService,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          purchaseDate,
          paymentMethodId,
          totalPrice: item.totalPrice,
          notesOrDescription: item.notesOrDescription || 'Batch item',
          recordedBy: (isAdmin ? recordedBy.trim() : currentUser?.name) || 'Admin',
          expenseCategory: item.expenseCategory,
          hasVat: item.hasVat,
          vatAmount: item.vatAmount,
          hasWithholding: item.hasWithholding,
          withholdingAmount: item.withholdingAmount,
          baseAmount: item.baseAmount
        }));

        onUpdatePurchases([...purchases, ...newItemsToCommit]);
      }
      
      setPendingBatchItems([]);
      setIsFormOpen(false);
      return;
    }

    // If nothing was entered at all
    alert('Please specify the Item or Service purchased.');
    return;

  };

  // Delete single purchase
  const handleDeleteSingle = (id: string) => {
    const remaining = purchases.filter(p => p.id !== id);
    onUpdatePurchases(remaining);
    setSelectedPurchaseIds(prev => prev.filter(pId => pId !== id));
    setDeletingPurchaseId(null);
  };

  // Delete selected purchases (bulk delete)
  const handleBulkDelete = () => {
    const remaining = purchases.filter(p => !selectedPurchaseIds.includes(p.id));
    onUpdatePurchases(remaining);
    setSelectedPurchaseIds([]);
  };

  // --- EDITABLE CATEGORIES AND CASCADE CONTROLS ---

  // Initiate category rename
  const handleStartRenameCategory = (cat: ExpenseCategory) => {
    setEditingCategoryId(cat.id);
    setEditCategoryNameValue(cat.name);
  };

  // Commit category rename
  const handleRenameCategorySave = (catId: string) => {
    if (!editCategoryNameValue.trim()) return;
    const trimmedNewName = editCategoryNameValue.trim();
    const targetCat = categories.find(c => c.id === catId);
    if (!targetCat) return;
    const oldName = targetCat.name;

    // Check duplicate check
    if (oldName.toLowerCase() !== trimmedNewName.toLowerCase() &&
        categories.some(c => c.name.toLowerCase() === trimmedNewName.toLowerCase())) {
      alert(`Category "${trimmedNewName}" already exists on record.`);
      return;
    }

    // 1. Rename category in categories state
    const renamedCategories = categories.map(c => 
      c.id === catId ? { ...c, name: trimmedNewName } : c
    );
    onUpdateCategories(renamedCategories);

    // 2. Cascade rename matching entries in the purchase ledger
    const cascadePurchases = purchases.map(p => 
      p.expenseCategory === oldName ? { ...p, expenseCategory: trimmedNewName } : p
    );
    onUpdatePurchases(cascadePurchases);

    setEditingCategoryId(null);
  };

  // safe delete a category
  const handleDeleteCategory = (cat: ExpenseCategory) => {
    setDeletingCategory(cat);
  };

  // Add a new Category
  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    
    const trimmed = newCategoryName.trim();
    if (categories.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
      alert('This expense category already exists.');
      return;
    }

    const newCat: ExpenseCategory = {
      id: `cat-${Date.now()}`,
      name: trimmed,
      items: []
    };

    onUpdateCategories([...categories, newCat]);
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  // Add Item to chosen Category
  const handleAddItemToCategory = (catId: string) => {
    if (!newItemName.trim()) return;
    const trimmed = newItemName.trim();

    const updated = categories.map(c => {
      if (c.id === catId) {
        if (c.items.some(it => it.toLowerCase() === trimmed.toLowerCase())) {
          return c;
        }
        return {
          ...c,
          items: [...c.items, trimmed]
        };
      }
      return c;
    });

    onUpdateCategories(updated);
    setNewItemName('');
    setActiveCategoryIdForNewItem(null);
  };

  // Trigger add item setup from suggestions
  const handleTriggerAddNewItemFlow = () => {
    if (!itemOrServiceInput.trim()) return;
    setAddingNewItemFromSearch(itemOrServiceInput.trim());
    setNewItemTargetCategory(categories[0]?.id || '');
    setIsNewCategoryModeInModal(false);
    setModalNewCategoryName('');
    setShowSuggestions(false);
  };

  // Commit item and possible new category from search suggestion
  const handleSaveNewItemFromSearch = () => {
    if (!addingNewItemFromSearch) return;

    let finalCategoryName = '';

    if (isNewCategoryModeInModal) {
      const trimmedCat = modalNewCategoryName.trim();
      if (!trimmedCat) {
        alert('Please enter a category name.');
        return;
      }
      const existingCat = categories.find(c => c.name.toLowerCase() === trimmedCat.toLowerCase());
      if (existingCat) {
        finalCategoryName = existingCat.name;
        const updated = categories.map(c => {
          if (c.id === existingCat.id) {
            if (!c.items.some(it => it.toLowerCase() === addingNewItemFromSearch.toLowerCase())) {
              return { ...c, items: [...c.items, addingNewItemFromSearch] };
            }
          }
          return c;
        });
        onUpdateCategories(updated);
      } else {
        const newCat: ExpenseCategory = {
          id: `cat-${Date.now()}`,
          name: trimmedCat,
          items: [addingNewItemFromSearch]
        };
        onUpdateCategories([...categories, newCat]);
        finalCategoryName = trimmedCat;
      }
    } else {
      const matchedCategory = categories.find(c => c.id === newItemTargetCategory);
      if (!matchedCategory) {
        alert('Please select a valid category.');
        return;
      }
      finalCategoryName = matchedCategory.name;
      
      const updated = categories.map(c => {
        if (c.id === matchedCategory.id) {
          if (!c.items.some(it => it.toLowerCase() === addingNewItemFromSearch.toLowerCase())) {
            return { ...c, items: [...c.items, addingNewItemFromSearch] };
          }
        }
        return c;
      });
      onUpdateCategories(updated);
    }

    setItemOrServiceInput(addingNewItemFromSearch);
    setExpenseCategory(finalCategoryName);
    setAddingNewItemFromSearch(null);
  };

  // Filter Purchase Records
  const filteredPurchases = purchases.filter(p => {
    const matchesCategory = selectedCategoryFilter === 'All' || p.expenseCategory === selectedCategoryFilter;
    const matchesBank = selectedBankFilter === 'All' || p.paymentMethodId === selectedBankFilter;
    
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      p.purchasedBy.toLowerCase().includes(searchLower) ||
      p.itemOrService.toLowerCase().includes(searchLower) ||
      p.expenseCategory.toLowerCase().includes(searchLower) ||
      (p.notesOrDescription && p.notesOrDescription.toLowerCase().includes(searchLower)) ||
      p.recordedBy.toLowerCase().includes(searchLower);

    return matchesCategory && matchesBank && matchesSearch;
  });

  // Sort Purchase Records
  const sortedPurchases = [...filteredPurchases].sort((a, b) => {
    let valA = a[sortBy];
    let valB = b[sortBy];

    if (typeof valA === 'string' && typeof valB === 'string') {
      return isSortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    
    return isSortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
  });

  const totalExpenseAmount = filteredPurchases.reduce((sum, p) => sum + p.totalPrice, 0);

  return (
    <div className="space-y-6  animate-fadeIn" id="purchases-tab-pnl">
      
      {/* Dynamic Summary Ribbon */}
      <div className="bg-[#121212] border border-[#262626] rounded-md p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-sans font-extrabold text-white uppercase tracking-widest flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-[#ee317b]" />
            Business Expenses &amp; Purchases Ledger
          </h2>

        </div>

        <div className="flex items-center gap-4">




          <button
            type="button"
            onClick={handleOpenAddForm}
            className="px-4 py-2.5 bg-[#ee317b] hover:bg-[#d61e63] text-white text-xs font-sans font-bold cursor-pointer transition-colors flex items-center gap-1.5 rounded-md"
          >
            <Plus className="w-4 h-4" />
            Add Bulk Purchases
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        
        {/* Left Side: Expense Categories Sidebar Layout */}
        <div className="xl:col-span-1 space-y-4">
          <div className="bg-[#121212] border border-[#262626] p-4 rounded-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-sans font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#ee317b]" />
                Expense Categories
              </h3>
              
              <div className="flex items-center gap-1.5">
                {!isAddingCategory ? (
                  <button
                    type="button"
                    onClick={() => setIsAddingCategory(true)}
                    className="p-1 bg-[#181818] border border-[#262626] text-stone-300 hover:text-white cursor-pointer transition-colors"
                    title="Add New Category"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingCategory(false)}
                    className="p-1 text-gray-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3 h-4" />
                  </button>
                )}

                {/* Mobile Collapse Trigger */}
                <button
                  type="button"
                  onClick={() => setIsMobileCategoriesCollapsed(!isMobileCategoriesCollapsed)}
                  className="xl:hidden px-2 py-1 text-[10px] font-sans font-extrabold tracking-wider bg-[#1c1c1c] text-white hover:bg-[#262626] hover:text-[#ee317b] border border-[#262626] transition-colors uppercase"
                >
                  {isMobileCategoriesCollapsed ? "Expand" : "Collapse"}
                </button>
              </div>
            </div>

            {/* Collapsible area on mobile */}
            <div className={`${isMobileCategoriesCollapsed ? 'hidden xl:block' : 'block'} space-y-4 animate-fadeIn`}>
              {/* Quick add category form */}
              <AnimatePresence>
                {isAddingCategory && (
                  <motion.form 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    onSubmit={handleCreateCategory}
                    className="bg-[#181818] border border-[#262626] p-3 space-y-2 overflow-hidden"
                  >
                    <label className="block text-[10px] text-gray-400 uppercase tracking-wider">New Category Name</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="flex-1 px-2 py-1 text-xs bg-[#101010] border border-[#262626] rounded-md focus:border-[#ee317b] text-white"
                        placeholder="e.g. Rent & Utilities"
                      />
                      <button
                        type="submit"
                        className="px-2.5 bg-[#71b536] text-white hover:bg-[#5a932a] text-xs font-sans font-bold cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* List of Categories and their Subitems (Fully Editable) */}
              <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
                {categories.map((cat) => (
                  <div key={cat.id} className="border border-[#202020] bg-[#161616]/45 p-3 rounded-md relative">
                    
                    {/* Category Rename inline editor or standard display label */}
                    {editingCategoryId === cat.id ? (
                      <div className="flex items-center gap-1.5 bg-[#101010] p-1.5 border border-[#71b536] mb-2 font-sans">
                        <input
                          type="text"
                          value={editCategoryNameValue}
                          onChange={(e) => setEditCategoryNameValue(e.target.value)}
                          className="flex-1 px-1 py-0.5 text-xs bg-[#141414] text-white outline-none font-sans font-bold uppercase"
                        />
                        <button
                          onClick={() => handleRenameCategorySave(cat.id)}
                          className="p-1 text-emerald-400 hover:text-white"
                          title="Save rename"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingCategoryId(null)}
                          className="p-1 text-rose-400 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between mb-2 pb-1 border-b border-[#222222]">
                        <span className="text-[11px] font-sans font-bold text-white uppercase tracking-wider block truncate max-w-[150px]" title={cat.name}>
                          {cat.name}
                        </span>
                        
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartRenameCategory(cat)}
                            className="p-1 text-zinc-500 hover:text-white cursor-pointer"
                            title="Rename category"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat)}
                            className="p-1 text-zinc-650 hover:text-rose-400 cursor-pointer"
                            title="Delete category"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveCategoryIdForNewItem(
                              activeCategoryIdForNewItem === cat.id ? null : cat.id
                            )}
                            className="text-[9px] text-[#71b536] hover:text-[#5fa22e] font-sans uppercase bg-[#141414] px-1.5 py-0.5 border border-[#202020] cursor-pointer ml-1"
                          >
                            + Item
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Add subitem inside category form */}
                    {activeCategoryIdForNewItem === cat.id && (
                      <div className="mb-2 bg-[#101010] p-2 border border-[#262626] flex gap-1 items-center">
                        <input
                          type="text"
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddItemToCategory(cat.id);
                            }
                          }}
                          placeholder="New subitem..."
                          className="flex-1 px-2 py-0.5 text-[11px] bg-[#141414] border border-[#262626] text-white font-sans"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddItemToCategory(cat.id)}
                          className="px-1.5 py-0.5 bg-[#71b536] text-white text-[10px] cursor-pointer font-bold"
                        >
                          ✓
                        </button>
                      </div>
                    )}

                    {/* Subitems container - Beautifully styled with high contrast in Light theme too! */}
                    {cat.items.length === 0 ? (
                      <span className="text-[10px] text-gray-500 italic block">No items registered in template.</span>
                    ) : (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {cat.items.map((item, i) => (
                          <span 
                            key={i} 
                            className="text-[9px] bg-stone-200 dark:bg-[#222222] border border-stone-300 dark:border-[#2d2d2d] text-stone-800 dark:text-stone-300 font-sans px-2 py-0.5"
                            title="Ready for auto-fill in purchase entry"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>


            </div>
          </div>
        </div>

        {/* Right Side: Ledger Table Grid */}
        <div className="xl:col-span-3 space-y-4">
          
          {/* Mobile-only Top Search Bar */}
          <div className="md:hidden flex items-center justify-end gap-1.5 pt-1 relative w-full h-8">
            <div ref={mobileSearchWrapperRef} className="relative flex items-center h-7 select-none">
              <AnimatePresence initial={false}>
                {!(isSearchExpanded || searchQuery) ? (
                  <motion.button
                    key="search-btn"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    type="button"
                    onClick={() => setIsSearchExpanded(true)}
                    className="flex items-center justify-center p-1.5 rounded text-gray-300 hover:bg-[#181818] transition-colors cursor-pointer"
                    title="Search database"
                  >
                    <Search className="w-3.5 h-3.5" />
                  </motion.button>
                ) : (
                  <motion.div
                    key="search-input-wrapper"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 140, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 250 }}
                    className="relative flex items-center bg-transparent overflow-hidden"
                  >
                    <div className="flex items-center justify-center w-7 h-7 rounded-md bg-[#252525] text-gray-400 mr-1 flex-shrink-0">
                      <Search className="h-3.5 w-3.5" />
                    </div>
                    <input
                      ref={mobileSearchInputRef}
                      type="text"
                      placeholder="Type to search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setIsSearchExpanded(false);
                        }
                      }}
                      className="bg-transparent text-[11px] text-white border-none outline-none focus:outline-none focus:ring-0 no-focus-outline shadow-none p-0 m-0 font-sans w-20 pl-0.5"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setIsSearchExpanded(false);
                        }}
                        className="ml-1 text-gray-500 hover:text-white transition-colors focus:outline-none flex-shrink-0"
                        title="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Controls: search and filters */}
          <div className="bg-[#121212] border border-[#262626] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
               {/* Search box */}
              <div ref={searchWrapperRef} className="hidden md:flex items-center">
                {!(isSearchExpanded || searchQuery) ? (
                  <button
                    type="button"
                    onClick={() => setIsSearchExpanded(true)}
                    className="flex items-center justify-center p-1.5 rounded text-gray-300 hover:bg-[#202020] hover:text-white transition-colors cursor-pointer text-xs font-medium font-sans border border-[#262626]"
                    title="Search database"
                  >
                    <Search className="w-3.5 h-3.5 mr-1" />
                    <span>Search</span>
                  </button>
                ) : (
                  <div className="relative flex items-center bg-transparent transition-all">
                    <div className="flex items-center justify-center w-7 h-7 rounded-md bg-[#252525] text-gray-400 mr-1">
                      <Search className="h-3.5 w-3.5" />
                    </div>
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Type to search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setIsSearchExpanded(false);
                        }
                      }}
                      className="bg-transparent text-xs text-white border-none outline-none focus:outline-none focus:ring-0 no-focus-outline shadow-none p-0 m-0 font-sans w-32 focus:w-44 transition-all pl-1"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setIsSearchExpanded(false);
                        }}
                        className="ml-1.5 text-gray-500 hover:text-white transition-colors focus:outline-none"
                        title="Clear search"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Category Filter */}
              <div>
                <SearchableSelect
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-[#181818] text-gray-300 border border-[#262626] rounded-md focus:border-[#ee317b] outline-none"
                >
                  <option value="All">All Categories</option>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </SearchableSelect>
              </div>

              {/* Bank Balance Filter */}
              <div>
                <SearchableSelect
                  value={selectedBankFilter}
                  onChange={(e) => setSelectedBankFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-[#181818] text-gray-300 border border-[#262626] rounded-md focus:border-[#ee317b] outline-none"
                >
                  <option value="All">All Bank Methods</option>
                  {bankAccounts.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </SearchableSelect>
              </div>
            </div>

            {/* Multiselect helper triggers */}
            <div>
              <button 
                type="button"
                onClick={() => {
                  const allFilteredIds = sortedPurchases.map(p => p.id);
                  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedPurchaseIds.includes(id));
                  if (allSelected) {
                    setSelectedPurchaseIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
                  } else {
                    setSelectedPurchaseIds(prev => {
                      const next = [...prev];
                      allFilteredIds.forEach(id => {
                        if (!next.includes(id)) next.push(id);
                      });
                      return next;
                    });
                  }
                }}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-sans text-gray-300 bg-[#181818] hover:bg-[#262626] border border-[#262626] rounded-md cursor-pointer transition-colors"
              >
                <CheckSquare className="w-3.5 h-3.5 text-[#ee317b]" />
                {sortedPurchases.length > 0 && sortedPurchases.every(p => selectedPurchaseIds.includes(p.id))
                  ? "Deselect All Listed"
                  : `Select All Listed (${sortedPurchases.length})`}
              </button>
            </div>
          </div>

          {/* Bulk Action Ribbon */}
          {selectedPurchaseIds.length > 0 && (
            <div className="bg-[#112918] border border-[#71b536]/30 p-3 rounded-md flex items-center justify-between text-xs font-sans animate-fadeIn">
              <span className="text-[#a7f3d0] font-bold">
                ✓ {selectedPurchaseIds.length} purchase logs selected
              </span>
              <button
                type="button"
                onClick={() => setShowBulkDeleteConfirm(true)}
                className="px-3 py-1 bg-[#421A1D] hover:bg-[#5a1c21] border border-rose-950 text-rose-400 font-bold cursor-pointer text-[10px] tracking-wider uppercase transition-all"
              >
                🗑️ Delete Selected Purchases
              </button>
            </div>
          )}

          {/* Table Spreadsheet View */}
          <div className="bg-[#121212] border border-[#262626] overflow-hidden rounded-md shadow-none">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-[#262626] bg-[#181818] text-[10px] text-gray-400 font-sans uppercase tracking-wider ">
                    <th className="py-3 px-3 text-center w-12">
                      <input
                        type="checkbox"
                        checked={sortedPurchases.length > 0 && sortedPurchases.every(p => selectedPurchaseIds.includes(p.id))}
                        onChange={(e) => {
                          const allFilteredIds = sortedPurchases.map(p => p.id);
                          if (e.target.checked) {
                            setSelectedPurchaseIds(prev => {
                              const next = [...prev];
                              allFilteredIds.forEach(id => {
                                if (!next.includes(id)) next.push(id);
                              });
                              return next;
                            });
                          } else {
                            setSelectedPurchaseIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
                          }
                        }}
                        className="accent-[#71b536] cursor-pointer"
                        title="Select all page purchases"
                      />
                    </th>
                    <th className="py-3 px-4 font-semibold text-gray-400 cursor-pointer" onClick={() => handleSort('itemOrService')}>
                      Item / Service <ArrowUpDown className="w-3 h-3 inline ml-0.5" />
                    </th>
                    <th className="py-3 px-4 font-semibold text-gray-400 cursor-pointer" onClick={() => handleSort('expenseCategory')}>
                      Category <ArrowUpDown className="w-3 h-3 inline ml-0.5" />
                    </th>
                    <th className="py-3 px-3 font-semibold text-gray-400 text-right cursor-pointer text-[9px]" onClick={() => handleSort('quantity')}>
                      Qty <ArrowUpDown className="w-3 h-3 inline ml-0.5" />
                    </th>
                    <th className="py-3 px-4 font-semibold text-gray-400 text-right cursor-pointer" onClick={() => handleSort('unitPrice')}>
                      Unit P. (ETB) <ArrowUpDown className="w-3 h-3 inline ml-0.5" />
                    </th>
                    <th className="py-3 px-4 font-semibold text-gray-400 text-right cursor-pointer" onClick={() => handleSort('totalPrice')}>
                      Total Charged (ETB) <ArrowUpDown className="w-3 h-3 inline ml-0.5" />
                    </th>
                    <th className="py-3 px-4 font-semibold text-gray-400 cursor-pointer" onClick={() => handleSort('purchaseDate')}>
                      Date <ArrowUpDown className="w-3 h-3 inline ml-0.5" />
                    </th>
                    <th className="py-3 px-4 font-semibold text-gray-400">Payment Account</th>
                    <th className="py-3 px-4 font-semibold text-gray-400">Recorded By</th>
                    <th className="py-3 px-4 text-center w-32">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626] text-gray-300 font-sans text-xs">
                  {sortedPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-gray-500 font-sans leading-relaxed italic">
                        No purchase logs recorded in filter settings. Use the Add button to record ledger data.
                      </td>
                    </tr>
                  ) : (
                    sortedPurchases.map((p) => {
                      const isSelected = selectedPurchaseIds.includes(p.id);
                      const matchedBank = bankAccounts.find(b => b.id === p.paymentMethodId);
                      
                      return (
                        <tr 
                          key={p.id}
                          className={`transition-colors ${
                            isSelected ? 'bg-[#121912]/20 border-l-2 border-[#71b536]' : 'hover:bg-[#181818]'
                          }`}
                        >
                          {/* Checkbox selector */}
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedPurchaseIds(prev => [...prev, p.id]);
                                } else {
                                  setSelectedPurchaseIds(prev => prev.filter(id => id !== p.id));
                                }
                              }}
                              className="accent-[#71b536] cursor-pointer"
                            />
                          </td>

                          {/* Item/Service with smart custom tax labels if applicable */}
                          <td className="py-3 px-4 text-[#E2E8F0] select-all font-semibold font-sans">
                            <div className="flex flex-col gap-0.5">
                              <span>{p.itemOrService}</span>
                              <div className="flex flex-wrap gap-1 mt-0.5 ">
                                {p.hasVat && (
                                  <span className="text-[8px] tracking-wider uppercase bg-[#182318] text-emerald-400 border border-emerald-900/50 px-1 font-sans font-bold">
                                    +15% VAT
                                  </span>
                                )}
                                {p.hasWithholding && (
                                  <span className="text-[8px] tracking-wider uppercase bg-[#31111E] text-red-400 border border-rose-950/50 px-1 font-sans font-bold">
                                    -3% WH
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-3 px-4">
                            <span className="bg-[#24131A] text-pink-400 border border-pink-900/40 text-[10px] px-1.5 py-0.5 uppercase tracking-wide">
                              {p.expenseCategory}
                            </span>
                          </td>

                          {/* Qty */}
                          <td className="py-3 px-4 text-right font-bold text-stone-200">{p.quantity}</td>

                          {/* Unit Price */}
                          <td className="py-3 px-4 text-right text-gray-400">{Number(p.unitPrice).toLocaleString()}</td>

                          {/* Total Price */}
                          <td className="py-3 px-4 text-right text-red-400 font-bold font-sans">
                            <div className="flex flex-col items-end">
                              <span>{Number(p.totalPrice).toLocaleString()} ETB</span>
                              {p.baseAmount && (p.hasVat || p.hasWithholding) && (
                                <span className="text-[9px] text-gray-500 font-normal">
                                  Base: {p.baseAmount.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Purchase Date */}
                          <td className="py-3 px-4 text-[#71b536] text-[11px] whitespace-nowrap">{p.purchaseDate}</td>

                          {/* Payment Method */}
                          <td className="py-3 px-4 text-stone-300 font-sans font-semibold mb-1">
                            {matchedBank ? matchedBank.name : 'Unknown Account'}
                          </td>

                          {/* Recorded By */}
                          <td className="py-3 px-4 text-gray-400 font-sans text-[11px]">{p.recordedBy}</td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEditForm(p)}
                                className="text-gray-400 hover:text-[#ee317b] hover:bg-[#262626] p-1 rounded-md transition-colors cursor-pointer"
                                title="Edit Purchase Record"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingPurchaseId(p.id)}
                                className="text-gray-500 hover:text-[#F87171] hover:bg-[#262626] p-1 rounded-md transition-colors cursor-pointer"
                                title="Delete Purchase Ledger Line"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Single Delete */}
      <AnimatePresence>
        {deletingPurchaseId && (() => {
          const target = purchases.find(p => p.id === deletingPurchaseId);
          if (!target) return null;
          return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-[#121212] border border-[#ee317b]/40 max-w-md w-full p-6 text-left space-y-4"
              >
                <div className="space-y-2">
                  <h3 className="font-sans text-white font-bold uppercase tracking-wider text-sm">Discards Specific Expense</h3>
                  <p className="text-stone-400 text-xs leading-relaxed font-sans">
                    Are you sure you want to permanently delete the registered purchase entry for <strong className="text-white">"{target.itemOrService}"</strong> recorded on {target.purchaseDate} for {target.totalPrice} ETB?
                  </p>
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t border-[#262626] font-sans">
                  <button
                    type="button"
                    onClick={() => setDeletingPurchaseId(null)}
                    className="px-4 py-1.5 bg-[#1a1a1a] border border-[#2d2d2d] text-gray-300 hover:text-white hover:bg-[#232323] cursor-pointer text-xs rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSingle(deletingPurchaseId)}
                    className="px-4 py-1.5 bg-[#ee317b] hover:bg-[#d61e63] text-white font-bold cursor-pointer text-xs uppercase rounded-md"
                  >
                    Confirm Delete
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Non-blocking bulk delete confirmation modal for Purchases */}
      <AnimatePresence>
        {showBulkDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm ">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121212] border border-[#ee317b]/40 max-w-md w-full p-6 text-left space-y-4"
            >
              <div className="space-y-2">
                <h3 className="font-sans text-white font-bold uppercase tracking-wider text-sm">Discards Highlighted Purchases</h3>
                <p className="text-stone-400 text-xs leading-relaxed font-sans">
                  Are you absolutely sure you want to permanently delete the <span className="text-white font-bold font-sans">{selectedPurchaseIds.length}</span> selected purchase logs?
                </p>
                <p className="text-stone-500 text-[11px] leading-relaxed font-sans">
                  Warning: This action will permanently remove these expenses from your calculations and reports. It cannot be undone.
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-[#262626] font-sans">
                <button
                  type="button"
                  onClick={() => setShowBulkDeleteConfirm(false)}
                  className="px-4 py-1.5 bg-[#1a1a1a] border border-[#2d2d2d] text-gray-300 hover:text-white hover:bg-[#232323] cursor-pointer text-xs rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleBulkDelete();
                    setShowBulkDeleteConfirm(false);
                  }}
                  className="px-4 py-1.5 bg-[#ee317b] hover:bg-[#d61e63] text-white font-bold cursor-pointer text-xs uppercase rounded-md"
                >
                  Delete Selected
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Non-blocking custom delete modal for Expense Category */}
      <AnimatePresence>
        {deletingCategory && (() => {
          const isBound = purchases.some(p => p.expenseCategory === deletingCategory.name);
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm ">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-[#121212] border border-[#ee317b]/40 max-w-md w-full p-6 text-left space-y-4"
              >
                <div className="space-y-2">
                  <h3 className="font-sans text-white font-bold uppercase tracking-wider text-sm">Remove Expense Category</h3>
                  <p className="text-stone-400 text-xs leading-relaxed font-sans">
                    Are you sure you want to delete the expense category <strong className="text-white">"{deletingCategory.name}"</strong>?
                  </p>
                  {isBound && (
                    <p className="text-rose-400 text-[11px] leading-relaxed font-sans">
                      ⚠️ ALERT: This category is currently referenced by existing purchase logs. Deleting this category will orphan those ledger lines and they will show up under default Uncategorized layout!
                    </p>
                  )}
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t border-[#262626] font-sans">
                  <button
                    type="button"
                    onClick={() => setDeletingCategory(null)}
                    className="px-4 py-1.5 bg-[#1a1a1a] border border-[#2d2d2d] text-gray-300 hover:text-white hover:bg-[#232323] cursor-pointer text-xs rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateCategories(categories.filter(c => c.id !== deletingCategory.id));
                      setDeletingCategory(null);
                    }}
                    className="px-4 py-1.5 bg-[#ee317b] hover:bg-[#d61e63] text-white font-bold cursor-pointer text-xs uppercase rounded-md"
                  >
                    Confirm Delete
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Drawer / Right Sliding Form Modal for Add (Batch Enabled) / Edit Purchase */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-end  overscroll-contain">
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-[#121212] w-full max-w-2xl h-[100dvh] sm:h-full border-l border-[#262626] shadow-2xl overflow-hidden flex flex-col justify-between overscroll-contain"
            >
              
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#262626] bg-[#181818] flex-shrink-0">
                <div>
                  <h4 className="font-sans font-bold text-white text-sm flex items-center gap-1.5 uppercase">
                    <Sparkles className="w-4 h-4 text-[#ee317b]" />
                    {editingPurchase ? 'Edit Purchase Order' : 'Record Purchases Batch'}
                  </h4>
                  <p className="text-[10px] text-gray-400 mt-0.5 font-sans">
                    {editingPurchase ? 'Modify ledger row details.' : 'Add multiple products or services below, review the batch summary, and commit everything.'}
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="p-1 text-gray-400 hover:text-white hover:bg-[#262626] rounded-md cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Inputs Container */}
               <div className="flex-1 p-6 space-y-5 overflow-y-auto overscroll-contain">
                
                {/* BATCH CORE DETAILS (Date, Charger bank, Operator, logger) */}
                <div className="bg-stone-100 dark:bg-[#161616]/70 border border-stone-250 dark:border-[#232323] p-4 space-y-4 rounded-md">
                    <span className="text-[10px] font-sans font-extrabold text-[#71b536] uppercase tracking-widest block border-b border-stone-250 dark:border-[#222222] pb-1.5">
                      Step 1: Batch Configuration Details
                    </span>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] text-stone-600 dark:text-gray-400 font-bold uppercase tracking-widest mb-1.5">Purchase Date</label>
                        <input
                          type="date"
                          required
                          value={purchaseDate}
                          onChange={(e) => setPurchaseDate(e.target.value)}
                          className="w-full px-2.5 py-2 text-xs bg-white dark:bg-[#181818] text-stone-900 dark:text-white border border-stone-300 dark:border-[#262626] focus:border-[#ee317b] rounded-md outline-none font-sans"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-stone-600 dark:text-gray-400 font-bold uppercase tracking-widest mb-1.5">Charge Ledger Bank/Cash</label>
                        <SearchableSelect
                          value={paymentMethodId}
                          onChange={(e) => setPaymentMethodId(e.target.value)}
                          className="w-full px-2.5 py-2 text-xs bg-white dark:bg-[#181818] text-stone-900 dark:text-white border border-stone-300 dark:border-[#262626] focus:border-[#ee317b] rounded-md outline-none cursor-pointer"
                        >
                          {bankAccounts.map((b) => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </SearchableSelect>
                      </div>
                    </div>

                    {/* Personnel Inputs - ONLY RECORDED BY */}
                    <div className="grid grid-cols-1">
                      <div>
                        <label className="block text-[10px] text-stone-600 dark:text-gray-400 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1">
                          Recorded By (Logger)
                          <Lock className="w-3 h-3 text-[#ee317b]" />
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            disabled={true}
                            value={recordedBy}
                            onChange={(e) => setRecordedBy(e.target.value)}
                            className={`w-full px-2.5 py-2 text-xs border rounded-md outline-none focus:border-[#ee317b] font-sans bg-stone-50 dark:bg-[#181818]/60 text-stone-500 dark:text-zinc-500 border-stone-200 dark:border-[#222222] cursor-not-allowed`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ITEM INPUT ENGINE */}
                  <div className="border border-stone-250 dark:border-[#2d2d2d] bg-stone-50 dark:bg-[#1a1215]/30 p-4 space-y-4 rounded-md relative">
                    <span className="text-[10px] font-sans font-extrabold text-[#ee317b] uppercase tracking-widest block border-b border-stone-250 dark:border-[#2d2024] pb-1.5">
                      {editingPurchase ? 'Edit Ledger Item Parameters' : 'Step 2: Add New Item to batch'}
                    </span>

                    {/* Category input */}
                    <div>
                      <label className="block text-[10px] text-stone-600 dark:text-gray-400 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        Expense Category
                        {isExactItemMatchedFromCatalog && <Lock className="w-3 h-3 text-[#ee317b]" title="Locked to catalog item category" />}
                      </label>
                      <SearchableSelect
                        value={expenseCategory}
                        disabled={isExactItemMatchedFromCatalog}
                        onChange={(e) => setExpenseCategory(e.target.value)}
                        className={`w-full px-2.5 py-2 text-xs border rounded-md outline-none font-sans ${
                          isExactItemMatchedFromCatalog 
                            ? 'bg-stone-100 dark:bg-[#181818]/60 text-stone-500 dark:text-zinc-500 border-stone-200 dark:border-[#222222] cursor-not-allowed' 
                            : 'bg-white dark:bg-[#181818] text-stone-900 dark:text-white border border-stone-300 dark:border-[#262626] focus:border-[#ee317b] cursor-pointer'
                        }`}
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </SearchableSelect>
                    </div>

                    {/* Search Suggestive Autocompleting Item Name Input */}
                    <div className="relative">
                      <label className="block text-[10px] text-stone-600 dark:text-gray-400 font-bold uppercase tracking-widest mb-1.5">Item or Service Name (Type to Match Catalog)</label>
                      <input
                        type="text"
                        required
                        value={itemOrServiceInput}
                        onChange={(e) => handleItemInputChange(e.target.value)}
                        onFocus={() => setShowSuggestions(true)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (showSuggestions && filteredSuggestions.length > 0) {
                              e.preventDefault();
                              const topSuggestion = filteredSuggestions[0];
                              handleSuggestionClick(topSuggestion.name, topSuggestion.categoryName);
                            }
                          }
                        }}
                        className="w-full px-2.5 py-2 text-xs bg-white dark:bg-[#181818] text-stone-950 dark:text-white border border-stone-300 dark:border-[#262626] rounded-md outline-none focus:border-[#ee317b] font-sans"
                        placeholder="Type products (e.g. CMYK toner, Kraft backing...)"
                      />

                      {/* Suggestions Floating Popup Dropdown container */}
                      <AnimatePresence>
                        {showSuggestions && (filteredSuggestions.length > 0 || (itemOrServiceInput.trim() !== '' && !hasExactSuggestionMatch)) && (
                          <motion.div 
                            ref={suggestionRef}
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="absolute left-0 right-0 top-[65px] bg-white dark:bg-[#151515] border border-stone-300 dark:border-[#2d2d2d] z-50 max-h-[220px] overflow-y-auto divide-y divide-stone-200 dark:divide-[#222222] shadow-2xl cursor-pointer"
                          >
                            {filteredSuggestions.map((sug, idx) => (
                              <div
                                key={idx}
                                onClick={() => handleSuggestionClick(sug.name, sug.categoryName)}
                                className="px-3 py-2 text-xs text-stone-850 dark:text-stone-250 hover:bg-[#ee317b]/10 hover:text-[#ee317b] dark:hover:text-white flex items-center justify-between font-sans font-medium"
                              >
                                <span>{sug.name}</span>
                                <span className="text-[9px] text-[#ee317b] bg-[#ee317b]/10 dark:bg-[#31111E] px-1.5 py-0.5 border border-[#ee317b]/20 lowercase">
                                  {sug.categoryName}
                                </span>
                              </div>
                            ))}

                            {itemOrServiceInput.trim() !== '' && !hasExactSuggestionMatch && (
                              <div
                                onClick={handleTriggerAddNewItemFlow}
                                className="px-3 py-2.5 bg-[#ee317b]/5 hover:bg-[#ee317b]/10 dark:bg-[#ee317b]/10 dark:hover:bg-[#ee317b]/20 text-stone-950 dark:text-white font-sans text-xs flex items-center justify-between cursor-pointer border-t border-stone-200 dark:border-[#2d2d2d]"
                              >
                                <div className="flex items-center gap-1.5">
                                  <PlusCircle className="w-4 h-4 text-[#ee317b]" />
                                  <span>Create <strong className="text-[#ee317b]">"{itemOrServiceInput.trim()}"</strong> as a new item...</span>
                                </div>
                                <span className="text-[10px] text-[#ee317b] uppercase font-sans font-bold tracking-wider">Catalog Tool</span>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </ AnimatePresence>
                    </div>

                    {/* Quantity and Unit Price */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1.5">Quantity</label>
                        <input
                          type="number"
                          min="0"
                          required
                          value={quantity || ''}
                          onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full px-2.5 py-2 text-xs bg-[#181818] text-white border border-[#262626] rounded-md outline-none focus:border-[#ee317b] font-sans"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1.5">Unit Price (ETB)</label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          required
                          value={unitPrice || ''}
                          onChange={(e) => setUnitPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full px-2.5 py-2 text-xs bg-[#181818] text-white border border-[#262626] rounded-md outline-none focus:border-[#ee317b] font-sans"
                        />
                      </div>
                    </div>

                    {/* Tax Options: VAT & Withholding Toggles */}
                    <div className="grid grid-cols-2 gap-4 pt-1">
                      <label className="flex items-center gap-2 px-3 py-2.5 bg-[#181818] border border-[#262626] cursor-pointer ">
                        <input
                          type="checkbox"
                          checked={hasVat}
                          onChange={(e) => setHasVat(e.target.checked)}
                          className="accent-[#71b536] w-3.5 h-3.5 cursor-pointer"
                        />
                        <div className="font-sans">
                          <span className="text-[10px] uppercase font-bold text-gray-300 block">Add 15% VAT</span>
                          <span className="text-[9px] text-gray-500 block">Value Added Tax</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-2 px-3 py-2.5 bg-[#181818] border border-[#262626] cursor-pointer ">
                        <input
                          type="checkbox"
                          checked={hasWithholding}
                          onChange={(e) => setHasWithholding(e.target.checked)}
                          className="accent-[#ee317b] w-3.5 h-3.5 cursor-pointer"
                        />
                        <div className="font-sans">
                          <span className="text-[10px] uppercase font-bold text-gray-300 block">3% Withholding</span>
                          <span className="text-[9px] text-gray-500 block">Supplier tax deduction</span>
                        </div>
                      </label>
                    </div>

                    {/* LIVE MATHEMATICAL TAX BREAKDOWN BLOCK */}
                    <div className="bg-[#181818] border border-[#262626] p-3 text-mono text-xs text-gray-400 space-y-1.5">
                      <div className="flex justify-between">
                        <span>Base Purchase Total (Qty x Price):</span>
                        <span className="text-white font-semibold">{baseAmount.toLocaleString()} ETB</span>
                      </div>
                      {hasVat && (
                        <div className="flex justify-between text-emerald-400">
                          <span>+ VAT (15%):</span>
                          <span>+{vatAmount.toLocaleString()} ETB</span>
                        </div>
                      )}
                      {hasWithholding && (
                        <div className="flex justify-between text-red-400">
                          <span>- Withholding Tax (3% supplier deduction):</span>
                          <span>-{withholdingAmount.toLocaleString()} ETB</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-[#2a2a2a] pt-2 text-sm font-bold text-[#ee317b]">
                        <span>Computed Net Charged to bank:</span>
                        <span>{currentCalculatedTotalPrice.toLocaleString()} ETB</span>
                      </div>
                    </div>

                    {/* Notes / Description */}
                    <div>
                      <label className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1.5">Item notes / vendor metadata</label>
                      <textarea
                        value={notesOrDescription}
                        onChange={(e) => setNotesOrDescription(e.target.value)}
                        rows={1.5}
                        className="w-full px-2.5 py-1.5 text-xs bg-[#181818] text-white border border-[#262626] rounded-md outline-none focus:border-[#ee317b] font-sans resize-none"
                        placeholder="Add manufacturer invoice number, roll weights, etc."
                      />
                    </div>

                    {/* Add to Batch Button (Only show in Add Mode) */}
                    {!editingPurchase && (
                      <div className="pt-1 flex">
                        <button
                          type="button"
                          onClick={handleAddCurrentRowToBatch}
                          className="w-full py-2.5 bg-[#1f2d1e] hover:bg-[#2d422a] text-[#71b536] border border-[#71b536]/30 font-sans font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5 rounded-md transition-all"
                        >
                          <Check className="w-4 h-4" />
                          + Confirm &amp; Add Item to Batch List
                        </button>
                      </div>
                    )}

                  </div>

                  {/* BATCH OVERVIEW / PENDING SUMMARY BOX (Only in Add Mode) */}
                  {!editingPurchase && pendingBatchItems.length > 0 && (
                    <div className="border border-zinc-700 bg-[#141414] p-4 space-y-4 rounded-md h-auto">
                      <div className="flex justify-between items-center border-b border-[#2d2d2d] pb-2">
                        <span className="text-[11px] font-sans font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Calculator className="w-4 h-4 text-[#ee317b]" />
                          Reviewing Pending Batch Summary ({pendingBatchItems.length} Products)
                        </span>
                        
                        <button
                          type="button"
                          onClick={() => setPendingBatchItems([])}
                          className="text-[9px] text-rose-400 hover:text-rose-300 uppercase tracking-wider font-sans outline-none"
                        >
                          Clear batch
                        </button>
                      </div>

                      {/* Small Grid pending items spreadsheet */}
                      <div className="overflow-x-auto border border-[#222222] text-[11px] font-sans bg-[#101010]">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-[#181818] text-gray-500 uppercase text-[9px] border-b border-[#222222]">
                              <th className="p-2">Item Product</th>
                              <th className="p-2">Category</th>
                              <th className="p-2 text-right">Qty</th>
                              <th className="p-2 text-right">Unit Price</th>
                              <th className="p-2 text-center">Taxes</th>
                              <th className="p-2 text-right">Net total</th>
                              <th className="p-2 text-center">Remove</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#202020] text-gray-300">
                            {pendingBatchItems.map((item, idx) => (
                              <tr key={item.tempId} className="hover:bg-[#151515]">
                                <td className="p-2 font-semibold text-white max-w-[120px] truncate" title={item.itemOrService}>
                                  {item.itemOrService}
                                </td>
                                <td className="p-2 text-pink-400 max-w-[100px] truncate">{item.expenseCategory}</td>
                                <td className="p-2 text-right text-white font-bold">{item.quantity}</td>
                                <td className="p-2 text-right">{item.unitPrice.toLocaleString()}</td>
                                <td className="p-2 text-center">
                                  <div className="flex gap-1 justify-center text-[9px]">
                                    {item.hasVat && <span className="bg-[#182318] text-emerald-400 px-0.5">V</span>}
                                    {item.hasWithholding && <span className="bg-[#31111E] text-red-400 px-0.5">W</span>}
                                  </div>
                                </td>
                                <td className="p-2 text-right text-white font-bold">{item.totalPrice.toLocaleString()} ETB</td>
                                <td className="p-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItemFromBatch(item.tempId)}
                                    className="p-1 text-rose-500 hover:text-rose-300 hover:bg-rose-950/20 cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Cumulative Pricing Mathematics */}
                      <div className="bg-[#181818] text-xs font-sans p-3 space-y-1.5 text-gray-400 border border-[#2d2d2d] rounded-md">
                        <div className="flex justify-between">
                          <span>Total Cumulative Base Amount:</span>
                          <span className="text-white font-bold">
                            {pendingBatchItems.reduce((acc, c) => acc + c.baseAmount, 0).toLocaleString()} ETB
                          </span>
                        </div>
                        <div className="flex justify-between text-emerald-400">
                          <span>Total Cumulative VAT Added (15%):</span>
                          <span>
                            +{pendingBatchItems.reduce((acc, c) => acc + c.vatAmount, 0).toLocaleString()} ETB
                          </span>
                        </div>
                        <div className="flex justify-between text-red-400">
                          <span>Total Cumulative Supplier Withholding Deducted (3%):</span>
                          <span>
                            -{pendingBatchItems.reduce((acc, c) => acc + c.withholdingAmount, 0).toLocaleString()} ETB
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-[#2a2a2a] pt-2 text-sm font-extrabold text-[#71b536]">
                          <span>NET CHARGES TO CHARGE LEDGER BANK:</span>
                          <span>
                            {pendingBatchItems.reduce((acc, c) => acc + c.totalPrice, 0).toLocaleString()} ETB
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                </div>

              {/* Bottom confirmation tools */}
              <div className="border-t border-[#262626] px-6 py-4 bg-[#181818] flex items-center justify-end gap-3  flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-transparent text-gray-400 hover:text-white text-xs font-sans  cursor-pointer border border-[#262626] hover:bg-[#202020] rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePurchase}
                  className="px-5 py-2 bg-[#ee317b] hover:bg-[#d61e63] text-white text-xs font-sans font-bold cursor-pointer  rounded-md"
                >
                  {editingPurchase 
                    ? 'Update Single Ledger Row' 
                    : pendingBatchItems.length > 0 || itemOrServiceInput.trim() !== ''
                      ? `Complete (${pendingBatchItems.length + (itemOrServiceInput.trim() !== '' ? 1 : 0)} items)`
                      : 'Save Purchase To Ledger'
                  }
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dynamic Pop-up Dialog to Add New Item to Catalog */}
      <AnimatePresence>
        {addingNewItemFromSearch !== null && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#121212] border border-stone-300 dark:border-[#ee317b]/40 max-w-md w-full p-6 text-left space-y-5 shadow-2xl rounded-md animate-fadeIn"
            >
              <div>
                <h3 className="font-sans text-stone-950 dark:text-white font-bold uppercase tracking-wider text-sm flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-[#ee317b]" />
                  Add New Item to Catalog
                </h3>
                <p className="text-stone-500 dark:text-gray-400 text-[11px] leading-relaxed font-sans mt-1">
                  You are registering <strong className="text-[#ee317b]">"{addingNewItemFromSearch}"</strong> to the business catalog. Assign it to an expense category below.
                </p>
              </div>

              <div className="space-y-4">
                {/* Category Option Selector Mode Toggle */}
                <div className="flex gap-4 border-b border-stone-200 dark:border-[#222222] pb-2 text-xs font-sans">
                  <label className="flex items-center gap-1.5 cursor-pointer text-stone-900 dark:text-white">
                    <input
                      type="radio"
                      checked={!isNewCategoryModeInModal}
                      onChange={() => setIsNewCategoryModeInModal(false)}
                      className="accent-[#ee317b]"
                    />
                    Choose Existing Category
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-stone-900 dark:text-white">
                    <input
                      type="radio"
                      checked={isNewCategoryModeInModal}
                      onChange={() => setIsNewCategoryModeInModal(true)}
                      className="accent-[#ee317b]"
                    />
                    + Create New Category
                  </label>
                </div>

                {!isNewCategoryModeInModal ? (
                  <div>
                    <label className="block text-[10px] text-stone-505 dark:text-gray-400 uppercase tracking-widest mb-1.5 font-bold">Select Category</label>
                    <SearchableSelect
                      value={newItemTargetCategory}
                      onChange={(e) => setNewItemTargetCategory(e.target.value)}
                      className="w-full px-2.5 py-2 text-xs bg-white dark:bg-[#181818] text-stone-900 dark:text-white border border-stone-300 dark:border-[#262626] focus:border-[#ee317b] rounded-md outline-none cursor-pointer"
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </SearchableSelect>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10px] text-stone-505 dark:text-gray-400 uppercase tracking-widest mb-1.5 font-bold">New Category Name</label>
                    <input
                      type="text"
                      required
                      value={modalNewCategoryName}
                      onChange={(e) => setModalNewCategoryName(e.target.value)}
                      placeholder="e.g. Licensing & Compliance"
                      className="w-full px-2.5 py-2 text-xs bg-white dark:bg-[#181818] text-stone-900 dark:text-white border border-stone-300 dark:border-[#262626] focus:border-[#ee317b] rounded-md outline-none font-sans"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-stone-200 dark:border-[#222222] font-sans">
                <button
                  type="button"
                  onClick={() => setAddingNewItemFromSearch(null)}
                  className="px-4 py-1.5 bg-stone-100 dark:bg-[#1a1a1a] border border-stone-300 dark:border-[#2d2d2d] text-stone-700 dark:text-gray-300 hover:text-stone-950 dark:hover:text-white cursor-pointer text-xs rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNewItemFromSearch}
                  className="px-4 py-1.5 bg-[#ee317b] hover:bg-[#d61e63] text-white font-bold cursor-pointer text-xs uppercase rounded-md"
                >
                  Save Item
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
