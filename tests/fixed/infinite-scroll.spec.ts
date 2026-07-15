import { test, expect } from '@playwright/test';
import { InfiniteScrollPage } from '../../pages/infinite-scroll.page';
import { pollForCountAbove } from '../../utils/poll-for-count';

test.describe('Infinite Scroll', () => {
  // Root cause: the paragraph count grows asynchronously as jscroll fetches
  // and appends more content after each scroll. Playwright's built-in
  // auto-waiting only covers actionability (visible/enabled/stable) for a
  // single element, not "wait for a count to increase" — so this scenario
  // needs a small custom expect.poll() wrapper instead of a plain
  // assertion.
  test('scrolling loads another paragraph', async ({ page }) => {
    const infiniteScrollPage = new InfiniteScrollPage(page);
    await infiniteScrollPage.goto();

    const baseline = await infiniteScrollPage.paragraphs.count();
    await infiniteScrollPage.scrollToBottom();
    await pollForCountAbove(infiniteScrollPage.paragraphs, baseline);

    expect(await infiniteScrollPage.paragraphs.count()).toBeGreaterThan(baseline);
  });
});
