import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  LayoutGrid, 
  Table as TableIcon, 
  ChevronRight, 
  X, 
  AlertCircle, 
  Phone, 
  User, 
  Layers, 
  Sparkles,
  Lock,
  Copy,
  CheckSquare,
  Printer,
  Download
} from 'lucide-react';
import { exportCustomersCSV } from '../utils/csvExport';
import { 
  Customer, 
  PaperStock, 
  CLIENT_TYPES, 
  ACQUISITION_SOURCES, 
  AGENTS, 
  EmployeeUser,
  BankAccount,
  ProductType
} from '../types';
import { parseFractionOrExpression, cleanLeadingZeros } from '../utils';

// Helper functions to translate modern color strings (oklch, oklab, color-mix) to standard RGB/RGBA colors for html2canvas compatibility
let canvasCtxCache: CanvasRenderingContext2D | null = null;

function resolveColorToRgb(colorStr: string): string {
  try {
    if (!canvasCtxCache) {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      canvasCtxCache = canvas.getContext('2d');
    }
    if (canvasCtxCache) {
      canvasCtxCache.fillStyle = 'rgba(0,0,0,0)'; // Reset to transparent
      canvasCtxCache.fillStyle = colorStr;
      const resolved = canvasCtxCache.fillStyle;
      if (resolved && resolved !== 'rgba(0, 0, 0, 0)' && resolved !== 'transparent' && resolved !== '#00000000') {
        return resolved;
      }
    }
  } catch (e) {
    console.warn("Canvas color resolver failed for:", colorStr, e);
  }
  return colorStr;
}

function convertColorStringToRgb(str: string): string {
  if (typeof str !== 'string') return str;
  
  // Replace oklch(...)
  str = str.replace(/oklch\((?:[^()]+|\((?:[^()]+|\([^()]*\))*\))*\)/ig, (match) => {
    return resolveColorToRgb(match);
  });
  
  // Replace oklab(...)
  str = str.replace(/oklab\((?:[^()]+|\((?:[^()]+|\([^()]*\))*\))*\)/ig, (match) => {
    return resolveColorToRgb(match);
  });
  
  // Replace color-mix(...)
  str = str.replace(/color-mix\((?:[^()]+|\((?:[^()]+|\([^()]*\))*\))*\)/ig, (match) => {
    return resolveColorToRgb(match);
  });
  
  return str;
}


interface CustomerTabProps {
  customers: Customer[];
  paperStocks: PaperStock[];
  bankAccounts: BankAccount[];
  productTypes: ProductType[];
  onAddProductType: (prod: ProductType) => Promise<void> | void;
  onDeleteProductType: (id: string) => Promise<void> | void;
  onAddCustomer: (customer: Customer) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
  onBulkUpdateCustomers: (updatedList: Customer[]) => void;
  currentUser: EmployeeUser | null;
  employees: EmployeeUser[];
}

