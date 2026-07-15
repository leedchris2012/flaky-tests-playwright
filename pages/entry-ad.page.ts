import { Page, Locator } from '@playwright/test';

export class EntryAdPage {
  readonly page: Page;
  readonly modal: Locator;
  readonly modalCloseText: Locator;
  readonly restartAdLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.locator('#modal');
    this.modalCloseText = page.locator('#modal .modal-footer p');
    this.restartAdLink = page.locator('#restart-ad');
  }

  async goto(): Promise<void> {
    await this.page.goto('/entry_ad');
  }

  async dismissModal(): Promise<void> {
    await this.modalCloseText.click();
  }
}
