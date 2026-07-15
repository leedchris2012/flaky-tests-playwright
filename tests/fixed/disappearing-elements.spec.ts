import { test, expect } from '@playwright/test';
import { DisappearingElementsPage } from '../../pages/disappearing-elements.page';

test.describe('Disappearing Elements', () => {
  // Root cause: the Gallery nav item is randomly present or absent on a
  // given page load. count() doesn't wait for the element to appear — it
  // just reports how many currently match, so it tells us whether the
  // element exists on *this* load without assuming either way.
  test('nav conditionally shows a Gallery link', async ({ page }) => {
    const disappearingElementsPage = new DisappearingElementsPage(page);
    await disappearingElementsPage.goto();

    await expect(disappearingElementsPage.homeLink).toBeVisible();

    const galleryCount = await disappearingElementsPage.galleryLink.count();
    expect([0, 1]).toContain(galleryCount);
    if (galleryCount > 0) {
      await expect(disappearingElementsPage.galleryLink).toBeVisible();
    }
  });
});
