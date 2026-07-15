import { Page, Locator } from '@playwright/test';

export class DisappearingElementsPage {
  readonly page: Page;
  readonly homeLink: Locator;
  readonly galleryLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.homeLink = page.getByRole('link', { name: 'Home', exact: true });
    this.galleryLink = page.getByRole('link', { name: 'Gallery', exact: true });
  }

  async goto(): Promise<void> {
    await this.page.goto('/disappearing_elements');
  }
}
