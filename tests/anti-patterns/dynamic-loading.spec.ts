import { test, expect } from '@playwright/test';
import { DynamicLoadingPage } from '../../pages/dynamic-loading.page';

test('start button reveals Hello World text (anti-pattern: fixed sleep + snapshot check)', async ({ page }) => {
  const dynamicLoadingPage = new DynamicLoadingPage(page);
  await dynamicLoadingPage.goto();
  await dynamicLoadingPage.start();

  // ANTI-PATTERN: #finish exists in the DOM at load but stays hidden
  // (display:none) for a fixed 5s before the page reveals it. A hard sleep
  // for a guessed duration, followed by a one-shot isVisible() snapshot
  // instead of an auto-retrying assertion, fails every run because 1s is
  // nowhere near the real 5s delay.
  await page.waitForTimeout(1000);
  expect(await dynamicLoadingPage.finishHeading.isVisible()).toBe(true);
});
