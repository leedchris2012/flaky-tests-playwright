import path from 'path';
import { test, expect } from '@playwright/test';
import { FileUploadPage } from '../../pages/file-upload.page';

test('upload confirmation shows the filename (anti-pattern: unawaited click + raw DOM snapshot)', async ({ page }) => {
  const fileUploadPage = new FileUploadPage(page);
  await fileUploadPage.goto();
  await fileUploadPage.fileInput.setInputFiles(path.join(__dirname, '../fixtures/upload-test.txt'));

  // ANTI-PATTERN: the submit button triggers a real page navigation, not
  // an in-page AJAX update. Forgetting to await the click means the next
  // line races that navigation. Reading the confirmation via a raw
  // page.evaluate() DOM query (no Playwright auto-waiting, unlike a
  // Locator) reads whatever is on the page at that exact instant — before
  // the navigation has completed.
  fileUploadPage.submitButton.click();
  const text = await page.evaluate(() => document.querySelector('#uploaded-files')?.textContent ?? null);

  expect(text).toContain('upload-test.txt');
});
