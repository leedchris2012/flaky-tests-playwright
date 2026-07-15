import { test, expect } from '@playwright/test';
import { InfiniteScrollPage } from '../../pages/infinite-scroll.page';

test('scrolling loads another chunk (anti-pattern: immediate count check, no wait)', async ({ page }) => {
  const infiniteScrollPage = new InfiniteScrollPage(page);
  await infiniteScrollPage.goto();

  // ANTI-PATTERN: jscroll's fetch-and-append for each new chunk is
  // asynchronous. Capturing a "before" count and comparing it to an
  // "after" count checked immediately post-scroll, with no wait at all,
  // races that request — the new chunk usually hasn't arrived yet by the
  // time the comparison runs, so this is flaky (usually fails, sometimes
  // passes if the fetch happens to resolve unusually fast).
  const before = await infiniteScrollPage.loadedItems.count();
  await infiniteScrollPage.scrollToBottom();
  const immediatelyAfter = await infiniteScrollPage.loadedItems.count();

  expect(immediatelyAfter).toBeGreaterThan(before);
});
