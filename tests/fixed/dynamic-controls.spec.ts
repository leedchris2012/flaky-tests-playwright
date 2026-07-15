import { test, expect } from '@playwright/test';
import { DynamicControlsPage } from '../../pages/dynamic-controls.page';

test.describe('Dynamic Controls', () => {
  // Root cause: the "Enable" button flips the text input's disabled
  // attribute only after a 3s delayed AJAX call. Interacting with a
  // locator (fill()) makes Playwright wait for it to be actionable
  // (visible, enabled, stable) first, so there's no need to guess the
  // delay or poll manually.
  test('enabled text input accepts typed text', async ({ page }) => {
    const dynamicControlsPage = new DynamicControlsPage(page);
    await dynamicControlsPage.goto();
    await dynamicControlsPage.clickEnable();

    await dynamicControlsPage.textInput.fill('flaky no more');
    await expect(dynamicControlsPage.textInput).toHaveValue('flaky no more');
  });
});
