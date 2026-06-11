import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
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
  MessageCircle,
  Send,
  ExternalLink,
  User, 
  Layers, 
  Sparkles,
  Lock,
  Copy,
  CheckSquare,
  Printer,
  Download,
  Filter,
  Check,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  CreditCard,
  FileText,
  CheckCircle,
  CheckCircle2,
  RotateCcw,
  Megaphone
} from 'lucide-react';

import { 
  Customer, 
  PaperStock, 
  ACQUISITION_SOURCES, 
  AGENTS, 
  EmployeeUser,
  BankAccount,
  ProductType
} from '../types';
import {
  parseFractionOrExpression,
  cleanLeadingZeros,
  computeStockConsumed,
  createLinkUrl,
  createSmsUrl,
  createTelegramUrl,
  createTelUrl,
  createWhatsAppUrl,
  detectContactType,
  formatContactDisplay,
  getCustomerStockDisplayName,
  getCustomerStockId,
  normalizePhoneNumber,
  resolveStockId,
  saveUsernameOpenPreference,
  UsernameOpenPreference,
} from '../utils';
import SearchableSelect from './SearchableSelect';
import { DataTableWrapper, DataTable, FloatingAddButton } from './shared/TabLayout';
import { SharedDataTableLayout } from './shared/SharedDataTableLayout';

const CUSTOMER_LAYOUT_STORAGE_KEY = 'ui.customer.layoutMode';
const CUSTOMER_FILTERS_STORAGE_KEY = 'ui.customer.filters';
const CUSTOMER_FREEZE_HEADER_STORAGE_KEY = 'ui.customer.freezeHeader';
const CUSTOMER_FREEZE_FIRST_COLUMN_STORAGE_KEY = 'ui.customer.freezeFirstColumn';
const CUSTOMER_SORT_FIELDS = [
  'recordedOrder',
  'clientType',
  'clientName',
  'phone',
  'acquisitionSource',
  'orderTakenBy',
  'productType',
  'quantity',
  'unitPrice',
  'advancePayment',
  'advanceDate',
  'bankAdvanceId',
  'paperType1',
  'amount1',
  'paperType2',
  'amount2',
  'paperType3',
  'amount3',
  'entrancePaper',
  'amount16',
  'ajabiPaper',
  'amount9',
  'remainingBalance',
  'deliveryDate',
  'fullValue',
  'bankRemainingId',
  'incompletionReason',
] as const;
type CustomerSortField = typeof CUSTOMER_SORT_FIELDS[number];
type CustomerColumnSortField = Exclude<CustomerSortField, 'recordedOrder'>;
const CUSTOMER_SORT_BY_STORAGE_KEY = 'ui.customer.sortBy';
const CUSTOMER_SORT_DIRECTION_STORAGE_KEY = 'ui.customer.sortDirection';

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
  clientTypes: { id: string; name: string }[];
  onAddProductType: (prod: ProductType) => Promise<void> | void;
  onUpdateProductType: (prod: ProductType) => Promise<void> | void;
  onDeleteProductType: (ids: string[]) => Promise<void> | void;
  onAddClientType: (type: { id: string; name: string }) => void;
  onUpdateClientType: (type: { id: string; name: string }) => void;
  onDeleteClientType: (ids: string[]) => void;
  onAddCustomer: (customer: Customer) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
  onBulkUpdateCustomers: (updatedList: Customer[]) => void;
  onUpdateStocks: (stocks: PaperStock[]) => void;
  currentUser: EmployeeUser | null;
  employees: EmployeeUser[];
  showGlobalProforma?: boolean;
  setShowGlobalProforma?: (val: boolean) => void;
}

