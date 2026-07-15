import { test } from '@playwright/test';
import { EntryAdPage } from '../../pages/entry-ad.page';

test('restart-ad link is clickable right after page load (anti-pattern: no wait for modal)', async ({ page }) => {
  const entryAdPage = new EntryAdPage(page);
  await entryAdPage.goto();

  // ANTI-PATTERN: the ad modal appears ~500ms after load and covers the
  // whole page. Clicking underlying content without waiting for/dismissing
  // it first races that timer — Playwright reports the click as intercepted
  // by #modal once the overlay renders.
  await entryAdPage.restartAdLink.click({ timeout: 2000 });
});
