import { Page, Locator } from '@playwright/test';

export class DynamicControlsPage {
  readonly page: Page;
  readonly enableButton: Locator;
  readonly textInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.enableButton = page.locator('#input-example button');
    this.textInput = page.locator('#input-example input[type="text"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/dynamic_controls');
  }

  async clickEnable(): Promise<void> {
    await this.enableButton.click();
  }
}