export default function CustomerTab({ 
  customers, 
  paperStocks, 
  bankAccounts,
  productTypes,
  clientTypes,
  onAddProductType,
  onUpdateProductType,
  onDeleteProductType,
  onAddClientType,
  onUpdateClientType,
  onDeleteClientType,
  onAddCustomer, 
  onUpdateCustomer, 
  onDeleteCustomer,
  onBulkUpdateCustomers,
  onUpdateStocks,
  currentUser,
  employees,
  showGlobalProforma,
  setShowGlobalProforma
}: CustomerTabProps) {
  
  // View states
  const [layoutMode, setLayoutMode] = useState<'grid' | 'cards'>(() => {
    const savedLayout = localStorage.getItem(CUSTOMER_LAYOUT_STORAGE_KEY);
    return savedLayout === 'cards' ? 'cards' : 'grid';
  });
  const [customerSortBy, setCustomerSortBy] = useState<CustomerSortField>(() => {
    const savedSortBy = localStorage.getItem(CUSTOMER_SORT_BY_STORAGE_KEY);
    return CUSTOMER_SORT_FIELDS.includes(savedSortBy as CustomerSortField) ? savedSortBy as CustomerSortField : 'recordedOrder';
  });
  const [customerSortDirection, setCustomerSortDirection] = useState<'asc' | 'desc'>(() => {
    return localStorage.getItem(CUSTOMER_SORT_DIRECTION_STORAGE_KEY) === 'desc' ? 'desc' : 'asc';
  });
  const [freezeCustomerHeader, setFreezeCustomerHeader] = useState(() => {
    return true;
  });
  const [freezeCustomerFirstColumn, setFreezeCustomerFirstColumn] = useState(() => {
    const saved = localStorage.getItem(CUSTOMER_FREEZE_FIRST_COLUMN_STORAGE_KEY);
    return saved === null ? true : saved === 'true';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const savedCustomerFilters = (() => {
    try {
      return JSON.parse(localStorage.getItem(CUSTOMER_FILTERS_STORAGE_KEY) || '{}') as Partial<Record<'agent' | 'source' | 'payment' | 'completion' | 'receipt', string>>;
    } catch {
      return {};
    }
  })();
  const [filterAgent, setFilterAgent] = useState<string>(savedCustomerFilters.agent || 'All');
  const [filterSource, setFilterSource] = useState<string>(savedCustomerFilters.source || 'All');
  const [filterPayment, setFilterPayment] = useState<string>(savedCustomerFilters.payment || 'All'); // 'All', 'Debt', 'Paid'
  const [filterCompletion, setFilterCompletion] = useState<string>(savedCustomerFilters.completion || 'All'); // 'All', 'Completed', 'Pending', 'Incomplete'
  const [filterReceipt, setFilterReceipt] = useState<string>(savedCustomerFilters.receipt || 'All'); // 'All', 'NeedsReceipt'
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [activeContactMenuId, setActiveContactMenuId] = useState<string | null>(null);
  const [contactMenuPosition, setContactMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [copiedContactId, setCopiedContactId] = useState<string | null>(null);
  const contactMenuRef = useRef<HTMLDivElement>(null);
  const copiedContactTimerRef = useRef<number | null>(null);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchWrapperRef = useRef<HTMLDivElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const [showProformaModal, setShowProformaModal] = useState(false);
  const [isStandaloneProformaMode, setIsStandaloneProformaMode] = useState(false);
  const [standaloneProformaItems, setStandaloneProformaItems] = useState<Array<{ id: string; productType: string; quantity: number | ''; unitPrice: number | ''; advancePayment: number | ''; }>>([]);

  // Proforma VAT State variables inside modal scope integration
  const [proformaIncludeVat, setProformaIncludeVat] = useState(true);
  const [proformaMobileTab, setProformaMobileTab] = useState<'edit' | 'preview'>('edit');
  const [proformaZoom, setProformaZoom] = useState(1);
  const [standaloneClientName, setStandaloneClientName] = useState('');
  const [standaloneClientPhone, setStandaloneClientPhone] = useState('');
  const [applyDigitalStamp, setApplyDigitalStamp] = useState(true);
  const [proformaBankId, setProformaBankId] = useState<string>('');
  const lastShowProformaModalRef = useRef(false);
  const [isProductRowsExpanded, setIsProductRowsExpanded] = useState(true);
  const [isTermsExpanded, setIsTermsExpanded] = useState(false);
  const [proformaTerms, setProformaTerms] = useState([
    { id: '1', content: '1. Delivery Term: Within 7 to 10 days from order receipt validation.' },
    { id: '2', content: '2. Payment Term: Requires at least 50% deposit ledger record, balance due prior to packaging release.' },
    { id: '3', content: '3. Validity: This proforma remains valid and conversion rates locked for 10 days from the dates above.' },
  ]);

  useEffect(() => {
    localStorage.setItem(CUSTOMER_LAYOUT_STORAGE_KEY, layoutMode);
  }, [layoutMode]);

  useEffect(() => {
    localStorage.setItem(CUSTOMER_SORT_BY_STORAGE_KEY, customerSortBy);
    localStorage.setItem(CUSTOMER_SORT_DIRECTION_STORAGE_KEY, customerSortDirection);
  }, [customerSortBy, customerSortDirection]);

  useEffect(() => {
    localStorage.setItem(CUSTOMER_FREEZE_HEADER_STORAGE_KEY, String(freezeCustomerHeader));
    localStorage.setItem(CUSTOMER_FREEZE_FIRST_COLUMN_STORAGE_KEY, String(freezeCustomerFirstColumn));
  }, [freezeCustomerHeader, freezeCustomerFirstColumn]);

  useEffect(() => {
    localStorage.setItem(CUSTOMER_FILTERS_STORAGE_KEY, JSON.stringify({
      agent: filterAgent,
      source: filterSource,
      payment: filterPayment,
      completion: filterCompletion,
      receipt: filterReceipt,
    }));
  }, [filterAgent, filterSource, filterPayment, filterCompletion, filterReceipt]);

  useEffect(() => {
    if (!activeContactMenuId) return;

    const handleOutsideContactMenu = (event: MouseEvent) => {
      if (contactMenuRef.current && !contactMenuRef.current.contains(event.target as Node)) {
        setActiveContactMenuId(null);
        setContactMenuPosition(null);
      }
    };

    document.addEventListener('mousedown', handleOutsideContactMenu);
    return () => document.removeEventListener('mousedown', handleOutsideContactMenu);
  }, [activeContactMenuId]);

  useEffect(() => {
    return () => {
      if (copiedContactTimerRef.current) {
        window.clearTimeout(copiedContactTimerRef.current);
      }
    };
  }, []);

  const handleRecordedOrderSort = () => {
    setCustomerSortBy('recordedOrder');
    setCustomerSortDirection('asc');
  };

  const handleCustomerSort = (field: CustomerColumnSortField) => {
    if (customerSortBy === field) {
      setCustomerSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
      return;
    }
    setCustomerSortBy(field);
    setCustomerSortDirection('asc');
  };

  const SortableCustomerHeader = ({ field, children, align = 'left', className = '' }: { field: CustomerColumnSortField; children: React.ReactNode; align?: 'left' | 'center' | 'right'; className?: string }) => {
    const alignClass = align === 'right' ? 'justify-end text-right' : align === 'center' ? 'justify-center text-center' : 'justify-start text-left';
    const arrow = customerSortDirection === 'asc' ? '↑' : '↓';

    return (
      <th
        className={`py-2.5 px-3 font-semibold text-gray-300 border-r border-[#262626] ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'} cursor-pointer select-none ${className}`}
        onClick={() => handleCustomerSort(field)}
      >
        <span className={`inline-flex w-full items-center ${alignClass} gap-1 whitespace-nowrap`}>
          <span>{children}</span>
          <span className="inline-flex w-3 shrink-0 justify-center text-[#ee317b]" aria-hidden="true">
            {customerSortBy === field ? arrow : ''}
          </span>
        </span>
      </th>
    );
  };


  // Editable proforma text states
  const [proformaLogoMain, setProformaLogoMain] = useState('mena');
  const [proformaLogoSuffix, setProformaLogoSuffix] = useState('inc');
  const [proformaLogoSubtitle, setProformaLogoSubtitle] = useState('Mena Inc Trading PLC');
  const [proformaContactTitle, setProformaContactTitle] = useState('Contact Information');
  const [proformaContactAddress1, setProformaContactAddress1] = useState('Bole Brass, adjacent to Yod Abyssinia');
  const [proformaContactAddress2, setProformaContactAddress2] = useState('Addis Ababa, Ethiopia');
  const [proformaContactPhone1, setProformaContactPhone1] = useState('📞 +251 942 125 568');
  const [proformaContactPhone2, setProformaContactPhone2] = useState('📞 +251 924 148 847');
  const [proformaContactEmail, setProformaContactEmail] = useState('email: mena.inc@trading-plc.com');
  const [proformaDocTitle, setProformaDocTitle] = useState('PROFORMA INVOICE');
  const [proformaDocNoPrefix, setProformaDocNoPrefix] = useState('Document No: ');
  const [proformaDocNo, setProformaDocNo] = useState('');
  const [proformaDocIssueDateLabel, setProformaDocIssueDateLabel] = useState('Doc Issue Date:');
  const [proformaDocIssueDate, setProformaDocIssueDate] = useState('');
  const [proformaClientBillToLabel, setProformaClientBillToLabel] = useState('CLIENT BILL TO');
  const [proformaClientName, setProformaClientName] = useState('');
  const [proformaClientPhone, setProformaClientPhone] = useState('');
  const [proformaClientRecipientId, setProformaClientRecipientId] = useState('');
  const [proformaAuthorityLabel, setProformaAuthorityLabel] = useState('ISSUED BY AUTHORITY');
  const [proformaIssuerName, setProformaIssuerName] = useState('');
  const [proformaIssuerPositionLabel, setProformaIssuerPositionLabel] = useState('Position: ');
  const [proformaIssuerPosition, setProformaIssuerPosition] = useState('');
  const [proformaVerificationNote, setProformaVerificationNote] = useState('Secure conversion ledger validation active.');
  const [proformaColNo, setProformaColNo] = useState('No.');
  const [proformaColDesc, setProformaColDesc] = useState('Description of Product Line');
  const [proformaColQty, setProformaColQty] = useState('Qty (pcs)');
  const [proformaColPrice, setProformaColPrice] = useState('Unit Price (ETB)');
  const [proformaColTotal, setProformaColTotal] = useState('Subtotal (ETB)');
  const [proformaTermsTitle, setProformaTermsTitle] = useState('Terms & General Conditions');
  const [proformaTerm1Prefix, setProformaTerm1Prefix] = useState('1. Delivery Term: ');
  const [proformaDeliveryTerm, setProformaDeliveryTerm] = useState('Within 7 to 10 days from order receipt validation.');
  const [proformaTerm2Prefix, setProformaTerm2Prefix] = useState('2. Payment Term: ');
  const [proformaPaymentTerm, setProformaPaymentTerm] = useState('Requires at least 50% deposit ledger record, balance due prior to packaging release.');
  const [proformaTerm3Prefix, setProformaTerm3Prefix] = useState('3. Validity: ');
  const [proformaValidityTerm, setProformaValidityTerm] = useState('This proforma remains valid and conversion rates locked for 10 days from the dates above.');
  const [proformaBankDetailsTitle, setProformaBankDetailsTitle] = useState('Payment Details (Direct Transfer)');
  const [proformaBankNameLabel, setProformaBankNameLabel] = useState('Bank Name: ');
  const [proformaBankName, setProformaBankName] = useState('');
  const [proformaBankAccountNumberLabel, setProformaBankAccountNumberLabel] = useState('Account Number: ');
  const [proformaBankAccountNumber, setProformaBankAccountNumber] = useState('');
  const [proformaFooterNote, setProformaFooterNote] = useState('processed in real-time by digital workbook agent, securely archived.');
  const [proformaPreparedByTitle, setProformaPreparedByTitle] = useState('PREPARED BY LEDGER CLERK');
  const [proformaPreparedByNote, setProformaPreparedByNote] = useState('');
  const [proformaPreparedByVerification, setProformaPreparedByVerification] = useState('Computer generated invoice. Requires no physical signature.');
  const [proformaAuthorizedStampTitle, setProformaAuthorizedStampTitle] = useState('AUTHORIZED PLC STAMP');
  const [proformaAuthorizedStampSubtitle, setProformaAuthorizedStampSubtitle] = useState('Mena Inc Conversion Division');
  
  // Edited product descriptions map (maps itemId -> customized product description)
  const [editedProductDescriptions, setEditedProductDescriptions] = useState<Record<string, string>>({});

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

      // Clone the container to completely escape ancestor CSS transforms (like mobile scaling) which cause severe text squishing
      const clone = container.cloneNode(true) as HTMLElement;
      
      // Bake all computed styles inline on every element so the clone renders identically
      // This is critical because cloneNode doesn't carry over stylesheet-computed values
      const sourceElements = container.querySelectorAll('*');
      const cloneElements = clone.querySelectorAll('*');
      
      const stylesToCopy = [
        'font-size', 'font-weight', 'font-family', 'font-style',
        'line-height', 'letter-spacing', 'text-align', 'text-transform', 'text-decoration',
        'color', 'background-color', 'background',
        'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
        'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
        'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
        'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
        'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
        'border-collapse', 'border-spacing',
        'width', 'min-width', 'max-width', 'height', 'min-height', 'max-height',
        'display', 'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'align-self',
        'gap', 'row-gap', 'column-gap', 'flex-grow', 'flex-shrink', 'flex-basis',
        'position', 'top', 'right', 'bottom', 'left',
        'overflow', 'overflow-x', 'overflow-y',
        'white-space', 'word-break', 'word-spacing',
        'opacity', 'visibility', 'vertical-align',
        'box-sizing', 'table-layout',
      ];
      
      // Inline styles on the root clone element itself
      const rootStyles = window.getComputedStyle(container);
      for (const prop of stylesToCopy) {
        try {
          let val = rootStyles.getPropertyValue(prop);
          if (val) clone.style.setProperty(prop, convertColorStringToRgb(val));
        } catch (_) {}
      }
      
      // Inline styles on every child element
      for (let i = 0; i < sourceElements.length && i < cloneElements.length; i++) {
        const srcEl = sourceElements[i] as HTMLElement;
        const clnEl = cloneElements[i] as HTMLElement;
        if (!clnEl.style) continue;
        try {
          const computed = window.getComputedStyle(srcEl);
          for (const prop of stylesToCopy) {
            try {
              let val = computed.getPropertyValue(prop);
              if (val) clnEl.style.setProperty(prop, convertColorStringToRgb(val));
            } catch (_) {}
          }
        } catch (_) {}
      }
      
      // Place clone off-screen in body
      clone.style.position = 'absolute';
      clone.style.top = '-9999px';
      clone.style.left = '-9999px';
      clone.style.maxHeight = 'none';
      clone.style.overflow = 'visible';
      clone.style.height = 'max-content';
      clone.style.width = '800px';
      clone.style.maxWidth = 'none';
      clone.style.margin = '0';
      clone.style.transform = 'none'; // Force 1:1 scale
      clone.style.gap = '0px';
      clone.style.rowGap = '0px';
      
      document.body.appendChild(clone);

      // Force a reflow and give the browser a moment to render the unscaled clone
      void clone.offsetHeight;
      await new Promise(resolve => setTimeout(resolve, 300));

      // Render the clone to a canvas with high scale for high resolution print quality
      const canvas = await html2canvas(clone, {
        scale: 2.5, // High resolution scale for clear vector text output
        useCORS: true,
        allowTaint: false, // Prevent tainted canvas errors
        backgroundColor: '#ffffff',
        logging: false,
        height: clone.scrollHeight,
        windowWidth: 800, // Force desktop viewport size
        windowHeight: clone.scrollHeight
      });

      // Clean up clone
      document.body.removeChild(clone);

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      let imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // If the generated image height is very close to A4 height, stretch it to completely eliminate the white gap at the bottom
      if (imgHeight < 297 && imgHeight > 280) {
        imgHeight = 297;
      }
      
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Handle multi-page if the proforma extends beyond one A4 page
      while (heightLeft > 1) { // Require more than 1mm overflow to trigger a new page
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

  // Sync showGlobalProforma with local proforma modal states
  useEffect(() => {
    if (showGlobalProforma) {
      setIsStandaloneProformaMode(true);
      setStandaloneProformaItems([
        { id: `temp-${Date.now()}`, productType: '', quantity: '', unitPrice: '', advancePayment: '' }
      ]);
      setStandaloneClientName('');
      setStandaloneClientPhone('');
      setShowProformaModal(true);
    }
  }, [showGlobalProforma]);

  useEffect(() => {
    if (!showProformaModal && setShowGlobalProforma) {
      setShowGlobalProforma(false);
    }
  }, [showProformaModal, setShowGlobalProforma]);

  // Removed redundant useEffect that forced default bank ID on empty selection

  // Synchronize inline bank details text when proformaBankId changes
  useEffect(() => {
    if (proformaBankId && bankAccounts) {
      const bank = bankAccounts.find(b => b.id === proformaBankId);
      if (bank) {
        setProformaBankName(bank.name);
        setProformaBankAccountNumber(bank.accountNumber || '');
      }
    }
  }, [proformaBankId, bankAccounts]);

  // Handle escape key to close filter popover
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowFilterPopover(false);
      }
    };
    if (showFilterPopover) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showFilterPopover]);

  // Focus search input on expansion
  useEffect(() => {
    if (isSearchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchExpanded]);

  // Click outside search container should close it if query is empty
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        if (!searchQuery) {
          setIsSearchExpanded(false);
        }
      }
    };
    if (isSearchExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSearchExpanded, searchQuery]);

  // Focus mobile search input on expansion
  useEffect(() => {
    if (isSearchExpanded && mobileSearchInputRef.current) {
      mobileSearchInputRef.current.focus();
    }
  }, [isSearchExpanded]);

  // Click outside mobile search container should close it if query is empty
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mobileSearchWrapperRef.current && !mobileSearchWrapperRef.current.contains(e.target as Node)) {
        if (!searchQuery) {
          setIsSearchExpanded(false);
        }
      }
    };
    if (isSearchExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSearchExpanded, searchQuery]);

  // Form Fields State
  const [clientType, setClientType] = useState<string>('');
  const [clientName, setClientName] = useState('');
  const [phone, setPhone] = useState('');
  const [acquisitionSource, setAcquisitionSource] = useState<Customer['acquisitionSource']>('');
   const [orderTakenBy, setOrderTakenBy] = useState<Customer['orderTakenBy']>(currentUser?.name || 'Bereket');
  const [productType, setProductType] = useState('');
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProductInput, setNewProductInput] = useState('');
  const [isAddingClientType, setIsAddingClientType] = useState(false);
  const [newClientTypeInput, setNewClientTypeInput] = useState('');
  const [selectedClientTypeIds, setSelectedClientTypeIds] = useState<string[]>([]);
  const [editingClientTypeId, setEditingClientTypeId] = useState<string | null>(null);
  const [editingClientTypeName, setEditingClientTypeName] = useState('');
  const [showProductManager, setShowProductManager] = useState(false);
  const [newManagerProductInput, setNewManagerProductInput] = useState('');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingProductName, setEditingProductName] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState<number>(0);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [advancePayment, setAdvancePayment] = useState<number>(0);
  const [paymentMethodId, setPaymentMethodId] = useState<string>('');

  // Math expression string inputs for the numerical editing fields
  const [qtyInput, setQtyInput] = useState<string>('');
  const [priceInput, setPriceInput] = useState<string>('');
  const [advanceInput, setAdvanceInput] = useState<string>('');

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
  const [selectedChannelNames, setSelectedChannelNames] = useState<string[]>([]);
  const [editingChannelName, setEditingChannelName] = useState<string | null>(null);
  const [editingChannelValue, setEditingChannelValue] = useState('');

  // Secure ledger data alignment states
  const [advancePaymentDate, setAdvancePaymentDate] = useState<string>('');
  const [bankRemainingId, setBankRemainingId] = useState<string>('');
  const [incompletionReason, setIncompletionReason] = useState<string>('');
  const [isVatAdded, setIsVatAdded] = useState<boolean>(false);
  const [baseUnitPriceInput, setBaseUnitPriceInput] = useState<string>('');

  // Non-blocking custom delete tracking ID
  const [deletingCustomerId, setDeletingCustomerId] = useState<string | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [expandedCards, setExpandedCards] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  
  // Bulk Complete states
  const [showBulkCompleteModal, setShowBulkCompleteModal] = useState(false);
  const [bulkCompleteDate, setBulkCompleteDate] = useState<string>('');
  const [bulkCompleteBankId, setBulkCompleteBankId] = useState<string>('b1');
  
  const [paperType1, setPaperType1] = useState('None');
  const [amount1, setAmount1] = useState<string>('');
  const [paperType2, setPaperType2] = useState('None');
  const [amount2, setAmount2] = useState<string>('');
  const [paperType3, setPaperType3] = useState('None');
  const [amount3, setAmount3] = useState<string>('');
  
  const [entrancePaper, setEntrancePaper] = useState('None');
  const [amount16, setAmount16] = useState<string>('');
  const [ajabiPaper, setAjabiPaper] = useState('None');
  const [amount9, setAmount9] = useState<string>('');
  
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    return d.toISOString().split('T')[0];
  });

  const [formError, setFormError] = useState('');
  const [newInlineStockName, setNewInlineStockName] = useState('');
  const [newInlineStockAmount, setNewInlineStockAmount] = useState('');

  const computeTotalConsumed = (stockValue: string): number => {
    const stockId = resolveStockId(stockValue, paperStocks);
    const stock = paperStocks.find(s => s.id === stockId) ||
      paperStocks.find(s => s.name.trim().toLowerCase() === stockValue.trim().toLowerCase());
    return stock ? computeStockConsumed(stock, customers, paperStocks) : 0;
  };

  const selectedStock = (stockValue: string) => {
    const stockId = resolveStockId(stockValue, paperStocks);
    return paperStocks.find(stock => stock.id === stockId);
  };

  const stockOptionRows = () => paperStocks.map(s => {
    const remaining = s.initialStock - computeTotalConsumed(s.id);
    let statusClass = '';
    if (remaining <= 0) statusClass = 'text-[#F87171]';
    else if (remaining < 50) statusClass = 'text-[#FACC15]';
    return (
      <option key={s.id} value={s.id} data-status={statusClass} data-amount={`(${remaining} sheets)`}>
        {s.name}
      </option>
    );
  });

  const handleAddProductInline = async () => {
    const cleaned = newProductInput.trim();
    if (cleaned) {
      const exists = productTypes.some(p => p.name.toLowerCase() === cleaned.toLowerCase());
      if (!exists) {
        const newProd = { id: 'pt_' + Date.now(), name: cleaned };
        await onAddProductType(newProd);
        setProductType(cleaned);
      } else {
        setProductType(cleaned);
      }
    }
    setNewProductInput('');
    setIsAddingProduct(false);
  };

  const handleAddClientTypeInline = () => {
    const cleaned = newClientTypeInput.trim();
    if (cleaned) {
      const exists = clientTypes.some(c => c.name.toLowerCase() === cleaned.toLowerCase());
      if (!exists) {
        const newType = { id: 'ct_' + Date.now(), name: cleaned };
        onAddClientType(newType);
        setClientType(cleaned);
      } else {
        setClientType(cleaned);
      }
    }
    setNewClientTypeInput('');
    setIsAddingClientType(false);
  };

  const handleRenameClientType = (typeId: string) => {
    const cleaned = editingClientTypeName.trim();
    const target = clientTypes.find(type => type.id === typeId);
    if (!cleaned || !target) return;
    if (clientTypes.some(type => type.id !== typeId && type.name.toLowerCase() === cleaned.toLowerCase())) {
      setFormError('Client type already exists.');
      return;
    }
    onUpdateClientType({ ...target, name: cleaned });
    if (clientType === target.name) setClientType(cleaned);
    onBulkUpdateCustomers(customers.map(customer =>
      customer.clientType === target.name ? { ...customer, clientType: cleaned } : customer
    ));
    setEditingClientTypeId(null);
    setEditingClientTypeName('');
    setFormError('');
  };

  const handleDeleteSelectedClientTypes = () => {
    if (selectedClientTypeIds.length === 0) return;
    const deletedNames = clientTypes.filter(type => selectedClientTypeIds.includes(type.id)).map(type => type.name);
    onDeleteClientType(selectedClientTypeIds);
    if (deletedNames.includes(clientType)) setClientType('');
    onBulkUpdateCustomers(customers.map(customer =>
      deletedNames.includes(customer.clientType) ? { ...customer, clientType: '' } : customer
    ));
    setSelectedClientTypeIds([]);
  };

  const handleRenameChannel = (oldName: string) => {
    const cleaned = editingChannelValue.trim();
    if (!cleaned) return;
    if (acquisitionChannels.some(channel => channel !== oldName && channel.toLowerCase() === cleaned.toLowerCase())) {
      setFormError('Lead channel already exists.');
      return;
    }
    const updatedChannels = acquisitionChannels.map(channel => channel === oldName ? cleaned : channel);
    setAcquisitionChannels(updatedChannels);
    localStorage.setItem('mena_inc_acquisition_channels_v3', JSON.stringify(updatedChannels));
    if (acquisitionSource === oldName) setAcquisitionSource(cleaned as Customer['acquisitionSource']);
    onBulkUpdateCustomers(customers.map(customer =>
      customer.acquisitionSource === oldName ? { ...customer, acquisitionSource: cleaned as Customer['acquisitionSource'] } : customer
    ));
    setEditingChannelName(null);
    setEditingChannelValue('');
    setFormError('');
  };

  const handleDeleteSelectedChannels = () => {
    if (selectedChannelNames.length === 0) return;
    const updatedChannels = acquisitionChannels.filter(channel => !selectedChannelNames.includes(channel));
    setAcquisitionChannels(updatedChannels);
    localStorage.setItem('mena_inc_acquisition_channels_v3', JSON.stringify(updatedChannels));
    if (selectedChannelNames.includes(acquisitionSource)) setAcquisitionSource('');
    onBulkUpdateCustomers(customers.map(customer =>
      selectedChannelNames.includes(customer.acquisitionSource) ? { ...customer, acquisitionSource: '' as Customer['acquisitionSource'] } : customer
    ));
    setSelectedChannelNames([]);
  };

  const handleRenameProductType = async (productId: string) => {
    const cleaned = editingProductName.trim();
    const target = productTypes.find(product => product.id === productId);
    if (!cleaned || !target) return;
    if (productTypes.some(product => product.id !== productId && product.name.toLowerCase() === cleaned.toLowerCase())) {
      setFormError('Product type already exists.');
      return;
    }
    await onUpdateProductType({ ...target, name: cleaned });
    if (productType === target.name) setProductType(cleaned);
    onBulkUpdateCustomers(customers.map(customer =>
      customer.productType === target.name ? { ...customer, productType: cleaned } : customer
    ));
    setEditingProductId(null);
    setEditingProductName('');
    setFormError('');
  };

  const managerPanelClass = "flex-1 bg-[#121212] border border-[#ee317b]/40 rounded-md p-2 space-y-2";
  const managerInputClass = "flex-1 bg-[#181818] border border-[#262626] text-white text-xs outline-none font-sans px-2 py-1 rounded";
  const managerIconButtonClass = "p-1 text-gray-500 hover:text-white hover:bg-[#262626] rounded cursor-pointer";

  const renderClientTypeManager = () => (
    <div className={managerPanelClass}>
      <div className="flex gap-1">
        <input
          type="text"
          placeholder="New client type..."
          value={newClientTypeInput}
          onChange={(e) => setNewClientTypeInput(e.target.value)}
          className={managerInputClass}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddClientTypeInline();
            }
          }}
        />
        <button type="button" onClick={handleAddClientTypeInline} className="px-2 text-[#71b536] font-bold text-xs">Add</button>
      </div>
      {selectedClientTypeIds.length > 0 && (
        <button type="button" onClick={handleDeleteSelectedClientTypes} className="w-full py-1 bg-[#421A1D] text-red-300 text-[10px] font-bold rounded">Delete Selected ({selectedClientTypeIds.length})</button>
      )}
      <div className="max-h-28 overflow-y-auto space-y-1">
        {clientTypes.map(type => (
          <div key={type.id} className="flex items-center gap-1.5 bg-[#181818] border border-[#262626] px-2 py-1 rounded">
            <input
              type="checkbox"
              checked={selectedClientTypeIds.includes(type.id)}
              onChange={(e) => setSelectedClientTypeIds(prev => e.target.checked ? [...prev, type.id] : prev.filter(id => id !== type.id))}
              className="accent-[#ee317b]"
            />
            {editingClientTypeId === type.id ? (
              <input
                value={editingClientTypeName}
                onChange={(e) => setEditingClientTypeName(e.target.value)}
                className={managerInputClass}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameClientType(type.id);
                  if (e.key === 'Escape') setEditingClientTypeId(null);
                }}
              />
            ) : (
              <span className="flex-1 text-white text-xs truncate">{type.name}</span>
            )}
            {editingClientTypeId === type.id ? (
              <button type="button" onClick={() => handleRenameClientType(type.id)} className={managerIconButtonClass}><Check className="w-3 h-3" /></button>
            ) : (
              <button type="button" onClick={() => { setEditingClientTypeId(type.id); setEditingClientTypeName(type.name); }} className={managerIconButtonClass}><Edit3 className="w-3 h-3" /></button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderChannelManager = () => (
    <div className={managerPanelClass}>
      <div className="flex gap-1">
        <input
          type="text"
          placeholder="New channel..."
          value={newChannelInput}
          onChange={(e) => setNewChannelInput(e.target.value)}
          className={managerInputClass}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const cleaned = newChannelInput.trim();
              if (cleaned && !acquisitionChannels.includes(cleaned)) {
                const updated = [...acquisitionChannels, cleaned];
                setAcquisitionChannels(updated);
                localStorage.setItem('mena_inc_acquisition_channels_v3', JSON.stringify(updated));
                setAcquisitionSource(cleaned as Customer['acquisitionSource']);
              }
              setNewChannelInput('');
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
              setAcquisitionSource(cleaned as Customer['acquisitionSource']);
            }
            setNewChannelInput('');
          }}
          className="px-2 text-[#71b536] font-bold text-xs"
        >
          Add
        </button>
      </div>
      {selectedChannelNames.length > 0 && (
        <button type="button" onClick={handleDeleteSelectedChannels} className="w-full py-1 bg-[#421A1D] text-red-300 text-[10px] font-bold rounded">Delete Selected ({selectedChannelNames.length})</button>
      )}
      <div className="max-h-28 overflow-y-auto space-y-1">
        {acquisitionChannels.map(channel => (
          <div key={channel} className="flex items-center gap-1.5 bg-[#181818] border border-[#262626] px-2 py-1 rounded">
            <input
              type="checkbox"
              checked={selectedChannelNames.includes(channel)}
              onChange={(e) => setSelectedChannelNames(prev => e.target.checked ? [...prev, channel] : prev.filter(name => name !== channel))}
              className="accent-[#ee317b]"
            />
            {editingChannelName === channel ? (
              <input
                value={editingChannelValue}
                onChange={(e) => setEditingChannelValue(e.target.value)}
                className={managerInputClass}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameChannel(channel);
                  if (e.key === 'Escape') setEditingChannelName(null);
                }}
              />
            ) : (
              <span className="flex-1 text-white text-xs truncate">{channel}</span>
            )}
            {editingChannelName === channel ? (
              <button type="button" onClick={() => handleRenameChannel(channel)} className={managerIconButtonClass}><Check className="w-3 h-3" /></button>
            ) : (
              <button type="button" onClick={() => { setEditingChannelName(channel); setEditingChannelValue(channel); }} className={managerIconButtonClass}><Edit3 className="w-3 h-3" /></button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const handleDeleteSelectedProductTypes = async () => {
    if (selectedProductIds.length === 0) return;
    const deletedNames = productTypes.filter(product => selectedProductIds.includes(product.id)).map(product => product.name);
    await onDeleteProductType(selectedProductIds);
    if (deletedNames.includes(productType)) setProductType('');
    onBulkUpdateCustomers(customers.map(customer =>
      deletedNames.includes(customer.productType) ? { ...customer, productType: '' } : customer
    ));
    setSelectedProductIds([]);
  };

  const renderProductTypeManager = () => (
    <div className={managerPanelClass}>
      <div className="flex gap-1">
        <input
          type="text"
          placeholder="New product..."
          value={newProductInput}
          onChange={(e) => setNewProductInput(e.target.value)}
          className={managerInputClass}
          onKeyDown={async (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              await handleAddProductInline();
            }
          }}
        />
        <button type="button" onClick={handleAddProductInline} className="px-2 text-[#71b536] font-bold text-xs">Add</button>
      </div>
      {selectedProductIds.length > 0 && (
        <button type="button" onClick={handleDeleteSelectedProductTypes} className="w-full py-1 bg-[#421A1D] text-red-300 text-[10px] font-bold rounded">Delete Selected ({selectedProductIds.length})</button>
      )}
      <div className="max-h-28 overflow-y-auto space-y-1">
        {productTypes.map(product => (
          <div key={product.id} className="flex items-center gap-1.5 bg-[#181818] border border-[#262626] px-2 py-1 rounded">
            <input
              type="checkbox"
              checked={selectedProductIds.includes(product.id)}
              onChange={(e) => setSelectedProductIds(prev => e.target.checked ? [...prev, product.id] : prev.filter(id => id !== product.id))}
              className="accent-[#ee317b]"
            />
            {editingProductId === product.id ? (
              <input
                value={editingProductName}
                onChange={(e) => setEditingProductName(e.target.value)}
                className={managerInputClass}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameProductType(product.id);
                  if (e.key === 'Escape') setEditingProductId(null);
                }}
              />
            ) : (
              <span className="flex-1 text-white text-xs truncate">{product.name}</span>
            )}
            {editingProductId === product.id ? (
              <button type="button" onClick={() => handleRenameProductType(product.id)} className={managerIconButtonClass}><Check className="w-3 h-3" /></button>
            ) : (
              <button type="button" onClick={() => { setEditingProductId(product.id); setEditingProductName(product.name); }} className={managerIconButtonClass}><Edit3 className="w-3 h-3" /></button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // Open form for Create
  const handleOpenCreate = () => {
    setEditingCustomer(null);
    setFormStep(1);
    setClientType('');
    setClientName('');
    setPhone('');
    setAcquisitionSource('');
    setOrderTakenBy(currentUser?.name || 'Bereket');
    setProductType('');
    setQuantity(0);
    setUnitPrice(0);
    setAdvancePayment(0);
    setQtyInput('');
    setPriceInput('');
    setAdvanceInput('');
    setPaymentMethodId('');
    setPaperType1('None');
    setAmount1('');
    setPaperType2('None');
    setAmount2('');
    setPaperType3('None');
    setAmount3('');
    setEntrancePaper('None');
    setAmount16('');
    setAjabiPaper('None');
    setAmount9('');
    
    setDeliveryDate('');

    // Google Sheets custom alignment fields
    const todayStr = new Date().toISOString().split('T')[0];
    setAdvancePaymentDate(todayStr);
    setBankRemainingId('');
    setIncompletionReason('');
    setIsVatAdded(false);
    setBaseUnitPriceInput('');
    
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
    setPaymentMethodId(customer.paymentMethodId || '');
    
    setPaperType1(getCustomerStockId(customer, 'paperType1', paperStocks));
    setAmount1(customer.amount1.toString());
    setPaperType2(getCustomerStockId(customer, 'paperType2', paperStocks));
    setAmount2(customer.amount2.toString());
    setPaperType3(getCustomerStockId(customer, 'paperType3', paperStocks));
    setAmount3(customer.amount3.toString());
    
    setEntrancePaper(getCustomerStockId(customer, 'entrancePaper', paperStocks));
    setAmount16(customer.amount16.toString());
    setAjabiPaper(getCustomerStockId(customer, 'ajabiPaper', paperStocks));
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
    setPaymentMethodId(customer.paymentMethodId || '');
    
    setPaperType1(getCustomerStockId(customer, 'paperType1', paperStocks));
    setAmount1(customer.amount1.toString());
    setPaperType2(getCustomerStockId(customer, 'paperType2', paperStocks));
    setAmount2(customer.amount2.toString());
    setPaperType3(getCustomerStockId(customer, 'paperType3', paperStocks));
    setAmount3(customer.amount3.toString());
    
    setEntrancePaper(getCustomerStockId(customer, 'entrancePaper', paperStocks));
    setAmount16(customer.amount16.toString());
    setAjabiPaper(getCustomerStockId(customer, 'ajabiPaper', paperStocks));
    setAmount9(customer.amount9.toString());
    setDeliveryDate(customer.deliveryDate);

    setAdvancePaymentDate(customer.advancePaymentDate || customer.deliveryDate);
    setBankRemainingId(customer.bankRemainingId || '');
    setIncompletionReason(customer.incompletionReason || '');
    setIsVatAdded(customer.isVatAdded || false);
    setBaseUnitPriceInput((customer.baseUnitPrice !== undefined ? customer.baseUnitPrice : customer.unitPrice).toString());
    
    setFormError('');
    setIsFormOpen(true);
  };

  const validateAndFormatContactInput = (): string | null => {
    const contactValue = phone.trim();
    if (!contactValue) return '';

    const contactType = detectContactType(contactValue);
    if (contactType === 'phone' || contactType === 'invalid-phone') {
      const normalized = normalizePhoneNumber(contactValue);
      if (normalized.error) {
        setFormError(normalized.error);
        return null;
      }
      return normalized.normalized;
    }

    setFormError('');
    return contactValue;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      setFormError('Client name is required.');
      return;
    }

    const contactInfo = validateAndFormatContactInput();
    if (contactInfo === null) return;

    const finalQuantity = Math.max(0, parseFractionOrExpression(qtyInput));
    const finalUnitPrice = Math.max(0, parseFractionOrExpression(priceInput));
    const finalAdvancePayment = Math.max(0, parseFractionOrExpression(advanceInput));
    const paperType1Id = resolveStockId(paperType1, paperStocks);
    const paperType2Id = resolveStockId(paperType2, paperStocks);
    const paperType3Id = resolveStockId(paperType3, paperStocks);
    const entrancePaperId = resolveStockId(entrancePaper, paperStocks);
    const ajabiPaperId = resolveStockId(ajabiPaper, paperStocks);

    const payload: Customer = {
      id: editingCustomer ? editingCustomer.id : 'c_' + Date.now(),
      clientType,
      clientName: clientName.trim(),
      phone: contactInfo,
      acquisitionSource,
      orderTakenBy,
      productType,
      // Force Absolute safe Positive Numbers only
      quantity: finalQuantity,
      unitPrice: finalUnitPrice,
      advancePayment: finalAdvancePayment,
      paymentMethodId: finalAdvancePayment > 0 ? paymentMethodId : '',
      paperType1: '',
      paperType1Id: paperType1Id === 'None' ? undefined : paperType1Id,
      amount1: Math.max(0, parseFractionOrExpression(amount1)),
      paperType2: '',
      paperType2Id: paperType2Id === 'None' ? undefined : paperType2Id,
      amount2: Math.max(0, parseFractionOrExpression(amount2)),
      paperType3: '',
      paperType3Id: paperType3Id === 'None' ? undefined : paperType3Id,
      amount3: Math.max(0, parseFractionOrExpression(amount3)),
      entrancePaper: '',
      entrancePaperId: entrancePaperId === 'None' ? undefined : entrancePaperId,
      amount16: Math.max(0, parseFractionOrExpression(amount16)),
      ajabiPaper: '',
      ajabiPaperId: ajabiPaperId === 'None' ? undefined : ajabiPaperId,
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

    const contactInfo = validateAndFormatContactInput();
    if (contactInfo === null) return;

    const finalQuantity = Math.max(0, parseFractionOrExpression(qtyInput));
    const finalUnitPrice = Math.max(0, parseFractionOrExpression(priceInput));
    const finalAdvancePayment = Math.max(0, parseFractionOrExpression(advanceInput));
    const paperType1Id = resolveStockId(paperType1, paperStocks);
    const paperType2Id = resolveStockId(paperType2, paperStocks);
    const paperType3Id = resolveStockId(paperType3, paperStocks);
    const entrancePaperId = resolveStockId(entrancePaper, paperStocks);
    const ajabiPaperId = resolveStockId(ajabiPaper, paperStocks);

    const payload: Customer = {
      id: 'c_' + Date.now(),
      clientType,
      clientName: clientName.trim(),
      phone: contactInfo,
      acquisitionSource,
      orderTakenBy,
      productType,
      quantity: finalQuantity,
      unitPrice: finalUnitPrice,
      advancePayment: finalAdvancePayment,
      paymentMethodId: finalAdvancePayment > 0 ? paymentMethodId : '',
      paperType1: '',
      paperType1Id: paperType1Id === 'None' ? undefined : paperType1Id,
      amount1: Math.max(0, parseFractionOrExpression(amount1)),
      paperType2: '',
      paperType2Id: paperType2Id === 'None' ? undefined : paperType2Id,
      amount2: Math.max(0, parseFractionOrExpression(amount2)),
      paperType3: '',
      paperType3Id: paperType3Id === 'None' ? undefined : paperType3Id,
      amount3: Math.max(0, parseFractionOrExpression(amount3)),
      entrancePaper: '',
      entrancePaperId: entrancePaperId === 'None' ? undefined : entrancePaperId,
      amount16: Math.max(0, parseFractionOrExpression(amount16)),
      ajabiPaper: '',
      ajabiPaperId: ajabiPaperId === 'None' ? undefined : ajabiPaperId,
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
    setProductType('');
    setQuantity(0);
    setUnitPrice(0);
    setQtyInput('');
    setPriceInput('');
    setDeliveryDate('');
    
    // Reset standard layout deductions
    setPaperType1('None');
    setAmount1('');
    setPaperType2('None');
    setAmount2('');
    setPaperType3('None');
    setAmount3('');
    
    // Reset auxiliary layouts
    setEntrancePaper('None');
    setAmount16('');
    setAjabiPaper('None');
    setAmount9('');
    
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
    setBulkCompleteDate(new Date().toISOString().split('T')[0]);
    setBulkCompleteBankId('b1');
    setShowBulkCompleteModal(true);
  };

  const executeBulkCompleteConfirmed = () => {
    const updatedList = customers.map(c => {
      if (selectedCustomerIds.includes(c.id)) {
        return {
          ...c,
          deliveryDate: c.deliveryDate || bulkCompleteDate,
          bankRemainingId: c.bankRemainingId || bulkCompleteBankId
        };
      }
      return c;
    });
    onBulkUpdateCustomers(updatedList);
    setSelectedCustomerIds([]);
    setShowBulkCompleteModal(false);
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

  const handleAddStockFromOrder = () => {
    const trimmedName = newInlineStockName.trim();
    const parsedAmount = Math.max(0, parseFractionOrExpression(newInlineStockAmount));

    if (!trimmedName) {
      setFormError('Stock item name is required.');
      return;
    }
    if (parsedAmount <= 0) {
      setFormError('Stock amount must be greater than zero.');
      return;
    }

    const existing = paperStocks.find(stock => stock.name.trim().toLowerCase() === trimmedName.toLowerCase());
    if (existing) {
      onUpdateStocks(paperStocks.map(stock =>
        stock.id === existing.id
          ? { ...stock, initialStock: stock.initialStock + parsedAmount }
          : stock
      ));
    } else {
      onUpdateStocks([...paperStocks, {
        id: 'p_' + Date.now(),
        name: trimmedName,
        initialStock: parsedAmount,
      }]);
    }

    setNewInlineStockName('');
    setNewInlineStockAmount('');
    setFormError('');
  };

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;

      if (event.key === 'Escape') {
        if (showMobileFilters) {
          event.preventDefault();
          setShowMobileFilters(false);
        } else if (showFilterPopover) {
          event.preventDefault();
          setShowFilterPopover(false);
        } else if (showProductManager) {
          event.preventDefault();
          setShowProductManager(false);
        } else if (showProformaModal) {
          event.preventDefault();
          setShowProformaModal(false);
        } else if (showBulkDeleteConfirm) {
          event.preventDefault();
          setShowBulkDeleteConfirm(false);
        } else if (showBulkCompleteModal) {
          event.preventDefault();
          setShowBulkCompleteModal(false);
        } else if (deletingCustomerId) {
          event.preventDefault();
          setDeletingCustomerId(null);
        } else if (isFormOpen) {
          event.preventDefault();
          setIsFormOpen(false);
        }
      }

      if (event.key === 'Enter' && !(event.target instanceof HTMLTextAreaElement)) {
        if (showBulkDeleteConfirm) {
          event.preventDefault();
          executeBulkDeleteConfirmed();
        } else if (showBulkCompleteModal) {
          event.preventDefault();
          executeBulkCompleteConfirmed();
        } else if (deletingCustomerId) {
          event.preventDefault();
          onDeleteCustomer(deletingCustomerId);
          setDeletingCustomerId(null);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    showMobileFilters,
    showFilterPopover,
    showProductManager,
    showProformaModal,
    showBulkDeleteConfirm,
    showBulkCompleteModal,
    deletingCustomerId,
    isFormOpen,
    customers,
    selectedCustomerIds,
    bulkCompleteDate,
    bulkCompleteBankId,
  ]);

  const getCustomerSortValue = (customer: Customer, field: CustomerColumnSortField) => {
    const fullValue = Number(customer.quantity || 0) * Number(customer.unitPrice || 0);
    const remainingBalance = fullValue - Number(customer.advancePayment || 0);

    switch (field) {
      case 'remainingBalance':
        return remainingBalance;
      case 'fullValue':
        return fullValue;
      default:
        return customer[field] ?? '';
    }
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
    } else if (filterReceipt === 'WithoutReceipt') {
      matchesReceipt = !c.isVatAdded;
    }

    return matchesSearch && matchesAgent && matchesSource && matchesPayment && matchesCompletion && matchesReceipt;
  }).sort((a, b) => {
    if (customerSortBy === 'recordedOrder') return 0;
    const direction = customerSortDirection === 'asc' ? 1 : -1;
    const valA = getCustomerSortValue(a, customerSortBy);
    const valB = getCustomerSortValue(b, customerSortBy);

    if (typeof valA === 'number' || typeof valB === 'number') {
      return (Number(valA || 0) - Number(valB || 0)) * direction;
    }

    return String(valA || '').localeCompare(String(valB || '')) * direction;
  });

  const proformaItemsToRender = isStandaloneProformaMode 
    ? standaloneProformaItems 
    : customers.filter(c => selectedCustomerIds.includes(c.id)).map(c => ({
        id: c.id,
        clientName: c.clientName,
        phone: c.phone,
        productType: c.productType,
        quantity: c.quantity,
        unitPrice: c.unitPrice,
        advancePayment: c.advancePayment || 0
      }));

  useEffect(() => {
    if (showProformaModal && !lastShowProformaModalRef.current) {
      setEditedProductDescriptions({});
      
      if (isStandaloneProformaMode) {
        setProformaClientName(standaloneClientName || 'Valued Corporate Client');
        setProformaClientPhone(standaloneClientPhone || '+251 900 000 000');
      } else {
        const firstCust = proformaItemsToRender[0] as any;
        setProformaClientName(firstCust?.clientName || 'Valued Corporate Client');
        setProformaClientPhone(firstCust?.phone || '+251 (Customer Record)');
      }

      // Auto-fit PDF width when opened
      setTimeout(() => {
        const container = document.getElementById('pdf-preview-scroller');
        if (container) {
          const padding = window.innerWidth >= 1300 ? 80 : 24;
          const ratio = (container.clientWidth - padding) / 800;
          setProformaZoom(Math.min(1.5, Math.max(0.2, ratio)));
        }
      }, 50);

      setProformaLogoMain('mena');
      setProformaLogoSuffix('inc');
      setProformaLogoSubtitle('Mena Inc Trading PLC');
      setProformaContactTitle('Contact Information');
      setProformaContactAddress1('Bole Brass, adjacent to Yod Abyssinia');
      setProformaContactAddress2('Addis Ababa, Ethiopia');
      setProformaContactPhone1('📞 +251 942 125 568');
      setProformaContactPhone2('📞 +251 924 148 847');
      setProformaContactEmail('email: mena.inc@trading-plc.com');
      setProformaDocTitle('PROFORMA INVOICE');
      setProformaDocNoPrefix('Document No: ');
      setProformaDocNo(`PRO-2026-${new Date().getMonth() + 1}${new Date().getDate()}-${Math.floor(1000 + Math.random() * 9000)}`);
      setProformaDocIssueDateLabel('Doc Issue Date:');
      setProformaDocIssueDate(new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }));
      setProformaClientBillToLabel('CLIENT BILL TO');
      setProformaClientRecipientId(`Approved Ledger Recipient ID: CLN-2026-${(proformaItemsToRender[0]?.id || 'DRAFT').slice(0, 6)}`);
      setProformaAuthorityLabel('ISSUED BY AUTHORITY');
      setProformaIssuerName(currentUser?.name || 'Mena Automated Operator');
      setProformaIssuerPositionLabel('Position: ');
      setProformaIssuerPosition(currentUser?.role || 'Staff Operator');
      setProformaVerificationNote('Secure conversion ledger validation active.');
      setProformaColNo('No.');
      setProformaColDesc('Description of Product Line');
      setProformaColQty('Qty (pcs)');
      setProformaColPrice('Unit Price (ETB)');
      setProformaColTotal('Subtotal (ETB)');
      setProformaTermsTitle('Terms & General Conditions');
      setProformaTerm1Prefix('1. Delivery Term: ');
      setProformaDeliveryTerm('Within 7 to 10 days from order receipt validation.');
      setProformaTerm2Prefix('2. Payment Term: ');
      setProformaPaymentTerm('Requires at least 50% deposit ledger record, balance due prior to packaging release.');
      setProformaTerm3Prefix('3. Validity: ');
      setProformaValidityTerm('This proforma remains valid and conversion rates locked for 10 days from the dates above.');
      setProformaBankDetailsTitle('Payment Details (Direct Transfer)');
      setProformaFooterNote('processed in real-time by digital workbook agent, securely archived.');
      setProformaPreparedByTitle('PREPARED BY LEDGER CLERK');
      setProformaPreparedByNote(`${currentUser?.name || 'Mena Automated Operator'} (${currentUser?.role || 'authorized staff'})`);
      setProformaPreparedByVerification('Computer generated invoice. Requires no physical signature.');
      setProformaAuthorizedStampTitle('AUTHORIZED PLC STAMP');
      setProformaAuthorizedStampSubtitle('Mena Inc Conversion Division');

      if (bankAccounts && bankAccounts.length > 0) {
        const defaultBank = bankAccounts.find(b => b.accountNumber === '1000632725896');
        if (defaultBank) {
          setProformaBankId(defaultBank.id);
          setProformaBankName(defaultBank.name);
          setProformaBankAccountNumber(defaultBank.accountNumber || '');
        } else {
          setProformaBankId(bankAccounts[0].id);
          setProformaBankName(bankAccounts[0].name);
          setProformaBankAccountNumber(bankAccounts[0].accountNumber || '');
        }
      }
    }
    lastShowProformaModalRef.current = showProformaModal;
  }, [showProformaModal, isStandaloneProformaMode, standaloneClientName, standaloneClientPhone, currentUser, bankAccounts, proformaItemsToRender]);

  const formatMoney = (val: number) => val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const getBankName = (id?: string) => id ? (bankAccounts.find(b => b.id === id)?.name || 'Unknown account') : 'Empty / Unpaid';
  const getStatusLabel = (customer: Customer) => {
    if (customer.deliveryDate && customer.bankRemainingId) return 'Completed';
    if (customer.incompletionReason) return 'Incomplete';
    return 'Pending';
  };
  const openExternalContactUrl = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };
  const handleUsernameAppChoice = (username: string, app: UsernameOpenPreference) => {
    saveUsernameOpenPreference(app);
    setActiveContactMenuId(null);
    openExternalContactUrl(app === 'telegram' ? createTelegramUrl(username) : createWhatsAppUrl(username));
  };
  const copyContactToClipboard = async (value: string) => {
    if (!value) return;
    try {
      await navigator.clipboard?.writeText(value);
    } catch (_) {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  };
  const showCopiedContactIndicator = (customerId: string) => {
    setCopiedContactId(customerId);
    if (copiedContactTimerRef.current) {
      window.clearTimeout(copiedContactTimerRef.current);
    }
    copiedContactTimerRef.current = window.setTimeout(() => {
      setCopiedContactId(null);
      copiedContactTimerRef.current = null;
    }, 1200);
  };
  const handleContactClick = async (customer: Customer, trigger: HTMLElement) => {
    const contact = formatContactDisplay(customer.phone || '');
    if (contact.type === 'empty' || contact.type === 'invalid-phone') return;
    await copyContactToClipboard(contact.normalized || contact.raw || contact.display);
    showCopiedContactIndicator(customer.id);
    if (contact.type === 'link') {
      openExternalContactUrl(createLinkUrl(contact.raw));
      return;
    }
    const rect = trigger.getBoundingClientRect();
    setContactMenuPosition({
      top: Math.min(rect.bottom + 6, window.innerHeight - 12),
      left: Math.min(rect.left, window.innerWidth - 190),
    });
    setActiveContactMenuId(activeContactMenuId === customer.id ? null : customer.id);
  };
  const miniLabel = (label: string, value: React.ReactNode, className = '', valueClass = 'text-gray-300') => (
    <div className={`min-w-0 ${className}`}>
      <span className="block text-[8px] uppercase tracking-wider text-gray-500 leading-tight">{label}</span>
      <span className={`block truncate text-[11px] leading-tight font-medium ${valueClass}`} title={typeof value === 'string' ? value : undefined}>{value || '-'}</span>
    </div>
  );
  const materialLine = (label: string, paper: string, amount: number) => (
    <div className="flex items-center justify-between gap-2 min-w-0 leading-tight">
      <span className="truncate text-[10px] text-gray-400" title={paper || 'None'}><span className="text-gray-500">{label}</span> {paper || 'None'}</span>
      <span className="shrink-0 text-[10px] font-semibold text-[#ee317b]">{amount || '-'}</span>
    </div>
  );
  const ContactInfoControl = ({ customer }: { customer: Customer }) => {
    const contact = formatContactDisplay(customer.phone || '');
    const isMenuOpen = activeContactMenuId === customer.id;
    const isCopied = copiedContactId === customer.id;
    const menuWidth = contact.type === 'username' ? 176 : 144;
    const menuLeft = contactMenuPosition ? Math.max(8, Math.min(contactMenuPosition.left, window.innerWidth - menuWidth - 8)) : 8;
    const menuTop = contactMenuPosition ? Math.max(8, contactMenuPosition.top) : 8;

    return (
      <div className="relative flex max-w-[190px] items-center gap-1">
        <button
          type="button"
          onClick={(event) => handleContactClick(customer, event.currentTarget)}
          disabled={contact.type === 'empty' || contact.type === 'invalid-phone'}
          className={`max-w-full inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[11px] transition-colors ${
            contact.type === 'invalid-phone'
              ? 'border-red-900/50 bg-[#2E181D]/30 text-red-300 cursor-help'
              : contact.type === 'empty'
                ? 'border-[#262626] bg-[#181818] text-gray-500 cursor-default'
                : 'border-[#262626] bg-[#181818] text-gray-300 hover:border-[#ee317b] hover:text-white cursor-pointer'
          }`}
          title={contact.error || contact.raw || 'No contact info'}
        >
          {contact.type === 'phone' ? <Phone className="w-3 h-3 shrink-0" /> : contact.type === 'link' ? <ExternalLink className="w-3 h-3 shrink-0" /> : <User className="w-3 h-3 shrink-0" />}
          <span className="truncate">{contact.display}</span>
        </button>
        {isCopied && (
          <span className="shrink-0 rounded border border-[#71b536]/40 bg-[#112918] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#71b536] shadow-sm">
            Copied
          </span>
        )}
        {isMenuOpen && contact.type !== 'link' && contactMenuPosition && createPortal(
          <div
            ref={contactMenuRef}
            className={`${contact.type === 'username' ? 'w-44' : 'w-36'} fixed z-[9999] rounded-md border border-[#262626] bg-[#181818] p-1 shadow-2xl`}
            style={{ top: menuTop, left: menuLeft }}
          >
            {contact.type === 'phone' ? (
              <>
                <button type="button" onClick={() => openExternalContactUrl(createTelUrl(contact.normalized))} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[11px] text-gray-300 hover:bg-[#242424]"><Phone className="w-3 h-3" /> Call</button>
                <button type="button" onClick={() => openExternalContactUrl(createSmsUrl(contact.normalized))} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[11px] text-gray-300 hover:bg-[#242424]"><MessageCircle className="w-3 h-3" /> SMS</button>
                <button type="button" onClick={() => openExternalContactUrl(createWhatsAppUrl(contact.normalized))} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[11px] text-gray-300 hover:bg-[#242424]"><Send className="w-3 h-3" /> WhatsApp</button>
              </>
            ) : (
              <>
                <div className="px-2 py-1 text-[9px] uppercase tracking-wider text-gray-500">Open username with</div>
                <button type="button" onClick={() => handleUsernameAppChoice(contact.normalized, 'whatsapp')} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[11px] text-gray-300 hover:bg-[#242424]"><Send className="w-3 h-3" /> WhatsApp</button>
                <button type="button" onClick={() => handleUsernameAppChoice(contact.normalized, 'telegram')} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[11px] text-gray-300 hover:bg-[#242424]"><MessageCircle className="w-3 h-3" /> Telegram</button>
              </>
            )}
          </div>,
          document.body
        )}
      </div>
    );
  };

  return (
    <SharedDataTableLayout
      id="customers-tab-pnl"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        mobileLeftControls={
          <>
            <button
              type="button"
              onClick={() => setLayoutMode('grid')}
              className={`p-1.5 rounded cursor-pointer transition-colors ${layoutMode === 'grid' ? 'bg-[#ee317b]/10 text-[#ee317b]' : 'text-gray-400 hover:text-white'}`}
              title="Table view"
            >
              <TableIcon className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('cards')}
              className={`p-1.5 rounded cursor-pointer transition-colors ${layoutMode === 'cards' ? 'bg-[#ee317b]/10 text-[#ee317b]' : 'text-gray-400 hover:text-white'}`}
              title="Gallery view"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </>
        }
        mobileRightControls={
          <>
            <button
              type="button"
              onClick={() => setShowMobileFilters(true)}
              className="bg-transparent text-gray-300 p-1.5 rounded hover:bg-[#181818] transition-colors flex items-center justify-center relative cursor-pointer"
              title="Refine database"
            >
              <Filter className="w-3.5 h-3.5" />
              {[filterAgent, filterSource, filterPayment, filterCompletion, filterReceipt].filter(f => f !== 'All').length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#ee317b] text-white text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">
                  {[filterAgent, filterSource, filterPayment, filterCompletion, filterReceipt].filter(f => f !== 'All').length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={handleRecordedOrderSort}
              className={`bg-transparent p-1.5 rounded hover:bg-[#181818] transition-colors flex items-center justify-center cursor-pointer ${
                customerSortBy === 'recordedOrder' ? 'text-[#ee317b]' : 'text-gray-300'
              }`}
              title="Recorded order"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </>
        }
        desktopLeftControls={
          <div className="border border-[#262626] rounded p-0.5 flex bg-transparent shrink-0">
            <button
              type="button"
              onClick={() => setLayoutMode('grid')}
              className={`p-1 rounded cursor-pointer transition-colors ${layoutMode === 'grid' ? 'bg-[#ee317b]/10 text-[#ee317b]' : 'text-gray-400 hover:text-white'}`}
              title="Tabular Grid View"
            >
              <TableIcon className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('cards')}
              className={`p-1 rounded cursor-pointer transition-colors ${layoutMode === 'cards' ? 'bg-[#ee317b]/10 text-[#ee317b]' : 'text-gray-400 hover:text-white'}`}
              title="Responsive Cards View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        }
        desktopRightControls={
          <>
            <div className="relative z-[1000]">
              <button
                type="button"
                onClick={() => setShowFilterPopover(!showFilterPopover)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-gray-300 hover:bg-[#202020] transition-colors cursor-pointer text-[11px] font-medium font-sans ${
                  [filterAgent, filterSource, filterPayment, filterCompletion, filterReceipt].some(f => f !== 'All')
                    ? 'text-[#ee317b] bg-[#ee317b]/10'
                    : ''
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                {[filterAgent, filterSource, filterPayment, filterCompletion, filterReceipt].filter(f => f !== 'All').length > 0 && (
                  <span className="bg-[#ee317b] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                    {[filterAgent, filterSource, filterPayment, filterCompletion, filterReceipt].filter(f => f !== 'All').length}
                  </span>
                )}
              </button>

              {showFilterPopover && (
                <>
                  <div
                    className="fixed inset-0 z-[990] cursor-default"
                    onClick={() => setShowFilterPopover(false)}
                  />
                  <div
                    className="absolute right-0 mt-1.5 w-72 z-[1001] rounded-lg border border-[#262626] bg-[#181818] p-2.5 text-xs font-sans text-gray-300 shadow-2xl flex flex-col gap-2.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between px-1">
                      <span className="font-bold text-gray-400 text-[10px] uppercase tracking-wider select-none">Database Options</span>
                      {[filterAgent, filterSource, filterPayment, filterCompletion, filterReceipt].some(f => f !== 'All') && (
                        <button
                          type="button"
                          onClick={() => {
                            setFilterAgent('All');
                            setFilterSource('All');
                            setFilterPayment('All');
                            setFilterCompletion('All');
                            setFilterReceipt('All');
                          }}
                          className="text-[#ee317b] hover:text-[#ee317b]/80 flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Clear All
                        </button>
                      )}
                    </div>
                    <div className="h-px bg-[#262626] my-0.5"></div>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 hover:bg-[#202020] rounded p-1 transition-colors">
                        <div className="flex items-center gap-1.5 text-gray-400 w-20 flex-shrink-0 select-none">
                          <User className="w-3.5 h-3.5" />
                          <span className="text-[11px]">Agent</span>
                        </div>
                        <div className="flex-1 min-w-0 bg-[#121212] rounded border border-[#262626] hover:border-gray-500 transition-colors">
                          <SearchableSelect
                            value={filterAgent}
                            onChange={(e) => setFilterAgent(e.target.value)}
                            className="bg-transparent text-xs text-white"
                          >
                            <option value="All">All Agents</option>
                            {AGENTS.map(agent => (
                              <option key={agent} value={agent}>{agent}</option>
                            ))}
                          </SearchableSelect>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 hover:bg-[#202020] rounded p-1 transition-colors">
                        <div className="flex items-center gap-1.5 text-gray-400 w-20 flex-shrink-0 select-none">
                          <Megaphone className="w-3.5 h-3.5" />
                          <span className="text-[11px]">Source</span>
                        </div>
                        <div className="flex-1 min-w-0 bg-[#121212] rounded border border-[#262626] hover:border-gray-500 transition-colors">
                          <SearchableSelect
                            value={filterSource}
                            onChange={(e) => setFilterSource(e.target.value)}
                            className="bg-transparent text-xs text-white"
                          >
                            <option value="All">All Sources</option>
                            {ACQUISITION_SOURCES.map(source => (
                              <option key={source} value={source}>{source}</option>
                            ))}
                          </SearchableSelect>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 hover:bg-[#202020] rounded p-1 transition-colors">
                        <div className="flex items-center gap-1.5 text-gray-400 w-20 flex-shrink-0 select-none">
                          <CreditCard className="w-3.5 h-3.5" />
                          <span className="text-[11px]">Payment</span>
                        </div>
                        <div className="flex-1 min-w-0 bg-[#121212] rounded border border-[#262626] hover:border-gray-500 transition-colors">
                          <SearchableSelect
                            value={filterPayment}
                            onChange={(e) => setFilterPayment(e.target.value)}
                            className="bg-transparent text-xs text-white"
                          >
                            <option value="All">All Statuses</option>
                            <option value="Paid">Fully Paid</option>
                            <option value="Debt">Unpaid / Debt</option>
                          </SearchableSelect>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 hover:bg-[#202020] rounded p-1 transition-colors">
                        <div className="flex items-center gap-1.5 text-gray-400 w-20 flex-shrink-0 select-none">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span className="text-[11px]">Job</span>
                        </div>
                        <div className="flex-1 min-w-0 bg-[#121212] rounded border border-[#262626] hover:border-gray-500 transition-colors">
                          <SearchableSelect
                            value={filterCompletion}
                            onChange={(e) => setFilterCompletion(e.target.value)}
                            className="bg-transparent text-xs text-white"
                          >
                            <option value="All">All Job Statuses</option>
                            <option value="Completed">Completed Only</option>
                            <option value="Pending">Pending Only</option>
                            <option value="Incomplete">Incomplete / Problematic</option>
                          </SearchableSelect>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 hover:bg-[#202020] rounded p-1 transition-colors">
                        <div className="flex items-center gap-1.5 text-gray-400 w-20 flex-shrink-0 select-none">
                          <FileText className="w-3.5 h-3.5" />
                          <span className="text-[11px]">Receipt</span>
                        </div>
                        <div className="flex-1 min-w-0 bg-[#121212] rounded border border-[#262626] hover:border-gray-500 transition-colors">
                          <SearchableSelect
                            value={filterReceipt}
                            onChange={(e) => setFilterReceipt(e.target.value)}
                            className="bg-transparent text-xs text-white"
                          >
                            <option value="All">All Receipts</option>
                            <option value="NeedsReceipt">Needs Receipts (VAT)</option>
                            <option value="WithoutReceipt">Without Receipt</option>
                          </SearchableSelect>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={handleRecordedOrderSort}
              className={`flex items-center justify-center p-1.5 rounded hover:bg-[#202020] transition-colors cursor-pointer ${
                customerSortBy === 'recordedOrder' ? 'text-[#ee317b] bg-[#ee317b]/10' : 'text-gray-300'
              }`}
              title="Recorded order"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleOpenCreate}
              className="text-[11px] font-sans font-bold text-black bg-[#ee317b] hover:bg-[#ee317b]/80 rounded px-2.5 py-1.5 flex items-center justify-center gap-1 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </>
        }
      fab={<FloatingAddButton onClick={handleOpenCreate} title="Create customer" />}
    >


      {/* Selected Items / Controls Row */}
      <div className="relative z-30">
        {/* Unified Selection Action Bar (Desktop Toolbar Row) */}
        <AnimatePresence>
          {selectedCustomerIds.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="hidden md:flex bg-[#ee317b]/10 border border-[#ee317b]/30 py-1.5 px-3 rounded-md items-center justify-between gap-4 text-xs font-sans z-30 overflow-x-auto"
            >
              <div className="flex items-center gap-2.5 text-white shrink-0">
                <CheckSquare className="w-4 h-4 text-[#ee317b]" />
                <span className="font-bold">{selectedCustomerIds.length} Selected</span>
                <button
                  type="button"
                  onClick={() => setSelectedCustomerIds([])}
                  className="px-2 py-0.5 bg-[#1C1C1C] hover:bg-[#262626] border border-[#262626] text-gray-400 hover:text-white rounded text-[10px] uppercase font-sans font-bold cursor-pointer transition-colors ml-1"
                  title="Deselect All Selected Items"
                >
                  Deselect All
                </button>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleBulkComplete}
                  className="px-3 py-1 bg-[#112918] hover:bg-[#1b4325] border border-green-800 text-[#71b536] font-bold rounded cursor-pointer transition-colors flex items-center gap-1 uppercase tracking-wider"
                >
                  ✓ Complete
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const selectedLedgerItems = customers.filter(c => selectedCustomerIds.includes(c.id));
                    setStandaloneClientName(selectedLedgerItems[0]?.clientName || '');
                    setStandaloneClientPhone(selectedLedgerItems[0]?.phone || '');
                    setStandaloneProformaItems(selectedLedgerItems.map(c => ({
                      id: c.id,
                      productType: c.productType || '',
                      quantity: c.quantity?.toString() || '',
                      unitPrice: c.unitPrice?.toString() || '',
                      advancePayment: c.advancePayment?.toString() || ''
                    })));
                    setIsStandaloneProformaMode(true);
                    setShowProformaModal(true);
                  }}
                  className="px-3 py-1 bg-[#181818] hover:bg-[#202020] border border-[#262626] text-white font-bold rounded cursor-pointer transition-colors flex items-center gap-1 uppercase tracking-wider"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Proforma
                </button>
                <button
                  type="button"
                  onClick={() => setShowBulkDeleteConfirm(true)}
                  className="px-3 py-1 bg-[#31111E] hover:bg-[#4a1a2d] border border-rose-900/50 text-[#ee317b] font-bold rounded cursor-pointer transition-colors flex items-center gap-1 uppercase tracking-wider"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* RENDER MODE: EXCEL SPREADSHEET HORIZONTAL GRID (DEFAULT) */}
      <DataTableWrapper className={`${layoutMode === 'grid' ? 'block' : 'hidden'} w-fit max-w-full mb-28 md:mb-0 !border-t md:!border md:!rounded-md`}>
        <DataTable
          className={`customer-ledger-table alternating-table-rows ${freezeCustomerHeader ? 'freeze-header-table' : ''} ${freezeCustomerFirstColumn ? 'freeze-first-column-table freeze-customer-info-table' : ''}`}
          onLongPressFreeze={(target) => {
            if (target === 'header') {
              setFreezeCustomerHeader(prev => !prev);
            } else {
              setFreezeCustomerFirstColumn(prev => !prev);
            }
          }}
        >
              <thead>
                <tr className="bg-[#181818] border-b border-[#262626] text-gray-400 font-sans tracking-wider uppercase text-center">
                  <th className="py-1.5 md:py-2.5 px-2.5 md:px-3 border-r border-[#262626] bg-[#1C1C1C] sticky left-0 z-20 font-bold text-gray-500 font-sans text-center w-8 text-[11px] md:text-xs">#</th>
                  <th className="customer-select-column py-2.5 px-2 border-r border-[#262626] font-bold text-center w-10 text-xs bg-[#181818]">
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
                      title="Select/Deselect all rows"
                    />
                  </th>
                  <SortableCustomerHeader field="clientName" className="customer-client-info-column min-w-[190px] bg-[#181818]">Client Info</SortableCustomerHeader>
                  <SortableCustomerHeader field="productType" className="min-w-[190px]">Order Info</SortableCustomerHeader>
                  <SortableCustomerHeader field="paperType1" className="min-w-[210px] bg-[#31111E]/20">Material Info</SortableCustomerHeader>
                  <SortableCustomerHeader field="advancePayment" className="min-w-[230px] text-[#71b536]">Payment Info</SortableCustomerHeader>
                  <SortableCustomerHeader field="deliveryDate" className="min-w-[210px] bg-[#31111E]/5">Delivery / Status</SortableCustomerHeader>
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
                              ? 'selected-row bg-[#1A2E20] border-l-2 border-[#ee317b]'
                              : 'hover:bg-[#1a1a1a]'
                      }`}
                    >
                      {/* Grid Row Index */}
                      <td className="py-1.5 px-1 text-center font-sans text-gray-500 border-r border-[#262626] bg-[#181818] sticky left-0 z-10">{index + 1}</td>
                      
                      {/* Grid Row Checkbox Column */}
                      <td className="customer-select-column py-1.5 px-2 border-r border-[#262626] text-center bg-[#151515]/45">
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
                      
                      {/* Client Info */}
                      <td className="customer-client-info-column py-1.5 px-2.5 border-r border-[#262626] font-sans align-top min-w-[190px]">
                        <div className="space-y-1">
                          <div className="flex items-baseline gap-1.5 min-w-0">
                            <span className="truncate text-[14px] font-bold leading-tight text-white" title={c.clientName}>{c.clientName}</span>
                            <span className="shrink-0 truncate text-[9px] font-semibold uppercase tracking-wide text-gray-500" title={c.clientType || 'Client'}>
                              {c.clientType || 'Client'}
                            </span>
                          </div>
                          <ContactInfoControl customer={c} />
                          <span className="inline-flex max-w-[150px] text-[10px] bg-[#181818] border border-[#2DA2D2D]/10 px-1.5 py-0.5 rounded-md text-gray-400 truncate" title={c.acquisitionSource}>
                            {c.acquisitionSource || 'No source'}
                          </span>
                          <div className="flex items-center gap-1 pt-0.5 font-sans">
                            <button
                              type="button"
                              onClick={() => handleOpenDuplicate(c)}
                              className="text-gray-400 hover:text-sky-400 hover:bg-[#262626] p-1.5 rounded-md transition-colors cursor-pointer"
                              title="Copy details to add another order for this client"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(c)}
                              className="text-gray-400 hover:text-[#ee317b] hover:bg-[#262626] p-1.5 rounded-md transition-colors cursor-pointer"
                              title="Edit Record"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingCustomerId(c.id)}
                              className="text-gray-500 hover:text-[#F87171] hover:bg-[#262626] p-1.5 rounded-md transition-colors cursor-pointer"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </td>
                      
                      {/* Order Info */}
                      <td className="py-1.5 px-2.5 border-r border-[#262626] font-sans align-top min-w-[190px]">
                        <div className="grid grid-cols-2 gap-x-2.5 gap-y-1">
                          {miniLabel('By', c.orderTakenBy, '', 'text-gray-300')}
                          {miniLabel('Product', c.productType, '', 'text-gray-200')}
                          {miniLabel('Qty', c.quantity.toLocaleString(), '', 'text-white')}
                          {miniLabel('Unit', formatMoney(c.unitPrice), '', 'text-gray-300')}
                          <div className="col-span-2 flex items-center justify-between gap-2 border-t border-[#262626]/80 pt-0.5">
                            <span className="text-[8px] uppercase tracking-wider text-gray-500">Total</span>
                            <span className="text-[12px] font-bold text-white">{formatMoney(fullVal)}</span>
                          </div>
                          {c.isVatAdded && <span className="col-span-2 text-[8px] text-[#ee317b] uppercase font-bold tracking-tight">15% VAT Inc.</span>}
                        </div>
                      </td>
                      
                      {/* Material Info */}
                      <td className="py-1.5 px-2.5 border-r border-[#262626] bg-[#31111E]/10 font-sans align-top min-w-[210px]">
                        <div className="space-y-0.5">
                          {materialLine('P1', getCustomerStockDisplayName(c, 'paperType1', paperStocks), c.amount1)}
                          {materialLine('P2', getCustomerStockDisplayName(c, 'paperType2', paperStocks), c.amount2)}
                          {materialLine('P3', getCustomerStockDisplayName(c, 'paperType3', paperStocks), c.amount3)}
                          {materialLine('Entrance', getCustomerStockDisplayName(c, 'entrancePaper', paperStocks), c.amount16)}
                          {materialLine('Ajabi', getCustomerStockDisplayName(c, 'ajabiPaper', paperStocks), c.amount9)}
                        </div>
                      </td>
                      
                      {/* Payment Info */}
                      <td className="py-1.5 px-2.5 border-r border-[#262626] font-sans align-top min-w-[230px]">
                        <div className="grid grid-cols-2 gap-x-2.5 gap-y-1">
                            {miniLabel('Advance', formatMoney(c.advancePayment), '', 'text-[#71b536]')}
                            <div>
                              <span className="block text-[8px] uppercase tracking-wider text-gray-500 leading-tight">Advance Date</span>
                              <input
                                type="date"
                                value={c.advancePaymentDate || ''}
                                onChange={(e) => onUpdateCustomer({ ...c, advancePaymentDate: e.target.value })}
                                className="w-full max-w-[118px] bg-[#121212] text-[11px] text-sky-400 hover:text-sky-300 border border-[#262626] hover:border-sky-400 focus:border-sky-400 outline-none px-1.5 py-0.5 font-sans cursor-pointer rounded-md leading-tight"
                                title="Change Advance Payment Date directly"
                              />
                            </div>
                            {miniLabel('Advance Bank', getBankName(c.paymentMethodId), '', 'text-gray-400')}
                            {miniLabel('Remaining', remainingVal <= 0 ? 'PAID' : formatMoney(remainingVal), '', remainingVal > 0 ? 'text-[#F87171] font-bold' : 'text-[#71b536] font-bold')}
                            {miniLabel('Full', formatMoney(fullVal), '', 'text-white font-bold')}
                        </div>
                      </td>
                      
                      {/* Delivery / Status */}
                      <td className="py-1.5 px-2.5 border-r border-[#262626] font-sans align-top bg-[#1c1c1c]/10 min-w-[245px]">
                        <div className="grid grid-cols-2 gap-x-2.5 gap-y-1">
                          <div className="min-w-0">
                            <span className="block text-[8px] uppercase tracking-wider text-gray-500 leading-tight">Delivery Date</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="date"
                                value={c.deliveryDate || ''}
                                onChange={(e) => onUpdateCustomer({ ...c, deliveryDate: e.target.value })}
                                className="min-w-0 w-full max-w-[128px] bg-[#121212] text-[11px] font-semibold text-[#ee317b] hover:text-[#ff4e91] border border-[#262626] hover:border-[#ee317b] focus:border-[#ee317b] outline-none px-1.5 py-0.5 font-sans cursor-pointer rounded-md leading-tight"
                                title="Change Delivery Date directly"
                              />
                              {c.deliveryDate && (
                                <button
                                  type="button"
                                  onClick={() => onUpdateCustomer({ ...c, deliveryDate: '', bankRemainingId: '' })}
                                  className="text-red-500 hover:text-red-400 font-extrabold px-1 py-0 cursor-pointer text-xs leading-none"
                                  title="Clear Delivery Date"
                                >
                                  x
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <span className="block text-[8px] uppercase tracking-wider text-gray-500 leading-tight">Remaining Bank</span>
                            <SearchableSelect
                              value={c.bankRemainingId || ''}
                              onChange={(e) => onUpdateCustomer({ ...c, bankRemainingId: e.target.value || undefined })}
                              className="bg-[#121212] text-[11px] text-gray-300 hover:text-white border border-[#262626] hover:border-[#ee317b] focus:border-[#ee317b] outline-none px-1.5 py-0.5 font-sans cursor-pointer rounded-md w-full max-w-[128px] leading-tight truncate"
                            >
                              <option value="">- Empty/Unpaid -</option>
                              {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </SearchableSelect>
                          </div>
                          <div className="min-w-0">
                            <span className="block text-[8px] uppercase tracking-wider text-gray-500 leading-tight">Status</span>
                            <span className={`inline-flex max-w-full rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase leading-tight ${isCompleted ? 'border-green-800/60 bg-[#112918]/30 text-[#71b536]' : c.incompletionReason ? 'border-red-900/60 bg-[#2E181D]/40 text-red-300' : 'border-[#262626] bg-[#181818] text-gray-300'}`}>
                              {getStatusLabel(c)}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <span className="block text-[8px] uppercase tracking-wider text-gray-500 leading-tight">Incomplete Reason</span>
                            <input
                              type="text"
                              value={c.incompletionReason || ''}
                              placeholder="Completed / reason..."
                              onChange={(e) => onUpdateCustomer({ ...c, incompletionReason: e.target.value })}
                              className="bg-[#121212] text-[11px] text-gray-350 hover:text-white border border-[#262626] hover:border-[#ee317b] focus:border-[#ee317b] outline-none px-1.5 py-0.5 font-sans rounded-md w-full max-w-[128px] leading-tight"
                              title={c.incompletionReason || 'Change Incompletion Reason directly'}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-10 font-sans text-sm text-gray-500">
                      No customer ledger logs matching this criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </DataTable>
      </DataTableWrapper>

      {/* RESPONSIVE CARDS VIEW */}
      <div className={`${layoutMode === 'cards' ? 'grid' : 'hidden'} grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-none mb-28 md:mb-0`}>
        {filteredCustomers.map((c) => {
            const fullVal = c.quantity * c.unitPrice;
            const remainingVal = fullVal - c.advancePayment;
            const isCompleted = !!(c.deliveryDate && c.bankRemainingId);
            const isSelected = selectedCustomerIds.includes(c.id);
            
            return (
              <div 
                key={c.id} 
                className={`border rounded-md p-3 shadow-none flex flex-col justify-between transition-all duration-300 text-gray-300 ${
                  isCompleted 
                    ? 'bg-[#112918]/25 border-green-800/60 shadow-[inset_0_1px_0_0_rgba(52,211,153,0.15)] text-green-300' 
                    : c.incompletionReason
                      ? 'bg-[#2E181D]/60 border-red-900/60 shadow-[inset_0_1px_0_0_rgba(239,68,68,0.15)] text-red-300'
                      : isSelected 
                        ? 'bg-sky-950/20 border-sky-600/60 shadow-[inset_0_1px_0_0_rgba(56,189,248,0.15)] text-sky-300'
                        : 'bg-[#121212] border-[#262626] hover:border-[#ee317b]'
                }`}
              >
                <div className="space-y-2.5">
                  
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
                        className="accent-[#ee317b] w-4.5 h-4.5 mt-0.5 cursor-pointer rounded-md border border-[#262626]"
                        title="Select/Deselect order item"
                      />
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[10px] uppercase font-sans font-bold px-2 py-0.5 rounded-md border ${
                            c.clientType === 'Organization' ? 'bg-[#2E181D] text-[#F87171] border-[#5D2D35]' : c.clientType === 'Individual' ? 'bg-[#181818] text-gray-300 border-[#262626]' : 'bg-[#1e1e1e] text-[#ee317b] border-[#ee317b]/30'
                          }`}>
                            {c.clientType}
                          </span>
                          
                          {isCompleted && (
                            <span className="text-[10px] bg-green-900/40 text-green-300 px-2 py-0.5 font-sans border border-green-800/40 rounded-md font-bold uppercase">
                              ✓ COMPLETED
                            </span>
                          )}

                          <span className="text-[10px] bg-[#181818] text-gray-400 px-1.5 py-0.5 font-sans border border-[#262626] rounded-md">
                            AGENT: {c.orderTakenBy.toUpperCase()}
                          </span>
                        </div>
                        <h3 className="font-sans font-bold text-white mt-2.5 text-base">{c.clientName}</h3>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 font-sans">
                        #{c.id.substring(c.id.length - 4)}
                      </span>
                    </div>
                  </div>

                  {/* Detail Info */}
                  <div className="text-xs text-gray-300 space-y-1.5 font-sans animate-fade-in">
                    <div className="flex items-center gap-2">
                       <Phone className="w-3.5 h-3.5 text-[#ee317b]" />
                       <span>{c.phone || 'No phone record'}</span>
                    </div>
                     <div className="flex flex-col gap-2">
                       <div className="flex items-center gap-2 font-sans text-xs">
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
                              className="bg-[#161616] text-[#ee317b] hover:text-[#ff4e91] border border-[#262626] hover:border-[#ee317b] focus:border-[#ee317b] font-sans px-1.5 py-0.5 rounded-md outline-none cursor-pointer"
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
                       
                       <div className="flex items-center gap-2 font-sans text-xs">
                          <span className="text-[#ee317b] font-bold text-xs">🏦</span>
                          <span className="text-gray-400 flex items-center gap-1.5 flex-wrap">
                            Final Method:
                            <SearchableSelect
                              value={c.bankRemainingId || ''}
                              onChange={(e) => {
                                onUpdateCustomer({
                                  ...c,
                                  bankRemainingId: e.target.value || undefined
                                });
                              }}
                              className="bg-[#161616] text-[#ee317b] hover:text-white border border-[#262626] hover:border-[#ee317b] focus:border-[#ee317b] font-sans px-1.5 py-0.5 rounded-md outline-none cursor-pointer max-w-[150px] truncate"
                            >
                              <option value="">- Unpaid -</option>
                              {bankAccounts.map(b => (
                                <option key={b.id} value={b.id}>
                                  {b.name}
                                </option>
                              ))}
                            </SearchableSelect>
                          </span>
                       </div>
                     </div>
                    <div className="flex items-center gap-2">
                       <Layers className="w-3.5 h-3.5 text-[#ee317b]" />
                       <span>Product: <strong className="text-white font-sans">{c.productType} ({c.quantity} pcs)</strong></span>
                    </div>
                  </div>

                  {/* Deductions breakdown */}
                  <div className="bg-[#181818] border border-[#262626] rounded-md p-3 text-xs space-y-2">
                    <span className="font-sans text-[10px] text-gray-500 uppercase tracking-wider block font-bold">STOCK ROOM DEDUCTIONS</span>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 font-sans">
                      {getCustomerStockId(c, 'paperType1', paperStocks) !== 'None' && (() => {
                        const sheets = Math.ceil(c.amount1 * c.quantity);
                        return (
                          <div>
                            <span className="text-gray-500 block text-[10px]">PAPER 1 (x Qty):</span>
                            <span className="font-medium text-stone-200" title="Sheets per card multiplied by card quantity, rounded up to next integer">
                              {getCustomerStockDisplayName(c, 'paperType1', paperStocks)} ({sheets} sheets)
                            </span>
                          </div>
                        );
                      })()}

                      {getCustomerStockId(c, 'paperType2', paperStocks) !== 'None' && (() => {
                        const sheets = Math.ceil(c.amount2 * c.quantity);
                        return (
                          <div>
                            <span className="text-gray-500 block text-[10px]">PAPER 2 (x Qty):</span>
                            <span className="font-medium text-stone-200" title="Sheets per card multiplied by card quantity, rounded up to next integer">
                              {getCustomerStockDisplayName(c, 'paperType2', paperStocks)} ({sheets} sheets)
                            </span>
                          </div>
                        );
                      })()}

                      {getCustomerStockId(c, 'paperType3', paperStocks) !== 'None' && (() => {
                        const sheets = Math.ceil(c.amount3 * c.quantity);
                        return (
                          <div>
                            <span className="text-gray-500 block text-[10px]">PAPER 3 (x Qty):</span>
                            <span className="font-medium text-stone-200" title="Sheets per card multiplied by card quantity, rounded up to next integer">
                              {getCustomerStockDisplayName(c, 'paperType3', paperStocks)} ({sheets} sheets)
                            </span>
                          </div>
                        );
                      })()}

                      {getCustomerStockId(c, 'entrancePaper', paperStocks) !== 'None' && (() => {
                        const sheets = Math.ceil(c.amount16 / 16);
                        return (
                          <div>
                            <span className="text-gray-500 block text-[10px]">ENTRANCE (Pieces / 16):</span>
                            <span className="font-medium text-stone-200" title="Entrance pieces divided by 16, rounded up">
                              {getCustomerStockDisplayName(c, 'entrancePaper', paperStocks)} ({sheets} sheets)
                            </span>
                          </div>
                        );
                      })()}

                      {getCustomerStockId(c, 'ajabiPaper', paperStocks) !== 'None' && (() => {
                        const sheets = Math.ceil(c.amount9 / 9);
                        return (
                          <div>
                            <span className="text-gray-500 block text-[10px]">AJABI (Pieces / 9):</span>
                            <span className="font-medium text-stone-200" title="Ajabi pieces divided by 9, rounded up">
                              {getCustomerStockDisplayName(c, 'ajabiPaper', paperStocks)} ({sheets} sheets)
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Finance Calculations */}
                  <div className="border-t border-[#262626] pt-3 grid grid-cols-3 gap-1 text-center font-sans text-xs">
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
                  <div className="mt-3.5 pt-2.5 border-t border-[#262626]/60 flex flex-col gap-1.5 text-[10px] font-sans">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 uppercase text-[8px] tracking-wider">Deposit A/C (Advance)</span>
                      <span className="text-gray-300 font-medium truncate max-w-[180px]">
                        {!c.paymentMethodId ? 'Empty / Unpaid' : (bankAccounts.find(ac => ac.id === c.paymentMethodId)?.name || 'Empty / Unpaid')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 uppercase text-[8px] tracking-wider">A/C for Remaining Due</span>
                      <span className="text-[#ee317b] font-medium truncate max-w-[180px]">
                        {c.bankRemainingId === '' ? 'Unpaid / Pending' : (bankAccounts.find(ac => ac.id === (c.bankRemainingId || 'b1'))?.name || 'CBE')}
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
                <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-[#262626]">
                  <button
                    type="button"
                    onClick={() => handleOpenDuplicate(c)}
                    className="text-xs text-sky-400 hover:text-white font-sans font-medium hover:bg-[#262626] px-2.5 py-1.5 rounded-md transition-all flex items-center gap-1 cursor-pointer"
                    title="Copy details to add another order for this client"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    +Order
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(c)}
                    className="text-xs text-[#ee317b] hover:text-white font-sans font-medium hover:bg-[#262626] px-2.5 py-1.5 rounded-md transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Modify
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingCustomerId(c.id)}
                    className="text-xs text-gray-400 hover:text-[#F87171] font-sans hover:bg-[#262626] px-2.5 py-1.5 rounded-md transition-all cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
          {filteredCustomers.length === 0 && (
            <div className="col-span-full text-center py-12 bg-[#121212] border border-[#262626] rounded-md text-gray-400 text-sm font-sans">
              No customer records matched your query terms.
            </div>
          )}
        </div>
      {/* DYNAMIC BACKDROP DRAWER/MODAL WIZARD */}
      <AnimatePresence>
        {isFormOpen && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-end bg-black/75 backdrop-blur-xs  overscroll-contain"
            onClick={(e) => { if (e.target === e.currentTarget) setIsFormOpen(false); }}
          >
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
                    <h3 className="font-sans font-bold text-white text-base flex items-center gap-1.5 uppercase">
                      {editingCustomer ? `Edit Order #${editingCustomer.id.slice(-4)}` : 'Create New Customer Order'}
                    </h3>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-[#262626] rounded-md cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Wizard Tab buttons */}
                <div className="grid grid-cols-3 border-b border-[#262626] text-center font-sans font-semibold text-[11px]  bg-[#181818]">
                  <button
                    type="button"
                    onClick={() => setFormStep(1)}
                    className={`py-3 border-b-2 cursor-pointer transition-colors rounded-md ${formStep === 1 ? 'border-[#ee317b] text-[#ee317b] bg-[#121212]' : 'border-transparent text-gray-400 hover:text-white'}`}
                  >
                    1. Account Info
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormStep(2)}
                    className={`py-3 border-b-2 cursor-pointer transition-colors rounded-md ${formStep === 2 ? 'border-[#ee317b] text-[#ee317b] bg-[#121212]' : 'border-transparent text-gray-400 hover:text-white'}`}
                  >
                    2. Primary Items
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormStep(3)}
                    className={`py-3 border-b-2 cursor-pointer transition-colors rounded-md ${formStep === 3 ? 'border-[#ee317b] text-[#ee317b] bg-[#121212]' : 'border-transparent text-gray-400 hover:text-white'}`}
                  >
                    3. Aux &amp; Special
                  </button>
                </div>
              </div>

              {/* Error strip */}
              {formError && (
                <div className="mx-6 mt-4 bg-[#31111E] border border-[#ee317b]/30 p-3 rounded-md text-[#F87171] text-xs flex items-center gap-2 font-sans">
                  <AlertCircle className="w-4 h-4 text-[#F87171] flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Step Forms */}
              <form onSubmit={handleFormSubmit} className="flex-1 px-6 pt-5 pb-2 overflow-y-auto space-y-6 overscroll-contain">
                
                {formStep === 1 && (
                  <div className="space-y-5 font-sans">
                    
                    {/* Card 1: Client Info */}
                    <div className="bg-[#181818] border border-[#262626] rounded-md p-4 space-y-4">
                      <h4 className="text-xs font-sans uppercase tracking-wider text-gray-500 font-bold border-b border-[#262626] pb-1.5">Client Info</h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1" htmlFor="field-client-name">
                            Client Name <span className="text-[#F87171]">*</span>
                          </label>
                          <input
                            id="field-client-name"
                            type="text"
                            required
                            placeholder="e.g. Almaz Tekle"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-[#121212] text-white border border-[#262626] focus:border-[#ee317b] rounded-md outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1" htmlFor="field-client-phone">
                            Contact Info
                          </label>
                          <input
                            id="field-client-phone"
                            type="text"
                             placeholder="Phone, link, or @username"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-[#121212] text-white border border-[#262626] focus:border-[#ee317b] rounded-md outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider" htmlFor="field-client-type">Client Type</label>
                            <button
                              type="button"
                              onClick={() => setIsAddingClientType(!isAddingClientType)}
                              className="text-[10px] text-[#ee317b] hover:text-pink-400 uppercase font-bold cursor-pointer"
                            >
                              {isAddingClientType ? 'Cancel' : 'Manage'}
                            </button>
                          </div>
                          <div className="flex gap-1.5">
                            {!isAddingClientType ? (
                              <div className="flex-1 flex gap-1.5">
                                <SearchableSelect
                                  id="field-client-type"
                                  value={clientType}
                                  onChange={(e) => setClientType(e.target.value as Customer['clientType'])}
                                  className="flex-1 px-3 py-2 text-sm bg-[#121212] text-white border border-[#262626] focus:border-[#ee317b] rounded-md outline-none cursor-pointer"
                                >
                                  <option value="">Select client type...</option>
                                  {clientTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                                </SearchableSelect>
                                {clientType && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const ct = clientTypes.find(c => c.name === clientType);
                                      if (ct) {
                                        if (window.confirm(`Are you sure you want to delete client type "${ct.name}"?`)) {
                                          onDeleteClientType([ct.id]);
                                          const remaining = clientTypes.filter(c => c.id !== ct.id);
                                          setClientType(remaining[0]?.name || '');
                                        }
                                      }
                                    }}
                                    className="px-2.5 bg-[#121212] text-red-400 hover:text-white hover:bg-red-700 border border-[#262626] hover:border-red-700 rounded-md font-sans text-xs font-bold cursor-pointer transition-colors flex items-center justify-center"
                                    title="Delete selected Client Type"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ) : (
                              renderClientTypeManager()
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider" htmlFor="field-client-source">Lead Channel</label>
                            <button
                              type="button"
                              onClick={() => setIsAddingChannel(!isAddingChannel)}
                              className="text-[10px] text-[#ee317b] hover:text-pink-400 uppercase font-bold cursor-pointer"
                            >
                              {isAddingChannel ? 'Cancel' : 'Manage'}
                            </button>
                          </div>
                          <div className="flex gap-1.5">
                            {!isAddingChannel ? (
                              <div className="flex-1 flex gap-1.5">
                                <SearchableSelect
                                  id="field-client-source"
                                  value={acquisitionSource}
                                  onChange={(e) => setAcquisitionSource(e.target.value as Customer['acquisitionSource'])}
                                  className="flex-1 px-3 py-2 text-sm bg-[#121212] text-white border border-[#262626] focus:border-[#ee317b] rounded-md outline-none cursor-pointer"
                                >
                                  <option value="">Select lead channel...</option>
                                  {acquisitionChannels.map(s => <option key={s} value={s}>{s}</option>)}
                                </SearchableSelect>
                                {acquisitionSource && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (window.confirm(`Are you sure you want to delete lead channel "${acquisitionSource}"?`)) {
                                        const updated = acquisitionChannels.filter(c => c !== acquisitionSource);
                                        setAcquisitionChannels(updated);
                                        localStorage.setItem('mena_inc_acquisition_channels_v3', JSON.stringify(updated));
                                        setAcquisitionSource(updated[0] || '');
                                      }
                                    }}
                                    className="px-2.5 bg-[#121212] text-red-400 hover:text-white hover:bg-red-700 border border-[#262626] hover:border-red-700 rounded-md font-sans text-xs font-bold cursor-pointer transition-colors flex items-center justify-center"
                                    title="Delete selected Lead Channel"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ) : (
                              renderChannelManager()
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: Product Info */}
                    <div className="bg-[#181818] border border-[#262626] rounded-md p-4 space-y-4">
                      <h4 className="text-xs font-sans uppercase tracking-wider text-gray-500 font-bold border-b border-[#262626] pb-1.5">Product Info</h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider" htmlFor="field-client-product">Product Type</label>
                            <button
                              type="button"
                              onClick={() => setIsAddingProduct(!isAddingProduct)}
                              className="text-[10px] text-[#ee317b] hover:text-pink-400 uppercase font-bold cursor-pointer"
                            >
                              {isAddingProduct ? 'Cancel' : 'Manage'}
                            </button>
                          </div>
                          <div className="flex gap-1.5">
                            {!isAddingProduct ? (
                              <div className="flex-1 flex gap-1.5">
                                <SearchableSelect
                                  id="field-client-product"
                                  value={productType}
                                  onChange={(e) => setProductType(e.target.value)}
                                  className="flex-1 px-3 py-2 text-sm bg-[#121212] text-white border border-[#262626] focus:border-[#ee317b] rounded-md outline-none cursor-pointer"
                                >
                                  <option value="">Select product type...</option>
                                  {productTypes.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                </SearchableSelect>
                                {productType && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const prod = productTypes.find(p => p.name === productType);
                                      if (prod) {
                                        if (window.confirm(`Are you sure you want to delete product type "${prod.name}"?`)) {
                                          await onDeleteProductType([prod.id]);
                                          const remaining = productTypes.filter(p => p.id !== prod.id);
                                          setProductType(remaining[0]?.name || '');
                                        }
                                      }
                                    }}
                                    className="px-2.5 bg-[#121212] text-red-400 hover:text-white hover:bg-red-700 border border-[#262626] hover:border-red-700 font-sans rounded-md text-xs font-bold cursor-pointer transition-colors flex items-center justify-center"
                                    title="Delete selected Product Type"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ) : (
                              renderProductTypeManager()
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1" htmlFor="field-client-agent">
                            Taken By <span className="text-[#F87171]">*</span>
                            <Lock className="w-3 h-3 text-gray-500" />
                          </label>
                          <SearchableSelect
                            id="field-client-agent"
                            disabled={true}
                            value={orderTakenBy}
                            onChange={(e) => setOrderTakenBy(e.target.value as Customer['orderTakenBy'])}
                            className="w-full px-3 py-2 text-sm border font-sans rounded-md outline-none bg-[#121212] border-[#262626] text-gray-500 cursor-not-allowed opacity-80"
                          >
                            {(employees.length > 0 ? employees.map(emp => emp.name) : AGENTS).map(a => (
                              <option key={a} value={a}>{a}</option>
                            ))}
                          </SearchableSelect>
                        </div>
                      </div>
                    </div>

                    {/* Card 3: Payment Info */}
                    <div className="bg-[#181818] border border-[#262626] rounded-md p-4 space-y-4">
                      <h4 className="text-xs font-sans uppercase tracking-wider text-gray-500 font-bold border-b border-[#262626] pb-1.5">Payment Info</h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1" htmlFor="field-client-qty">
                            Quantity <span className="text-[#F87171]">*</span>
                          </label>
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
                            className="w-full px-3 py-2 text-sm bg-[#121212] border border-[#262626] text-white rounded-md outline-none focus:border-[#ee317b]"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider" htmlFor="field-client-price">
                              Unit Price (ETB) <span className="text-[#F87171]">*</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isVatAdded}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setIsVatAdded(checked);
                                  if (checked) {
                                    const baseVal = parseFractionOrExpression(baseUnitPriceInput);
                                    const withVat = Math.round(baseVal * 1.15 * 100) / 100;
                                    setPriceInput(withVat.toString());
                                    setUnitPrice(withVat);
                                  } else {
                                    setPriceInput(baseUnitPriceInput);
                                    setUnitPrice(parseFractionOrExpression(baseUnitPriceInput));
                                  }
                                }}
                                className="accent-[#ee317b] w-3 h-3"
                              />
                              <span className="text-[10px] text-gray-300 uppercase tracking-wider font-bold">Add 15% VAT</span>
                            </label>
                          </div>
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
                            className="w-full px-3 py-2 text-sm bg-[#121212] border border-[#262626] text-white rounded-md outline-none focus:border-[#ee317b] disabled:opacity-60 disabled:cursor-not-allowed"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1" htmlFor="field-client-advance">Advance (ETB)</label>
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
                            className="w-full px-3 py-2 text-sm bg-[#121212] border border-[#262626] text-white rounded-md outline-none focus:border-[#ee317b]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1" htmlFor="field-client-advance-date">Advance Payment Date</label>
                          <input
                            id="field-client-advance-date"
                            type="date"
                            required
                            value={advancePaymentDate}
                            onChange={(e) => setAdvancePaymentDate(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-[#121212] border border-[#262626] text-white rounded-md outline-none focus:border-[#ee317b] cursor-pointer"
                          />
                        </div>

                        {(parseFractionOrExpression(advanceInput) > 0) && (
                          <div>
                            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1" htmlFor="field-client-bank">Advance Deposit Account</label>
                            <SearchableSelect
                              id="field-client-bank"
                              value={paymentMethodId}
                              onChange={(e) => setPaymentMethodId(e.target.value)}
                              className="w-full px-3 py-2 text-sm bg-[#121212] border border-[#262626] text-white rounded-md outline-none focus:border-[#ee317b] cursor-pointer"
                            >
                              <option value="">-- Empty / Unpaid --</option>
                              {bankAccounts.map(b => (
                                <option key={b.id} value={b.id}>
                                  {b.name}
                                </option>
                              ))}
                            </SearchableSelect>
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1" htmlFor="field-client-bank-remaining">Final Payment Method</label>
                          <SearchableSelect
                            id="field-client-bank-remaining"
                            value={bankRemainingId}
                            onChange={(e) => setBankRemainingId(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-[#121212] border border-[#262626] text-white rounded-md outline-none focus:border-[#ee317b] cursor-pointer"
                          >
                            <option value="">-- Unpaid / Pending --</option>
                            {bankAccounts.map(b => (
                              <option key={b.id} value={b.id}>
                                {b.name}
                              </option>
                            ))}
                          </SearchableSelect>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1" htmlFor="field-client-delivery">Final Payment Date (Delivery Date)</label>
                          <input
                            id="field-client-delivery"
                            type="date"
                            value={deliveryDate}
                            onChange={(e) => setDeliveryDate(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-[#121212] text-white border border-[#262626] focus:border-[#ee317b] rounded-md outline-none cursor-pointer"
                          />
                        </div>

                        {(computedRemainingBalance > 0) && (
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1" htmlFor="field-incompletion-reason">Incompletion Reason / Notes</label>
                            <input
                              id="field-incompletion-reason"
                              type="text"
                              placeholder="e.g. Awaiting design finalization or None"
                              value={incompletionReason}
                              onChange={(e) => setIncompletionReason(e.target.value)}
                              className="w-full px-3 py-2 text-sm bg-[#121212] border border-[#262626] text-white rounded-md outline-none focus:border-[#ee317b]"
                            />
                          </div>
                        )}

                      </div>
                    </div>

                    {/* Card 4: Order Summary */}
                    <div className="bg-[#121212] border border-[#262626] rounded-md p-4 space-y-3">
                      <h4 className="text-xs font-sans uppercase tracking-wider text-gray-500 font-bold border-b border-[#262626] pb-1.5 flex justify-between items-center">
                        Order Summary
                        <span className="text-[10px] text-[#ee317b] animate-pulse">Live Calc</span>
                      </h4>
                      
                      <div className="grid grid-cols-2 gap-y-2 text-xs font-sans">
                        <div className="text-gray-400">Subtotal</div>
                        <div className="text-right text-gray-200">
                          {isVatAdded 
                            ? (parseFractionOrExpression(baseUnitPriceInput) * quantity).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})
                            : computedFullPayment.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ETB
                        </div>

                        {isVatAdded && (
                          <>
                            <div className="text-gray-400">VAT (15%)</div>
                            <div className="text-right text-[#ee317b]">
                              + {(parseFractionOrExpression(baseUnitPriceInput) * quantity * 0.15).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ETB
                            </div>
                          </>
                        )}

                        <div className="text-gray-400 font-bold pt-2 border-t border-[#262626]">Total Output Price</div>
                        <div className="text-right text-white font-bold pt-2 border-t border-[#262626]">
                          {computedFullPayment.toLocaleString()} ETB
                        </div>

                        <div className="text-gray-400">Advance Paid</div>
                        <div className="text-right text-gray-200">
                          - {(parseFractionOrExpression(advanceInput) || 0).toLocaleString()} ETB
                        </div>

                        <div className="text-gray-400 font-bold pt-2 border-t border-[#262626]">Remaining Due</div>
                        <div className={`text-right font-bold pt-2 border-t border-[#262626] ${computedRemainingBalance > 0 ? 'text-[#F87171]' : 'text-[#71b536]'}`}>
                          {computedRemainingBalance <= 0 ? 'Paid (0 ETB)' : `${computedRemainingBalance.toLocaleString()} ETB`}
                        </div>
                      </div>
                    </div>

                  </div>
                )}

                {formStep === 2 && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-sans uppercase tracking-wider text-gray-500 font-bold border-b border-[#262626] pb-1.5">Primary Stock Item Deduction</h4>

                    <div className="bg-[#181818] border border-[#262626] rounded-md p-4 space-y-3 font-sans">
                      <span className="text-[10px] text-[#71b536] tracking-wider uppercase font-bold block">Add Stock Item Here</span>
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_8rem_auto] gap-2">
                        <input
                          type="text"
                          value={newInlineStockName}
                          onChange={(e) => setNewInlineStockName(e.target.value)}
                          placeholder="New stock item name..."
                          className="w-full px-2.5 py-1.5 text-xs bg-[#121212] text-white border border-[#262626] focus:border-[#71b536] rounded-md outline-none font-sans"
                        />
                        <input
                          type="text"
                          value={newInlineStockAmount}
                          onChange={(e) => setNewInlineStockAmount(cleanLeadingZeros(e.target.value))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddStockFromOrder();
                            }
                          }}
                          placeholder="Amount"
                          className="w-full px-2.5 py-1.5 text-xs bg-[#121212] text-white border border-[#262626] focus:border-[#71b536] rounded-md outline-none font-sans"
                        />
                        <button
                          type="button"
                          onClick={handleAddStockFromOrder}
                          className="px-3 py-1.5 bg-[#71b536] hover:bg-[#5a932a] text-black text-xs font-bold rounded-md cursor-pointer"
                        >
                          Add Stock
                        </button>
                      </div>
                    </div>

                    {/* Primary Item 1 */}
                    <div className="bg-[#181818] border border-[#262626] rounded-md p-4 space-y-3 font-sans">
                      <span className="text-[10px] text-[#ee317b] tracking-wider uppercase font-bold block">First Layout Item Deduction</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1">Primary Item 1</label>
                          <SearchableSelect
                            value={paperType1}
                            onChange={(e) => setPaperType1(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-[#121212] text-white border border-[#262626] focus:border-[#ee317b] rounded-md outline-none font-sans cursor-pointer"
                          >
                            <option value="None">None</option>
                            {paperStocks.map(s => {
                              const remaining = s.initialStock - computeTotalConsumed(s.id);
                              let statusClass = '';
                              if (remaining <= 0) statusClass = 'text-[#F87171]';
                              else if (remaining < 50) statusClass = 'text-[#FACC15]';
                              return (
                                <option key={s.id} value={s.id} data-status={statusClass} data-amount={`(${remaining} sheets)`}>
                                  {s.name}
                                </option>
                              );
                            })}
                          </SearchableSelect>
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1">Items consumed per card/piece</label>
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
                            className={`w-full px-2.5 py-1.5 text-xs bg-[#121212] text-white border rounded-md outline-none ${(() => {
                              if (!amount1 || paperType1 === 'None') return 'border-[#262626] focus:border-[#3a3a3a]';
                              const stock = selectedStock(paperType1);
                              if (!stock) return 'border-[#262626] focus:border-[#3a3a3a]';
                              const consumed = Math.ceil(parseFractionOrExpression(amount1) * quantity);
                              const newRemaining = stock.initialStock - computeTotalConsumed(stock.id) - consumed;
                              if (newRemaining <= 0) return 'border-2 border-red-500 focus:border-red-400';
                              if (newRemaining <= 50) return 'border-2 border-yellow-500 focus:border-yellow-400';
                              return 'border-[#262626] focus:border-[#3a3a3a]';
                            })()}`}
                            placeholder="e.g. 1/4 or 0.5"
                          />
                          {paperType1 !== 'None' && amount1 && (
                            <div className="text-[10px] text-gray-500 mt-1 font-sans">
                              {Math.ceil(parseFractionOrExpression(amount1) * quantity)} items consumed
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Primary Item 2 */}
                    <div className="bg-[#181818] border border-[#262626] rounded-md p-4 space-y-3 font-sans">
                      <span className="text-[10px] text-gray-400 tracking-wider uppercase font-bold block">Optional Second Layout Item</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1">Primary Item 2</label>
                          <SearchableSelect
                            value={paperType2}
                            onChange={(e) => setPaperType2(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-[#121212] text-white border border-[#262626] focus:border-[#ee317b] rounded-md outline-none font-sans cursor-pointer"
                          >
                            <option value="None">None</option>
                            {paperStocks.map(s => {
                              const remaining = s.initialStock - computeTotalConsumed(s.id);
                              let statusClass = '';
                              if (remaining <= 0) statusClass = 'text-[#F87171]';
                              else if (remaining < 50) statusClass = 'text-[#FACC15]';
                              return (
                                <option key={s.id} value={s.id} data-status={statusClass} data-amount={`(${remaining} sheets)`}>
                                  {s.name}
                                </option>
                              );
                            })}
                          </SearchableSelect>
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1">Items consumed per card/piece</label>
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
                            className={`w-full px-2.5 py-1.5 text-xs bg-[#121212] text-white border rounded-md outline-none disabled:opacity-40 disabled:cursor-not-allowed ${(() => {
                              if (!amount2 || paperType2 === 'None') return 'border-[#262626] focus:border-[#3a3a3a]';
                              const stock = selectedStock(paperType2);
                              if (!stock) return 'border-[#262626] focus:border-[#3a3a3a]';
                              const consumed = Math.ceil(parseFractionOrExpression(amount2) * quantity);
                              const newRemaining = stock.initialStock - computeTotalConsumed(stock.id) - consumed;
                              if (newRemaining <= 0) return 'border-2 border-red-500 focus:border-red-400';
                              if (newRemaining <= 50) return 'border-2 border-yellow-500 focus:border-yellow-400';
                              return 'border-[#262626] focus:border-[#3a3a3a]';
                            })()}`}
                            placeholder="e.g. 1/2"
                          />
                          {paperType2 !== 'None' && amount2 && (
                            <div className="text-[10px] text-gray-500 mt-1 font-sans">
                              {Math.ceil(parseFractionOrExpression(amount2) * quantity)} items consumed
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Primary Item 3 */}
                    <div className="bg-[#181818] border border-[#262626] rounded-md p-4 space-y-3 font-sans">
                      <span className="text-[10px] text-gray-400 tracking-wider uppercase font-bold block">Optional Third Layout Item</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1">Primary Item 3</label>
                          <SearchableSelect
                            value={paperType3}
                            onChange={(e) => setPaperType3(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-[#121212] text-white border border-[#262626] focus:border-[#ee317b] rounded-md outline-none font-sans cursor-pointer"
                          >
                            <option value="None">None</option>
                            {paperStocks.map(s => {
                              const remaining = s.initialStock - computeTotalConsumed(s.id);
                              let statusClass = '';
                              if (remaining <= 0) statusClass = 'text-[#F87171]';
                              else if (remaining < 50) statusClass = 'text-[#FACC15]';
                              return (
                                <option key={s.id} value={s.id} data-status={statusClass} data-amount={`(${remaining} sheets)`}>
                                  {s.name}
                                </option>
                              );
                            })}
                          </SearchableSelect>
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1">Items consumed per card/piece</label>
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
                            className={`w-full px-2.5 py-1.5 text-xs bg-[#121212] text-white border rounded-md outline-none disabled:opacity-40 disabled:cursor-not-allowed ${(() => {
                              if (!amount3 || paperType3 === 'None') return 'border-[#262626] focus:border-[#3a3a3a]';
                              const stock = selectedStock(paperType3);
                              if (!stock) return 'border-[#262626] focus:border-[#3a3a3a]';
                              const consumed = Math.ceil(parseFractionOrExpression(amount3) * quantity);
                              const newRemaining = stock.initialStock - computeTotalConsumed(stock.id) - consumed;
                              if (newRemaining <= 0) return 'border-2 border-red-500 focus:border-red-400';
                              if (newRemaining <= 50) return 'border-2 border-yellow-500 focus:border-yellow-400';
                              return 'border-[#262626] focus:border-[#3a3a3a]';
                            })()}`}
                            placeholder="e.g. 1/4"
                          />
                          {paperType3 !== 'None' && amount3 && (
                            <div className="text-[10px] text-gray-500 mt-1 font-sans">
                              {Math.ceil(parseFractionOrExpression(amount3) * quantity)} items consumed
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {formStep === 3 && (
                  <div className="space-y-4 font-sans">
                    <h4 className="text-xs font-sans uppercase tracking-wider text-gray-500 font-bold border-b border-[#262626] pb-1.5">Auxiliary / Special Layout Sheets</h4>

                    {/* Entrance Aux (Divided by 16) */}
                    <div className="bg-[#181818] border border-[#262626] rounded-md p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-gray-300 tracking-wider uppercase font-bold block">Entrance Sheets Spec</span>
                        <span className="text-[9px] bg-[#262626] border border-[#3a3a3a] text-gray-300 px-1.5 py-0.5 rounded-md font-sans">DIVIDED BY 16</span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1">Entrance Stock</label>
                          <SearchableSelect
                            value={entrancePaper}
                            onChange={(e) => setEntrancePaper(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-[#121212] text-white border border-[#262626] focus:border-[#ee317b] rounded-md outline-none cursor-pointer"
                          >
                            <option value="None">None</option>
                            {paperStocks.map(s => {
                              const remaining = s.initialStock - computeTotalConsumed(s.id);
                              let statusClass = '';
                              if (remaining <= 0) statusClass = 'text-[#F87171]';
                              else if (remaining < 50) statusClass = 'text-[#FACC15]';
                              return (
                                <option key={s.id} value={s.id} data-status={statusClass}>
                                  {s.name} ({remaining} sheets)
                                </option>
                              );
                            })}
                          </SearchableSelect>
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1">Amount of entrance card</label>
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
                            className={`w-full px-2.5 py-1.5 text-xs bg-[#121212] text-white border rounded-md outline-none disabled:opacity-40 disabled:cursor-not-allowed ${(() => {
                              if (!amount16 || entrancePaper === 'None') return 'border-[#262626] focus:border-[#3a3a3a]';
                              const stock = selectedStock(entrancePaper);
                              if (!stock) return 'border-[#262626] focus:border-[#3a3a3a]';
                              const consumed = Math.ceil(parseFractionOrExpression(amount16) / 16);
                              const newRemaining = stock.initialStock - computeTotalConsumed(stock.id) - consumed;
                              if (newRemaining <= 0) return 'border-2 border-red-500 focus:border-red-400';
                              if (newRemaining <= 50) return 'border-2 border-yellow-500 focus:border-yellow-400';
                              return 'border-[#262626] focus:border-[#3a3a3a]';
                            })()}`}
                            placeholder="e.g. 160 or 16 * 10"
                          />
                          {entrancePaper !== 'None' && amount16 && (
                            <div className="text-[10px] text-gray-500 mt-1 font-sans">
                              {Math.ceil(parseFractionOrExpression(amount16) / 16)} sheets consumed
                            </div>
                          )}
                        </div>
                      </div>

                    </div>

                    {/* Ajabi Aux (Divided by 9) */}
                    <div className="bg-[#181818] border border-[#262626] rounded-md p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-gray-300 tracking-wider uppercase font-bold block">Ajabi Sheets Spec</span>
                        <span className="text-[9px] bg-[#262626] border border-[#3a3a3a] text-gray-300 px-1.5 py-0.5 rounded-md font-sans">DIVIDED BY 9</span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1">Ajabi Stock</label>
                          <SearchableSelect
                            value={ajabiPaper}
                            onChange={(e) => setAjabiPaper(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-[#121212] text-white border border-[#262626] focus:border-[#ee317b] rounded-md outline-none cursor-pointer"
                          >
                            <option value="None">None</option>
                            {paperStocks.map(s => {
                              const remaining = s.initialStock - computeTotalConsumed(s.id);
                              let statusClass = '';
                              if (remaining <= 0) statusClass = 'text-[#F87171]';
                              else if (remaining < 50) statusClass = 'text-[#FACC15]';
                              return (
                                <option key={s.id} value={s.id} data-status={statusClass}>
                                  {s.name} ({remaining} sheets)
                                </option>
                              );
                            })}
                          </SearchableSelect>
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1">Amount of ajabi card</label>
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
                            className={`w-full px-2.5 py-1.5 text-xs bg-[#121212] text-white border rounded-md outline-none disabled:opacity-40 disabled:cursor-not-allowed ${(() => {
                              if (!amount9 || ajabiPaper === 'None') return 'border-[#262626] focus:border-[#3a3a3a]';
                              const stock = selectedStock(ajabiPaper);
                              if (!stock) return 'border-[#262626] focus:border-[#3a3a3a]';
                              const consumed = Math.ceil(parseFractionOrExpression(amount9) / 9);
                              const newRemaining = stock.initialStock - computeTotalConsumed(stock.id) - consumed;
                              if (newRemaining <= 0) return 'border-2 border-red-500 focus:border-red-400';
                              if (newRemaining <= 50) return 'border-2 border-yellow-500 focus:border-yellow-400';
                              return 'border-[#262626] focus:border-[#3a3a3a]';
                            })()}`}
                            placeholder="e.g. 90 or 9 * 10"
                          />
                          {ajabiPaper !== 'None' && amount9 && (
                            <div className="text-[10px] text-gray-500 mt-1 font-sans">
                              {Math.ceil(parseFractionOrExpression(amount9) / 9)} sheets consumed
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                )}

              </form>

              {/* Bottom Nav */}
              <div className="border-t border-[#262626] px-4 sm:px-6 py-4 bg-[#181818] flex flex-wrap items-center justify-between gap-3 sm:gap-4 sticky bottom-0 z-10">
                <div>
                  {formStep > 1 && (
                    <button
                      type="button"
                      onClick={() => setFormStep((prev) => (prev - 1) as 1 | 2 | 3)}
                      className="px-4 py-2 bg-transparent text-gray-300 hover:text-white border border-[#262626]  text-xs font-sans font-bold cursor-pointer"
                    >
                      Back
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 justify-end">
                  {!editingCustomer && (
                    <button
                      type="button"
                      onClick={handleSaveAndAddAnother}
                      className="px-4 py-2 border border-[#ee317b] text-[#ee317b] hover:bg-[#ee317b]/10 text-xs font-sans font-bold cursor-pointer "
                      title="Save this order, and immediately start another order for this same customer"
                    >
                      Save & Add Another Order
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleFormSubmit}
                    className="px-5 py-2 bg-[#ee317b] hover:bg-[#d61e63] text-white text-xs font-sans font-bold cursor-pointer "
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
                      className="px-4 py-2 bg-[#262626] text-stone-300 border border-[#3e3e3e] font-sans font-bold text-xs hover:bg-[#323232] hover:text-white flex items-center gap-1 cursor-pointer"
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
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 font-sans "
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
                      Are you sure you want to delete the paper consumption record for <span className="text-white font-semibold font-sans">"{targetCust.clientName}"</span>? This operation is irreversible and will restore occupied paper quantities back to your available inventory room balances.
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
        {showBulkCompleteModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 font-sans"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[#121212] border border-[#71b536]/60 max-w-md w-full p-6 text-left space-y-5 rounded-md"
            >
              <div className="flex items-start gap-3.5">
                <div className="text-[#71b536] text-3xl">✓</div>
                <div className="space-y-1.5 font-semibold text-white w-full">
                  <h3 className="text-white text-sm font-bold uppercase tracking-wider">Confirm Bulk Completion</h3>
                  <p className="text-xs text-gray-400 font-sans font-normal leading-relaxed">
                    You are marking <span className="text-white font-bold font-sans">{selectedCustomerIds.length}</span> orders as Paid/Completed.
                  </p>
                  
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Completion Date</label>
                      <input
                        type="date"
                        value={bulkCompleteDate}
                        onChange={(e) => setBulkCompleteDate(e.target.value)}
                        className="w-full bg-[#161616] text-[#71b536] border border-[#262626] focus:border-[#71b536] font-sans px-3 py-2 rounded-md outline-none cursor-pointer text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Deposit Account</label>
                      <SearchableSelect
                        value={bulkCompleteBankId}
                        onChange={(e) => setBulkCompleteBankId(e.target.value)}
                        className="w-full bg-[#161616] text-[#71b536] border border-[#262626] focus:border-[#71b536] font-sans px-3 py-2 rounded-md outline-none cursor-pointer text-xs"
                      >
                        <option value="b1">Select Bank Account</option>
                        {bankAccounts.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </SearchableSelect>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#262626]">
                <button
                  onClick={() => setShowBulkCompleteModal(false)}
                  className="px-3.5 py-1.5 text-xs text-gray-400 hover:text-white border border-[#262626] bg-[#181818] uppercase tracking-wider cursor-pointer font-sans rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={executeBulkCompleteConfirmed}
                  className="px-4 py-1.5 text-xs bg-[#112918] hover:bg-[#1b4325] border border-green-800 text-[#71b536] font-bold uppercase tracking-widest cursor-pointer font-sans rounded-md"
                >
                  Confirm Paid
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBulkDeleteConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 font-sans "
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
                    Are you sure you want to permanently delete the <span className="text-white font-bold font-sans">{selectedCustomerIds.length}</span> selected customer logs? 
                  </p>
                  <p className="text-xs text-stone-500 leading-relaxed font-sans font-normal">
                    This will wipe out all selected client records and return occupied paper stock weights to available inventory balances.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#262626]">
                <button
                  onClick={() => setShowBulkDeleteConfirm(false)}
                  className="px-3.5 py-1.5 text-xs text-gray-400 hover:text-white border border-[#262626] bg-[#181818] uppercase tracking-wider cursor-pointer font-sans"
                >
                  Cancel
                </button>
                <button
                  onClick={executeBulkDeleteConfirmed}
                  className="px-4 py-1.5 text-xs bg-[#ee317b] hover:bg-[#d61e63] text-white font-bold uppercase tracking-widest cursor-pointer font-sans"
                >
                  Delete Selected
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showProformaModal && (
            <motion.div 
              key="proforma-writer"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed inset-0 z-[9999] bg-[#0a0a0a] flex flex-col font-sans text-xs overflow-hidden" id="proforma-writer-modal">
            {/* Controller Bar - Sticky Top Header */}
            <div className="flex flex-col p-3 md:p-4 bg-[#141414] border-b border-[#262626] shrink-0 z-20 print-hidden-stamp-toggle shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-gray-300 font-semibold uppercase tracking-widest text-[10px] md:text-xs">
                    {isStandaloneProformaMode ? 'PROFORMA WRITER' : 'PROFORMA LEDGER'}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    id="export-pdf-direct-btn"
                    type="button"
                    onClick={exportDirectPDF}
                    className="px-3 md:px-4 py-1.5 bg-[#71b536] hover:bg-[#5ea126] text-black font-bold cursor-pointer rounded-md uppercase text-[9px] md:text-[10px] tracking-wider transition-colors flex items-center gap-1"
                  >
                    <span>📥 Export</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowProformaModal(false)}
                    className="px-3 md:px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-gray-300 font-bold cursor-pointer rounded-md uppercase text-[9px] md:text-[10px] tracking-wider transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
              
              {/* Mobile Tabs Toggle */}
              <div className="flex min-[1300px]:hidden bg-[#1f1f1f] p-0.5 rounded-md border border-[#2d2226] mt-3">
                <button 
                  onClick={() => setProformaMobileTab('edit')} 
                  className={`flex-1 py-1.5 rounded-sm text-[10px] font-bold uppercase transition-colors ${proformaMobileTab === 'edit' ? 'bg-[#ee317b] text-white' : 'text-gray-400'}`}
                >
                  Edit
                </button>
                <button 
                  onClick={() => {
                    setProformaMobileTab('preview');
                    setTimeout(() => {
                      const container = document.getElementById('pdf-preview-scroller');
                      if(container && window.innerWidth < 1300) {
                        const ratio = (window.innerWidth - 24) / 800; // 24px padding
                        setProformaZoom(Math.min(1.5, Math.max(0.2, ratio)));
                      }
                    }, 10);
                  }} 
                  className={`flex-1 py-1.5 rounded-sm text-[10px] font-bold uppercase transition-colors ${proformaMobileTab === 'preview' ? 'bg-[#71b536] text-white' : 'text-gray-400'}`}
                >
                  Preview
                </button>
              </div>
            </div>

            {/* Split Pane Workspace */}
            <div className="flex-1 flex overflow-hidden">
              {/* LEFT SIDEBAR (EDITOR) */}
              <div className={`w-full min-[1300px]:w-[40%] bg-[#121212] overflow-y-auto p-4 md:p-6 flex-col gap-6 custom-scrollbar border-r border-[#262626] ${proformaMobileTab === 'preview' ? 'hidden min-[1300px]:flex' : 'flex'}`}>
                
                {/* Client Info Section */}
                    {/* Client Info Section */}
                    <div className="bg-[#181818] border border-[#2d2024] p-4 rounded-md shadow-sm space-y-3">
                      <h3 className="text-[#ee317b] font-bold uppercase tracking-widest text-[10px] border-b border-[#2d2024] pb-2 mb-1 flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#ee317b]"></span>
                          Client Info
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setStandaloneClientName('');
                            setStandaloneClientPhone('');
                            setStandaloneProformaItems([
                              { id: `temp-${Date.now()}`, productType: '', quantity: '', unitPrice: '', advancePayment: '' }
                            ]);
                          }}
                          className="text-gray-400 hover:text-[#ee317b] bg-transparent border border-[#262626] hover:border-[#ee317b]/50 hover:bg-[#ee317b]/10 px-2 py-1 rounded-[4px] text-[9px] tracking-wider transition-all uppercase flex items-center gap-1"
                          title="Clear all client info and product rows"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                          Clear All Data
                        </button>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] uppercase text-gray-500 font-bold mb-1">PROFORMA CLIENT NAME</label>
                          <input 
                            type="text" 
                            value={standaloneClientName} 
                            onChange={(e) => setStandaloneClientName(e.target.value)} 
                            className="w-full bg-[#121212] border border-[#262626] px-2.5 py-1.5 text-[11px] hover:border-[#ee317b]/40 outline-none focus:border-[#ee317b] text-white rounded-sm"
                            placeholder="Mena Corporate Client PLC"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] uppercase text-gray-500 font-bold mb-1">PROFORMA CLIENT PHONE</label>
                          <input 
                            type="text" 
                            value={standaloneClientPhone} 
                            onChange={(e) => setStandaloneClientPhone(e.target.value)} 
                            className="w-full bg-[#121212] border border-[#262626] px-2.5 py-1.5 text-[11px] hover:border-[#ee317b]/40 outline-none focus:border-[#ee317b] text-white rounded-sm"
                            placeholder="+251 900 000 000"
                          />
                        </div>
                      </div>
                    </div>


                {/* Payment Settings Section (Always visible) */}
                <div className="bg-[#181818] border border-[#2d2024] p-4 rounded-md shadow-sm space-y-3">
                  <h3 className="text-[#ee317b] font-bold uppercase tracking-widest text-[10px] border-b border-[#2d2024] pb-2 mb-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ee317b]"></span>
                    Payment Settings
                  </h3>
                  <div className="flex flex-col gap-3">
                    <label className="flex items-center justify-between text-stone-300 text-xs w-full">
                      <span className="font-bold text-gray-400 uppercase text-[9px]">Payment Bank</span>
                      <SearchableSelect
                        value={proformaBankId}
                        onChange={(e) => setProformaBankId(e.target.value)}
                        className="px-2 py-1 bg-[#121212] border border-[#262626] text-gray-300 rounded-sm text-[10px] outline-none cursor-pointer focus:border-[#ee317b] w-2/3 max-w-[200px]"
                      >
                        <option value="">-- No Bank Details --</option>
                        {bankAccounts.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </SearchableSelect>
                    </label>
                    <label className="flex items-center justify-between text-stone-300 cursor-pointer text-xs w-full hover:bg-[#1a1215] p-1.5 rounded transition-colors -mx-1.5 px-1.5">
                      <span className="font-bold text-gray-400 uppercase text-[9px]">Apply PLC Stamp Seal</span>
                      <input
                        type="checkbox"
                        checked={applyDigitalStamp}
                        onChange={(e) => setApplyDigitalStamp(e.target.checked)}
                        className="accent-[#71b536] w-3.5 h-3.5 cursor-pointer"
                      />
                    </label>
                    <label className="flex items-center justify-between text-stone-300 cursor-pointer text-xs w-full hover:bg-[#1a1215] p-1.5 rounded transition-colors -mx-1.5 px-1.5">
                      <span className="font-bold text-gray-400 uppercase text-[9px]">Include 15% VAT</span>
                      <input
                        type="checkbox"
                        checked={proformaIncludeVat}
                        onChange={(e) => setProformaIncludeVat(e.target.checked)}
                        className="accent-[#ee317b] w-3.5 h-3.5 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                {/* Product Rows Section */}
                    <div className="bg-[#181818] border border-[#2d2024] p-4 rounded-md shadow-sm space-y-3 flex-1 flex flex-col min-h-max">
                      <div className="flex items-center justify-between border-b border-[#2d2024] pb-2 mb-1 cursor-pointer select-none group" onClick={() => setIsProductRowsExpanded(!isProductRowsExpanded)}>
                        <h3 className="text-[#ee317b] font-bold uppercase tracking-widest text-[10px] flex items-center gap-1.5 transition-colors">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#ee317b]"></span>
                          Product Rows
                          <span className={`transform transition-transform text-gray-500 ml-1 ${isProductRowsExpanded ? 'rotate-180' : ''}`}>▼</span>
                        </h3>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsProductRowsExpanded(true);
                            setStandaloneProformaItems(prev => [
                              ...prev,
                              {
                                id: `temp-${Date.now()}`,
                                productType: '',
                                quantity: '',
                                unitPrice: '',
                                advancePayment: ''
                              }
                            ]);
                            setTimeout(() => {
                              const container = document.getElementById('standalone-proforma-list');
                              if (container) {
                                container.scrollTop = container.scrollHeight;
                              }
                            }, 50);
                          }}
                          className="bg-[#ee317b] hover:bg-[#d61e63] text-white px-2.5 py-1 text-[10px] font-bold uppercase cursor-pointer rounded-sm transition-colors"
                        >
                          + Add Row
                        </button>
                      </div>
                      
                      {isProductRowsExpanded && (
                        <>

                      {standaloneProformaItems.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center border border-dashed border-[#2d2024] rounded-md bg-[#121212] p-6 text-center">
                          <p className="text-gray-500 text-[11px]">No items drafted. Click "+ Add Row" to start designing your proforma.</p>
                        </div>
                      ) : (
                        <div id="standalone-proforma-list" className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-1 -mr-1">
                          {standaloneProformaItems.map((item, index) => (
                            <div key={item.id} className="bg-[#121212] p-2.5 border border-[#262626] rounded-sm group relative">
                              <div className="absolute -left-1.5 -top-1.5 bg-[#181818] border border-[#2d2024] w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-gray-500 font-bold z-10">
                                {index + 1}
                              </div>
                              <div className="flex items-start gap-2">
                                <div className="flex-1 space-y-2">
                                  <div>
                                    <input
                                      type="text"
                                      value={item.productType}
                                      placeholder="Product Description..."
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setStandaloneProformaItems(prev => prev.map(p => p.id === item.id ? { ...p, productType: val } : p));
                                      }}
                                      className="w-full bg-transparent text-white border-b border-[#2d2226] px-1 py-1 text-[11px] outline-none focus:border-[#ee317b] font-semibold"
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <div className="flex-1">
                                      <label className="block text-[8px] text-gray-500 uppercase tracking-widest mb-0.5">Qty</label>
                                      <input
                                        type="number"
                                        placeholder="0"
                                        value={item.quantity}
                                        onChange={(e) => {
                                          const val = e.target.value === '' ? '' : Number(e.target.value);
                                          setStandaloneProformaItems(prev => prev.map(p => p.id === item.id ? { ...p, quantity: val } : p));
                                        }}
                                        className="w-full bg-[#1a1a1a] text-white border border-[#2d2226] px-1.5 py-1 text-[10px] rounded-sm outline-none focus:border-[#ee317b]"
                                      />
                                    </div>
                                    <div className="flex-1">
                                      <label className="block text-[8px] text-gray-500 uppercase tracking-widest mb-0.5">Unit Price</label>
                                      <input
                                        type="number"
                                        placeholder="0.00"
                                        value={item.unitPrice}
                                        onChange={(e) => {
                                          const val = e.target.value === '' ? '' : Number(e.target.value);
                                          setStandaloneProformaItems(prev => prev.map(p => p.id === item.id ? { ...p, unitPrice: val } : p));
                                        }}
                                        className="w-full bg-[#1a1a1a] text-white border border-[#2d2226] px-1.5 py-1 text-[10px] rounded-sm outline-none focus:border-[#ee317b]"
                                      />
                                    </div>
                                    <div className="flex-1">
                                      <label className="block text-[8px] text-gray-500 uppercase tracking-widest mb-0.5">Advance</label>
                                      <input
                                        type="number"
                                        placeholder="0.00"
                                        value={item.advancePayment}
                                        onChange={(e) => {
                                          const val = e.target.value === '' ? '' : Number(e.target.value);
                                          setStandaloneProformaItems(prev => prev.map(p => p.id === item.id ? { ...p, advancePayment: val } : p));
                                        }}
                                        className="w-full bg-[#1a1a1a] text-white border border-[#2d2226] px-1.5 py-1 text-[10px] rounded-sm outline-none focus:border-[#ee317b] text-[#71b536]"
                                      />
                                    </div>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setStandaloneProformaItems(prev => prev.filter(p => p.id !== item.id))}
                                  className="w-6 h-6 flex items-center justify-center bg-[#2a111a] text-red-400 hover:bg-[#ee317b] hover:text-white rounded-sm transition-colors mt-1 shrink-0 group-hover:opacity-100 opacity-50"
                                  title="Delete Row"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                        </>
                      )}
                    </div>

                    {/* Terms & Conditions Editor */}
                    <div className="bg-[#181818] border border-[#2d2024] p-4 rounded-md shadow-sm flex flex-col shrink-0 min-h-max">
                      <div className="flex items-center justify-between border-b border-[#2d2024] pb-2 cursor-pointer select-none group" onClick={() => setIsTermsExpanded(!isTermsExpanded)}>
                        <h3 className="text-[#ee317b] font-bold uppercase tracking-widest text-[10px] flex items-center gap-1.5 transition-colors">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#ee317b]"></span>
                          Terms &amp; Conditions
                          <span className={`transform transition-transform text-gray-500 ml-1 ${isTermsExpanded ? 'rotate-180' : ''}`}>▼</span>
                        </h3>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsTermsExpanded(true);
                            setProformaTerms(prev => [...prev, { id: `term-${Date.now()}`, content: '' }]);
                          }}
                          className="bg-[#1a1a1a] hover:bg-[#262626] border border-[#2d2024] text-gray-300 px-2.5 py-1 text-[10px] font-bold uppercase cursor-pointer rounded-sm transition-colors"
                        >
                          + Add Term
                        </button>
                      </div>
                      
                      {isTermsExpanded && (
                        <div className="mt-3 space-y-2 overflow-y-auto custom-scrollbar max-h-[250px] pr-1">
                          {proformaTerms.map((term, idx) => (
                            <div key={term.id} className="flex items-start gap-2 group relative">
                               <div className="absolute -left-2 -top-1.5 bg-[#181818] w-3 h-3 flex items-center justify-center text-[7px] text-gray-600 font-bold z-10 rounded-full">{idx + 1}</div>
                               <textarea
                                 value={term.content}
                                 placeholder="Term content..."
                                 rows={2}
                                 onChange={(e) => {
                                   const val = e.target.value;
                                   setProformaTerms(prev => prev.map(t => t.id === term.id ? { ...t, content: val } : t));
                                 }}
                                 className="flex-1 bg-[#121212] text-gray-300 border border-[#262626] p-1.5 text-[10px] rounded-sm outline-none focus:border-[#ee317b] resize-none"
                               />
                               <button
                                 type="button"
                                 onClick={() => setProformaTerms(prev => prev.filter(t => t.id !== term.id))}
                                 className="w-5 h-5 flex items-center justify-center bg-[#2a111a] text-red-400 hover:bg-[#ee317b] hover:text-white rounded-sm transition-colors shrink-0 opacity-50 group-hover:opacity-100"
                               >
                                 ✕
                               </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Live Totals Section */}
                    {(() => {
                      const totalSub = standaloneProformaItems.reduce((acc, curr) => acc + (Number(curr.quantity || 0) * Number(curr.unitPrice || 0)), 0);
                      const vatAmt = proformaIncludeVat ? totalSub * 0.15 : 0;
                      const grandTotal = totalSub + vatAmt;
                      const totalAdv = standaloneProformaItems.reduce((acc, curr) => acc + Number(curr.advancePayment || 0), 0);
                      const bal = grandTotal - totalAdv;
                      return (
                        <div className="bg-[#181818] border border-[#2d2024] p-4 rounded-md shadow-sm space-y-2 text-[11px] shrink-0">
                          <div className="flex justify-between items-center text-gray-400">
                            <span>Subtotal:</span>
                            <span className="font-bold text-white">{totalSub.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits:2})} ETB</span>
                          </div>
                          {proformaIncludeVat && (
                            <div className="flex justify-between items-center text-gray-400">
                              <span>VAT (15%):</span>
                              <span className="font-bold text-[#ee317b]">{vatAmt.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits:2})} ETB</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center text-gray-300 pt-1 border-t border-[#262626]">
                            <span className="font-bold uppercase tracking-wider text-[10px]">Grand Total:</span>
                            <span className="font-bold text-white text-xs">{grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits:2})} ETB</span>
                          </div>
                          <div className="flex justify-between items-center text-[#71b536]">
                            <span>Total Paid Advance:</span>
                            <span className="font-bold">-{totalAdv.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits:2})} ETB</span>
                          </div>
                          <div className="flex justify-between items-center text-gray-100 pt-1 border-t border-[#262626]">
                            <span className="font-bold uppercase tracking-wider text-[10px]">Balance Due:</span>
                            <span className={`font-bold text-[13px] ${bal > 0 ? 'text-[#ee317b]' : bal < 0 ? 'text-yellow-400' : 'text-[#71b536]'}`}>
                              {bal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits:2})} ETB
                            </span>
                          </div>
                        </div>
                      );
                    })()}

              </div>

              {/* RIGHT SIDEBAR (PDF PREVIEW) */}
              <div className={`flex-1 w-full bg-[#1a1a1a] flex-col relative ${proformaMobileTab === 'edit' ? 'hidden min-[1300px]:flex' : 'flex'}`}>
                
                {/* PDF Zoom Controls */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-[#262626]/90 backdrop-blur border border-[#333] rounded-full px-2 py-1.5 flex items-center gap-2 md:gap-3 z-10 shadow-xl print-hidden-stamp-toggle scale-90 md:scale-100 origin-top w-max max-w-[90vw]">
                  <button onClick={() => setProformaZoom(z => Math.max(0.2, z - 0.1))} className="w-6 h-6 flex items-center justify-center bg-[#1f1f1f] hover:bg-[#333] rounded-full text-white font-bold text-sm transition-colors cursor-pointer shrink-0">-</button>
                  <span className="text-[10px] text-gray-300 font-bold uppercase w-10 text-center select-none shrink-0">{Math.round(proformaZoom * 100)}%</span>
                  <button onClick={() => setProformaZoom(z => Math.min(2, z + 0.1))} className="w-6 h-6 flex items-center justify-center bg-[#1f1f1f] hover:bg-[#333] rounded-full text-white font-bold text-sm transition-colors cursor-pointer shrink-0">+</button>
                  <div className="w-px h-4 bg-[#444] shrink-0"></div>
                  <button onClick={() => setProformaZoom(1)} className="text-[9px] font-bold uppercase text-gray-400 hover:text-white px-1 cursor-pointer shrink-0">100%</button>
                  <button onClick={() => {
                     if (window.innerWidth < 1300) {
                        const ratio = (window.innerWidth - 24) / 800; // 24px padding
                        setProformaZoom(Math.min(1.5, Math.max(0.2, ratio)));
                     } else {
                        const container = document.getElementById('pdf-preview-scroller');
                        if(container) {
                          const ratio = (container.clientWidth - 80) / 800; // 80px margin
                          setProformaZoom(Math.min(1.5, Math.max(0.2, ratio)));
                        }
                     }
                  }} className="text-[9px] font-bold uppercase text-gray-400 hover:text-white px-1 cursor-pointer shrink-0">Fit</button>
                </div>

                {/* PDF Container Scroller */}
                <div id="pdf-preview-scroller" className="flex-1 w-full flex flex-col h-full overflow-hidden">
                  <TransformWrapper
                    key={`${proformaMobileTab}-${proformaZoom}`}
                    initialScale={1}
                    initialPositionX={
                      typeof window !== 'undefined'
                        ? window.innerWidth < 1300
                          ? (window.innerWidth - 800) / 2
                          : ((document.getElementById('pdf-preview-scroller')?.clientWidth || window.innerWidth / 2) - 800) / 2
                        : 0
                    }
                    initialPositionY={0}
                    minScale={0.5}
                    maxScale={4}
                    limitToBounds={false}
                    panning={{ disabled: false }}
                    wheel={{ disabled: true }}
                    pinch={{ disabled: false }}
                  >
                    <TransformComponent wrapperClass="!w-full !h-full flex-1 custom-scrollbar bg-[#0a0a0a] proforma-pan-cursor" contentClass="min-w-max min-h-full flex items-start justify-center p-3 md:p-10 pt-16 md:pt-20 select-none">
                    {/* Zoom Wrapper */}
                    <div 
                      style={{ 
                        transform: `scale(${proformaZoom})`, 
                        transition: 'transform 0.15s ease-out',
                        width: '800px', // matches print-container width
                        flexShrink: 0
                      }}
                      className="shadow-2xl rounded-sm origin-top flex justify-center bg-transparent"
                    >
                       {/* Printable Area - Rendered using White-Paper Theme */}
                       {(() => {
                         const MAX_WEIGHT_PER_PAGE = 10;
                         const proformaPages = [];
                         let items = [...proformaItemsToRender];
                         
                         const getItemWeight = (item: any) => {
                           const desc = item.productType || '';
                           const charWeight = Math.ceil(desc.length / 55);
                           const newlineWeight = desc.split('\n').length;
                           return Math.max(1, Math.max(charWeight, newlineWeight));
                         };

                         if (items.length === 0) {
                           proformaPages.push([]);
                         } else {
                           let currentPage: any[] = [];
                           let currentWeight = 0;
                           
                           while (items.length > 0) {
                             const nextItem = items[0];
                             const weight = getItemWeight(nextItem);
                             
                             if (currentPage.length === 0) {
                               currentPage.push(items.shift());
                               currentWeight += weight;
                             } else if (currentWeight + weight <= MAX_WEIGHT_PER_PAGE) {
                               currentPage.push(items.shift());
                               currentWeight += weight;
                             } else {
                               proformaPages.push(currentPage);
                               currentPage = [];
                               currentWeight = 0;
                             }
                           }
                           if (currentPage.length > 0) {
                             proformaPages.push(currentPage);
                           }
                         }

                         return (
                           <div id="proforma-print-container" className="flex flex-col gap-8 print:gap-0 bg-transparent max-w-none w-max mx-auto">
                             {proformaPages.map((pageItems, pageIndex) => {
                               const isLastPage = pageIndex === proformaPages.length - 1;
                               const globalIndexOffset = proformaPages.slice(0, pageIndex).reduce((acc, curr) => acc + curr.length, 0);
                               return (
                                 <div key={pageIndex} className="proforma-page relative bg-white text-black pl-16 pr-10 pt-6 pb-10 shadow-inner border border-gray-300 select-text font-sans w-[800px] h-[1131px] overflow-hidden max-w-none flex flex-col" style={{ pageBreakAfter: isLastPage ? 'auto' : 'always', breakInside: 'avoid' }}>
                <style dangerouslySetInnerHTML={{__html: `
                  /* Explicit print-safe hex color overrides for all elements in the proforma container */
                  .proforma-page {
                    background-color: #ffffff !important;
                    color: #111827 !important;
                    border-color: #e5e7eb !important;
                    box-shadow: none !important;
                    width: 800px !important;
                    max-width: none !important;
                    margin: 0 auto;
                  }
                  .proforma-page .text-gray-900,
                  #proforma-print-container strong,
                  #proforma-print-container h1,
                  #proforma-print-container h2 {
                    color: #111827 !important;
                  }
                  .proforma-page .text-gray-800,
                  .proforma-page .text-gray-750,
                  .proforma-page .text-gray-705 {
                    color: #1f2937 !important;
                  }
                  .proforma-page .text-gray-700,
                  .proforma-page .text-gray-600 {
                    color: #374151 !important;
                  }
                  .proforma-page .text-gray-550,
                  .proforma-page .text-gray-500,
                  .proforma-page .text-gray-450 {
                    color: #6b7280 !important;
                  }
                  .proforma-page .text-gray-400 {
                    color: #9ca3af !important;
                  }
                  .proforma-page .text-black {
                    color: #000000 !important;
                  }
                  .proforma-page .text-\[\#ee317b\] {
                    color: #ee317b !important;
                  }
                  .proforma-page .text-\[\#71b536\] {
                    color: #71b536 !important;
                  }
                  .proforma-page .text-green-700 {
                    color: #15803d !important;
                  }
                  .proforma-page .text-red-700 {
                    color: #b91c1c !important;
                  }
                  
                  .proforma-page .border-gray-100 {
                    border-color: #f3f4f6 !important;
                  }
                  .proforma-page .border-gray-200 {
                    border-color: #e5e7eb !important;
                  }
                  .proforma-page .border-gray-250 {
                    border-color: #e2e8f0 !important;
                  }
                  .proforma-page .border-gray-300 {
                    border-color: #d1d5db !important;
                  }
                  .proforma-page .border-gray-350 {
                    border-color: #cbd5e1 !important;
                  }
                  .proforma-page .border-gray-400 {
                    border-color: #9ca3af !important;
                  }
                  #proforma-print-container table,
                  #proforma-print-container th,
                  #proforma-print-container td,
                  #proforma-print-container tr,
                  #proforma-print-container div {
                    border-color: #d1d5db;
                  }
                  
                  .proforma-page .bg-white {
                    background-color: #ffffff !important;
                  }
                  .proforma-page .bg-gray-100 {
                    background-color: #f3f4f6 !important;
                  }
                  .proforma-page .bg-gray-50 {
                    background-color: #f9fafb !important;
                  }
                  .proforma-page .bg-gray-55 {
                    background-color: #f9fafb !important;
                  }
                  .proforma-page .bg-gray-50\/50 {
                    background-color: rgba(249, 250, 251, 0.5) !important;
                  }
                  .proforma-page .bg-gray-50\/20 {
                    background-color: rgba(249, 250, 251, 0.2) !important;
                  }

                  .proforma-page,
                  .proforma-page * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    box-shadow: none !important;
                    text-shadow: none !important;
                  }
                  @media print {
                    @page {
                      margin: 0;
                      size: A4 portrait;
                    }
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
                    .proforma-page {
                      position: absolute !important;
                      left: 0 !important;
                      top: 0 !important;
                      width: 100% !important;
                      height: auto !important;
                      padding: 8mm !important;
                      margin: 0 !important;
                      box-shadow: none !important;
                      border: none !important;
                      border: none !important;
                      background: white !important;
                      color: black !important;
                      visibility: visible !important;
                    }
                    .proforma-page * {
                      visibility: visible !important;
                    }
                    .print-hidden-stamp-toggle {
                      display: none !important;
                    }
                  }
                `}} />
                
                {/* Letterhead Design Elements */}
                <div className="absolute left-12 top-0 bottom-0 w-[1px] bg-[#71b536] z-0 print-exact" />
                <div className="absolute bottom-0 left-0 right-0 h-6 bg-[#2e7d32] z-0 print-exact" />

                {/* Header Section with Corporate Logo and Contact Information */}
                <div className="relative z-10 flex flex-col mb-3">
                  <div className="flex items-start justify-between pb-3">
                    {/* Corporate Identity & Brand mark */}
                    <div className="flex items-start gap-2 text-left pr-4">
                      {/* Premium App Logo image replacement */}
                      <img 
                        src="/mena-logo.png" 
                        alt="Mena Logo" 
                        className="w-16 h-16 object-contain -ml-2"
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                      />
                      <div className="pt-2">
                        <h1 className="text-2xl font-black tracking-tight text-gray-900 font-sans text-left" style={{ textTransform: 'lowercase' }}>
                          mena inc
                        </h1>
                        <p className="text-[11px] uppercase font-sans tracking-widest text-black font-bold text-left mt-0.5">Mena Inc Trading PLC</p>
                      </div>
                    </div>

                    {/* Letterhead address coordinates */}
                    <div className="text-right font-sans text-[10px] text-gray-700 space-y-0.5 pt-2 pb-1">
                      <p className="font-bold text-gray-900 uppercase tracking-wide">Contact Information</p>
                      <p>Reality Plaza, Bole Brass</p>
                      <p>Addis Ababa, Ethiopia</p>
                      <p className="font-bold text-black mt-1.5">📞 +251 942 125 568</p>
                      <p className="font-bold text-black">📞 +251 924 148 847</p>
                    </div>
                  </div>

                  {/* Horizontal Green Line completely below the header */}
                  <div className="h-[1px] bg-[#71b536] z-0 print-exact -ml-4 -mr-10 mb-0" />
                </div>

                {/* Sub-header document metrics */}
                <div className="relative z-10 flex justify-between items-end mb-6 pl-4">
                  <div className="text-left">
                    <h2 className="text-lg font-black uppercase text-gray-900 tracking-wider font-sans mb-1">PROFORMA INVOICE</h2>
                    <p className="text-[11px] font-sans text-gray-500">Document No: <strong className="text-black">PRO-2026-{new Date().getMonth() + 1}{new Date().getDate()}-{Math.floor(1000 + Math.random() * 9000)}</strong></p>
                  </div>
                  <div className="text-right font-sans text-[11px]">
                    <p className="text-gray-550 mb-0.5">Doc Issue Date:</p>
                    <p className="font-bold text-gray-900">{new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                </div>

                {/* Client Recipient Details */}
                {(() => {
                  const cName = isStandaloneProformaMode ? standaloneClientName : (proformaItemsToRender[0] as any)?.clientName;
                  const cPhone = isStandaloneProformaMode ? standaloneClientPhone : (proformaItemsToRender[0] as any)?.phone;
                  
                  if (!cName || cName.trim() === '') {
                    return null;
                  }

                  return (
                    <div className="relative z-10 mb-8 font-sans text-[11px] pl-4">
                      <div className="text-left">
                        <p className="font-sans text-[9px] uppercase tracking-widest text-[#ee317b] font-bold mb-1.5">CLIENT BILL TO</p>
                        <p className="font-bold text-gray-900 text-sm font-sans uppercase">
                          {cName}
                        </p>
                        {cPhone && cPhone.trim() !== '' && (
                          <p className="text-gray-600 mt-1.5 font-medium">
                            📞 {cPhone}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Table of selected Order items */}
                <div className="relative z-10 border border-gray-300 overflow-hidden mb-1 rounded-sm ml-4">
                  <table className="w-full text-left border-collapse text-[10px] table-fixed">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-300 text-gray-705 font-sans uppercase text-[9px] tracking-wider text-center">
                        <th className="py-2 px-3 border-r border-gray-300 font-bold w-12 text-center bg-gray-100">No.</th>
                        <th className="py-2 px-3 border-r border-gray-300 font-bold text-left bg-gray-100">Description of Product Line</th>
                        <th className="py-2 px-3 border-r border-gray-300 font-bold text-right w-20 bg-gray-100">Qty (pcs)</th>
                        <th className="py-2 px-3 border-r border-gray-300 font-bold text-right w-28 bg-gray-100">Unit Price (ETB)</th>
                        <th className="py-2 px-3 font-bold text-right w-32 bg-gray-100">Subtotal (ETB)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-gray-800 text-center">
                      {pageItems.map((item, idx) => {
                        const q = Number(item.quantity) || 0;
                        const p = Number(item.unitPrice) || 0;
                        const rowTotal = q * p;
                        return (
                          <tr key={item.id} className="hover:bg-gray-55/50">
                            <td className="py-2 px-3 border-r border-gray-300 font-sans text-center text-gray-500">{globalIndexOffset + idx + 1}</td>
                            <td className="py-2 px-3 border-r border-gray-300 text-left text-gray-800 font-sans break-words whitespace-normal">
                              <strong className="text-black font-semibold">{item.productType}</strong>
                            </td>
                            <td className="py-2 px-3 border-r border-gray-300 font-sans text-right text-black font-semibold">{q.toLocaleString()}</td>
                            <td className="py-2 px-3 border-r border-gray-300 font-sans text-right text-gray-900">{p.toFixed(2)}</td>
                            <td className="py-2 px-3 font-sans text-right font-bold text-black">{rowTotal.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                      {pageItems.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center py-8 font-sans text-gray-400">
                            No drafted items found. Use the editor to add items.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Subtotal glued to table (ONLY on last page) */}
                {isLastPage && (
                  <div className="relative z-10 shrink-0 mt-0 ml-4 mb-4 text-[11px]">
                    <div className="w-80 font-sans space-y-1.5 border border-gray-250 px-3 py-2 bg-gray-50/20 text-left">
                      <div className="flex justify-between text-gray-600">
                        <span>Itemized Sub-Total:</span>
                        <span className="font-bold text-gray-900">
                          {proformaItemsToRender.reduce((acc, c) => acc + ((Number(c.quantity) || 0) * (Number(c.unitPrice) || 0)), 0).toFixed(2)} ETB
                        </span>
                      </div>
                      {proformaIncludeVat && (
                        <div className="flex justify-between text-gray-600">
                          <span>VAT (15.00%):</span>
                          <span className="font-bold text-gray-900">
                            {(proformaItemsToRender.reduce((acc, c) => acc + ((Number(c.quantity) || 0) * (Number(c.unitPrice) || 0)), 0) * 0.15).toFixed(2)} ETB
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between border-t pt-1.5 text-xs text-gray-900 font-black">
                        <span>Grand Total:</span>
                        <span>
                          {(
                            proformaItemsToRender.reduce((acc, c) => acc + ((Number(c.quantity) || 0) * (Number(c.unitPrice) || 0)), 0) * 
                            (proformaIncludeVat ? 1.15 : 1)
                          ).toFixed(2)} ETB
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 text-gray-600 text-[10px] border-b pb-1.5 border-dashed">
                        <span className="text-green-700 font-bold">Total Recorded Paid (Adv):</span>
                        <span className="font-bold text-green-700">
                          -{proformaItemsToRender.reduce((acc, c) => acc + (Number(c.advancePayment) || 0), 0).toFixed(2)} ETB
                        </span>
                      </div>
                      <div className="flex justify-between pt-1.5 text-[11.5px] font-black text-red-700">
                        <span>Outstanding Balance Due:</span>
                        <span>
                          {Math.max(0, 
                            (proformaItemsToRender.reduce((acc, c) => acc + ((Number(c.quantity) || 0) * (Number(c.unitPrice) || 0)), 0) * (proformaIncludeVat ? 1.15 : 1)) - 
                            proformaItemsToRender.reduce((acc, c) => acc + (Number(c.advancePayment) || 0), 0)
                          ).toFixed(2)} ETB
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Terms and Conditions Block pushed to the bottom */}
                <div className="flex-1 shrink-0 w-full flex flex-col justify-end text-[11px] ml-4 pb-2">
                  <div className="border border-gray-300 bg-gray-50/50 px-3 py-2 font-sans text-[9px] text-gray-600 w-full rounded-md leading-relaxed text-left break-words">
                    <p className="font-bold text-gray-800 uppercase tracking-wider mb-1 text-[9.5px]">Terms &amp; General Conditions</p>
                    {proformaTerms.map(term => (
                      <p key={term.id} className="mb-1">{term.content}</p>
                    ))}
                    
                    {proformaBankId && (() => {
                      const bank = bankAccounts.find(b => b.id === proformaBankId);
                      if (!bank) return null;
                      return (
                        <div className="mt-2.5 pt-2.5 border-t border-gray-200 text-gray-700">
                          <p className="font-bold text-gray-800 uppercase tracking-wider mb-1 text-[8.5px]">Payment Details (Direct Transfer)</p>
                          <p className="mb-0.5">Bank Name: <strong className="text-black font-semibold">{bank.name}</strong></p>
                          {bank.accountNumber && <p>Account Number: <strong className="text-black font-semibold font-sans">{bank.accountNumber}</strong></p>}
                        </div>
                      );
                    })()}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 pt-4 border-t border-gray-200 relative mt-auto">
                  <div className="space-y-4 font-sans text-[9px] text-left">
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
                    {applyDigitalStamp && (
                      <div className="absolute left-0 bottom-4 font-sans text-[9px] text-right pr-6 space-y-1">
                        <p className="font-bold text-gray-800 uppercase">AUTHORIZED PLC STAMP</p>
                        <p className="text-gray-500 text-[8px]">Mena inc trading PLC</p>
                      </div>
                    )}

                    {/* SVG Rounded Double Circle Stamp overlapping signature or Premium Real Stamp Photo overlay */}
                    {applyDigitalStamp && (
                      <div className="transform rotate-8 absolute right-2 z-10 bottom-0 pb-2">
                        <img 
                          src="https://lh3.googleusercontent.com/d/1CbGimATXHfhwtx7aKcQivzxp8bDi1kZt" 
                          alt="Company Stamp Seal" 
                          className="w-[125px] h-[125px] object-contain mix-blend-multiply opacity-90"
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
                               );
                             })}
                           </div>
                         );
                       })()}
                    </div>
              </TransformComponent>
              </TransformWrapper>
              </div>
              </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* 📦 PRODUCT TYPES MANAGER MODAL */}
      <AnimatePresence>
        {showProductManager && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm "
            onClick={(e) => { if (e.target === e.currentTarget) setShowProductManager(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121212] border border-[#262626] w-full max-w-md overflow-hidden shadow-2xl flex flex-col relative font-sans"
            >
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-[#ee317b] to-[#71b536]" />
              
              {/* Modal header */}
              <div className="px-6 py-4 border-b border-[#262626] flex justify-between items-center bg-[#181818]/60">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#ee317b]" />
                  <h3 className="text-sm font-bold font-sans tracking-wider uppercase text-white">Manage Product Types</h3>
                </div>
                <button
                  onClick={() => { 
                    setShowProductManager(false); 
                    setNewManagerProductInput('');
                    setSelectedProductIds([]);
                  }}
                  className="text-gray-400 hover:text-white cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5 flex-shrink-0" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[70vh] space-y-4">
                
                {/* Add product type form */}
                <div className="bg-[#181818] border border-[#262626] p-4 space-y-3 font-sans">
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
                      className="bg-[#71b536] hover:bg-white text-black font-bold text-xs uppercase px-4 py-1.5 rounded-md transition-colors cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Product Types List */}
                <div className="space-y-2 font-sans">
                  <span className="text-[10px] text-gray-500 tracking-wider uppercase font-bold block">Active Product Categories ({productTypes.length})</span>
                  
                  {productTypes.length > 0 && (
                    <div className="flex items-center justify-between px-3 py-1.5 bg-[#181818] border border-[#262626] border-b-0 text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                      <label className="flex items-center gap-2 cursor-pointer ">
                        <input
                          type="checkbox"
                          checked={selectedProductIds.length === productTypes.length && productTypes.length > 0}
                          ref={(el) => {
                            if (el) {
                              el.indeterminate = selectedProductIds.length > 0 && selectedProductIds.length < productTypes.length;
                            }
                          }}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProductIds(productTypes.map(p => p.id));
                            } else {
                              setSelectedProductIds([]);
                            }
                          }}
                          className="accent-[#ee317b] h-3.5 w-3.5 cursor-pointer"
                        />
                        <span>Select All</span>
                      </label>
                      <span>{selectedProductIds.length} Selected</span>
                    </div>
                  )}

                  {selectedProductIds.length > 0 && (
                    <div className="flex items-center justify-between px-3 py-2 bg-[#2d1217] border border-red-900/40 text-xs text-red-400 font-sans animate-fadeIn">
                      <span>Selected: <strong className="text-white bg-red-950/60 px-1 py-0.5 border border-red-900/40">{selectedProductIds.length}</strong> categories</span>
                      <button
                        type="button"
                        onClick={async () => {
                          if (window.confirm(`Are you sure you want to delete the ${selectedProductIds.length} selected product types?`)) {
                            const idsToDelete = [...selectedProductIds];
                            await onDeleteProductType(idsToDelete);
                            
                            // If the current main productType is deleted, reset it
                            const deletedNames = productTypes.filter(p => idsToDelete.includes(p.id)).map(p => p.name);
                            if (deletedNames.includes(productType)) {
                              const remaining = productTypes.filter(p => !idsToDelete.includes(p.id));
                              setProductType(remaining[0]?.name || '');
                            }
                            setSelectedProductIds([]);
                          }
                        }}
                        className="px-2.5 py-1 bg-[#421A1D] hover:bg-red-700 text-white font-bold uppercase text-[10px] tracking-wider rounded-md transition-colors cursor-pointer"
                      >
                        🗑 Delete Selected
                      </button>
                    </div>
                  )}

                  <div className="border border-[#262626] bg-[#141414] divide-y divide-[#232323] overflow-hidden max-h-60 overflow-y-auto">
                    {productTypes.map(prod => {
                      const isSelected = selectedProductIds.includes(prod.id);
                      return (
                        <div key={prod.id} className={`px-4 py-2 flex items-center justify-between text-xs font-sans transition-colors ${isSelected ? 'bg-red-950/10' : 'hover:bg-[#1c1c1c]/40'}`}>
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedProductIds(prev => [...prev, prod.id]);
                                } else {
                                  setSelectedProductIds(prev => prev.filter(id => id !== prod.id));
                                }
                              }}
                              className="accent-[#ee317b] h-3.5 w-3.5 cursor-pointer"
                            />
                            <span className="font-sans text-white font-semibold">{prod.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              if (window.confirm(`Are you sure you want to delete product type "${prod.name}"?`)) {
                                await onDeleteProductType([prod.id]);
                                if (productType === prod.name) {
                                  setProductType(productTypes.find(p => p.id !== prod.id)?.name || '');
                                }
                                setSelectedProductIds(prev => prev.filter(id => id !== prod.id));
                              }
                            }}
                            className="p-1 text-gray-500 hover:text-red-400 rounded-md cursor-pointer transition-colors"
                            title="Delete Product Type"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </button>
                        </div>
                      );
                    })}
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
                  onClick={() => { 
                    setShowProductManager(false); 
                    setNewManagerProductInput(''); 
                    setSelectedProductIds([]);
                  }}
                  className="bg-[#242424] hover:bg-[#323232] text-white text-xs font-sans font-medium px-4 py-1.5 transition-colors cursor-pointer rounded-md"
                >
                  Done
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Filters Bottom Sheet */}
      <AnimatePresence>
        {showMobileFilters && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileFilters(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-[#121212] border-t border-[#262626] rounded-t-xl z-50 p-4 md:hidden pb-10"
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-400 font-bold text-[11px] uppercase tracking-wider">Database Options</span>
                <button onClick={() => setShowMobileFilters(false)} className="p-1 text-gray-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 font-sans text-xs">
                <div>
                  <label className="block text-gray-500 text-[10px] uppercase mb-1">Staff</label>
                  <select
                    value={filterAgent}
                    onChange={(e) => setFilterAgent(e.target.value)}
                    className="w-full px-2 py-1.5 bg-[#181818] border border-[#262626] text-gray-200 rounded-md outline-none focus:border-[#ee317b]"
                  >
                    <option value="All">All Staff</option>
                    {(employees.length > 0 ? employees.map(emp => emp.name) : AGENTS).map(agent => (
                      <option key={agent} value={agent}>{agent}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-gray-500 text-[10px] uppercase mb-1">Lead Channel</label>
                  <select
                    value={filterSource}
                    onChange={(e) => setFilterSource(e.target.value)}
                    className="w-full px-2 py-1.5 bg-[#181818] border border-[#262626] text-gray-200 rounded-md outline-none focus:border-[#ee317b]"
                  >
                    <option value="All">All Leads</option>
                    {acquisitionChannels.map(source => <option key={source} value={source}>{source}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-500 text-[10px] uppercase mb-1">Debt Status</label>
                  <select
                    value={filterPayment}
                    onChange={(e) => setFilterPayment(e.target.value)}
                    className="w-full px-2 py-1.5 bg-[#181818] border border-[#262626] text-gray-200 rounded-md outline-none focus:border-[#ee317b]"
                  >
                    <option value="All">Any Payment</option>
                    <option value="Debt">Outstanding Debt</option>
                    <option value="Paid">Paid in Full</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-500 text-[10px] uppercase mb-1">Completion Status</label>
                  <select
                    value={filterCompletion}
                    onChange={(e) => setFilterCompletion(e.target.value)}
                    className="w-full px-2 py-1.5 bg-[#181818] border border-[#262626] text-gray-200 rounded-md outline-none focus:border-[#ee317b]"
                  >
                    <option value="All">All Job Statuses</option>
                    <option value="Completed">Completed Only</option>
                    <option value="Pending">Pending Only</option>
                    <option value="Incomplete">Incomplete / Problematic</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-500 text-[10px] uppercase mb-1">Receipt Needed</label>
                  <select
                    value={filterReceipt}
                    onChange={(e) => setFilterReceipt(e.target.value)}
                    className="w-full px-2 py-1.5 bg-[#181818] border border-[#262626] text-gray-200 rounded-md outline-none focus:border-[#ee317b]"
                  >
                    <option value="All">All Receipts</option>
                    <option value="NeedsReceipt">Needs Receipts (VAT)</option>
                    <option value="WithoutReceipt">Without Receipt</option>
                  </select>
                </div>

                <div className="pt-1.5">
                  <button
                    onClick={() => {
                      setFilterAgent('All');
                      setFilterSource('All');
                      setFilterPayment('All');
                      setFilterCompletion('All');
                      setFilterReceipt('All');
                    }}
                    className="w-full py-2 bg-[#ee317b]/10 text-[#ee317b] hover:bg-[#ee317b]/20 rounded-md font-bold text-xs transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* Mobile Sticky Bottom Action Bar for Multi-select */}
      <AnimatePresence>
        {selectedCustomerIds.length > 0 && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="md:hidden fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 bg-[#121212] border-t border-[#ee317b] text-white z-40 p-3 flex flex-col gap-2 shadow-[0_-4px_15px_rgba(238,49,123,0.15)] pb-5"
          >
            <div className="flex justify-between items-center text-xs font-bold text-[#ee317b] mb-1 px-1">
              <span>{selectedCustomerIds.length} Selected Orders</span>
              <button type="button" onClick={() => setSelectedCustomerIds([])} className="text-gray-400 font-normal underline">Clear Selection</button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleBulkComplete}
                className="bg-[#112918] border border-[#71b536]/30 text-[#71b536] py-2.5 rounded font-bold text-xs cursor-pointer flex items-center justify-center gap-1"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                Paid
              </button>
              <button
                type="button"
                onClick={() => {
                  const selectedLedgerItems = customers.filter(c => selectedCustomerIds.includes(c.id));
                  setStandaloneClientName(selectedLedgerItems[0]?.clientName || '');
                  setStandaloneClientPhone(selectedLedgerItems[0]?.phone || '');
                  setStandaloneProformaItems(selectedLedgerItems.map(c => ({
                    id: c.id,
                    productType: c.productType || '',
                    quantity: c.quantity?.toString() || '',
                    unitPrice: c.unitPrice?.toString() || '',
                    advancePayment: c.advancePayment?.toString() || ''
                  })));
                  setIsStandaloneProformaMode(true);
                  setShowProformaModal(true);
                }}
                className="bg-[#31111E] border border-[#ee317b]/30 text-[#ee317b] py-2.5 rounded font-bold text-xs cursor-pointer flex items-center justify-center gap-1"
              >
                <Printer className="w-3.5 h-3.5" />
                Proforma
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                className="bg-[#2E181D] border border-red-900/40 text-red-400 py-2.5 rounded font-bold text-xs cursor-pointer flex items-center justify-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </SharedDataTableLayout>
  );
}
