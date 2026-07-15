import { test } from '@playwright/test';
import { EntryAdPage } from '../../pages/entry-ad.page';

test('restart-ad link is clickable right after page load (anti-pattern: guessed sleep, no dismiss)', async ({ page }) => {
  const entryAdPage = new EntryAdPage(page);
  await entryAdPage.goto();

  // ANTI-PATTERN: the ad modal appears ~500ms after load and covers the
  // whole page. A short hard sleep just long enough for the modal to have
  // appeared, followed by clicking underlying content without dismissing
  // it, means the click stays genuinely blocked — Playwright reports it
  // as intercepted by #modal, since the modal is never dismissed.
  await page.waitForTimeout(700);
  await entryAdPage.restartAdLink.click({ timeout: 2000 });
});
