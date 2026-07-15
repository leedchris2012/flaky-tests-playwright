import { test, expect } from '@playwright/test';
import { JsAlertsPage } from '../../pages/js-alerts.page';

test('confirm dialog is accepted (anti-pattern: handler registered after the click)', async ({ page }) => {
  const jsAlertsPage = new JsAlertsPage(page);
  await jsAlertsPage.goto();

  // ANTI-PATTERN: confirm() blocks the page until the dialog is resolved.
  // Playwright auto-dismisses any dialog that has no listener attached at
  // the moment it fires, so registering the handler after click() has
  // already resolved is too late — the dialog was already auto-dismissed
  // as "Cancel" before the handler existed.
  await jsAlertsPage.confirmButton.click();
  jsAlertsPage.onDialog((dialog) => dialog.accept());

  await expect(jsAlertsPage.resultText).toHaveText('You clicked: Ok');
});
