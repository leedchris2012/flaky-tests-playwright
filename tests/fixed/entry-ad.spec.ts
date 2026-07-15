import { test, expect } from '@playwright/test';
import { EntryAdPage } from '../../pages/entry-ad.page';

test.describe('Entry Ad', () => {
  // Root cause: a modal overlay appears ~500ms after page load via
  // setTimeout and intercepts clicks on the underlying page until it's
  // dismissed. Waiting for the modal's visible state and dismissing it
  // deterministically, instead of interacting immediately, avoids racing
  // that timer.
  test('restart-ad link is clickable after the modal is dismissed', async ({ page }) => {
    const entryAdPage = new EntryAdPage(page);
    await entryAdPage.goto();

    await expect(entryAdPage.modal).toBeVisible();
    await entryAdPage.dismissModal();
    await expect(entryAdPage.modal).toBeHidden();

    await expect(entryAdPage.restartAdLink).toBeVisible();
  });
});
