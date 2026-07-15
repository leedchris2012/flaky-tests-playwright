import { Page, Locator } from '@playwright/test';

export class DynamicLoadingPage {
  readonly page: Page;
  readonly startButton: Locator;
  readonly finishHeading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.startButton = page.locator('#start button');
    this.finishHeading = page.locator('#finish h4');
  }

  async goto(): Promise<void> {
    await this.page.goto('/dynamic_loading/1');
  }

  async start(): Promise<void> {
    await this.startButton.click();
  }
}
