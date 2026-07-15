import { Locator, expect } from '@playwright/test';

export async function pollForCountAbove(
  locator: Locator,
  baseline: number,
  timeout = 10000
): Promise<void> {
  await expect.poll(() => locator.count(), { timeout }).toBeGreaterThan(baseline);
}
