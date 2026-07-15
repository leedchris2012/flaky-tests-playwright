import { test, expect } from '@playwright/test';
import { DynamicControlsPage } from '../../pages/dynamic-controls.page';

test('enabled text input accepts typed text (anti-pattern: manual isEnabled check)', async ({ page }) => {
  const dynamicControlsPage = new DynamicControlsPage(page);
  await dynamicControlsPage.goto();
  await dynamicControlsPage.clickEnable();

  // ANTI-PATTERN: the button re-enables the input only after a 3s delayed
  // AJAX call. Checking isEnabled() once after a short guessed sleep is a
  // one-shot snapshot, not a retrying wait, so it reads the stale disabled
  // state.
  await page.waitForTimeout(500);
  expect(await dynamicControlsPage.textInput.isEnabled()).toBe(true);
});