export default function CustomerTab({ 
  customers, 
  paperStocks, 
  bankAccounts,
  productTypes,
  onAddProductType,
  onDeleteProductType,
  onAddCustomer, 
  onUpdateCustomer, 
  onDeleteCustomer,
  onBulkUpdateCustomers,
  currentUser,
  employees
}: CustomerTabProps) {
  
  // View states
  const [layoutMode, setLayoutMode] = useState<'grid' | 'cards'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAgent, setFilterAgent] = useState<string>('All');
  const [filterSource, setFilterSource] = useState<string>('All');
  const [filterPayment, setFilterPayment] = useState<string>('All'); // 'All', 'Debt', 'Paid'
  const [filterCompletion, setFilterCompletion] = useState<string>('All'); // 'All', 'Completed', 'Pending', 'Incomplete'
  const [filterReceipt, setFilterReceipt] = useState<string>('All'); // 'All', 'NeedsReceipt'
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [showProformaModal, setShowProformaModal] = useState(false);
  const [isStandaloneProformaMode, setIsStandaloneProformaMode] = useState(false);
  const [standaloneProformaItems, setStandaloneProformaItems] = useState<Array<{ id: string; productType: string; quantity: number; unitPrice: number; advancePayment: number; }>>([]);

  // Proforma VAT State variables inside modal scope integration
  const [proformaIncludeVat, setProformaIncludeVat] = useState(true);
  const [standaloneClientName, setStandaloneClientName] = useState('Mena Corporate Client PLC');
  const [standaloneClientPhone, setStandaloneClientPhone] = useState('+251 900 000 000');
  const [applyDigitalStamp, setApplyDigitalStamp] = useState(true);

  // Dynamic html2canvas + jsPDF direct file exporter (pure modern Vector text-layout based PDF engine)
  const exportDirectPDF = async () => {
    const btn = document.getElementById('export-pdf-direct-btn');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
      btn.innerHTML = '⚡ Generating PDF...';
      btn.setAttribute('disabled', 'true');
    }

    const originalGetComputedStyle = window.getComputedStyle;
    const originalGetPropertyValue = CSSStyleDeclaration.prototype.getPropertyValue;
    const originalStyleDeclarationCssTextDesc = Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype, 'cssText');
    const originalRuleCssTextDesc = Object.getOwnPropertyDescriptor(CSSRule.prototype, 'cssText');

    const originalAppendChild = Node.prototype.appendChild;
    const originalInsertBefore = Node.prototype.insertBefore;

    const iframeRestores: Array<() => void> = [];

    function patchWindowStyles(w: any) {
      if (!w) return;
      try {
        const origGetComputedStyle = w.getComputedStyle;
        const origGetPropertyValue = w.CSSStyleDeclaration?.prototype?.getPropertyValue;
        const origStyleDeclarationCssTextDesc = w.CSSStyleDeclaration ? Object.getOwnPropertyDescriptor(w.CSSStyleDeclaration.prototype, 'cssText') : null;
        const origRuleCssTextDesc = w.CSSRule ? Object.getOwnPropertyDescriptor(w.CSSRule.prototype, 'cssText') : null;

        iframeRestores.push(() => {
          try {
            if (origGetPropertyValue) {
              w.CSSStyleDeclaration.prototype.getPropertyValue = origGetPropertyValue;
            }
            if (origStyleDeclarationCssTextDesc) {
              Object.defineProperty(w.CSSStyleDeclaration.prototype, 'cssText', origStyleDeclarationCssTextDesc);
            }
            if (origRuleCssTextDesc) {
              Object.defineProperty(w.CSSRule.prototype, 'cssText', origRuleCssTextDesc);
            }
            w.getComputedStyle = origGetComputedStyle;
          } catch (_) {}
        });

        if (origGetPropertyValue) {
          w.CSSStyleDeclaration.prototype.getPropertyValue = function(propertyName: string) {
            const val = origGetPropertyValue.call(this, propertyName);
            if (typeof val === 'string') {
              return convertColorStringToRgb(val);
            }
            return val;
          };
        }

        if (origStyleDeclarationCssTextDesc && origStyleDeclarationCssTextDesc.get) {
          Object.defineProperty(w.CSSStyleDeclaration.prototype, 'cssText', {
            ...origStyleDeclarationCssTextDesc,
            get() {
              const val = origStyleDeclarationCssTextDesc.get!.call(this);
              if (typeof val === 'string') {
                return convertColorStringToRgb(val);
              }
              return val;
            }
          });
        }

        if (origRuleCssTextDesc && origRuleCssTextDesc.get) {
          Object.defineProperty(w.CSSRule.prototype, 'cssText', {
            ...origRuleCssTextDesc,
            get() {
              const val = origRuleCssTextDesc.get!.call(this);
              if (typeof val === 'string') {
                return convertColorStringToRgb(val);
              }
              return val;
            }
          });
        }

        w.getComputedStyle = function(el: any, pseudoElt: any) {
          const style = origGetComputedStyle(el, pseudoElt);
          return new Proxy(style, {
            get(target, prop) {
              if (prop === 'getPropertyValue') {
                return function(propertyName: string) {
                  let val = target.getPropertyValue(propertyName);
                  if (typeof val === 'string') {
                    val = convertColorStringToRgb(val);
                  }
                  return val;
                };
              }
              let val = Reflect.get(target, prop);
              if (typeof val === 'string') {
                val = convertColorStringToRgb(val);
              }
              if (typeof val === 'function') {
                return val.bind(target);
              }
              return val;
            }
          });
        };
      } catch (e) {
        console.warn("Failed to patch window styles for:", w, e);
      }
    }

    try {
      // 1. Patch parent window
      patchWindowStyles(window);

      // 2. Intercept iframe appends to patch sandboxed html2canvas windows
      Node.prototype.appendChild = function<T extends Node>(newChild: T): T {
        const res = originalAppendChild.call(this, newChild);
        if (newChild instanceof HTMLIFrameElement) {
          try {
            patchWindowStyles(newChild.contentWindow);
          } catch (e) {
            console.warn("Failed to patch iframe on appendChild", e);
          }
        }
        return res;
      };

      Node.prototype.insertBefore = function<T extends Node>(newChild: T, refChild: Node | null): T {
        const res = originalInsertBefore.call(this, newChild, refChild);
        if (newChild instanceof HTMLIFrameElement) {
          try {
            patchWindowStyles(newChild.contentWindow);
          } catch (e) {
            console.warn("Failed to patch iframe on insertBefore", e);
          }
        }
        return res;
      };

      const container = document.getElementById('proforma-print-container');
      if (!container) {
        throw new Error('Proforma container element not found.');
      }

      // Save original styles to restore later
      const originalMaxHeight = container.style.maxHeight;
      const originalOverflow = container.style.overflow;
      const originalHeight = container.style.height;
      const originalWidth = container.style.width;

      // Temporarily set styling to show the entire layout and keep it consistent on mobile
      container.style.maxHeight = 'none';
      container.style.overflow = 'visible';
      container.style.height = 'auto';
      container.style.width = '800px';

      // Render the container to a canvas with high scale for high resolution print quality
      const canvas = await html2canvas(container, {
        scale: 2.5, // High resolution scale for clear vector text output
        useCORS: true,
        allowTaint: false, // Prevent tainted canvas errors
        backgroundColor: '#ffffff',
        logging: false
      });

      // Restore original styles immediately after capture
      container.style.maxHeight = originalMaxHeight;
      container.style.overflow = originalOverflow;
      container.style.height = originalHeight;
      container.style.width = originalWidth;

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Handle multi-page if the proforma extends beyond one A4 page
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const clientNameFilename = isStandaloneProformaMode 
        ? standaloneClientName 
        : (proformaItemsToRender[0] as any)?.clientName || 'Draft';

      pdf.save(`Mena_Inc_Proforma_${clientNameFilename.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    } catch (err: any) {
      console.error('PDF export crashed:', err);
      alert(`Export Error: ${err?.message || String(err)}`);
      throw err;
    } finally {
      // 1. Run all iframe restores
      for (const restore of iframeRestores) {
        try {
          restore();
        } catch (_) {}
      }

      // 2. Restore DOM insertion methods
      Node.prototype.appendChild = originalAppendChild;
      Node.prototype.insertBefore = originalInsertBefore;

      // 3. Restore parent window prototypes and methods
      CSSStyleDeclaration.prototype.getPropertyValue = originalGetPropertyValue;
      if (originalStyleDeclarationCssTextDesc) {
        Object.defineProperty(CSSStyleDeclaration.prototype, 'cssText', originalStyleDeclarationCssTextDesc);
      }
      if (originalRuleCssTextDesc) {
        Object.defineProperty(CSSRule.prototype, 'cssText', originalRuleCssTextDesc);
      }
      window.getComputedStyle = originalGetComputedStyle;

      if (btn) {
        btn.innerHTML = originalText;
        btn.removeAttribute('disabled');
      }
    }
  };

  const isAdmin = currentUser?.role === 'admin';

  // Modal / Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formStep, setFormStep] = useState<1 | 2 | 3>(1);

  // Lock body scroll when customer form or proforma modal is open
  useEffect(() => {
    if (isFormOpen || showProformaModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFormOpen, showProformaModal]);

  // Form Fields State
  const [clientType, setClientType] = useState<Customer['clientType']>('Individual');
  const [clientName, setClientName] = useState('');
  const [phone, setPhone] = useState('');
  const [acquisitionSource, setAcquisitionSource] = useState<Customer['acquisitionSource']>('Repeat');
   const [orderTakenBy, setOrderTakenBy] = useState<Customer['orderTakenBy']>(currentUser?.name || 'Bereket');
  const [productType, setProductType] = useState(productTypes[0]?.name || '');
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProductInput, setNewProductInput] = useState('');
  const [showProductManager, setShowProductManager] = useState(false);
  const [newManagerProductInput, setNewManagerProductInput] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [advancePayment, setAdvancePayment] = useState<number>(0);
  const [paymentMethodId, setPaymentMethodId] = useState<string>('b1');

  // Math expression string inputs for the numerical editing fields
  const [qtyInput, setQtyInput] = useState<string>('0');
  const [priceInput, setPriceInput] = useState<string>('0');
  const [advanceInput, setAdvanceInput] = useState<string>('0');

  // Dynamic Acquisition Channels State
  const [acquisitionChannels, setAcquisitionChannels] = useState<string[]>(() => {
    const saved = localStorage.getItem('mena_inc_acquisition_channels_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (_) {}
    }
    return ['TikTok', 'Instagram', 'Telegram', 'Word of Mouth', 'Repeat'];
  });
  const [newChannelInput, setNewChannelInput] = useState('');
  const [isAddingChannel, setIsAddingChannel] = useState(false);

  // Secure ledger data alignment states
  const [advancePaymentDate, setAdvancePaymentDate] = useState<string>('');
  const [bankRemainingId, setBankRemainingId] = useState<string>('');
  const [incompletionReason, setIncompletionReason] = useState<string>('');
  const [isVatAdded, setIsVatAdded] = useState<boolean>(false);
  const [baseUnitPriceInput, setBaseUnitPriceInput] = useState<string>('0');

  // Non-blocking custom delete tracking ID
  const [deletingCustomerId, setDeletingCustomerId] = useState<string | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  
  const [paperType1, setPaperType1] = useState(paperStocks[0]?.name || 'Big flower');
  const [amount1, setAmount1] = useState<string>('0');
  const [paperType2, setPaperType2] = useState('None');
  const [amount2, setAmount2] = useState<string>('0');
  const [paperType3, setPaperType3] = useState('None');
  const [amount3, setAmount3] = useState<string>('0');
  
  const [entrancePaper, setEntrancePaper] = useState('None');
  const [amount16, setAmount16] = useState<string>('0');
  const [ajabiPaper, setAjabiPaper] = useState('None');
  const [amount9, setAmount9] = useState<string>('0');
  
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    return d.toISOString().split('T')[0];
  });

  const [formError, setFormError] = useState('');

  const handleAddProductInline = async () => {
    const cleaned = newProductInput.trim();
    if (cleaned) {
      const existing = productTypes.find(p => p.name.toLowerCase() === cleaned.toLowerCase());
      if (existing) {
        setProductType(existing.name);
      } else {
        const newProd: ProductType = {
          id: 'pt_' + Date.now(),
          name: cleaned
        };
        await onAddProductType(newProd);
        setProductType(cleaned);
      }
    }
    setNewProductInput('');
    setIsAddingProduct(false);
  };

  // Open form for Create
  const handleOpenCreate = () => {
    setEditingCustomer(null);
    setFormStep(1);
    setClientType('Individual');
    setClientName('');
    setPhone('');
    setAcquisitionSource('Repeat');
    setOrderTakenBy(currentUser?.name || 'Bereket');
    setProductType(productTypes[0]?.name || '');
    setQuantity(0);
    setUnitPrice(0);
    setAdvancePayment(0);
    setQtyInput('0');
    setPriceInput('0');
    setAdvanceInput('0');
    setPaymentMethodId('b1');
    setPaperType1(paperStocks[0]?.name || 'Big flower');
    setAmount1('0');
    setPaperType2('None');
    setAmount2('0');
    setPaperType3('None');
    setAmount3('0');
    setEntrancePaper('None');
    setAmount16('0');
    setAjabiPaper('None');
    setAmount9('0');
    
    setDeliveryDate('');

    // Google Sheets custom alignment fields
    const todayStr = new Date().toISOString().split('T')[0];
    setAdvancePaymentDate(todayStr);
    setBankRemainingId('');
    setIncompletionReason('');
    setIsVatAdded(false);
    setBaseUnitPriceInput('0');
    
    setFormError('');
    setIsFormOpen(true);
  };

  // Open form for Edit
  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormStep(1);
    setClientType(customer.clientType);
    setClientName(customer.clientName);
    setPhone(customer.phone);
    setAcquisitionSource(customer.acquisitionSource);
    setOrderTakenBy(customer.orderTakenBy);
    setProductType(customer.productType);
    setQuantity(customer.quantity);
    setUnitPrice(customer.unitPrice);
    setAdvancePayment(customer.advancePayment);
    setQtyInput(customer.quantity.toString());
    setPriceInput(customer.unitPrice.toString());
    setAdvanceInput(customer.advancePayment.toString());
    setPaymentMethodId(customer.paymentMethodId || 'b1');
    
    setPaperType1(customer.paperType1);
    setAmount1(customer.amount1.toString());
    setPaperType2(customer.paperType2);
    setAmount2(customer.amount2.toString());
    setPaperType3(customer.paperType3);
    setAmount3(customer.amount3.toString());
    
    setEntrancePaper(customer.entrancePaper);
    setAmount16(customer.amount16.toString());
    setAjabiPaper(customer.ajabiPaper);
    setAmount9(customer.amount9.toString());
    setDeliveryDate(customer.deliveryDate);

    // Google Sheets custom alignment fields loading
    setAdvancePaymentDate(customer.advancePaymentDate || customer.deliveryDate);
    setBankRemainingId(customer.bankRemainingId || '');
    setIncompletionReason(customer.incompletionReason || '');
    setIsVatAdded(customer.isVatAdded || false);
    setBaseUnitPriceInput((customer.baseUnitPrice !== undefined ? customer.baseUnitPrice : customer.unitPrice).toString());
    
    setFormError('');
    setIsFormOpen(true);
  };

  // Duplicate helper (some customers have more than one order)
  const handleOpenDuplicate = (customer: Customer) => {
    setEditingCustomer(null);
    setFormStep(1);
    setClientType(customer.clientType);
    setClientName(customer.clientName);
    setPhone(customer.phone);
    setAcquisitionSource(customer.acquisitionSource);
    setOrderTakenBy(customer.orderTakenBy);
    setProductType(customer.productType);
    setQuantity(customer.quantity);
    setUnitPrice(customer.unitPrice);
    setAdvancePayment(customer.advancePayment);
    setQtyInput(customer.quantity.toString());
    setPriceInput(customer.unitPrice.toString());
    setAdvanceInput(customer.advancePayment.toString());
    setPaymentMethodId(customer.paymentMethodId || 'b1');
    
    setPaperType1(customer.paperType1);
    setAmount1(customer.amount1.toString());
    setPaperType2(customer.paperType2);
    setAmount2(customer.amount2.toString());
    setPaperType3(customer.paperType3);
    setAmount3(customer.amount3.toString());
    
    setEntrancePaper(customer.entrancePaper);
    setAmount16(customer.amount16.toString());
    setAjabiPaper(customer.ajabiPaper);
    setAmount9(customer.amount9.toString());
    setDeliveryDate(customer.deliveryDate);

    setAdvancePaymentDate(customer.advancePaymentDate || customer.deliveryDate);
    setBankRemainingId(customer.bankRemainingId || 'b1');
    setIncompletionReason(customer.incompletionReason || '');
    setIsVatAdded(customer.isVatAdded || false);
    setBaseUnitPriceInput((customer.baseUnitPrice !== undefined ? customer.baseUnitPrice : customer.unitPrice).toString());
    
    setFormError('');
    setIsFormOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      setFormError('Client name is required.');
      return;
    }

    const finalQuantity = Math.max(0, parseFractionOrExpression(qtyInput));
    const finalUnitPrice = Math.max(0, parseFractionOrExpression(priceInput));
    const finalAdvancePayment = Math.max(0, parseFractionOrExpression(advanceInput));

    const payload: Customer = {
      id: editingCustomer ? editingCustomer.id : 'c_' + Date.now(),
      clientType,
      clientName: clientName.trim(),
      phone: phone.trim(),
      acquisitionSource,
      orderTakenBy,
      productType,
      // Force Absolute safe Positive Numbers only
      quantity: finalQuantity,
      unitPrice: finalUnitPrice,
      advancePayment: finalAdvancePayment,
      paymentMethodId,
      paperType1,
      amount1: Math.max(0, parseFractionOrExpression(amount1)),
      paperType2,
      amount2: Math.max(0, parseFractionOrExpression(amount2)),
      paperType3,
      amount3: Math.max(0, parseFractionOrExpression(amount3)),
      entrancePaper,
      amount16: Math.max(0, parseFractionOrExpression(amount16)),
      ajabiPaper,
      amount9: Math.max(0, parseFractionOrExpression(amount9)),
      deliveryDate,
      
      // Custom Google Sheets fields
      advancePaymentDate,
      bankRemainingId,
      incompletionReason: incompletionReason.trim(),
      isVatAdded,
      baseUnitPrice: isVatAdded ? Math.max(0, parseFractionOrExpression(baseUnitPriceInput)) : undefined
    };

    if (editingCustomer) {
      onUpdateCustomer(payload);
    } else {
      onAddCustomer(payload);
    }
    setIsFormOpen(false);
  };

  const handleSaveAndAddAnother = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      setFormError('Client name is required.');
      return;
    }

    const finalQuantity = Math.max(0, parseFractionOrExpression(qtyInput));
    const finalUnitPrice = Math.max(0, parseFractionOrExpression(priceInput));
    const finalAdvancePayment = Math.max(0, parseFractionOrExpression(advanceInput));

    const payload: Customer = {
      id: 'c_' + Date.now(),
      clientType,
      clientName: clientName.trim(),
      phone: phone.trim(),
      acquisitionSource,
      orderTakenBy,
      productType,
      quantity: finalQuantity,
      unitPrice: finalUnitPrice,
      advancePayment: finalAdvancePayment,
      paymentMethodId,
      paperType1,
      amount1: Math.max(0, parseFractionOrExpression(amount1)),
      paperType2,
      amount2: Math.max(0, parseFractionOrExpression(amount2)),
      paperType3,
      amount3: Math.max(0, parseFractionOrExpression(amount3)),
      entrancePaper,
      amount16: Math.max(0, parseFractionOrExpression(amount16)),
      ajabiPaper,
      amount9: Math.max(0, parseFractionOrExpression(amount9)),
      deliveryDate,
      
      advancePaymentDate,
      bankRemainingId,
      incompletionReason: incompletionReason.trim(),
      isVatAdded,
      baseUnitPrice: isVatAdded ? Math.max(0, parseFractionOrExpression(baseUnitPriceInput)) : undefined
    };

    onAddCustomer(payload);

    // Keep the core customer details that persist (name, phone, clientType, channel, agent, dates)
    // but reset the product-specific and sheet-deduction configurations for the next item order
    setProductType('Pocket Card');
    setQuantity(0);
    setUnitPrice(85);
    setQtyInput('0');
    setPriceInput('85');
    setDeliveryDate('');
    
    // Reset standard layout deductions
    setPaperType1(paperStocks[0]?.name || 'Big flower');
    setAmount1('0');
    setPaperType2('None');
    setAmount2('0');
    setPaperType3('None');
    setAmount3('0');
    
    // Reset auxiliary layouts
    setEntrancePaper('None');
    setAmount16('0');
    setAjabiPaper('None');
    setAmount9('0');
    
    setIncompletionReason('');
    setIsVatAdded(false);
    setBaseUnitPriceInput('85');

    // Return the form immediately to page/step 1 so they can log the next item safely
    setFormStep(1);
    setFormError('');
  };

  const computedFullPayment = quantity * unitPrice;
  const computedRemainingBalance = computedFullPayment - advancePayment;

  // Bulk Selection and Update Handlers
  const handleBulkComplete = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const updatedList = customers.map(c => {
      if (selectedCustomerIds.includes(c.id)) {
        return {
          ...c,
          deliveryDate: c.deliveryDate || todayStr,
          bankRemainingId: c.bankRemainingId || 'b1'
        };
      }
      return c;
    });
    onBulkUpdateCustomers(updatedList);
    setSelectedCustomerIds([]);
    alert(`Successfully completed ${selectedCustomerIds.length} orders.`);
  };

  const handleBulkDelete = () => {
    setShowBulkDeleteConfirm(true);
  };

  const executeBulkDeleteConfirmed = () => {
    const remaining = customers.filter(c => !selectedCustomerIds.includes(c.id));
    onBulkUpdateCustomers(remaining);
    setSelectedCustomerIds([]);
    setShowBulkDeleteConfirm(false);
  };

  // Filter application
  const filteredCustomers = customers.filter(c => {
    const matchesSearch = 
      c.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone && c.phone.includes(searchQuery)) ||
      c.productType.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesAgent = filterAgent === 'All' || c.orderTakenBy === filterAgent;
    const matchesSource = filterSource === 'All' || c.acquisitionSource === filterSource;

    const full = c.quantity * c.unitPrice;
    const remaining = full - c.advancePayment;
    let matchesPayment = true;
    if (filterPayment === 'Debt') {
      matchesPayment = remaining > 0;
    } else if (filterPayment === 'Paid') {
      matchesPayment = remaining <= 0;
    }

    const isCompleted = !!(c.deliveryDate && c.bankRemainingId);
    let matchesCompletion = true;
    if (filterCompletion === 'Completed') {
      matchesCompletion = isCompleted;
    } else if (filterCompletion === 'Pending') {
      matchesCompletion = !isCompleted && !c.incompletionReason;
    } else if (filterCompletion === 'Incomplete') {
      matchesCompletion = !isCompleted && !!c.incompletionReason;
    }

    let matchesReceipt = true;
    if (filterReceipt === 'NeedsReceipt') {
      matchesReceipt = !!c.isVatAdded;
    }

    return matchesSearch && matchesAgent && matchesSource && matchesPayment && matchesCompletion && matchesReceipt;
  });

  const proformaItemsToRender = isStandaloneProformaMode 
    ? standaloneProformaItems 
    : customers.filter(c => selectedCustomerIds.includes(c.id)).map(c => ({
        id: c.id,
        clientName: c.clientName,
        productType: c.productType,
        quantity: c.quantity,
        unitPrice: c.unitPrice,
        advancePayment: c.advancePayment || 0
      }));

  return (
    <div className="space-y-6" id="customers-tab-pnl">
      
      {/* Search and Filters Strip - Optimized for Mobile Screen limits */}
      <div className="bg-[#121212] border border-[#262626] rounded-none p-4 shadow-none flex flex-col gap-4 select-none">
        
        {/* Row 1: Selectors and buttons */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2 font-mono w-full lg:w-auto text-xs">
            {/* Filter Agent */}
            <select
              value={filterAgent}
              onChange={(e) => setFilterAgent(e.target.value)}
              className="px-3 py-1.5 bg-[#181818] border border-[#262626] text-gray-300 rounded-none text-xs outline-none cursor-pointer focus:border-[#ee317b]"
            >
              <option value="All">All Staff</option>
              {(employees.length > 0 ? employees.map(emp => emp.name) : AGENTS).map(agent => (
                <option key={agent} value={agent}>{agent}</option>
              ))}
            </select>

            {/* Filter Lead Channel */}
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="px-3 py-1.5 bg-[#181818] border border-[#262626] text-gray-300 rounded-none text-xs outline-none cursor-pointer focus:border-[#ee317b]"
            >
              <option value="All">All Leads</option>
              {acquisitionChannels.map(source => <option key={source} value={source}>{source}</option>)}
            </select>

            {/* Filter Debt Status */}
            <select
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
              className="px-3 py-1.5 bg-[#181818] border border-[#262626] text-gray-300 rounded-none text-xs outline-none cursor-pointer focus:border-[#ee317b]"
            >
              <option value="All">Any Payment</option>
              <option value="Debt">Outstanding Debt</option>
              <option value="Paid">Paid in Full</option>
            </select>

            {/* Filter Completion Status */}
            <select
              value={filterCompletion}
              onChange={(e) => setFilterCompletion(e.target.value)}
              className="px-3 py-1.5 bg-[#181818] border border-[#262626] text-gray-300 rounded-none text-xs outline-none cursor-pointer focus:border-[#ee317b]"
            >
              <option value="All">All Job Statuses</option>
              <option value="Completed">Completed Only</option>
              <option value="Pending">Pending Only</option>
              <option value="Incomplete">Incomplete / Problematic</option>
            </select>

            {/* Filter Receipt Needed */}
            <select
              value={filterReceipt}
              onChange={(e) => setFilterReceipt(e.target.value)}
              className="px-3 py-1.5 bg-[#181818] border border-[#262626] text-gray-300 rounded-none text-xs outline-none cursor-pointer focus:border-[#ee317b]"
            >
              <option value="All">All Receipts</option>
              <option value="NeedsReceipt">Needs Receipts (VAT)</option>
            </select>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:justify-end">
            {/* Select/Deselect All Toggle button */}
            <button
              type="button"
              onClick={() => {
                const allFilteredIds = filteredCustomers.map(c => c.id);
                const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedCustomerIds.includes(id));
                if (allSelected) {
                  // Deselect all filtered
                  setSelectedCustomerIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
                } else {
                  // Select all filtered
                  setSelectedCustomerIds(prev => {
                    const next = [...prev];
                    allFilteredIds.forEach(id => {
                      if (!next.includes(id)) next.push(id);
                    });
                    return next;
                  });
                }
              }}
              className="text-xs font-mono text-gray-300 hover:text-white bg-[#181818] hover:bg-[#262626] border border-[#262626] px-3.5 py-1.5 flex items-center justify-center gap-1.5 cursor-pointer rounded-none transition-colors"
              title="Toggle selection of all filtered items"
            >
              <CheckSquare className="w-3.5 h-3.5 text-[#ee317b]" />
              {filteredCustomers.length > 0 && filteredCustomers.every(c => selectedCustomerIds.includes(c.id)) 
                ? "Deselect All" 
                : `Select All (${filteredCustomers.length})`}
            </button>

            {/* Grid vs Cards Switcher */}
            <div className="border border-[#262626] rounded-none p-0.5 flex bg-[#181818] justify-center">
              <button
                type="button"
                onClick={() => setLayoutMode('grid')}
                className={`p-1.5 rounded-none cursor-pointer transition-colors ${layoutMode === 'grid' ? 'bg-[#ee317b] text-black font-semibold' : 'text-gray-400 hover:text-white'}`}
                title="Tabular Grid View (Default)"
              >
                <TableIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('cards')}
                className={`p-1.5 rounded-none cursor-pointer transition-colors ${layoutMode === 'cards' ? 'bg-[#ee317b] text-black font-semibold' : 'text-gray-400 hover:text-white'}`}
                title="Responsive Cards View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                exportCustomersCSV(customers, (id) => bankAccounts.find(b => b.id === id)?.name || 'CBE / System Default');
              }}
              className="text-xs font-mono font-bold text-[#ee317b] hover:text-white hover:bg-[#ee317b]/10 border border-[#ee317b]/30 bg-[#ee317b]/5 rounded-none px-4 py-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Download currently loaded customer & order ledger as a CSV file"
            >
              <Download className="w-4 h-4" />
              Export Orders CSV
            </button>

            <button
              type="button"
              onClick={() => {
                setIsStandaloneProformaMode(true);
                setStandaloneProformaItems([
                  {
                    id: 'temp-1',
                    productType: 'Premium Double Ring Notebook A4 (70 gsm)',
                    quantity: 1000,
                    unitPrice: 95.00,
                    advancePayment: 25000
                  }
                ]);
                setShowProformaModal(true);
              }}
              className="text-xs font-mono font-bold text-gray-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-none px-4 py-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-[#ee317b]" />
              Standalone Proforma Tool
            </button>

            <button
              type="button"
              onClick={handleOpenCreate}
              className="text-xs font-mono font-bold text-white bg-[#ee317b] hover:bg-[#d61e63] rounded-none px-4 py-2 flex items-center justify-center gap-1.5 shadow-none transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create Customer Order
            </button>
          </div>
        </div>

        {/* Row 2: Search Bar Below Dropdowns & Settings */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search clients by name, phone, product type or lead source..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-[#181818] text-white hover:bg-[#1E1E1E] focus:bg-[#1E1E1E] border border-[#262626] rounded-none outline-none focus:border-[#ee317b] transition-all font-sans"
          />
        </div>

      </div>

      {/* Bulk Executive Actions Strip */}
      {selectedCustomerIds.length > 0 && (
        <div className="bg-[#181818] border border-blue-900/45 p-3 rounded-none flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono animate-fade-in relative z-30">
          <div className="flex items-center gap-2 text-blue-400">
            <CheckSquare className="w-4 h-4 text-[#ee317b]" />
            <span>Selected <strong className="text-white bg-blue-950 px-1.5 py-0.5 border border-blue-900">{selectedCustomerIds.length}</strong> {selectedCustomerIds.length === 1 ? 'order file' : 'order files'}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleBulkComplete}
              className="px-3 py-1.5 bg-[#112918] hover:bg-[#1b4325] border border-green-800 text-[#71b536] font-bold cursor-pointer transition-colors flex items-center gap-1 uppercase text-[10px] tracking-wider"
            >
              ✓ Complete Selected
            </button>
            <button
              type="button"
              onClick={() => {
                setIsStandaloneProformaMode(false);
                setShowProformaModal(true);
              }}
              className="px-3 py-1.5 bg-[#31111E] hover:bg-[#4d1c31] border border-[#ee317b]/30 text-[#ee317b] font-bold cursor-pointer transition-colors flex items-center gap-1 uppercase text-[10px] tracking-wider"
            >
              📄 Export Proforma
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              className="px-3 py-1.5 bg-[#421A1D]/80 hover:bg-red-900/35 border border-red-900/40 text-red-400 font-bold cursor-pointer transition-colors flex items-center gap-1 uppercase text-[10px] tracking-wider animate-fadeIn"
              title="Wipe out highlighted selections from terminal ledger"
            >
              🗑️ Delete Selected
            </button>
            <button
              type="button"
              onClick={() => setSelectedCustomerIds([])}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-gray-350 border border-zinc-700 cursor-pointer transition-colors uppercase text-[10px] tracking-wider"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* RENDER MODE: EXCEL SPREADSHEET HORIZONTAL GRID (DEFAULT) */}
      {layoutMode === 'grid' ? (
        <div className="bg-[#121212] border border-[#262626] rounded-none overflow-hidden shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="bg-[#181818] border-b border-[#262626] text-gray-400 font-mono tracking-wider uppercase text-center">
                  <th className="py-2.5 px-3 border-r border-[#262626] bg-[#1C1C1C] sticky left-0 z-20 font-bold text-[#ee317b] font-mono text-center w-8 text-xs">Index</th>
                  <th className="py-2.5 px-2 border-r border-[#262626] font-bold text-center w-10 text-xs">
                    <input
                      type="checkbox"
                      checked={filteredCustomers.length > 0 && selectedCustomerIds.length === filteredCustomers.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCustomerIds(filteredCustomers.map(c => c.id));
                        } else {
                          setSelectedCustomerIds([]);
                        }
                      }}
                      className="accent-[#ee317b] cursor-pointer"
                      title="Select/Deselect all filtered rows"
                    />
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-gray-300 border-r border-[#262626] text-left">Client Type</th>
                  <th className="py-2.5 px-3 font-semibold text-gray-300 border-r border-[#262626] text-left">Client Name</th>
                  <th className="py-2.5 px-3 font-semibold text-gray-300 border-r border-[#262626] text-left">Phone / Contact</th>
                  <th className="py-2.5 px-3 font-semibold text-gray-300 border-r border-[#262626] text-left">Acquisition Channel</th>
                  <th className="py-2.5 px-3 font-semibold text-gray-300 border-r border-[#262626] text-left">Order Taken By</th>
                  <th className="py-2.5 px-3 font-semibold text-gray-300 border-r border-[#262626] text-left">Product Type</th>
                  <th className="py-2.5 px-3 font-semibold text-gray-300 border-r border-[#262626] text-right">Quantity</th>
                  <th className="py-2.5 px-3 font-semibold text-gray-300 border-r border-[#262626] text-right">Unit Price (ETB)</th>
                  <th className="py-2.5 px-3 font-semibold text-gray-300 border-r border-[#262626] text-right text-[#71b536]">Advance (ETB)</th>
                  <th className="py-2.5 px-3 font-semibold text-gray-300 border-r border-[#262626] text-center bg-[#1c1c1c]/20">Advance Date</th>
                  <th className="py-2.5 px-3 font-semibold text-gray-300 border-r border-[#262626] text-left">Deposit Account (Advance)</th>
                  
                  {/* Ledger Paper Stocks */}
                  <th className="py-2.5 px-3 font-semibold text-gray-300 border-r border-[#262626] bg-[#31111E]/20 text-left">Paper 1</th>
                  <th className="py-2.5 px-3 font-semibold text-gray-300 border-r border-[#262626] text-right bg-[#31111E]/20">Amount 1</th>
                  <th className="py-2.5 px-3 font-semibold text-gray-300 border-r border-[#262626] bg-[#31111E]/20 text-left">Paper 2</th>
                  <th className="py-2.5 px-3 font-semibold text-gray-300 border-r border-[#262626] text-right bg-[#31111E]/20">Amount 2</th>
                  <th className="py-2.5 px-3 font-semibold text-gray-300 border-r border-[#262626] bg-[#31111E]/20 text-left">Paper 3</th>
                  <th className="py-2.5 px-3 font-semibold text-gray-300 border-r border-[#262626] text-right bg-[#31111E]/20">Amount 3</th>
                  
                  {/* Auxiliary Papers */}
                  <th className="py-2.5 px-3 font-semibold text-gray-300 border-r border-[#262626] bg-[#112233]/40 text-left">Entrance Paper</th>
                  <th className="py-2.5 px-3 font-semibold text-gray-300 border-r border-[#262626] text-right bg-[#112233]/40">Amt /16</th>
                  <th className="py-2.5 px-3 font-semibold text-gray-300 border-r border-[#262626] bg-[#112233]/40 text-left">Ajabi Paper</th>
                  <th className="py-2.5 px-3 font-semibold text-gray-300 border-r border-[#262626] text-right bg-[#112233]/40">Amt /9</th>
                  
                  <th className="py-2.5 px-3 font-semibold text-gray-300 border-r border-[#262626] text-right">Remaining Balance</th>
                  <th className="py-2.5 px-3 font-semibold text-gray-300 border-r border-[#262626] text-center bg-[#31111E]/5">Final Payment Date</th>
                  <th className="py-2.5 px-3 font-semibold text-[#ee317b] border-r border-[#262626] text-right bg-[#31111E]/10">Full (ETB)</th>
                  <th className="py-2.5 px-3 font-semibold text-gray-300 border-r border-[#262626] text-left">Remaining Bank</th>
                  <th className="py-2.5 px-3 font-semibold text-gray-300 border-r border-[#262626] text-stone-400 text-left">Incompletion Reason</th>
                  
                  <th className="py-2.5 px-3 text-center text-gray-400 font-mono w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626] text-gray-300">
                {filteredCustomers.map((c, index) => {
                  const fullVal = c.quantity * c.unitPrice;
                  const remainingVal = fullVal - c.advancePayment;
                  const isCompleted = !!(c.deliveryDate && c.bankRemainingId);
                  
                  const isSelected = selectedCustomerIds.includes(c.id);
                  
                  return (
                    <tr 
                      key={c.id} 
                      className={`transition-colors ${
                        isCompleted 
                          ? 'completed-order-row' 
                          : c.incompletionReason 
                            ? 'incomplete-order-row' 
                            : isSelected
                              ? 'bg-sky-950/25 border-l-2 border-sky-500'
                              : 'hover:bg-[#1a1a1a]'
                      }`}
                    >
                      {/* Grid Row Index */}
                      <td className="py-2 px-1 text-center font-mono text-gray-500 border-r border-[#262626] bg-[#181818] sticky left-0 z-10">{index + 2}</td>
                      
                      {/* Grid Row Checkbox Column */}
                      <td className="py-2 px-2 border-r border-[#262626] text-center bg-[#151515]/45">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCustomerIds(prev => [...prev, c.id]);
                            } else {
                              setSelectedCustomerIds(prev => prev.filter(id => id !== c.id));
                            }
                          }}
                          className="accent-[#ee317b] cursor-pointer"
                          title="Select order"
                        />
                      </td>
                      
                      {/* Client Type */}
                      <td className="py-2 px-3 border-r border-[#262626] font-mono">
                        <span className={`inline-flex px-2 py-0.5 rounded-none text-[10px] font-semibold border ${c.clientType === 'Organization' ? 'bg-[#2E181D] text-[#F87171] border-[#5D2D35]' : 'bg-[#181818] text-gray-300 border-[#262626]'}`}>
                          {c.clientType.toUpperCase()}
                        </span>
                      </td>
                      
                      {/* Client Name */}
                      <td className="py-2 px-3 border-r border-[#262626] font-semibold text-white whitespace-nowrap">{c.clientName}</td>
                      
                      {/* Phone / Contact */}
                      <td className="py-2 px-3 border-r border-[#262626] font-mono text-gray-400 whitespace-nowrap">{c.phone || '-'}</td>
                      
                      {/* Acquisition Channel */}
                      <td className="py-2 px-3 border-r border-[#262626] text-gray-300 font-mono">
                        <span className="text-[11px] bg-[#181818] border border-[#2DA2D2D]/10 px-1.5 py-0.5 rounded-none">{c.acquisitionSource}</span>
                      </td>
                      
                      {/* Order Taken By */}
                      <td className="py-2 px-3 border-r border-[#262626] font-medium text-gray-300">{c.orderTakenBy}</td>
                      
                      {/* Product Type */}
                      <td className="py-2 px-3 border-r border-[#262626] text-gray-300 whitespace-nowrap font-sans">{c.productType}</td>
                      
                      {/* Quantity */}
                      <td className="py-2 px-3 border-r border-[#262626] text-right font-mono text-white">{c.quantity.toLocaleString()}</td>
                      
                      {/* Unit Price (ETB) */}
                      <td className="py-2 px-3 border-r border-[#262626] text-right font-mono text-gray-300">
                        <div>{c.unitPrice.toLocaleString()}</div>
                        {c.isVatAdded && (
                          <div className="text-[8px] text-[#ee317b] uppercase font-bold tracking-tight">15% VAT Inc.</div>
                        )}
                      </td>
                      
                      {/* Advance (ETB) */}
                      <td className="py-2 px-3 border-r border-[#262626] text-right font-mono text-[#71b536] bg-[#112918]/10">{c.advancePayment.toLocaleString()}</td>
                      
                      {/* Inline Date Picker for Advance Payment Date */}
                      <td className="py-1.5 px-2 border-r border-[#262626] font-mono text-center bg-[#1c1c1c]/10">
                        <input
                          type="date"
                          value={c.advancePaymentDate || ''}
                          onChange={(e) => {
                            onUpdateCustomer({
                              ...c,
                              advancePaymentDate: e.target.value
                            });
                          }}
                          className="bg-[#121212] text-[11px] text-sky-400 hover:text-sky-300 border border-[#262626] hover:border-sky-400 focus:border-sky-400 outline-none px-1.5 py-0.5 font-mono cursor-pointer rounded-none"
                          title="Change Advance Payment Date directly"
                        />
                      </td>

                      {/* Deposit Account (Advance) */}
                      <td className="py-2 px-3 border-r border-[#262626] font-mono text-xs text-stone-450 bg-stone-900/10 whitespace-nowrap">
                        {bankAccounts.find(b => b.id === (c.paymentMethodId || 'b1'))?.name || 'Commercial Bank of Ethiopia'}
                      </td>
                      
                      {/* Paper 1 */}
                      <td className="py-2 px-3 border-r border-[#262626] bg-[#31111E]/10 text-gray-300 font-sans">{c.paperType1}</td>
                      {/* Amount 1 */}
                      <td className="py-2 px-3 border-r border-[#262626] text-right font-mono bg-[#31111E]/10">{c.amount1 || '-'}</td>
                      
                      {/* Paper 2 */}
                      <td className="py-2 px-3 border-r border-[#262626] bg-[#31111E]/10 text-gray-300 font-sans">{c.paperType2}</td>
                      {/* Amount 2 */}
                      <td className="py-2 px-3 border-r border-[#262626] text-right font-mono bg-[#31111E]/10">{c.amount2 || '-'}</td>
                      
                      {/* Paper 3 */}
                      <td className="py-2 px-3 border-r border-[#262626] bg-[#31111E]/10 text-gray-300 font-sans">{c.paperType3}</td>
                      {/* Amount 3 */}
                      <td className="py-2 px-3 border-r border-[#262626] text-right font-mono bg-[#31111E]/10">{c.amount3 || '-'}</td>
                      
                      {/* Entrance Paper */}
                      <td className="py-2 px-3 border-r border-[#262626] bg-[#112233]/20 text-gray-400 font-sans">{c.entrancePaper}</td>
                      {/* Amt /16 */}
                      <td className="py-2 px-3 border-r border-[#262626] text-right font-mono bg-[#112233]/20">{c.amount16 || '-'}</td>
                      
                      {/* Ajabi Paper */}
                      <td className="py-2 px-3 border-r border-[#262626] bg-[#112233]/20 text-gray-400 font-sans">{c.ajabiPaper}</td>
                      {/* Amt /9 */}
                      <td className="py-2 px-3 border-r border-[#262626] text-right font-mono bg-[#112233]/20">{c.amount9 || '-'}</td>
                      
                      {/* Remaining (V) */}
                      <td className={`py-2 px-3 border-r border-[#262626] text-right font-mono font-bold ${remainingVal > 0 ? 'text-[#F87171] bg-[#2E181D]/30' : 'text-[#71b536] bg-[#112918]/30'}`}>
                        {remainingVal === 0 ? 'PAID' : remainingVal.toLocaleString()}
                      </td>
                      
                      {/* Final Payment Date */}
                      <td className="py-2.5 px-3 border-r border-[#262626] font-mono whitespace-nowrap bg-[#1c1c1c]/30 text-center">
                        <div className="inline-flex items-center justify-center gap-1">
                          <input
                            type="date"
                            value={c.deliveryDate || ''}
                            onChange={(e) => {
                              onUpdateCustomer({
                                ...c,
                                deliveryDate: e.target.value
                              });
                            }}
                            className="bg-[#121212] text-xs text-[#ee317b] hover:text-[#ff4e91] border border-[#262626] hover:border-[#ee317b] focus:border-[#ee317b] outline-none px-2 py-1 font-mono cursor-pointer rounded-none"
                            title="Change Final Payment Date directly"
                          />
                          {c.deliveryDate && (
                            <button
                              type="button"
                              onClick={() => {
                                onUpdateCustomer({
                                  ...c,
                                  deliveryDate: '',
                                  bankRemainingId: '' // Clearing date resets the bank complete state too
                                });
                              }}
                              className="text-red-500 hover:text-red-400 font-extrabold px-1.5 py-0.5 cursor-pointer text-xs"
                              title="Clear Final Payment Date"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </td>
                      
                      {/* Full (ETB) */}
                      <td className="py-2 px-3 border-r border-[#262626] text-right font-mono font-bold text-white bg-[#31111E]/10">{fullVal.toLocaleString()}</td>
 
                      {/* Inline Dropdown for Remaining Bank account (Col Y) */}
                      <td className="py-1.5 px-2 border-r border-[#262626] font-mono text-center bg-[#1c1c1c]/10">
                        <select
                          value={c.bankRemainingId || ''}
                          onChange={(e) => {
                            onUpdateCustomer({
                              ...c,
                              bankRemainingId: e.target.value || undefined
                            });
                          }}
                          className="bg-[#121212] text-xs text-gray-300 hover:text-white border border-[#262626] hover:border-[#ee317b] focus:border-[#ee317b] outline-none px-2 py-1 font-mono cursor-pointer rounded-none w-full min-w-[130px] max-w-[180px]"
                        >
                          <option value="">- Empty/Unpaid -</option>
                          {bankAccounts.map(b => (
                            <option key={b.id} value={b.id}>
                              {b.name.replace(/\s*\(.*\)/, '').replace('Commercial Bank of Ethiopia', 'CBE')} {b.accountNumber ? `(${b.accountNumber.slice(-4)})` : ''}
                            </option>
                          ))}
                        </select>
                      </td>
 
                      {/* Inline Input for Incompletion Reason (Col Z) */}
                      <td className="py-1 px-2 border-r border-[#262626] min-w-[220px]">
                        <input
                          type="text"
                          value={c.incompletionReason || ''}
                          placeholder="Completed / enter reason..."
                          onChange={(e) => {
                            onUpdateCustomer({
                              ...c,
                              incompletionReason: e.target.value
                            });
                          }}
                          className="bg-[#121212] text-xs text-gray-350 hover:text-white border border-[#262626] hover:border-[#ee317b] focus:border-[#ee317b] outline-none px-2 py-1 font-sans rounded-none w-full"
                          title="Change Incompletion Reason directly"
                        />
                      </td>
                      
                      {/* Actions */}
                      <td className="py-1 px-2 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1 font-mono">
                          <button
                            type="button"
                            onClick={() => handleOpenDuplicate(c)}
                            className="text-gray-400 hover:text-sky-400 hover:bg-[#262626] p-1.5 rounded-none transition-colors cursor-pointer"
                            title="Add Another Order for Client (Duplicate details)"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(c)}
                            className="text-gray-400 hover:text-[#ee317b] hover:bg-[#262626] p-1.5 rounded-none transition-colors cursor-pointer"
                            title="Edit Record"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingCustomerId(c.id)}
                            className="text-gray-500 hover:text-[#F87171] hover:bg-[#262626] p-1.5 rounded-none transition-colors cursor-pointer"
                            title="Delete Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={24} className="text-center py-10 font-mono text-sm text-gray-500">
                      No customer ledger logs matching this criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* RESPONSIVE CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 select-none animate-none">
          {filteredCustomers.map((c) => {
            const fullVal = c.quantity * c.unitPrice;
            const remainingVal = fullVal - c.advancePayment;
            const isCompleted = !!(c.deliveryDate && c.bankRemainingId);
            const isSelected = selectedCustomerIds.includes(c.id);
            
            return (
              <div 
                key={c.id} 
                className={`border rounded-none p-5 shadow-none flex flex-col justify-between transition-all duration-300 text-gray-300 ${
                  isCompleted 
                    ? 'bg-[#112918]/25 border-green-800/60 shadow-[inset_0_1px_0_0_rgba(52,211,153,0.15)] text-green-300' 
                    : c.incompletionReason
                      ? 'bg-[#2E181D]/60 border-red-900/60 shadow-[inset_0_1px_0_0_rgba(239,68,68,0.15)] text-red-300'
                      : isSelected 
                        ? 'bg-sky-950/20 border-sky-600/60 shadow-[inset_0_1px_0_0_rgba(56,189,248,0.15)] text-sky-300'
                        : 'bg-[#121212] border-[#262626] hover:border-[#ee317b]'
                }`}
              >
                <div className="space-y-4">
                  
                  {/* Top Header Card */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCustomerIds(prev => [...prev, c.id]);
                          } else {
                            setSelectedCustomerIds(prev => prev.filter(id => id !== c.id));
                          }
                        }}
                        className="accent-[#ee317b] w-4.5 h-4.5 mt-0.5 cursor-pointer rounded-none border border-[#262626]"
                        title="Select/Deselect order item"
                      />
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-none border ${
                            c.clientType === 'Organization' ? 'bg-[#2E181D] text-[#F87171] border-[#5D2D35]' : 'bg-[#181818] text-gray-300 border-[#262626]'
                          }`}>
                            {c.clientType}
                          </span>
                          
                          {isCompleted && (
                            <span className="text-[10px] bg-green-900/40 text-green-300 px-2 py-0.5 font-mono border border-green-800/40 rounded-none font-bold uppercase">
                              ✓ COMPLETED
                            </span>
                          )}

                          <span className="text-[10px] bg-[#181818] text-gray-400 px-1.5 py-0.5 font-mono border border-[#262626] rounded-none">
                            AGENT: {c.orderTakenBy.toUpperCase()}
                          </span>
                        </div>
                        <h3 className="font-mono font-bold text-white mt-2.5 text-base">{c.clientName}</h3>
                      </div>
                    </div>
                    
                    <span className="text-xs text-gray-500 font-mono">
                      #{c.id.substring(c.id.length - 4)}
                    </span>
                  </div>

                  {/* Detail Info */}
                  <div className="text-xs text-gray-300 space-y-1.5 font-mono">
                    <div className="flex items-center gap-2">
                       <Phone className="w-3.5 h-3.5 text-[#ee317b]" />
                       <span>{c.phone || 'No phone record'}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-xs">
                       <span className="text-[#ee317b] font-bold text-xs">📅</span>
                       <span className="text-gray-400 flex items-center gap-1.5 flex-wrap">
                         Final Payment Date:
                         <input
                           type="date"
                           value={c.deliveryDate || ''}
                           onChange={(e) => {
                             onUpdateCustomer({
                               ...c,
                               deliveryDate: e.target.value
                             });
                           }}
                           className="bg-[#161616] text-[#ee317b] hover:text-[#ff4e91] border border-[#262626] hover:border-[#ee317b] focus:border-[#ee317b] font-mono px-1.5 py-0.5 rounded-none outline-none cursor-pointer"
                         />
                         {c.deliveryDate && (
                           <button
                             type="button"
                             onClick={() => {
                               onUpdateCustomer({
                                 ...c,
                                 deliveryDate: '',
                                 bankRemainingId: '' // Reset completion status
                               });
                             }}
                             className="text-red-500 hover:text-red-400 font-extrabold px-1.5 py-0.5 cursor-pointer text-xs"
                             title="Clear Final Payment Date"
                           >
                             ✕
                           </button>
                         )}
                       </span>
                    </div>
                    <div className="flex items-center gap-2">
                       <Layers className="w-3.5 h-3.5 text-[#ee317b]" />
                       <span>Product: <strong className="text-white font-sans">{c.productType} ({c.quantity} pcs)</strong></span>
                    </div>
                  </div>

                  {/* Deductions breakdown */}
                  <div className="bg-[#181818] border border-[#262626] rounded-none p-3 text-xs space-y-2">
                    <span className="font-mono text-[10px] text-gray-500 uppercase tracking-wider block font-bold">STOCK ROOM DEDUCTIONS</span>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 font-mono">
                      {c.paperType1 !== 'None' && (() => {
                        const raw = Number((c.amount1 * c.quantity).toFixed(2));
                        const ceiled = Math.ceil(c.amount1 * c.quantity);
                        return (
                          <div>
                            <span className="text-gray-500 block text-[10px]">PAPER 1 (x Qty):</span>
                            <span className="font-medium text-stone-200" title="Sheets per card multiplied by card quantity, rounded up to next integer">
                              {c.paperType1} ({raw === ceiled ? `${raw}` : `${raw} ➔ ${ceiled}`} sheets)
                            </span>
                          </div>
                        );
                      })()}

                      {c.paperType2 !== 'None' && (() => {
                        const raw = Number((c.amount2 * c.quantity).toFixed(2));
                        const ceiled = Math.ceil(c.amount2 * c.quantity);
                        return (
                          <div>
                            <span className="text-gray-500 block text-[10px]">PAPER 2 (x Qty):</span>
                            <span className="font-medium text-stone-200" title="Sheets per card multiplied by card quantity, rounded up to next integer">
                              {c.paperType2} ({raw === ceiled ? `${raw}` : `${raw} ➔ ${ceiled}`} sheets)
                            </span>
                          </div>
                        );
                      })()}

                      {c.paperType3 !== 'None' && (() => {
                        const raw = Number((c.amount3 * c.quantity).toFixed(2));
                        const ceiled = Math.ceil(c.amount3 * c.quantity);
                        return (
                          <div>
                            <span className="text-gray-500 block text-[10px]">PAPER 3 (x Qty):</span>
                            <span className="font-medium text-stone-200" title="Sheets per card multiplied by card quantity, rounded up to next integer">
                              {c.paperType3} ({raw === ceiled ? `${raw}` : `${raw} ➔ ${ceiled}`} sheets)
                            </span>
                          </div>
                        );
                      })()}

                      {c.entrancePaper !== 'None' && (() => {
                        const raw = Number((c.amount16 / 16).toFixed(2));
                        const ceiled = Math.ceil(c.amount16 / 16);
                        return (
                          <div>
                            <span className="text-gray-500 block text-[10px]">ENTRANCE (Pieces / 16):</span>
                            <span className="font-medium text-stone-200" title="Entrance pieces divided by 16, rounded up">
                              {c.entrancePaper} ({raw === ceiled ? `${raw}` : `${raw} ➔ ${ceiled}`} sheets)
                            </span>
                          </div>
                        );
                      })()}

                      {c.ajabiPaper !== 'None' && (() => {
                        const raw = Number((c.amount9 / 9).toFixed(2));
                        const ceiled = Math.ceil(c.amount9 / 9);
                        return (
                          <div>
                            <span className="text-gray-500 block text-[10px]">AJABI (Pieces / 9):</span>
                            <span className="font-medium text-stone-200" title="Ajabi pieces divided by 9, rounded up">
                              {c.ajabiPaper} ({raw === ceiled ? `${raw}` : `${raw} ➔ ${ceiled}`} sheets)
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Finance Calculations */}
                  <div className="border-t border-[#262626] pt-3 grid grid-cols-3 gap-1 text-center font-mono text-xs">
                    <div>
                      <span className="text-gray-500 block text-[9px] uppercase">Full Value</span>
                      <span className="font-bold text-white">{fullVal.toLocaleString()} ETB</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[9px] uppercase">Received</span>
                      <span className="font-bold text-[#71b536]">{c.advancePayment.toLocaleString()} ETB</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[9px] uppercase">Debt Due</span>
                      <span className={`font-bold ${remainingVal > 0 ? 'text-[#F87171]' : 'text-gray-400'}`}>
                        {remainingVal === 0 ? 'None' : `${remainingVal.toLocaleString()} ETB`}
                      </span>
                    </div>
                  </div>

                  {/* Dynamic Treasury Deposit Indicators */}
                  <div className="mt-3.5 pt-2.5 border-t border-[#262626]/60 flex flex-col gap-1.5 text-[10px] font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 uppercase text-[8px] tracking-wider">Deposit A/C (Advance)</span>
                      <span className="text-gray-300 font-medium truncate max-w-[180px]">
                        {bankAccounts.find(ac => ac.id === (c.paymentMethodId || 'b1'))?.name || 'CBE'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 uppercase text-[8px] tracking-wider">A/C for Remaining Due</span>
                      <span className="text-[#ee317b] font-medium truncate max-w-[180px]">
                        {bankAccounts.find(ac => ac.id === (c.bankRemainingId || 'b1'))?.name || 'CBE'}
                      </span>
                    </div>
                    {c.incompletionReason && (
                      <div className="pt-2 border-t border-[#262626]/40 text-left">
                        <span className="text-gray-500 uppercase text-[8px] tracking-wider block mb-0.5">Incompletion Reason / Notes:</span>
                        <p className="text-stone-400 leading-normal text-xs">{c.incompletionReason}</p>
                      </div>
                    )}
                  </div>

                </div>

                {/* Card footer buttons */}
                <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-[#262626]">
                  <button
                    type="button"
                    onClick={() => handleOpenDuplicate(c)}
                    className="text-xs text-sky-400 hover:text-white font-mono font-medium hover:bg-[#262626] px-2.5 py-1.5 rounded-none transition-all flex items-center gap-1 cursor-pointer"
                    title="Copy details to add another order for this client"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    +Order
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(c)}
                    className="text-xs text-[#ee317b] hover:text-white font-mono font-medium hover:bg-[#262626] px-2.5 py-1.5 rounded-none transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Modify
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingCustomerId(c.id)}
                    className="text-xs text-gray-400 hover:text-[#F87171] font-mono hover:bg-[#262626] px-2.5 py-1.5 rounded-none transition-all cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
          {filteredCustomers.length === 0 && (
            <div className="col-span-full text-center py-12 bg-[#121212] border border-[#262626] rounded-none text-gray-400 text-sm font-mono">
              No customer records matched your query terms.
            </div>
          )}
        </div>
      )}

      {/* DYNAMIC BACKDROP DRAWER/MODAL WIZARD */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/75 backdrop-blur-xs select-none overscroll-contain">
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-[#121212] w-full max-w-xl h-[100dvh] sm:h-full border-l border-[#262626] shadow-2xl overflow-hidden flex flex-col justify-between overscroll-contain"
            >
              
              {/* Header */}
              <div>
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#262626] bg-[#181818]">
                  <div>
                    <h3 className="font-mono font-bold text-white text-base flex items-center gap-1.5 uppercase">
                      <Sparkles className="w-5 h-5 text-[#ee317b]" />
                      {editingCustomer ? `Edit Order #${editingCustomer.id.slice(-4)}` : 'Create New Customer Order'}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5 font-mono">Stock room computations subtraction automatically runs based on ledger rules.</p>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="p-1 text-gray-400 hover:text-white hover:bg-[#262626] rounded-none cursor-pointer"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Wizard Tab buttons */}
                <div className="grid grid-cols-3 border-b border-[#262626] text-center font-mono font-semibold text-[11px] select-none bg-[#181818]">
                  <button
                    type="button"
                    onClick={() => setFormStep(1)}
                    className={`py-3 border-b-2 cursor-pointer transition-colors rounded-none ${formStep === 1 ? 'border-[#ee317b] text-[#ee317b] bg-[#121212]' : 'border-transparent text-gray-400 hover:text-white'}`}
                  >
                    1. Account Info
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormStep(2)}
                    className={`py-3 border-b-2 cursor-pointer transition-colors rounded-none ${formStep === 2 ? 'border-[#ee317b] text-[#ee317b] bg-[#121212]' : 'border-transparent text-gray-400 hover:text-white'}`}
                  >
                    2. Primary Papers
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormStep(3)}
                    className={`py-3 border-b-2 cursor-pointer transition-colors rounded-none ${formStep === 3 ? 'border-[#ee317b] text-[#ee317b] bg-[#121212]' : 'border-transparent text-gray-400 hover:text-white'}`}
                  >
                    3. Aux &amp; Special
                  </button>
                </div>
              </div>

              {/* Error strip */}
              {formError && (
                <div className="mx-6 mt-4 bg-[#31111E] border border-[#ee317b]/30 p-3 rounded-none text-[#F87171] text-xs flex items-center gap-2 font-mono">
                  <AlertCircle className="w-4 h-4 text-[#F87171] flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Step Forms */}
              <form onSubmit={handleFormSubmit} className="flex-1 px-6 py-5 overflow-y-auto space-y-6 overscroll-contain">
                
                {formStep === 1 && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-gray-500 font-bold border-b border-[#262626] pb-1.5">1. Client Billing &amp; Pricing Metadata</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-400 font-mono uppercase tracking-wider mb-1" htmlFor="field-client-type">Client Type</label>
                        <select
                          id="field-client-type"
                          value={clientType}
                          onChange={(e) => setClientType(e.target.value as Customer['clientType'])}
                          className="w-full px-3 py-2 text-sm bg-[#181818] text-white border border-[#262626] focus:border-[#ee317b] rounded-none outline-none cursor-pointer font-mono"
                        >
                          {CLIENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-400 font-mono uppercase tracking-wider mb-1" htmlFor="field-client-source">Lead Channel</label>
                        <div className="flex gap-1.5">
                          {!isAddingChannel ? (
                            <>
                              <select
                                id="field-client-source"
                                value={acquisitionSource}
                                onChange={(e) => setAcquisitionSource(e.target.value as Customer['acquisitionSource'])}
                                className="flex-1 px-3 py-2 text-sm bg-[#181818] text-white border border-[#262626] focus:border-[#ee317b] rounded-none outline-none cursor-pointer font-mono"
                              >
                                {acquisitionChannels.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                              <button
                                type="button"
                                onClick={() => setIsAddingChannel(true)}
                                className="px-2.5 bg-[#262626] text-gray-300 hover:text-white border border-[#262626] hover:border-[#ee317b] font-mono text-xs font-bold cursor-pointer transition-colors"
                                title="Add custom Lead Option"
                              >
                                + New
                              </button>
                            </>
                          ) : (
                            <div className="flex-1 flex gap-1 items-center bg-[#181818] border border-[#262626] px-2 py-1">
                              <input
                                type="text"
                                placeholder="Channel name..."
                                value={newChannelInput}
                                onChange={(e) => setNewChannelInput(e.target.value)}
                                className="flex-1 bg-transparent text-white text-xs outline-none border-b border-transparent focus:border-[#ee317b] font-mono"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const cleaned = newChannelInput.trim();
                                    if (cleaned && !acquisitionChannels.includes(cleaned)) {
                                      const updated = [...acquisitionChannels, cleaned];
                                      setAcquisitionChannels(updated);
                                      localStorage.setItem('mena_inc_acquisition_channels_v3', JSON.stringify(updated));
                                      setAcquisitionSource(cleaned);
                                    }
                                    setNewChannelInput('');
                                    setIsAddingChannel(false);
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const cleaned = newChannelInput.trim();
                                  if (cleaned && !acquisitionChannels.includes(cleaned)) {
                                    const updated = [...acquisitionChannels, cleaned];
                                    setAcquisitionChannels(updated);
                                    localStorage.setItem('mena_inc_acquisition_channels_v3', JSON.stringify(updated));
                                    setAcquisitionSource(cleaned);
                                  }
                                  setNewChannelInput('');
                                  setIsAddingChannel(false);
                                }}
                                className="text-[#ee317b] hover:text-pink-400 font-bold px-1 text-xs"
                              >
                                Add
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setNewChannelInput('');
                                  setIsAddingChannel(false);
                                }}
                                className="text-gray-500 hover:text-gray-300 px-1 text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-400 font-mono uppercase tracking-wider mb-1" htmlFor="field-client-name">Client Name <span className="text-[#F87171]">*</span></label>
                      <input
                        id="field-client-name"
                        type="text"
                        required
                        placeholder="e.g. Almaz Tekle"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-[#181818] text-white border border-[#262626] focus:border-[#ee317b] rounded-none outline-none font-sans"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-400 font-mono uppercase tracking-wider mb-1" htmlFor="field-client-phone">Phone / Contact</label>
                        <input
                          id="field-client-phone"
                          type="text"
                           placeholder="e.g. +251 911..."
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-[#181818] text-white border border-[#262626] focus:border-[#ee317b] rounded-none outline-none font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-400 font-mono uppercase tracking-wider mb-1 flex items-center gap-1" htmlFor="field-client-agent">
                          Taken By <span className="text-[#F87171]">*</span>
                          {!isAdmin && <Lock className="w-3 h-3 text-[#ee317b]" />}
                        </label>
                        <select
                          id="field-client-agent"
                          disabled={!isAdmin}
                          value={orderTakenBy}
                          onChange={(e) => setOrderTakenBy(e.target.value as Customer['orderTakenBy'])}
                          className={`w-full px-3 py-2 text-sm border font-mono rounded-none outline-none ${
                            !isAdmin 
                              ? 'bg-[#181818]/60 border-[#222222] text-zinc-500 cursor-not-allowed' 
                              : 'bg-[#181818] border-[#262626] text-white focus:border-[#ee317b] cursor-pointer'
                          }`}
                        >
                          {(employees.length > 0 ? employees.map(emp => emp.name) : AGENTS).map(a => (
                            <option key={a} value={a}>{a}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-xs font-medium text-gray-400 font-mono uppercase tracking-wider" htmlFor="field-client-product">Product Type</label>
                          <button
                            type="button"
                            onClick={() => setShowProductManager(true)}
                            className="text-[10px] text-[#ee317b] hover:underline uppercase font-mono font-bold cursor-pointer"
                          >
                            Manage
                          </button>
                        </div>
                        <div className="flex gap-1.5">
                          {!isAddingProduct ? (
                            <>
                              <select
                                id="field-client-product"
                                value={productType}
                                onChange={(e) => setProductType(e.target.value)}
                                className="flex-1 px-3 py-2 text-sm bg-[#181818] text-white border border-[#262626] focus:border-[#ee317b] rounded-none outline-none cursor-pointer font-sans"
                              >
                                {productTypes.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                              </select>
                              <button
                                type="button"
                                onClick={() => setIsAddingProduct(true)}
                                className="px-2.5 bg-[#262626] text-gray-300 hover:text-white border border-[#262626] hover:border-[#ee317b] font-mono text-xs font-bold cursor-pointer transition-colors"
                                title="Add custom Product Type"
                              >
                                + New
                              </button>
                            </>
                          ) : (
                            <div className="flex-1 flex gap-1 items-center bg-[#181818] border border-[#262626] px-2 py-1">
                              <input
                                type="text"
                                placeholder="Product name..."
                                value={newProductInput}
                                onChange={(e) => setNewProductInput(e.target.value)}
                                className="flex-1 bg-transparent text-white text-xs outline-none border-b border-transparent focus:border-[#ee317b] font-sans"
                                onKeyDown={async (e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    await handleAddProductInline();
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={handleAddProductInline}
                                className="text-[#ee317b] hover:text-pink-400 font-bold px-1 text-xs font-mono"
                              >
                                Add
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setNewProductInput('');
                                  setIsAddingProduct(false);
                                }}
                                className="text-gray-500 hover:text-gray-300 px-1 text-xs font-mono"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {editingCustomer && (
                        <div>
                          <label className="block text-xs font-medium text-gray-400 font-mono uppercase tracking-wider mb-1" htmlFor="field-client-delivery">Final Payment Date (Delivery Date)</label>
                          <input
                            id="field-client-delivery"
                            type="date"
                            value={deliveryDate}
                            onChange={(e) => setDeliveryDate(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-[#181818] text-white border border-[#262626] focus:border-[#ee317b] rounded-none outline-none font-mono cursor-pointer"
                          />
                        </div>
                      )}
                    </div>

                    <div className="bg-[#181818] border border-[#262626] rounded-none p-4 mt-6 space-y-4">
                      <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider font-bold block">Live Automated Financial Calculations</span>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] font-mono font-medium text-gray-400 uppercase tracking-wider mb-1" htmlFor="field-client-qty">Quantity</label>
                          <input
                            id="field-client-qty"
                            type="text"
                            required
                            value={qtyInput}
                            onChange={(e) => {
                              const v = cleanLeadingZeros(e.target.value);
                              setQtyInput(v);
                              setQuantity(parseFractionOrExpression(v));
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const res = parseFractionOrExpression(qtyInput);
                                setQtyInput(res.toString());
                                setQuantity(res);
                              }
                            }}
                            className="w-full px-2.5 py-1.5 text-xs bg-[#121212] border border-[#262626] text-white rounded-none outline-none font-mono focus:border-[#ee317b]"
                          />
                        </div>

                        <div className="border border-[#262626] bg-[#121212] p-3 space-y-3 col-span-3">
                          <label className="flex items-center gap-2.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isVatAdded}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setIsVatAdded(checked);
                                if (checked) {
                                  // compute VAT from current base unit price
                                  const baseVal = parseFractionOrExpression(baseUnitPriceInput);
                                  const withVat = Math.round(baseVal * 1.15 * 100) / 100;
                                  setPriceInput(withVat.toString());
                                  setUnitPrice(withVat);
                                } else {
                                  // revert back to original
                                  setPriceInput(baseUnitPriceInput);
                                  setUnitPrice(parseFractionOrExpression(baseUnitPriceInput));
                                }
                              }}
                              className="accent-[#ee317b]"
                            />
                            <span className="text-xs text-white uppercase tracking-wider font-bold">Needs Receipt? (Add 15% VAT)</span>
                          </label>

                          {isVatAdded && (
                            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-[#262626]/60">
                              <div>
                                <label className="block text-[10px] text-gray-400 uppercase tracking-wider font-mono mb-1">Item Price BEFORE VAT (ETB)</label>
                                <input
                                  type="text"
                                  value={baseUnitPriceInput}
                                  onChange={(e) => {
                                    const cleaned = cleanLeadingZeros(e.target.value);
                                    setBaseUnitPriceInput(cleaned);
                                    // auto-calc dynamic with-vat price
                                    const baseVal = parseFractionOrExpression(cleaned);
                                    const withVat = Math.round(baseVal * 1.15 * 100) / 100;
                                    setPriceInput(withVat.toString());
                                    setUnitPrice(withVat);
                                  }}
                                  className="w-full px-2.5 py-1.5 text-xs bg-[#181818] border border-[#262626] text-white rounded-none outline-none font-mono focus:border-[#ee317b]"
                                  placeholder="e.g. 100"
                                />
                              </div>
                              <div className="text-xs font-mono flex flex-col justify-center text-gray-500 pl-1">
                                <p>15% VAT Rate Added</p>
                                <p className="text-white">VAT: <span className="text-[#ee317b] font-bold">{(parseFractionOrExpression(baseUnitPriceInput) * 0.15).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ETB</span></p>
                              </div>
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono font-medium text-gray-400 uppercase tracking-wider mb-1" htmlFor="field-client-price">Unit Price (ETB)</label>
                          <input
                            id="field-client-price"
                            type="text"
                            required
                            disabled={isVatAdded}
                            value={priceInput}
                            onChange={(e) => {
                              const v = cleanLeadingZeros(e.target.value);
                              setPriceInput(v);
                              setUnitPrice(parseFractionOrExpression(v));
                              // if not vat added, keep base price input in sync too
                              if (!isVatAdded) {
                                setBaseUnitPriceInput(v);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const res = parseFractionOrExpression(priceInput);
                                setPriceInput(res.toString());
                                setUnitPrice(res);
                              }
                            }}
                            className="w-full px-2.5 py-1.5 text-xs bg-[#121212] border border-[#262626] text-white rounded-none outline-none font-mono focus:border-[#ee317b] disabled:opacity-65"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono font-medium text-gray-400 uppercase tracking-wider mb-1" htmlFor="field-client-advance">Advance (ETB)</label>
                          <input
                            id="field-client-advance"
                            type="text"
                            required
                            value={advanceInput}
                            onChange={(e) => {
                              const v = cleanLeadingZeros(e.target.value);
                              setAdvanceInput(v);
                              setAdvancePayment(parseFractionOrExpression(v));
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const res = parseFractionOrExpression(advanceInput);
                                setAdvanceInput(res.toString());
                                setAdvancePayment(res);
                              }
                            }}
                            className="w-full px-2.5 py-1.5 text-xs bg-[#121212] border border-[#262626] text-white rounded-none outline-none font-mono focus:border-[#ee317b]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div>
                          <label className="block text-[10px] font-mono font-medium text-gray-400 uppercase tracking-wider mb-1" htmlFor="field-client-advance-date">Advance Payment Date</label>
                          <input
                            id="field-client-advance-date"
                            type="date"
                            required
                            value={advancePaymentDate}
                            onChange={(e) => setAdvancePaymentDate(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-[#121212] border border-[#262626] text-white rounded-none outline-none font-mono focus:border-[#ee317b] cursor-pointer"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono font-medium text-gray-400 uppercase tracking-wider mb-1" htmlFor="field-client-bank">Bank Account for Advance (Deposit)</label>
                          <select
                            id="field-client-bank"
                            value={paymentMethodId}
                            onChange={(e) => setPaymentMethodId(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-[#121212] border border-[#262626] text-white rounded-none outline-none font-mono focus:border-[#ee317b] cursor-pointer"
                          >
                            {bankAccounts.map(b => (
                              <option key={b.id} value={b.id}>
                                {b.name} {b.accountNumber ? `(A/C: ${b.accountNumber})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pb-1">
                        <div>
                          <label className="block text-[10px] font-mono font-medium text-gray-400 uppercase tracking-wider mb-1" htmlFor="field-client-bank-remaining">Bank for Remaining Balance (Final)</label>
                          <select
                            id="field-client-bank-remaining"
                            value={bankRemainingId}
                            onChange={(e) => setBankRemainingId(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-[#121212] border border-[#262626] text-white rounded-none outline-none font-mono focus:border-[#ee317b] cursor-pointer animate-pulse"
                          >
                            {bankAccounts.map(b => (
                              <option key={b.id} value={b.id}>
                                {b.name} {b.accountNumber ? `(A/C: ${b.accountNumber})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono font-medium text-gray-400 uppercase tracking-wider mb-1" htmlFor="field-incompletion-reason">Incompletion Reason / Notes</label>
                          <input
                            id="field-incompletion-reason"
                            type="text"
                            placeholder="e.g. Awaiting design finalization or None"
                            value={incompletionReason}
                            onChange={(e) => setIncompletionReason(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-[#121212] border border-[#262626] text-white rounded-none outline-none font-sans focus:border-[#ee317b]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[#262626] text-xs font-mono">
                        <div>
                          <span className="text-gray-500 block text-[9px] uppercase font-mono">Full Payment</span>
                          <span className="text-sm font-semibold text-[#ee317b]">
                            {computedFullPayment.toLocaleString()} ETB
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 block text-[9px] uppercase font-mono">Remaining Due</span>
                          <span className={`text-sm font-semibold ${computedRemainingBalance > 0 ? 'text-[#F87171]' : 'text-[#71b536]'}`}>
                            {computedRemainingBalance <= 0 ? 'Paid (0 ETB)' : `${computedRemainingBalance.toLocaleString()} ETB`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {formStep === 2 && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-gray-500 font-bold border-b border-[#262626] pb-1.5">2. Standard Layout Papers Deduction</h4>
                    <p className="text-xs text-gray-400 leading-relaxed font-mono">
                      Select which paper variant types and the literal sheets consumed by this project. Standard papers decrement 1-for-1 from matching stock names.
                    </p>

                    {/* Paper Type 1 */}
                    <div className="bg-[#181818] border border-[#262626] rounded-none p-4 space-y-3 font-mono">
                      <span className="text-[10px] text-[#ee317b] tracking-wider uppercase font-bold block">First Layout Stock Deduction</span>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1">Paper Type 1</label>
                          <select
                            value={paperType1}
                            onChange={(e) => setPaperType1(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-[#121212] text-white border border-[#262626] focus:border-[#ee317b] rounded-none outline-none font-mono cursor-pointer"
                          >
                            {paperStocks.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1">Sheets consumed per card/piece</label>
                          <input
                            type="text"
                            value={amount1}
                            onChange={(e) => setAmount1(cleanLeadingZeros(e.target.value))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                setAmount1(parseFractionOrExpression(amount1).toString());
                              }
                            }}
                            className="w-full px-2.5 py-1.5 text-xs bg-[#121212] text-white border border-[#262626] rounded-none outline-none focus:border-[#ee317b]"
                            placeholder="e.g. 1/4 or 0.5"
                          />
                          <div className="text-[10px] text-gray-500 mt-1 flex flex-col font-mono gap-0.5">
                            <span className="text-stone-300">Parsed factor: {parseFractionOrExpression(amount1)} sheets/card</span>
                            <span className="text-[#ee317b]">Total sheets deducted ({parseFractionOrExpression(amount1)} × {quantity}): {Number((parseFractionOrExpression(amount1) * quantity).toFixed(2))} sheets</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Paper Type 2 */}
                    <div className="bg-[#181818] border border-[#262626] rounded-none p-4 space-y-3 font-mono">
                      <span className="text-[10px] text-gray-400 tracking-wider uppercase font-bold block">Optional Second Layout Stock</span>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1">Paper Type 2</label>
                          <select
                            value={paperType2}
                            onChange={(e) => setPaperType2(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-[#121212] text-white border border-[#262626] focus:border-[#ee317b] rounded-none outline-none font-mono cursor-pointer"
                          >
                            <option value="None">None</option>
                            {paperStocks.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1">Sheets consumed per card/piece</label>
                          <input
                            type="text"
                            value={amount2}
                            onChange={(e) => setAmount2(cleanLeadingZeros(e.target.value))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                setAmount2(parseFractionOrExpression(amount2).toString());
                              }
                            }}
                            disabled={paperType2 === 'None'}
                            className="w-full px-2.5 py-1.5 text-xs bg-[#121212] text-white border border-[#262626] rounded-none outline-none focus:border-[#ee317b] disabled:opacity-40 disabled:cursor-not-allowed"
                            placeholder="e.g. 1/2"
                          />
                          {paperType2 !== 'None' && (
                            <div className="text-[10px] text-gray-500 mt-1 flex flex-col font-mono gap-0.5">
                              <span className="text-stone-300">Parsed factor: {parseFractionOrExpression(amount2)} sheets/card</span>
                              <span className="text-[#71b536]">Total sheets deducted ({parseFractionOrExpression(amount2)} × {quantity}): {Number((parseFractionOrExpression(amount2) * quantity).toFixed(2))} sheets</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Paper Type 3 */}
                    <div className="bg-[#181818] border border-[#262626] rounded-none p-4 space-y-3 font-mono">
                      <span className="text-[10px] text-gray-400 tracking-wider uppercase font-bold block">Optional Third Layout Stock</span>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1">Paper Type 3</label>
                          <select
                            value={paperType3}
                            onChange={(e) => setPaperType3(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-[#121212] text-white border border-[#262626] focus:border-[#ee317b] rounded-none outline-none font-mono cursor-pointer"
                          >
                            <option value="None">None</option>
                            {paperStocks.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1">Sheets consumed per card/piece</label>
                          <input
                            type="text"
                            value={amount3}
                            onChange={(e) => setAmount3(cleanLeadingZeros(e.target.value))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                setAmount3(parseFractionOrExpression(amount3).toString());
                              }
                            }}
                            disabled={paperType3 === 'None'}
                            className="w-full px-2.5 py-1.5 text-xs bg-[#121212] text-white border border-[#262626] rounded-none outline-none focus:border-[#ee317b] disabled:opacity-40 disabled:cursor-not-allowed"
                            placeholder="e.g. 1/4"
                          />
                          {paperType3 !== 'None' && (
                            <div className="text-[10px] text-gray-500 mt-1 flex flex-col font-mono gap-0.5">
                              <span className="text-stone-300">Parsed factor: {parseFractionOrExpression(amount3)} sheets/card</span>
                              <span className="text-[#71b536]">Total sheets deducted ({parseFractionOrExpression(amount3) * quantity}): {Number((parseFractionOrExpression(amount3) * quantity).toFixed(2))} sheets</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {formStep === 3 && (
                  <div className="space-y-4 font-mono">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-gray-500 font-bold border-b border-[#262626] pb-1.5">3. Auxiliary / Special Layout Sheets</h4>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Entrance paper sheet counts are divided by 16, and Ajabi paper counts are divided by 9 prior to subtracting. Select materials below:
                    </p>

                    {/* Entrance Aux (Divided by 16) */}
                    <div className="bg-[#181818] border border-[#262626] rounded-none p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-sky-400 tracking-wider uppercase font-bold block">Entrance Sheets Spec</span>
                        <span className="text-[9px] bg-[#112233]/40 border border-sky-900 text-sky-400 px-1.5 py-0.5 rounded-none font-mono">DIVIDED BY 16</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1">Entrance Stock</label>
                          <select
                            value={entrancePaper}
                            onChange={(e) => setEntrancePaper(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-[#121212] text-white border border-[#262626] focus:border-[#ee317b] rounded-none outline-none cursor-pointer"
                          >
                            <option value="None">None</option>
                            {paperStocks.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1">Deducted sheets (expression enabled)</label>
                          <input
                            type="text"
                            value={amount16}
                            onChange={(e) => setAmount16(cleanLeadingZeros(e.target.value))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                setAmount16(parseFractionOrExpression(amount16).toString());
                              }
                            }}
                            disabled={entrancePaper === 'None'}
                            className="w-full px-2.5 py-1.5 text-xs bg-[#121212] text-white border border-[#262626] rounded-none outline-none focus:border-[#ee317b] disabled:opacity-40 disabled:cursor-not-allowed"
                            placeholder="e.g. 160 or 16 * 10"
                          />
                          {entrancePaper !== 'None' && (
                            <div className="text-[10px] text-gray-500 mt-1 flex flex-col font-mono">
                              <span className="text-stone-300">Parsed: {parseFractionOrExpression(amount16)} sheets</span>
                              <span className="text-sky-400">Deduction ratio (sheets/16): {(parseFractionOrExpression(amount16) / 16).toFixed(2)} sheets</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-500 leading-tight">
                        E.g. entering 160 sheets automatically deducts exactly 10 full primary sheets from the stock rooms.
                      </p>
                    </div>

                    {/* Ajabi Aux (Divided by 9) */}
                    <div className="bg-[#181818] border border-[#262626] rounded-none p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-pink-400 tracking-wider uppercase font-bold block">Ajabi Sheets Spec</span>
                        <span className="text-[9px] bg-pink-900/20 border border-pink-900/40 text-pink-400 px-1.5 py-0.5 rounded-none font-mono">DIVIDED BY 9</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1">Ajabi Stock</label>
                          <select
                            value={ajabiPaper}
                            onChange={(e) => setAjabiPaper(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-[#121212] text-white border border-[#262626] focus:border-[#ee317b] rounded-none outline-none cursor-pointer"
                          >
                            <option value="None">None</option>
                            {paperStocks.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1">Deducted sheets (expression enabled)</label>
                          <input
                            type="text"
                            value={amount9}
                            onChange={(e) => setAmount9(cleanLeadingZeros(e.target.value))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                setAmount9(parseFractionOrExpression(amount9).toString());
                              }
                            }}
                            disabled={ajabiPaper === 'None'}
                            className="w-full px-2.5 py-1.5 text-xs bg-[#121212] text-white border border-[#262626] rounded-none outline-none focus:border-[#ee317b] disabled:opacity-40 disabled:cursor-not-allowed"
                            placeholder="e.g. 90 or 9 * 10"
                          />
                          {ajabiPaper !== 'None' && (
                            <div className="text-[10px] text-gray-500 mt-1 flex flex-col font-mono">
                              <span className="text-stone-300">Parsed: {parseFractionOrExpression(amount9)} sheets</span>
                              <span className="text-pink-400">Deduction ratio (sheets/9): {(parseFractionOrExpression(amount9) / 9).toFixed(2)} sheets</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-500 leading-tight">
                        E.g. entering 90 sheets automatically deducts exactly 10 full primary sheets from available warehouse stocks.
                      </p>
                    </div>
                  </div>
                )}

              </form>

              {/* Bottom Nav */}
              <div className="border-t border-[#262626] px-6 py-4 bg-[#181818] flex items-center justify-between select-none">
                <div>
                  {formStep > 1 && (
                    <button
                      type="button"
                      onClick={() => setFormStep((prev) => (prev - 1) as 1 | 2 | 3)}
                      className="px-4 py-2 bg-transparent text-gray-300 hover:text-white border border-[#262626] select-none text-xs font-mono font-bold cursor-pointer"
                    >
                      Back
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2 bg-transparent text-gray-400 hover:text-white text-xs font-mono select-none cursor-pointer"
                  >
                    Cancel
                  </button>
                  
                  {/* Save and Add Another visible on all steps for convenience when Aux/Special page is not needed */}
                  {!editingCustomer && (
                    <button
                      type="button"
                      onClick={handleSaveAndAddAnother}
                      className="px-4 py-2 border border-[#ee317b] text-[#ee317b] hover:bg-[#ee317b]/10 text-xs font-mono font-bold cursor-pointer select-none"
                      title="Save this order, and immediately start another order for this same customer"
                    >
                      Save &amp; Add Another Order
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleFormSubmit}
                    className="px-5 py-2 bg-[#ee317b] hover:bg-[#d61e63] text-white text-xs font-mono font-bold cursor-pointer select-none"
                  >
                    {editingCustomer ? 'Save Modification' : 'Complete Record Order'}
                  </button>

                  {formStep < 3 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (formStep === 1 && !clientName.trim()) {
                          setFormError('Client name holds metadata requirements and must be inputted.');
                          return;
                        }
                        setFormError('');
                        setFormStep((prev) => (prev + 1) as 1 | 2 | 3);
                      }}
                      className="px-4 py-2 bg-[#262626] text-stone-300 border border-[#3e3e3e] font-mono font-bold text-xs hover:bg-[#323232] hover:text-white flex items-center gap-1 cursor-pointer select-none"
                    >
                      <span>Next Page</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deletingCustomerId && (() => {
          const targetCust = customers.find(c => c.id === deletingCustomerId);
          if (!targetCust) return null;
          return (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 font-mono select-none"
            >
              <motion.div 
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-[#121212] border border-[#ee317b]/40 max-w-md w-full p-6 text-left space-y-5"
              >
                <div className="flex items-start gap-3.5">
                  <div className="text-[#ee317b] text-3xl">⚠️</div>
                  <div className="space-y-1.5 font-semibold text-white">
                    <h3 className="text-white text-sm font-bold uppercase tracking-wider">Confirm Card Order Disposal</h3>
                    <p className="text-xs text-gray-400 font-sans font-normal leading-relaxed">
                      Are you sure you want to delete the paper consumption record for <span className="text-white font-semibold font-mono">"{targetCust.clientName}"</span>? This operation is irreversible and will restore occupied paper quantities back to your available inventory room balances.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#262626]">
                  <button
                    onClick={() => setDeletingCustomerId(null)}
                    className="px-3.5 py-1.5 text-xs text-gray-400 hover:text-white border border-[#262626] bg-[#181818] uppercase tracking-wider cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      onDeleteCustomer(deletingCustomerId);
                      setDeletingCustomerId(null);
                    }}
                    className="px-4 py-1.5 text-xs bg-[#ee317b] hover:bg-[#d61e63] text-white font-bold uppercase tracking-widest cursor-pointer"
                  >
                    Delete Permanently
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      <AnimatePresence>
        {showBulkDeleteConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 font-mono select-none"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[#121212] border border-[#ee317b]/60 max-w-md w-full p-6 text-left space-y-5"
            >
              <div className="flex items-start gap-3.5">
                <div className="text-[#ee317b] text-3xl">⚠️</div>
                <div className="space-y-1.5 font-semibold text-white">
                  <h3 className="text-white text-sm font-bold uppercase tracking-wider">Confirm Bulk Order Disposal</h3>
                  <p className="text-xs text-gray-400 font-sans font-normal leading-relaxed">
                    Are you sure you want to permanently delete the <span className="text-white font-bold font-mono">{selectedCustomerIds.length}</span> selected customer logs? 
                  </p>
                  <p className="text-xs text-stone-500 leading-relaxed font-sans font-normal">
                    This will wipe out all selected client records and return occupied paper stock weights to available inventory balances.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#262626]">
                <button
                  onClick={() => setShowBulkDeleteConfirm(false)}
                  className="px-3.5 py-1.5 text-xs text-gray-400 hover:text-white border border-[#262626] bg-[#181818] uppercase tracking-wider cursor-pointer font-mono"
                >
                  Cancel
                </button>
                <button
                  onClick={executeBulkDeleteConfirmed}
                  className="px-4 py-1.5 text-xs bg-[#ee317b] hover:bg-[#d61e63] text-white font-bold uppercase tracking-widest cursor-pointer font-mono"
                >
                  Delete Selected
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showProformaModal && (
          <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 overflow-y-auto font-sans text-xs overscroll-contain">
            <div className="max-w-4xl w-full bg-[#181818] border border-[#262626] p-6 relative flex flex-col gap-4 rounded-none my-8 max-h-[90vh] overscroll-contain">
              
              {/* Controller Bar */}
              <div className="flex flex-col gap-3 border-b pb-3 border-[#262626] font-mono text-xs print-hidden-stamp-toggle">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-gray-300 font-semibold uppercase">
                      {isStandaloneProformaMode ? 'STANDALONE PROFORMA WRITER' : 'PROFORMA AUTOMATION LEDGER'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Interactive Toggle for Stamp Seal */}
                    <label className="flex items-center gap-2 text-stone-300 cursor-pointer text-xs mr-3 select-none">
                      <input
                        type="checkbox"
                        checked={applyDigitalStamp}
                        onChange={(e) => setApplyDigitalStamp(e.target.checked)}
                        className="accent-[#71b536]"
                      />
                      <span>Apply PLC Stamp Seal</span>
                    </label>

                    {/* Interactive Toggle for VAT */}
                    <label className="flex items-center gap-2 text-stone-300 cursor-pointer text-xs mr-3 select-none">
                      <input
                        type="checkbox"
                        checked={proformaIncludeVat}
                        onChange={(e) => setProformaIncludeVat(e.target.checked)}
                        className="accent-[#ee317b]"
                      />
                      <span>Include 15% VAT</span>
                    </label>

                    {/* Export PDF Button (Instant client-generate) */}
                    <button
                      id="export-pdf-direct-btn"
                      type="button"
                      onClick={exportDirectPDF}
                      className="px-4 py-1.5 bg-[#71b536] hover:bg-[#5ea126] text-black font-bold cursor-pointer rounded-none uppercase text-[10px] tracking-wider transition-colors flex items-center gap-1"
                    >
                      <span>📥 Export PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowProformaModal(false)}
                      className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-gray-300 font-bold cursor-pointer rounded-none uppercase text-[10px] tracking-wider transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>

                {/* STANDALONE PROFORMA FORM WRITER CONTROLS ROW */}
                {isStandaloneProformaMode && (
                  <div className="bg-[#1a1215] border border-[#ee317b]/30 p-4 space-y-3 font-mono text-xs select-none">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#110b0d] p-3 border border-[#2d2024] mb-1">
                      <div>
                        <label className="block text-[9px] uppercase text-gray-400 font-bold mb-1">PROFORMA CLIENT NAME</label>
                        <input 
                          type="text" 
                          value={standaloneClientName} 
                          onChange={(e) => setStandaloneClientName(e.target.value)} 
                          className="w-full bg-[#181818] border border-[#2d2024] px-2.5 py-1 text-[11px] hover:border-[#ee317b]/40 outline-none focus:border-[#ee317b] text-white"
                          placeholder="Mena Corporate Client PLC"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase text-gray-400 font-bold mb-1">PROFORMA CLIENT PHONE</label>
                        <input 
                          type="text" 
                          value={standaloneClientPhone} 
                          onChange={(e) => setStandaloneClientPhone(e.target.value)} 
                          className="w-full bg-[#181818] border border-[#2d2024] px-2.5 py-1 text-[11px] hover:border-[#ee317b]/40 outline-none focus:border-[#ee317b] text-white"
                          placeholder="+251 900 000 000"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-b border-[#2d2024] pb-2">
                      <span className="text-[#ee317b] font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        ✨ Quick Draft Editor
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setStandaloneProformaItems(prev => [
                            ...prev,
                            {
                              id: `temp-${Date.now()}`,
                              productType: 'Double Ring Notebook (50 gsm)',
                              quantity: 1000,
                              unitPrice: 85.00,
                              advancePayment: 0
                            }
                          ]);
                        }}
                        className="bg-[#ee317b] hover:bg-[#d61e63] text-white px-2.5 py-1 text-[10px] font-bold uppercase cursor-pointer"
                      >
                        + Add Custom Row
                      </button>
                    </div>

                    {standaloneProformaItems.length === 0 ? (
                      <p className="text-gray-400 italic text-[11px] py-1">No items drafted. Click "+ Add Custom Row" to start designing your proforma.</p>
                    ) : (
                      <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                        {standaloneProformaItems.map((item, index) => (
                          <div key={item.id} className="grid grid-cols-12 gap-2 items-center bg-[#241c1e]/60 p-2 border border-[#2d2024]">
                            <div className="col-span-1 text-center font-bold text-[#ee317b] text-[10px]">
                              #{index + 1}
                            </div>
                            <div className="col-span-4">
                              <label className="block text-[8px] text-gray-500 uppercase tracking-widest mb-0.5">Product Description</label>
                              <input
                                type="text"
                                value={item.productType}
                                placeholder="E.g. Double Ring Notebook (50 gsm)"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setStandaloneProformaItems(prev => prev.map(p => p.id === item.id ? { ...p, productType: val } : p));
                                }}
                                className="w-full bg-[#121212] text-white border border-[#2d2226] px-1.5 py-1 text-[10px] rounded-none outline-none focus:border-[#ee317b]"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-[8px] text-gray-500 uppercase tracking-widest mb-0.5">Qty (pcs)</label>
                              <input
                                type="number"
                                placeholder="Qty"
                                value={item.quantity}
                                onChange={(e) => {
                                  const val = Number(e.target.value) || 0;
                                  setStandaloneProformaItems(prev => prev.map(p => p.id === item.id ? { ...p, quantity: val } : p));
                                }}
                                className="w-full bg-[#121212] text-white border border-[#2d2226] px-1.5 py-1 text-[10px] rounded-none outline-none focus:border-[#ee317b]"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-[8px] text-gray-500 uppercase tracking-widest mb-0.5">Unit Price</label>
                              <input
                                type="number"
                                placeholder="Price"
                                value={item.unitPrice}
                                onChange={(e) => {
                                  const val = Number(e.target.value) || 0;
                                  setStandaloneProformaItems(prev => prev.map(p => p.id === item.id ? { ...p, unitPrice: val } : p));
                                }}
                                className="w-full bg-[#121212] text-white border border-[#2d2226] px-1.5 py-1 text-[10px] rounded-none outline-none focus:border-[#ee317b]"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-[8px] text-gray-500 uppercase tracking-widest mb-0.5">Paid Advance</label>
                              <input
                                type="number"
                                placeholder="Paid"
                                value={item.advancePayment}
                                onChange={(e) => {
                                  const val = Number(e.target.value) || 0;
                                  setStandaloneProformaItems(prev => prev.map(p => p.id === item.id ? { ...p, advancePayment: val } : p));
                                }}
                                className="w-full bg-[#121212] text-white border border-[#2d2226] px-1.5 py-1 text-[10px] rounded-none outline-none focus:border-[#ee317b]"
                              />
                            </div>
                            <div className="col-span-1 text-right pt-2.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setStandaloneProformaItems(prev => prev.filter(p => p.id !== item.id));
                                }}
                                className="text-red-400 hover:text-red-500 font-bold px-1 py-0.5 text-xs cursor-pointer"
                                title="Delete Row"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Printable Area - Rendered using White-Paper Theme */}
              <div className="bg-white text-black p-10 shadow-inner overflow-y-auto border border-gray-300 select-text max-h-[70vh] rounded-none flex-1 font-sans overscroll-contain" id="proforma-print-container">
                <style dangerouslySetInnerHTML={{__html: `
                  /* Explicit print-safe hex color overrides for all elements in the proforma container */
                  #proforma-print-container {
                    background-color: #ffffff !important;
                    color: #111827 !important;
                    border-color: #e5e7eb !important;
                  }
                  #proforma-print-container .text-gray-900,
                  #proforma-print-container strong,
                  #proforma-print-container h1,
                  #proforma-print-container h2 {
                    color: #111827 !important;
                  }
                  #proforma-print-container .text-gray-800,
                  #proforma-print-container .text-gray-750,
                  #proforma-print-container .text-gray-705 {
                    color: #1f2937 !important;
                  }
                  #proforma-print-container .text-gray-700,
                  #proforma-print-container .text-gray-600 {
                    color: #374151 !important;
                  }
                  #proforma-print-container .text-gray-550,
                  #proforma-print-container .text-gray-500,
                  #proforma-print-container .text-gray-450 {
                    color: #6b7280 !important;
                  }
                  #proforma-print-container .text-gray-400 {
                    color: #9ca3af !important;
                  }
                  #proforma-print-container .text-black {
                    color: #000000 !important;
                  }
                  #proforma-print-container .text-\[\#ee317b\] {
                    color: #ee317b !important;
                  }
                  #proforma-print-container .text-\[\#71b536\] {
                    color: #71b536 !important;
                  }
                  #proforma-print-container .text-green-700 {
                    color: #15803d !important;
                  }
                  #proforma-print-container .text-red-700 {
                    color: #b91c1c !important;
                  }
                  
                  #proforma-print-container .border-gray-100 {
                    border-color: #f3f4f6 !important;
                  }
                  #proforma-print-container .border-gray-200 {
                    border-color: #e5e7eb !important;
                  }
                  #proforma-print-container .border-gray-250 {
                    border-color: #e2e8f0 !important;
                  }
                  #proforma-print-container .border-gray-300 {
                    border-color: #d1d5db !important;
                  }
                  #proforma-print-container .border-gray-350 {
                    border-color: #cbd5e1 !important;
                  }
                  #proforma-print-container .border-gray-400 {
                    border-color: #9ca3af !important;
                  }
                  #proforma-print-container table,
                  #proforma-print-container th,
                  #proforma-print-container td,
                  #proforma-print-container tr,
                  #proforma-print-container div {
                    border-color: #d1d5db;
                  }
                  
                  #proforma-print-container .bg-white {
                    background-color: #ffffff !important;
                  }
                  #proforma-print-container .bg-gray-100 {
                    background-color: #f3f4f6 !important;
                  }
                  #proforma-print-container .bg-gray-50 {
                    background-color: #f9fafb !important;
                  }
                  #proforma-print-container .bg-gray-55 {
                    background-color: #f9fafb !important;
                  }
                  #proforma-print-container .bg-gray-50\/50 {
                    background-color: rgba(249, 250, 251, 0.5) !important;
                  }
                  #proforma-print-container .bg-gray-50\/20 {
                    background-color: rgba(249, 250, 251, 0.2) !important;
                  }

                  #proforma-print-container,
                  #proforma-print-container * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  @media print {
                    /* Strip background and borders of main visual container overlays */
                    body {
                      background: white !important;
                      color: black !important;
                    }
                    body > *:not(#proforma-print-container-wrapper) {
                      visibility: hidden !important;
                    }
                    /* Parent elements of #proforma-print-container must not block printed render */
                    .fixed, .z-50, .max-w-4xl {
                      position: absolute !important;
                      left: 0 !important;
                      top: 0 !important;
                      width: 100% !important;
                      height: auto !important;
                      background: transparent !important;
                      backdrop-filter: none !important;
                      border: none !important;
                      box-shadow: none !important;
                      padding: 0 !important;
                      margin: 0 !important;
                      overflow: visible !important;
                    }
                    #proforma-print-container {
                      position: absolute !important;
                      left: 0 !important;
                      top: 0 !important;
                      width: 100% !important;
                      height: auto !important;
                      padding: 15mm !important;
                      margin: 0 !important;
                      box-shadow: none !important;
                      border: none !important;
                      background: white !important;
                      color: black !important;
                      visibility: visible !important;
                    }
                    #proforma-print-container * {
                      visibility: visible !important;
                    }
                    .print-hidden-stamp-toggle {
                      display: none !important;
                    }
                  }
                `}} />
                
                {/* Header Section with Corporate Logo and Contact Information */}
                <div className="flex items-start justify-between border-b border-gray-300 pb-6 mb-6">
                  {/* Corporate Identity & Brand mark */}
                  <div className="flex items-start gap-4 text-left">
                    {/* Premium App Logo image replacement */}
                    <img 
                      src="https://lh3.googleusercontent.com/d/1AGGeqHTdLb0glL2pF27eYLCEmXq0ease" 
                      alt="Mena Logo" 
                      className="w-12 h-12 object-contain bg-white border border-gray-250 p-1 mt-1"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h1 className="text-xl font-black tracking-tight text-gray-900 font-mono text-left" style={{ textTransform: 'lowercase' }}>
                        mena<span className="text-[#ee317b] font-sans">.</span>inc
                      </h1>
                      <p className="text-[10px] uppercase font-mono tracking-widest text-[#71b536] font-bold text-left">Mena Inc Trading PLC</p>
                    </div>
                  </div>

                  {/* Letterhead address coordinates */}
                  <div className="text-right font-mono text-[9.5px] text-gray-700 space-y-0.5">
                    <p className="font-bold text-gray-900 uppercase">Contact Information</p>
                    <p>Bole Brass, adjacent to Yod Abyssinia</p>
                    <p>Addis Ababa, Ethiopia</p>
                    <p className="font-bold text-black mt-1">📞 +251 942 125 568</p>
                    <p className="font-bold text-black">📞 +251 924 148 847</p>
                    <p className="text-[9px] text-gray-400 lowercase italic">email: mena.inc@trading-plc.com</p>
                  </div>
                </div>

                {/* Sub-header document metrics */}
                <div className="flex justify-between items-end mb-6">
                  <div className="text-left">
                    <h2 className="text-base font-black uppercase text-gray-900 tracking-wider font-mono">PROFORMA INVOICE</h2>
                    <p className="text-[10px] font-mono text-gray-500">Document No: <strong className="text-black">PRO-2026-{new Date().getMonth() + 1}{new Date().getDate()}-{Math.floor(1000 + Math.random() * 9000)}</strong></p>
                  </div>
                  <div className="text-right font-mono text-[10px]">
                    <p className="text-gray-550">Doc Issue Date:</p>
                    <p className="font-bold text-gray-900">{new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                </div>

                {/* Client Recipient Details */}
                <div className="grid grid-cols-2 gap-4 mb-6 border-t border-b border-gray-200 py-4 font-sans text-[10px]">
                  <div className="text-left border-r border-gray-100 pr-4">
                    <p className="font-mono text-[8px] uppercase tracking-widest text-[#ee317b] font-bold mb-1">CLIENT BILL TO</p>
                    <p className="font-bold text-gray-900 text-xs font-sans uppercase">
                      {isStandaloneProformaMode 
                        ? standaloneClientName 
                        : (proformaItemsToRender[0] as any)?.clientName || 'Valued Corporate Client'}
                    </p>
                    <p className="text-gray-500 mt-1">
                      📞 {isStandaloneProformaMode 
                        ? standaloneClientPhone 
                        : '+251 (Customer Record)'}
                    </p>
                    <p className="text-gray-400 text-[9px] mt-0.5">Approved Ledger Recipient ID: CLN-2026-{(proformaItemsToRender[0]?.id || 'DRAFT').slice(0, 6)}</p>
                  </div>
                  <div className="text-left pl-4 font-mono text-left">
                    <p className="text-[8px] uppercase tracking-widest text-[#71b536] font-bold mb-1">ISSUED BY AUTHORITY</p>
                    <p className="text-gray-800 font-bold uppercase">{currentUser?.name || 'Mena Automated Operator'}</p>
                    <p className="text-gray-500 font-sans text-[9.5px]">Position: <span className="text-black font-semibold uppercase text-[9px]">{currentUser?.role || 'Staff Operator'}</span></p>
                    <p className="text-gray-450 italic mt-1 font-sans text-[9px]">Secure conversion ledger validation active.</p>
                  </div>
                </div>

                {/* Table of selected Order items */}
                <div className="border border-gray-350 overflow-hidden mb-6 rounded-none">
                  <table className="w-full text-left border-collapse text-[10px]">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-300 text-gray-705 font-mono uppercase text-[9px] tracking-wider text-center">
                        <th className="py-2 px-3 border-r border-gray-300 font-bold w-12 text-center bg-gray-100">No.</th>
                        <th className="py-2 px-3 border-r border-gray-300 font-bold text-left bg-gray-100">Description of Product Line</th>
                        <th className="py-2 px-3 border-r border-gray-300 font-bold text-right w-20 bg-gray-100">Qty (pcs)</th>
                        <th className="py-2 px-3 border-r border-gray-300 font-bold text-right w-28 bg-gray-100">Unit Price (ETB)</th>
                        <th className="py-2 px-3 font-bold text-right w-32 bg-gray-100">Subtotal (ETB)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-gray-800 text-center">
                      {proformaItemsToRender.map((item, idx) => {
                        const rowTotal = item.quantity * item.unitPrice;
                        return (
                          <tr key={item.id} className="hover:bg-gray-55/50">
                            <td className="py-2 px-3 border-r border-gray-300 font-mono text-center text-gray-500">{idx + 1}</td>
                            <td className="py-2 px-3 border-r border-gray-300 text-left text-gray-800 font-sans">
                              <strong className="text-black font-semibold">{item.productType}</strong>
                            </td>
                            <td className="py-2 px-3 border-r border-gray-300 font-mono text-right text-black font-semibold">{item.quantity.toLocaleString()}</td>
                            <td className="py-2 px-3 border-r border-gray-300 font-mono text-right text-gray-900">{Number(item.unitPrice).toFixed(2)}</td>
                            <td className="py-2 px-3 font-mono text-right font-bold text-black">{rowTotal.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                      {proformaItemsToRender.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center py-8 font-mono text-gray-400">
                            No drafted items found. Use the editor to add items.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Totals & Deductions summaries */}
                <div className="flex flex-col md:flex-row items-stretch justify-between gap-6 mb-8 text-[11px]">
                  {/* Terms and Conditions Block */}
                  <div className="border border-gray-300 bg-gray-50/50 p-4 font-mono text-[9px] text-gray-600 flex-1 rounded-none leading-relaxed text-left">
                    <p className="font-bold text-gray-800 uppercase tracking-wider mb-1.5 text-[9.5px]">Terms &amp; General Conditions</p>
                    <p className="mb-1">1. <strong>Delivery Term:</strong> Within 7 to 10 days from order receipt validation.</p>
                    <p className="mb-1">2. <strong>Payment Term:</strong> Requires at least 50% deposit ledger record, balance due prior to packaging release.</p>
                    <p className="mb-1">3. <strong>Validity:</strong> This proforma remains valid and conversion rates locked for 10 days from the dates above.</p>
                    <p className="text-[8.5px] text-gray-400 mt-2 lowercase">processed in real-time by digital workbook agent, securely archived.</p>
                  </div>

                  {/* Summary math table */}
                  <div className="w-full md:w-80 font-mono space-y-1.5 border border-gray-250 p-4 bg-gray-50/20">
                    <div className="flex justify-between text-gray-600">
                      <span>Itemized Sub-Total:</span>
                      <span className="font-bold text-gray-900">
                        {proformaItemsToRender.reduce((acc, c) => acc + (c.quantity * c.unitPrice), 0).toFixed(2)} ETB
                      </span>
                    </div>
                    {proformaIncludeVat && (
                      <div className="flex justify-between text-gray-600">
                        <span>VAT (15.00%):</span>
                        <span className="font-bold text-gray-900">
                          {(proformaItemsToRender.reduce((acc, c) => acc + (c.quantity * c.unitPrice), 0) * 0.15).toFixed(2)} ETB
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between border-t pt-1.5 text-xs text-gray-900 font-black">
                      <span>Grand Total:</span>
                      <span>
                        {(
                          proformaItemsToRender.reduce((acc, c) => acc + (c.quantity * c.unitPrice), 0) * 
                          (proformaIncludeVat ? 1.15 : 1)
                        ).toFixed(2)} ETB
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 text-gray-600 text-[10px] border-b pb-1.5 border-dashed">
                      <span className="text-green-700 font-bold">Total Recorded Paid (Adv):</span>
                      <span className="font-bold text-green-700">
                        -{proformaItemsToRender.reduce((acc, c) => acc + c.advancePayment, 0).toFixed(2)} ETB
                      </span>
                    </div>
                    <div className="flex justify-between pt-1.5 text-[11.5px] font-black text-red-700">
                      <span>Outstanding Balance Due:</span>
                      <span>
                        {Math.max(0, 
                          (proformaItemsToRender.reduce((acc, c) => acc + (c.quantity * c.unitPrice), 0) * (proformaIncludeVat ? 1.15 : 1)) - 
                          proformaItemsToRender.reduce((acc, c) => acc + c.advancePayment, 0)
                        ).toFixed(2)} ETB
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sign-Off Letterhead Block with Corporate Ink Stamp overlapping Authorized signature */}
                <div className="flex items-center justify-between mt-12 pt-8 border-t border-gray-200 relative">
                  <div className="space-y-4 font-mono text-[9px] text-left">
                    <div className="space-y-0.5">
                      <p className="font-bold text-gray-800">PREPARED BY LEDGER CLERK</p>
                      <p className="text-gray-500 uppercase">{currentUser?.name || 'Mena Automated Operator'} ({currentUser?.role || 'authorized staff'})</p>
                    </div>
                    <div className="w-40 border-b border-gray-400 h-6 border-dashed" />
                    <p className="text-[7.5px] text-gray-400">Computer generated invoice. Requires no physical signature.</p>
                  </div>

                  {/* Stamp overlaps on top right */}
                  <div className="relative w-44 h-28 flex items-center justify-end">
                    
                    {/* The signature row */}
                    <div className="absolute left-0 bottom-4 font-mono text-[9px] text-right pr-6 space-y-1">
                      <p className="font-bold text-gray-800 uppercase">AUTHORIZED PLC STAMP</p>
                      <p className="text-gray-500 text-[8px]">Mena Inc Conversion Division</p>
                    </div>

                    {/* SVG Rounded Double Circle Stamp overlapping signature or Premium Real Stamp Photo overlay */}
                    {applyDigitalStamp && (
                      <div className="transform rotate-8 absolute right-2 z-10 bottom-0 select-none pb-2">
                        <img 
                          src="https://lh3.googleusercontent.com/d/1CbGimATXHfhwtx7aKcQivzxp8bDi1kZt" 
                          alt="Company Stamp Seal" 
                          className="w-[125px] h-[125px] object-contain mix-blend-multiply opacity-90"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            // Render standard SVG stamp if external image fails to fetch due to connection issues
                            (e.target as HTMLElement).style.display = 'none';
                            const fallback = document.getElementById('svg-stamp-fallback');
                            if (fallback) fallback.classList.remove('hidden');
                          }}
                        />
                        <div id="svg-stamp-fallback" className="hidden">
                          <svg width="115" height="115" viewBox="0 0 150 150" className="transform rotate-6">
                            <circle cx="75" cy="75" r="72" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeOpacity="0.85" />
                            <circle cx="75" cy="75" r="66" fill="none" stroke="#2563EB" strokeWidth="1" strokeOpacity="0.85" />
                            <path id="curve-top-stamp" d="M 20,75 A 55,55 0 1,1 130,75" fill="none" stroke="none" />
                            <text fill="#2563EB" fillOpacity="0.85" fontSize="10" fontFamily="sans-serif" fontWeight="bold">
                              <textPath href="#curve-top-stamp" startOffset="50%" textAnchor="middle">
                                ሜና ኢንክ ትሬዲንግ ኃ/የተ/የግ/ማ
                              </textPath>
                            </text>
                            <path id="curve-bottom-stamp" d="M 130,75 A 55,55 0 0,1 20,75" fill="none" stroke="none" />
                            <text fill="#2563EB" fillOpacity="0.85" fontSize="10" fontFamily="sans-serif" fontWeight="bold">
                              <textPath href="#curve-bottom-stamp" startOffset="50%" textAnchor="middle">
                                * MENA INC TRADING PLC *
                              </textPath>
                            </text>
                            <circle cx="75" cy="75" r="34" fill="none" stroke="#2563EB" strokeWidth="1.5" strokeDasharray="4,3" strokeOpacity="0.8" />
                            <g transform="translate(75, 75) scale(0.6)">
                              <path d="M 0 -22 C -18 -38 -38 -18 -22 0 C -38 18 -18 38 0 22 C 18 38 38 18 22 0 C 38 -18 18 -38 0 -22 Z" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeOpacity="0.8" />
                              <circle cx="0" cy="0" r="6.5" fill="#2563EB" fillOpacity="0.8" />
                            </g>
                            <text x="75" y="60" fill="#2563EB" fillOpacity="0.85" fontSize="7" fontStyle="italic" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                              0942125568
                            </text>
                            <text x="75" y="98" fill="#2563EB" fillOpacity="0.85" fontSize="7" fontStyle="italic" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                              0924148847
                            </text>
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>

                </div>

              </div>

            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 📦 PRODUCT TYPES MANAGER MODAL */}
      <AnimatePresence>
        {showProductManager && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121212] border border-[#262626] w-full max-w-md overflow-hidden shadow-2xl flex flex-col relative font-mono"
            >
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-[#ee317b] to-[#71b536]" />
              
              {/* Modal header */}
              <div className="px-6 py-4 border-b border-[#262626] flex justify-between items-center bg-[#181818]/60">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#ee317b]" />
                  <h3 className="text-sm font-bold font-mono tracking-wider uppercase text-white">Manage Product Types</h3>
                </div>
                <button
                  onClick={() => { 
                    setShowProductManager(false); 
                    setNewManagerProductInput('');
                  }}
                  className="text-gray-400 hover:text-white cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5 flex-shrink-0" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[70vh] space-y-4">
                
                {/* Add product type form */}
                <div className="bg-[#181818] border border-[#262626] p-4 space-y-3 font-mono">
                  <span className="text-[10px] text-[#71b536] tracking-wider uppercase font-bold block">
                    Add Product Type
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Laser Cut Invitation"
                      value={newManagerProductInput}
                      onChange={(e) => setNewManagerProductInput(e.target.value)}
                      className="flex-1 bg-[#121212] border border-[#262626] text-xs px-2.5 py-1.5 focus:border-[#ee317b] focus:border outline-none text-white font-sans"
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newManagerProductInput.trim()) {
                            const cleaned = newManagerProductInput.trim();
                            const existing = productTypes.find(p => p.name.toLowerCase() === cleaned.toLowerCase());
                            if (!existing) {
                              await onAddProductType({ id: 'pt_' + Date.now(), name: cleaned });
                            }
                            setNewManagerProductInput('');
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (newManagerProductInput.trim()) {
                          const cleaned = newManagerProductInput.trim();
                          const existing = productTypes.find(p => p.name.toLowerCase() === cleaned.toLowerCase());
                          if (!existing) {
                            await onAddProductType({ id: 'pt_' + Date.now(), name: cleaned });
                          }
                          setNewManagerProductInput('');
                        }
                      }}
                      className="bg-[#71b536] hover:bg-white text-black font-bold text-xs uppercase px-4 py-1.5 rounded-none transition-colors cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Product Types List */}
                <div className="space-y-2 font-mono">
                  <span className="text-[10px] text-gray-500 tracking-wider uppercase font-bold block">Active Product Categories ({productTypes.length})</span>
                  
                  <div className="border border-[#262626] bg-[#141414] divide-y divide-[#232323] overflow-hidden max-h-60 overflow-y-auto">
                    {productTypes.map(prod => (
                      <div key={prod.id} className="px-4 py-2 flex items-center justify-between text-xs font-mono">
                        <span className="font-sans text-white font-semibold">{prod.name}</span>
                        <button
                          type="button"
                          onClick={async () => {
                            if (window.confirm(`Are you sure you want to delete product type "${prod.name}"?`)) {
                              await onDeleteProductType(prod.id);
                              if (productType === prod.name) {
                                setProductType(productTypes.find(p => p.id !== prod.id)?.name || '');
                              }
                            }
                          }}
                          className="p-1 text-gray-500 hover:text-red-400 rounded-none cursor-pointer transition-colors"
                          title="Delete Product Type"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </div>
                    ))}
                    {productTypes.length === 0 && (
                      <div className="p-4 text-center text-gray-500 text-xs">
                        No product types registered.
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Modal footer */}
              <div className="px-6 py-4 border-t border-[#262626] bg-[#181818]/60 flex justify-end">
                <button
                  onClick={() => { setShowProductManager(false); setNewManagerProductInput(''); }}
                  className="bg-[#242424] hover:bg-[#323232] text-white text-xs font-mono font-medium px-4 py-1.5 transition-colors cursor-pointer rounded-none"
                >
                  Done
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
