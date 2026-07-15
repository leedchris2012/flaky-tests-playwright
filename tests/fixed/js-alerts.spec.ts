import { test, expect } from '@playwright/test';
import { JsAlertsPage } from '../../pages/js-alerts.page';

test.describe('JavaScript Alerts', () => {
  // Root cause: native confirm() blocks the page until answered, and
  // Playwright auto-dismisses any dialog with no listener attached at the
  // moment it fires. Registering the page.on('dialog') handler before
  // triggering the action guarantees it's already in place when the
  // dialog needs a decision.
  test('confirm dialog is accepted', async ({ page }) => {
    const jsAlertsPage = new JsAlertsPage(page);
    await jsAlertsPage.goto();

    jsAlertsPage.onDialog((dialog) => dialog.accept());
    await jsAlertsPage.confirmButton.click();

    await expect(jsAlertsPage.resultText).toHaveText('You clicked: Ok');
  });
});
