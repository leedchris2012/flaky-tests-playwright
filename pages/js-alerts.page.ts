import { Page, Locator, Dialog } from '@playwright/test';

export class JsAlertsPage {
  readonly page: Page;
  readonly confirmButton: Locator;
  readonly resultText: Locator;

  constructor(page: Page) {
    this.page = page;
    this.confirmButton = page.getByRole('button', { name: 'Click for JS Confirm' });
    this.resultText = page.locator('#result');
  }

  async goto(): Promise<void> {
    await this.page.goto('/javascript_alerts');
  }

  onDialog(handler: (dialog: Dialog) => void): void {
    this.page.on('dialog', handler);
  }
}
