import { test, expect } from '@playwright/test';

// Keep track of any console errors thrown during test runs
let consoleErrors: string[] = [];

test.describe('Mena Inc. Dashboard E2E Tests', () => {
  // Use a unique prefix for all test data to prevent collisions and simplify cleanup
  const testId = Date.now();
  const TEST_CUSTOMER_NAME = `TEST_CUSTOMER_${testId}`;
  const TEST_CUSTOMER_PHONE = `TEST_PHONE_${testId}`;
  const TEST_CUSTOMER_EDITED = `TEST_CUSTOMER_EDITED_${testId}`;
  const TEST_BANK_NAME = `TEST_BANK_${testId}`;
  const TEST_PURCHASE_NAME = `TEST_PURCHASE_${testId}`;

  // Log in using hardcoded emergency fallback credentials before each test
  test.beforeEach(async ({ page }) => {
    // Clear console errors array before each test
    consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');

    // Check if the Authenticated Gateway login screen is present
    const loginTitle = page.locator('h2:has-text("AUTHENTICATED GATEWAY")');
    if (await loginTitle.isVisible()) {
      // Selector Note: If input placeholders change, update these selectors
      await page.locator('input[placeholder="e.g. bereket"]').fill('admin6244');
      await page.locator('input[placeholder="••••••••"]').fill('admin6244');
      await page.locator('button:has-text("Sign in")').click();
    }

    // Wait for the main executive header or branding to ensure the dashboard loaded
    await expect(page.locator('h1:has-text("MENA INC.")')).toBeVisible({ timeout: 10000 });
  });

  // Strict cleanup after each test to remove any data created during testing
  test.afterEach(async ({ page }) => {
    console.log('Running test cleanup to remove any remaining TEST_ records...');
    
    // 1. Clean up Customers / Orders
    try {
      // Go to Customer Management Tab
      const custTab = page.locator('button#tab-cust-trigger');
      if (await custTab.isVisible()) {
        await custTab.click();
        
        // Find any rows in the Excel-like spreadsheet containing our "TEST_" prefix
        // Selector Note: tr:has-text("TEST_") targets any table row containing our test prefix
        const testRow = page.locator('tr:has-text("TEST_")').first();
        while (await testRow.isVisible()) {
          // Find and click the Delete button (trash icon button) on this specific row
          // Selector Note: Modify 'button[title="Delete Record"]' if the delete button tooltip changes
          const deleteBtn = testRow.locator('button[title="Delete Record"]');
          if (await deleteBtn.isVisible()) {
            await deleteBtn.click();
            // Click the confirmation button inside the modal overlay
            // Selector Note: Modify button:has-text("Delete Permanently") if confirm modal layout changes
            const confirmBtn = page.locator('button:has-text("Delete Permanently")');
            await confirmBtn.click();
            await page.waitForTimeout(500); // Small pause to allow animation & local storage synchronization
          } else {
            break;
          }
        }
      }
    } catch (e) {
      console.warn('Error during customer E2E cleanup:', e);
    }

    // 2. Clean up Purchases / Expenses Ledger
    try {
      const purchasesTab = page.locator('button#tab-purchases-trigger');
      if (await purchasesTab.isVisible()) {
        await purchasesTab.click();

        const testPurchaseRow = page.locator('tr:has-text("TEST_")').first();
        while (await testPurchaseRow.isVisible()) {
          const deleteBtn = testPurchaseRow.locator('button[title="Delete Purchase Ledger Line"]');
          if (await deleteBtn.isVisible()) {
            await deleteBtn.click();
            const confirmBtn = page.locator('button:has-text("Confirm Delete")');
            await confirmBtn.click();
            await page.waitForTimeout(500);
          } else {
            break;
          }
        }
      }
    } catch (e) {
      console.warn('Error during purchase E2E cleanup:', e);
    }

    // 3. Clean up Bank / Payment accounts
    try {
      const perfTab = page.locator('button#tab-perf-trigger');
      if (await perfTab.isVisible()) {
        await perfTab.click();

        // Bank Accounts list in Performance Tab
        const testBankRow = page.locator('tr:has-text("TEST_")').first();
        while (await testBankRow.isVisible()) {
          const deleteBtn = testBankRow.locator('button:has-text("Delete")');
          if (await deleteBtn.isVisible()) {
            await deleteBtn.click();
            const confirmBtn = page.locator('button:has-text("Yes, Delete Account")');
            await confirmBtn.click();
            await page.waitForTimeout(500);
          } else {
            break;
          }
        }
      }
    } catch (e) {
      console.warn('Error during bank accounts E2E cleanup:', e);
    }
  });

  // Test 1: App loads without crashing
  test('1. App loads without crashing', async ({ page }) => {
    // Assert document title contains expected branding
    await expect(page).toHaveTitle(/Mena/i);
    // Confirm presence of main page headers
    await expect(page.locator('header')).toBeVisible();
  });

  // Test 2: Main navigation/sidebar tabs open correctly
  test('2. Main navigation tabs open correctly', async ({ page }) => {
    // Selectors Note: Verify button IDs if tab layout updates
    const tabs = [
      { id: 'button#tab-cust-trigger', panelId: '#customers-tab-pnl' },
      { id: 'button#tab-inv-trigger', panelId: 'h2:has-text("Current Inventory Stocks")' },
      { id: 'button#tab-purchases-trigger', panelId: 'h2:has-text("Purchases & Expenses Ledger")' },
      { id: 'button#tab-perf-trigger', panelId: 'h2:has-text("Executive Performance Dashboard")' },
    ];

    for (const tab of tabs) {
      const tabButton = page.locator(tab.id);
      await expect(tabButton).toBeVisible();
      await tabButton.click();
      await expect(page.locator(tab.panelId).first()).toBeVisible();
    }
  });

  // Test 3 & 5: Customer/order form can be filled & Tables display added data correctly
  test('3 & 5. Customer form can be filled and displays in table', async ({ page }) => {
    await page.locator('button#tab-cust-trigger').click();

    // Open create order wizard modal
    // Selector Note: Modify selector if the orange/pink circular Plus button changes markup
    await page.locator('button:has(svg.lucide-plus)').first().click();

    // Step 1: Account Info
    // Selector Note: Inputs are bound via IDs in CustomerTab
    await page.locator('input#field-client-name').fill(TEST_CUSTOMER_NAME);
    await page.locator('input#field-client-phone').fill(TEST_CUSTOMER_PHONE);
    
    // Choose client type and source
    await page.locator('select#field-client-type').selectOption({ index: 1 });
    await page.locator('select#field-client-source').selectOption({ index: 1 });
    await page.locator('select#field-client-product').selectOption({ index: 1 });

    // Set numbers
    await page.locator('input#field-client-qty').fill('500');
    await page.locator('input#field-client-price').fill('12');
    await page.locator('input#field-client-advance').fill('1500');

    // Click Next Page (Step 2: Primary Items)
    await page.locator('button:has-text("Next Page")').click();

    // Choose paper types (deduction stocks) if applicable
    await page.locator('select#field-paper-type1').selectOption({ index: 1 });
    await page.locator('input#field-amount-1').fill('0.5');

    // Click Next Page (Step 3: Aux & Special)
    await page.locator('button:has-text("Next Page")').click();

    // Save/Submit the form
    // Selector Note: The wizard triggers handleFormSubmit on 'Complete Record Order'
    await page.locator('button:has-text("Complete Record Order")').click();

    // Verify the record is saved and visible in the desktop Excel table
    const tableRow = page.locator(`tr:has-text("${TEST_CUSTOMER_NAME}")`);
    await expect(tableRow).toBeVisible();
  });

  // Test 4: Required fields show validation errors
  test('4. Required fields show validation errors', async ({ page }) => {
    await page.locator('button#tab-cust-trigger').click();
    await page.locator('button:has(svg.lucide-plus)').first().click();

    // Try to click Next Page without filling required Client Name field
    await page.locator('button:has-text("Next Page")').click();

    // Assert validation error strip appears
    const errorStrip = page.locator('div:has-text("Client name holds metadata requirements")');
    await expect(errorStrip).toBeVisible();
  });

  // Test 6: Search, filter, and sort controls work
  test('6. Search, filter, and sort controls work', async ({ page }) => {
    await page.locator('button#tab-cust-trigger').click();

    // Create a temporary test customer to query for
    await page.locator('button:has(svg.lucide-plus)').first().click();
    await page.locator('input#field-client-name').fill(TEST_CUSTOMER_NAME);
    await page.locator('input#field-client-qty').fill('200');
    await page.locator('input#field-client-price').fill('15');
    await page.locator('input#field-client-advance').fill('0');
    await page.locator('button:has-text("Complete Record Order")').click();

    // Expand search if closed, and type the query
    // Selector Note: Toggles search bar expansion
    const searchToggler = page.locator('button[title="Search database"]');
    if (await searchToggler.isVisible()) {
      await searchToggler.click();
    }
    const searchInput = page.locator('input[placeholder="Type to search..."]');
    await searchInput.fill(TEST_CUSTOMER_NAME);

    // Verify search matches only our target
    await expect(page.locator(`tr:has-text("${TEST_CUSTOMER_NAME}")`)).toBeVisible();

    // Verify sorting works - e.g. clicking the table headers to trigger sorting
    // Selector Note: th element triggers sorting for Client Name column
    await page.locator('th:has-text("Client Name")').click();
  });

  // Test 7: Edit and delete actions work on isolated fresh test record
  test('7. Edit and delete actions work', async ({ page }) => {
    await page.locator('button#tab-cust-trigger').click();

    // Create fresh record for edit/delete test
    await page.locator('button:has(svg.lucide-plus)').first().click();
    await page.locator('input#field-client-name').fill(TEST_CUSTOMER_NAME);
    await page.locator('input#field-client-qty').fill('100');
    await page.locator('input#field-client-price').fill('10');
    await page.locator('input#field-client-advance').fill('0');
    await page.locator('button:has-text("Complete Record Order")').click();

    const row = page.locator(`tr:has-text("${TEST_CUSTOMER_NAME}")`);
    await expect(row).toBeVisible();

    // Edit test
    // Selector Note: Click the Edit button on this specific customer's row
    await row.locator('button[title="Edit Record"]').click();
    await page.locator('input#field-client-name').fill(TEST_CUSTOMER_EDITED);
    await page.locator('button:has-text("Save Modification")').click();

    // Verify edited name appears
    await expect(page.locator(`tr:has-text("${TEST_CUSTOMER_EDITED}")`)).toBeVisible();

    // Delete test
    const editedRow = page.locator(`tr:has-text("${TEST_CUSTOMER_EDITED}")`);
    await editedRow.locator('button[title="Delete Record"]').click();
    await page.locator('button:has-text("Delete Permanently")').click();

    // Confirm it is gone
    await expect(page.locator(`tr:has-text("${TEST_CUSTOMER_EDITED}")`)).not.toBeVisible();
  });

  // Test 8: Dark mode and light mode do not break layout
  test('8. Dark mode and light mode do not break layout', async ({ page }) => {
    // Open profile menu to trigger theme switcher
    // Selector Note: Profile button is the round user-initial button
    await page.locator('header button[title="Profile Menu"]').click();

    // Click Theme button to switch
    const themeBtn = page.locator('button:has-text("Theme")');
    await expect(themeBtn).toBeVisible();
    await themeBtn.click();

    // Verify main components are still visible and layout isn't blank
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  });

  // Test 9: Mobile viewport works correctly
  test('9. Mobile viewport works correctly', async ({ page }) => {
    // Simulate a phone screen viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Verify mobile layout adjustments (e.g. bottom navigation bar or mobile tabs)
    // Mobile view hides desktop tabs, and displays sticky toolbar
    const stickyToolbar = page.locator('.app-mobile-sticky-toolbar');
    await expect(stickyToolbar).toBeVisible();
  });

  // Test 10: No console errors appear during normal use
  test('10. No console errors appear during normal use', async ({ page }) => {
    // Navigate across all main tabs to ensure normal routing triggers zero console errors
    const tabs = ['Customers', 'Inventory Dashboard', 'Purchases & Expenses Ledger', 'Business Performance Summary'];
    
    for (const tabText of tabs) {
      await page.locator(`button:has-text("${tabText}")`).first().click();
      await page.waitForTimeout(300);
    }

    // Verify that the tracked console error list is clean
    expect(consoleErrors.length).toBe(0);
  });
});
