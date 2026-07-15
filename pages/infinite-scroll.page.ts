import { Page, Locator } from '@playwright/test';

export class InfiniteScrollPage {
  readonly page: Page;
  readonly loadedItems: Locator;

  constructor(page: Page) {
    this.page = page;
    this.loadedItems = page.locator('.jscroll-added');
  }

  async goto(): Promise<void> {
    await this.page.goto('/infinite_scroll');
  }

  async scrollToBottom(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  }
}
