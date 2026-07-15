import { test, expect } from '@playwright/test';
import { DisappearingElementsPage } from '../../pages/disappearing-elements.page';

test('nav shows a Gallery link (anti-pattern: assumes element always present)', async ({ page }) => {
  const disappearingElementsPage = new DisappearingElementsPage(page);
  await disappearingElementsPage.goto();

  // ANTI-PATTERN: the Gallery nav item is randomly included on page load
  // (present on roughly 2 out of 3 loads, confirmed by repeated fetches of
  // the live page). Asserting it's always visible assumes presence instead
  // of checking for it, so this fails whenever a given run happens to omit
  // it.
  await expect(disappearingElementsPage.galleryLink).toBeVisible();
});
