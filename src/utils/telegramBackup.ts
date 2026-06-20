import { BankAccount, ClientType, Customer, EmployeeUser, ExpenseCategory, Loan, PaperStock, ProductType, Purchase } from '../types';
import { createAllDataExcelBlob, getLocalBackupDate } from './excelExport';

const TELEGRAM_BACKUP_SESSION_KEY = 'mena_inc_telegram_backup_session_date_v1';

interface TelegramBackupPayload {
  customers: Customer[];
  purchases: Purchase[];
  loans: Loan[];
  bankAccounts: BankAccount[];
  paperStocks: PaperStock[];
  categories: ExpenseCategory[];
  productTypes: ProductType[];
  clientTypes: ClientType[];
  employees: EmployeeUser[];
}

const blobToBase64 = async (blob: Blob) => {
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
};

export async function sendDailyTelegramBackup(
  data: TelegramBackupPayload,
  getBankName: (id?: string) => string,
  currentUser: EmployeeUser | null
) {
  const date = getLocalBackupDate();
  if (sessionStorage.getItem(TELEGRAM_BACKUP_SESSION_KEY) === date) return;
  sessionStorage.setItem(TELEGRAM_BACKUP_SESSION_KEY, date);

  const { blob, filename } = createAllDataExcelBlob(
    data.customers,
    data.purchases,
    data.bankAccounts,
    data.paperStocks,
    getBankName,
    {
      categories: data.categories,
      loans: data.loans,
      productTypes: data.productTypes,
      clientTypes: data.clientTypes,
      employees: data.employees,
      date
    }
  );

  const dataBase64 = await blobToBase64(blob);
  const response = await fetch('/api/telegram-daily-backup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date,
      filename,
      dataBase64,
      triggeredBy: currentUser?.username || currentUser?.name || 'anonymous',
      counts: {
        customers: data.customers.length,
        purchases: data.purchases.length,
        loans: data.loans.length,
        bankAccounts: data.bankAccounts.length,
        paperStocks: data.paperStocks.length,
        categories: data.categories.length,
        productTypes: data.productTypes.length,
        clientTypes: data.clientTypes.length,
        employees: data.employees.length
      }
    })
  });

  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(message || `Telegram backup request failed with ${response.status}`);
  }
}
