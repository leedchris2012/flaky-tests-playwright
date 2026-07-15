import { test, expect } from '@playwright/test';
import { DynamicLoadingPage } from '../../pages/dynamic-loading.page';

test.describe('Dynamic Loading', () => {
  // Root cause: #finish exists in the DOM at load but is hidden
  // (display:none) until a 5s timer flips it visible. A hard sleep either
  // guesses wrong or couples the test to that 5s implementation detail.
  // Playwright's web-first assertion polls until the element is actually
  // visible instead of checking at one arbitrary instant.
  test('start button reveals Hello World text', async ({ page }) => {
    const dynamicLoadingPage = new DynamicLoadingPage(page);
    await dynamicLoadingPage.goto();
    await dynamicLoadingPage.start();

    await expect(dynamicLoadingPage.finishHeading).toBeVisible({ timeout: 7000 });
    await expect(dynamicLoadingPage.finishHeading).toHaveText('Hello World!');
  });
});
