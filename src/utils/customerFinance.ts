import { BankAccount, Customer } from '../types';

export type CustomerPaymentEntry = {
  id: string;
  date: string;
  amount: number;
  bankId: string;
  currency?: string;
  originalCurrency?: string;
  recordedBy: string;
  label: string;
};

export type CustomerRefundEntry = {
  id: string;
  date: string;
  amount: number;
  bankId: string;
  currency?: string;
  notes?: string;
  recordedBy: string;
};

const getCustomerInvoiceCurrency = (customer: Customer): string => customer.currency || 'ETB';

export function isCustomerPaymentCurrencyCompatible(customer: Customer, currency?: string): boolean {
  return !currency || currency === getCustomerInvoiceCurrency(customer);
}

export function getCustomerInvoiceSubtotal(customer: Customer): number {
  const base = Number(customer.quantity || 0) * Number(customer.unitPrice || 0);
  const adjustments = (customer.orderAdjustments || [])
    .reduce((sum, adjustment) => (
      sum + (Number(adjustment.additionalQuantity || 0) * Number(adjustment.unitPrice || 0))
    ), 0);
  return base + adjustments;
}

export function getCustomerAdditionalQuantity(customer: Customer): number {
  return (customer.orderAdjustments || [])
    .reduce((sum, adjustment) => sum + Number(adjustment.additionalQuantity || 0), 0);
}

export function getCustomerEffectiveQuantity(customer: Customer): number {
  return Number(customer.quantity || 0) + getCustomerAdditionalQuantity(customer);
}

export function getCustomerInvoiceTotal(customer: Customer): number {
  const subtotal = getCustomerInvoiceSubtotal(customer);
  return subtotal + (customer.isVatAdded ? subtotal * 0.15 : 0);
}

export function getCustomerPaymentMethodId(payment: NonNullable<Customer['payments']>[number]): string {
  return payment.paymentMethodId || payment.methodId || '';
}

export function getCustomerPaymentEntries(customer: Customer): CustomerPaymentEntry[] {
  const entries: CustomerPaymentEntry[] = (customer.payments || [])
    .map((payment, index) => ({
      id: payment.id || `pay_${customer.id}_${index}`,
      date: payment.date || '',
      amount: Number(payment.amount || 0),
      bankId: getCustomerPaymentMethodId(payment),
      currency: payment.currency,
      originalCurrency: payment.originalCurrency,
      recordedBy: payment.recordedBy || customer.orderTakenBy || 'Unknown',
      label: payment.id === `mig_adv_${customer.id}`
        ? 'Advance Payment'
        : payment.id === `mig_rem_${customer.id}`
          ? 'Final Payment'
          : 'Customer Payment'
    }))
    .filter(entry => entry.amount > 0);

  const legacyAdvanceAmount = Number(customer.advancePayment || 0);
  if (legacyAdvanceAmount > 0) {
    const advanceDate = customer.advancePaymentDate || customer.deliveryDate || '';
    const advanceBankId = customer.paymentMethodId || '';
    const advanceId = `mig_adv_${customer.id}`;
    const hasLegacyAdvance = entries.some(entry =>
      entry.id === advanceId ||
      (
        Math.abs(entry.amount - legacyAdvanceAmount) < 0.01 &&
        entry.date === advanceDate &&
        entry.bankId === advanceBankId
      )
    );

    if (!hasLegacyAdvance) {
      entries.push({
        id: advanceId,
        date: advanceDate,
        amount: legacyAdvanceAmount,
        bankId: advanceBankId,
        currency: customer.currency,
        originalCurrency: customer.currency,
        recordedBy: customer.orderTakenBy || 'Unknown',
        label: 'Advance Payment'
      });
    }
  }

  return entries;
}

export function getCustomerRefundEntries(customer: Customer): CustomerRefundEntry[] {
  return (customer.refunds || [])
    .map((refund, index) => ({
      id: refund.id || `refund_${customer.id}_${index}`,
      date: refund.date || '',
      amount: Number(refund.amount || 0),
      bankId: refund.paymentMethodId || '',
      currency: refund.currency,
      notes: refund.notes,
      recordedBy: refund.recordedBy || customer.orderTakenBy || 'Unknown'
    }))
    .filter(entry => entry.amount > 0);
}

export function getCustomerGrossPaid(customer: Customer): number {
  return getCustomerPaymentEntries(customer)
    .filter(payment => isCustomerPaymentCurrencyCompatible(customer, payment.currency))
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
}

export function getCustomerTotalRefunded(customer: Customer): number {
  return getCustomerRefundEntries(customer)
    .filter(refund => isCustomerPaymentCurrencyCompatible(customer, refund.currency))
    .reduce((sum, refund) => sum + Number(refund.amount || 0), 0);
}

export function getCustomerTotalPaid(customer: Customer): number {
  return Math.max(0, getCustomerGrossPaid(customer) - getCustomerTotalRefunded(customer));
}

export function getCustomerOverpaidAmount(customer: Customer): number {
  return Math.max(0, getCustomerTotalPaid(customer) - getCustomerInvoiceTotal(customer));
}

export function getCustomerRemainingBalance(customer: Customer): number {
  return Math.max(0, getCustomerInvoiceTotal(customer) - getCustomerTotalPaid(customer));
}

export function isCustomerPaymentComplete(customer: Customer): boolean {
  const totalInvoice = getCustomerInvoiceTotal(customer);
  if (totalInvoice <= 0) return false;
  return getCustomerTotalPaid(customer) >= totalInvoice - 0.01;
}

export function getCustomerLatestPaymentEntry(customer: Customer): CustomerPaymentEntry | null {
  const entries = getCustomerPaymentEntries(customer).filter(payment => payment.date);
  if (entries.length === 0) return null;
  return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
}

export function getCustomerLatestPaymentDate(customer: Customer): string {
  return getCustomerLatestPaymentEntry(customer)?.date || '';
}

export function getCustomerRelevantBankIds(customer: Customer): string[] {
  const paymentBankIds = getCustomerPaymentEntries(customer)
    .map(entry => entry.bankId)
    .filter(Boolean);
  const refundBankIds = getCustomerRefundEntries(customer)
    .map(entry => entry.bankId)
    .filter(Boolean);
  if (paymentBankIds.length > 0 || refundBankIds.length > 0) return Array.from(new Set([...paymentBankIds, ...refundBankIds]));

  return Array.from(new Set([
    customer.paymentMethodId,
    customer.bankRemainingId
  ].filter(Boolean) as string[]));
}

export function getBankNameForPayment(bankAccounts: BankAccount[], bankId?: string): string {
  if (!bankId) return 'Unassigned account';
  return bankAccounts.find(bank => bank.id === bankId)?.name || 'Unknown account';
}
