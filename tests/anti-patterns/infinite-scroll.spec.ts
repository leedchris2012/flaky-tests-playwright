import { test, expect } from '@playwright/test';
import { InfiniteScrollPage } from '../../pages/infinite-scroll.page';

test('scrolling loads another paragraph (anti-pattern: immediate fixed count)', async ({ page }) => {
  const infiniteScrollPage = new InfiniteScrollPage(page);
  await infiniteScrollPage.goto();
  await infiniteScrollPage.scrollToBottom();

  // ANTI-PATTERN: jscroll's fetch-and-append for the next chunk is
  // asynchronous. A one-shot count() snapshot taken immediately after
  // scrolling races that request and reads 0 almost every time.
  const count = await infiniteScrollPage.paragraphs.count();
  expect(count).toBe(1);
});
