import path from 'path';
import { test, expect } from '@playwright/test';
import { FileUploadPage } from '../../pages/file-upload.page';

test.describe('File Upload', () => {
  // Root cause: submitting the form causes a full page navigation to the
  // confirmation page. setInputFiles() sets the file synchronously, but the
  // confirmation text only exists after that navigation completes — a
  // web-first assertion on the confirmation element waits for it rather
  // than reading it the instant the click call resolves.
  test('upload confirmation shows the filename', async ({ page }) => {
    const fileUploadPage = new FileUploadPage(page);
    await fileUploadPage.goto();
    await fileUploadPage.fileInput.setInputFiles(path.join(__dirname, '../fixtures/upload-test.txt'));
    await fileUploadPage.submitButton.click();

    await expect(fileUploadPage.uploadedFiles).toHaveText('upload-test.txt');
  });
});
