# Flaky Tests Playwright Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a TypeScript Playwright UI test suite against the live
[the-internet.herokuapp.com](https://the-internet.herokuapp.com/) demonstrating
7 paired anti-pattern/fixed specs, each showing a real timing/race-condition
flake and its correct fix, with a green CI pipeline running only the fixed
suite.

**Architecture:** One lightweight Page Object per scenario (`pages/`), shared
by an intentionally-flaky spec (`tests/anti-patterns/`, excluded from CI) and
a correctly-waiting spec (`tests/fixed/`, the only suite CI runs). One small
utility (`utils/`) covers the one case Playwright's built-in auto-waiting
genuinely can't: polling a growing count.

**Tech Stack:** TypeScript, `@playwright/test` (browser/`page` fixture, chromium
only), GitHub Actions.

## Global Constraints

- Language: TypeScript, `strict: true`.
- Base URL: `https://the-internet.herokuapp.com`, chromium only (`projects: [{ name: 'chromium' }]`).
- `retries: 0` everywhere (not just CI) — the fixed suite must pass deterministically on the first try; this is the whole point of the project.
- CI: GitHub Actions, triggered on push to `main`, pull requests, and manual dispatch. Installs the chromium browser binary, then runs `npx playwright test tests/fixed` only.
- `tests/anti-patterns/**` is never run in CI — it exists for reading/demonstration and is excluded via the `npm test` script's explicit `tests/fixed` path (not via Playwright config `testIgnore`, so `npx playwright test tests/anti-patterns` still works for manual inspection).
- Every `tests/fixed/<scenario>.spec.ts` has a short plain-language comment block above the test explaining the root cause and why the fix works.
- No API layer or schema validation — pure UI/browser testing.

## Corrections made to the approved design during implementation planning

Verified every target page against the live site before writing selectors.
One scenario in the approved design didn't match live site behavior:

- **"Slow Resources" (`/slow`) → replaced with "Entry Ad" (`/entry_ad`).**
  `/slow`'s 30s delay is an invisible background AJAX call (`$.get('/slow_external')`,
  confirmed 30.4s via `curl`) with no DOM effect at all — nothing appears,
  changes, or becomes interactable when it resolves, so there is no flaky
  assertion to build. `/entry_ad` shows a full-page modal overlay via
  `setTimeout(..., 500)` that intercepts clicks on the underlying page until
  dismissed — a real, common automation flake (interstitial racing an
  interaction) that preserves the same "wait deterministically, don't guess
  or sleep" lesson. Confirmed by the user before proceeding. The design spec
  at `docs/superpowers/specs/2026-07-15-flaky-tests-playwright-design.md` has
  already been updated to reflect this.

All other scenario selectors below (`#start`/`#finish`, `#input-example`,
the Gallery `<li>`, `#modal`, dialog behavior, `#uploaded-files`) were
confirmed against the live page HTML/behavior, not assumed. (Infinite
Scroll's selector was *not* correctly confirmed at this stage — see the
Task 5 Correction note below; `.jscroll-inner p` matched 0 elements and was
fixed mid-task to `.jscroll-added`.)

- **Drag and Drop (`/drag_and_drop`) was dropped entirely** after Task 8,
  before Task 9 was dispatched. The scenario's premise — that Playwright's
  built-in `dragTo()` fails to trigger this page's native HTML5 drag
  listeners, requiring a manual mouse-sequence workaround — no longer holds
  with the installed Playwright version (1.61.1). Live testing showed
  `dragTo()` succeeding reliably (3/3 trials), and even a naive single-jump
  manual mouse sequence with no intermediate move steps also succeeded
  reliably (5/5 trials): modern Chromium/Playwright fixed native
  drag-event simulation, so there is no longer a reproducible flake on this
  page. Confirmed with the user before dropping rather than forcing a
  stale premise — the project now ships 7 scenarios, not 8. What was
  Task 9 (Drag and Drop) has been removed; the tasks that followed it are
  renumbered (old Task 10 → 9, old Task 11 → 10, old Task 12 → 11).

## File Structure

```
flaky-tests-playwright/
├── pages/
│   ├── dynamic-loading.page.ts
│   ├── dynamic-controls.page.ts
│   ├── disappearing-elements.page.ts
│   ├── infinite-scroll.page.ts
│   ├── entry-ad.page.ts
│   ├── js-alerts.page.ts
│   └── file-upload.page.ts
├── utils/
│   └── poll-for-count.ts
├── tests/
│   ├── anti-patterns/
│   │   └── <scenario>.spec.ts        (7 files, never run in CI)
│   ├── fixed/
│   │   └── <scenario>.spec.ts        (7 files, the only suite CI runs)
│   └── fixtures/
│       └── upload-test.txt           (static file for the upload scenario)
├── playwright.config.ts
├── package.json / tsconfig.json / .gitignore
├── .github/workflows/playwright.yml
└── README.md
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `playwright.config.ts`
- Create: `.gitignore`

**Interfaces:**
- Produces: npm scripts `test` (runs `tests/fixed` only), `test:anti-patterns`, `test:report`, `typecheck`. Playwright config with `baseURL: 'https://the-internet.herokuapp.com'`, `retries: 0`, single `chromium` project.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "flaky-tests-playwright",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "playwright test tests/fixed",
    "test:anti-patterns": "playwright test tests/anti-patterns",
    "test:report": "playwright show-report"
  },
  "devDependencies": {
    "@playwright/test": "^1.48.0",
    "@types/node": "^20.14.0",
    "typescript": "^5.5.4"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "commonjs",
    "lib": ["ES2021", "DOM"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "types": ["node", "@playwright/test"]
  },
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `playwright.config.ts`**

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'https://the-internet.herokuapp.com',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
```

- [ ] **Step 4: Create `.gitignore`**

```
node_modules/
playwright-report/
test-results/
```

- [ ] **Step 5: Install dependencies and the chromium browser**

Run: `npm install && npx playwright install chromium`
Expected: both complete successfully; creates `node_modules/` and `package-lock.json`.

- [ ] **Step 6: Verify the config loads**

Run: `npx playwright test --list`
Expected: exits 0, prints `Total: 0 tests in 0 files` (no spec files exist yet).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json playwright.config.ts .gitignore
git commit -m "chore: scaffold Playwright TypeScript project"
```

---

### Task 2: Dynamic Loading

**Files:**
- Create: `pages/dynamic-loading.page.ts`
- Create: `tests/anti-patterns/dynamic-loading.spec.ts`
- Create: `tests/fixed/dynamic-loading.spec.ts`

**Interfaces:**
- Produces: `DynamicLoadingPage` class — `constructor(page: Page)`, `goto(): Promise<void>`, `start(): Promise<void>`, readonly locators `startButton`, `finishHeading`.

- [ ] **Step 1: Create the page object**

`pages/dynamic-loading.page.ts`:

```typescript
import { Page, Locator } from '@playwright/test';

export class DynamicLoadingPage {
  readonly page: Page;
  readonly startButton: Locator;
  readonly finishHeading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.startButton = page.locator('#start button');
    this.finishHeading = page.locator('#finish h4');
  }

  async goto(): Promise<void> {
    await this.page.goto('/dynamic_loading/1');
  }

  async start(): Promise<void> {
    await this.startButton.click();
  }
}
```

- [ ] **Step 2: Write the anti-pattern spec**

`tests/anti-patterns/dynamic-loading.spec.ts`:

```typescript
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
```

- [ ] **Step 3: Run the anti-pattern spec and confirm it fails as expected**

Run: `npx playwright test tests/anti-patterns/dynamic-loading.spec.ts`
Expected: `1 failed` — the `isVisible()` snapshot at t=1s reads `false`.

- [ ] **Step 4: Write the fixed spec**

`tests/fixed/dynamic-loading.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { DynamicLoadingPage } from '../../pages/dynamic-loading.page';

test.describe('Dynamic Loading', () => {
  // Root cause: #finish exists in the DOM at load but is hidden
  // (display:none) until a 5s timer flips it visible. A hard sleep either
  // guesses wrong or couples the test to that 5s implementation detail.
  // Playwright's web-first assertion polls until the element is actually
  // visible instead of checking at one arbitrary instant.
  test('start button reveals Hello World text', async ({ page }) => {
    const dynamicLoadingPage = new DynamicLoadingPage(page);
    await dynamicLoadingPage.goto();
    await dynamicLoadingPage.start();

    await expect(dynamicLoadingPage.finishHeading).toBeVisible({ timeout: 7000 });
    await expect(dynamicLoadingPage.finishHeading).toHaveText('Hello World!');
  });
});
```

- [ ] **Step 5: Run the fixed spec and confirm it passes**

Run: `npx playwright test tests/fixed/dynamic-loading.spec.ts`
Expected: `1 passed`.

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors.

- [ ] **Step 7: Commit**

```bash
git add pages/dynamic-loading.page.ts tests/anti-patterns/dynamic-loading.spec.ts tests/fixed/dynamic-loading.spec.ts
git commit -m "feat: add Dynamic Loading scenario"
```

---

### Task 3: Dynamic Controls

**Files:**
- Create: `pages/dynamic-controls.page.ts`
- Create: `tests/anti-patterns/dynamic-controls.spec.ts`
- Create: `tests/fixed/dynamic-controls.spec.ts`

**Interfaces:**
- Produces: `DynamicControlsPage` class — `constructor(page: Page)`, `goto(): Promise<void>`, `clickEnable(): Promise<void>`, readonly locators `enableButton`, `textInput`.

- [ ] **Step 1: Create the page object**

`pages/dynamic-controls.page.ts`:

```typescript
import { Page, Locator } from '@playwright/test';

export class DynamicControlsPage {
  readonly page: Page;
  readonly enableButton: Locator;
  readonly textInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.enableButton = page.locator('#input-example button');
    this.textInput = page.locator('#input-example input[type="text"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/dynamic_controls');
  }

  async clickEnable(): Promise<void> {
    await this.enableButton.click();
  }
}
```

- [ ] **Step 2: Write the anti-pattern spec**

`tests/anti-patterns/dynamic-controls.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { DynamicControlsPage } from '../../pages/dynamic-controls.page';

test('enabled text input accepts typed text (anti-pattern: manual isEnabled check)', async ({ page }) => {
  const dynamicControlsPage = new DynamicControlsPage(page);
  await dynamicControlsPage.goto();
  await dynamicControlsPage.clickEnable();

  // ANTI-PATTERN: the button re-enables the input only after a 3s delayed
  // AJAX call. Checking isEnabled() once after a short guessed sleep is a
  // one-shot snapshot, not a retrying wait, so it reads the stale disabled
  // state.
  await page.waitForTimeout(500);
  expect(await dynamicControlsPage.textInput.isEnabled()).toBe(true);
});
```

- [ ] **Step 3: Run the anti-pattern spec and confirm it fails as expected**

Run: `npx playwright test tests/anti-patterns/dynamic-controls.spec.ts`
Expected: `1 failed` — `isEnabled()` at t=500ms is still `false` (real delay is 3000ms).

- [ ] **Step 4: Write the fixed spec**

`tests/fixed/dynamic-controls.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { DynamicControlsPage } from '../../pages/dynamic-controls.page';

test.describe('Dynamic Controls', () => {
  // Root cause: the "Enable" button flips the text input's disabled
  // attribute only after a 3s delayed AJAX call. Interacting with a
  // locator (fill()) makes Playwright wait for it to be actionable
  // (visible, enabled, stable) first, so there's no need to guess the
  // delay or poll manually.
  test('enabled text input accepts typed text', async ({ page }) => {
    const dynamicControlsPage = new DynamicControlsPage(page);
    await dynamicControlsPage.goto();
    await dynamicControlsPage.clickEnable();

    await dynamicControlsPage.textInput.fill('flaky no more');
    await expect(dynamicControlsPage.textInput).toHaveValue('flaky no more');
  });
});
```

- [ ] **Step 5: Run the fixed spec and confirm it passes**

Run: `npx playwright test tests/fixed/dynamic-controls.spec.ts`
Expected: `1 passed`.

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors.

- [ ] **Step 7: Commit**

```bash
git add pages/dynamic-controls.page.ts tests/anti-patterns/dynamic-controls.spec.ts tests/fixed/dynamic-controls.spec.ts
git commit -m "feat: add Dynamic Controls scenario"
```

---

### Task 4: Disappearing Elements

**Files:**
- Create: `pages/disappearing-elements.page.ts`
- Create: `tests/anti-patterns/disappearing-elements.spec.ts`
- Create: `tests/fixed/disappearing-elements.spec.ts`

**Interfaces:**
- Produces: `DisappearingElementsPage` class — `constructor(page: Page)`, `goto(): Promise<void>`, readonly locators `homeLink`, `galleryLink`.

- [ ] **Step 1: Create the page object**

`pages/disappearing-elements.page.ts`:

```typescript
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
```

- [ ] **Step 2: Write the anti-pattern spec**

`tests/anti-patterns/disappearing-elements.spec.ts`:

```typescript
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
```

- [ ] **Step 3: Run the anti-pattern spec a few times and observe the flake**

Run: `npx playwright test tests/anti-patterns/disappearing-elements.spec.ts --repeat-each=5`
Expected: a mix of passed and failed runs — this scenario is genuinely
probabilistic (unlike the others, which fail deterministically), so don't
expect a fixed pass/fail count.

- [ ] **Step 4: Write the fixed spec**

`tests/fixed/disappearing-elements.spec.ts`:

```typescript
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
```

- [ ] **Step 5: Run the fixed spec several times and confirm it always passes**

Run: `npx playwright test tests/fixed/disappearing-elements.spec.ts --repeat-each=5`
Expected: `5 passed` regardless of whether Gallery happened to appear on each load.

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors.

- [ ] **Step 7: Commit**

```bash
git add pages/disappearing-elements.page.ts tests/anti-patterns/disappearing-elements.spec.ts tests/fixed/disappearing-elements.spec.ts
git commit -m "feat: add Disappearing Elements scenario"
```

---

### Task 5: Infinite Scroll

**Files:**
- Create: `utils/poll-for-count.ts`
- Create: `pages/infinite-scroll.page.ts`
- Create: `tests/anti-patterns/infinite-scroll.spec.ts`
- Create: `tests/fixed/infinite-scroll.spec.ts`

**Interfaces:**
- Produces: `pollForCountAbove(locator: Locator, baseline: number, timeout?: number): Promise<void>` (from `utils/poll-for-count.ts`).
- Produces: `InfiniteScrollPage` class — `constructor(page: Page)`, `goto(): Promise<void>`, `scrollToBottom(): Promise<void>`, readonly locator `loadedItems`.

**Correction (found during Task 5 implementation, verified live):** the plan
originally targeted `.jscroll-inner p`, assuming jscroll wraps each loaded
chunk in a `<p>` tag. It doesn't — live inspection (headless Chromium against
`https://the-internet.herokuapp.com/infinite_scroll`) shows each chunk is a
`<div class="jscroll-added">` containing a raw text node, no `<p>` anywhere.
`.jscroll-inner p` matches 0 elements forever, so the fixed spec hung until
its poll timeout. The corrected selector is `.jscroll-added`, and the
locator is renamed `paragraphs` → `loadedItems` since "paragraphs" is no
longer accurate. Verified live: `.jscroll-added` count is 1 immediately
after `goto()` resolves (an in-flight loading placeholder), settles to 2
within ~500ms (the page auto-loads once on its own, before any user
scroll — the initial container is short enough that jscroll's own
near-bottom check fires on load), then reliably increases by exactly 1 per
explicit `scrollToBottom()` call once settled. The baseline/poll pattern
below is robust to this pre-existing auto-load noise by construction — it
only asserts *relative* growth from whatever baseline was captured, never
an absolute count.

- [ ] **Step 1: Create the poll utility**

`utils/poll-for-count.ts`:

```typescript
import { Locator, expect } from '@playwright/test';

export async function pollForCountAbove(
  locator: Locator,
  baseline: number,
  timeout = 10000
): Promise<void> {
  await expect.poll(() => locator.count(), { timeout }).toBeGreaterThan(baseline);
}
```

- [ ] **Step 2: Create the page object**

`pages/infinite-scroll.page.ts`:

```typescript
import { Page, Locator } from '@playwright/test';

export class InfiniteScrollPage {
  readonly page: Page;
  readonly loadedItems: Locator;

  constructor(page: Page) {
    this.page = page;
    this.loadedItems = page.locator('.jscroll-added');
  }

  async goto(): Promise<void> {
    await this.page.goto('/infinite_scroll');
  }

  async scrollToBottom(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  }
}
```

- [ ] **Step 3: Write the anti-pattern spec**

`tests/anti-patterns/infinite-scroll.spec.ts`:

```typescript
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
```

- [ ] **Step 4: Run the anti-pattern spec a few times and observe the flake**

Run: `npx playwright test tests/anti-patterns/infinite-scroll.spec.ts --repeat-each=5`
Expected: a mix of passed and failed runs (verified live: roughly 3 failed /
2 passed out of 5 in manual testing) — this scenario is genuinely
probabilistic like Disappearing Elements, not deterministic like the other
anti-patterns, because the zero-wait comparison sometimes gets lucky. Don't
expect a fixed pass/fail count.

- [ ] **Step 5: Write the fixed spec**

`tests/fixed/infinite-scroll.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { InfiniteScrollPage } from '../../pages/infinite-scroll.page';
import { pollForCountAbove } from '../../utils/poll-for-count';

test.describe('Infinite Scroll', () => {
  // Root cause: the number of loaded content chunks grows asynchronously
  // as jscroll fetches and appends more content after each scroll.
  // Playwright's built-in auto-waiting only covers actionability
  // (visible/enabled/stable) for a single element, not "wait for a count
  // to increase" — so this scenario needs a small custom expect.poll()
  // wrapper instead of a plain assertion.
  test('scrolling loads another chunk', async ({ page }) => {
    const infiniteScrollPage = new InfiniteScrollPage(page);
    await infiniteScrollPage.goto();

    const baseline = await infiniteScrollPage.loadedItems.count();
    await infiniteScrollPage.scrollToBottom();
    await pollForCountAbove(infiniteScrollPage.loadedItems, baseline);

    expect(await infiniteScrollPage.loadedItems.count()).toBeGreaterThan(baseline);
  });
});
```

- [ ] **Step 6: Run the fixed spec and confirm it passes**

Run: `npx playwright test tests/fixed/infinite-scroll.spec.ts`
Expected: `1 passed`.

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors.

- [ ] **Step 8: Commit**

```bash
git add utils/poll-for-count.ts pages/infinite-scroll.page.ts tests/anti-patterns/infinite-scroll.spec.ts tests/fixed/infinite-scroll.spec.ts
git commit -m "feat: add Infinite Scroll scenario"
```

---

### Task 6: Entry Ad

**Files:**
- Create: `pages/entry-ad.page.ts`
- Create: `tests/anti-patterns/entry-ad.spec.ts`
- Create: `tests/fixed/entry-ad.spec.ts`

**Interfaces:**
- Produces: `EntryAdPage` class — `constructor(page: Page)`, `goto(): Promise<void>`, `dismissModal(): Promise<void>`, readonly locators `modal`, `modalCloseText`, `restartAdLink`.

**Correction (found during Task 6 implementation, verified live):** the
anti-pattern spec originally clicked `restartAdLink` immediately after
`goto()`, racing the 500ms modal timer. Live testing in a raw Node script
showed this failing reliably (goto() cold-start latency exceeded 500ms), but
inside the actual Playwright test runner — which reuses a warm browser
across repeats — `goto()` against the live Heroku site routinely resolves
in well under 500ms, so the click fired and succeeded *before* the modal
appeared. Confirmed empirically: 8/8 repeats passed instead of failing.
The fix is a deliberate `page.waitForTimeout(700)` before the click,
guaranteeing the modal is already up (verified visible by 700ms) with no
dependence on `goto()`'s incidental timing. Re-verified: 8/8 repeats fail
as intended with this change.

- [ ] **Step 1: Create the page object**

`pages/entry-ad.page.ts`:

```typescript
import { Page, Locator } from '@playwright/test';

export class EntryAdPage {
  readonly page: Page;
  readonly modal: Locator;
  readonly modalCloseText: Locator;
  readonly restartAdLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.locator('#modal');
    this.modalCloseText = page.locator('#modal .modal-footer p');
    this.restartAdLink = page.locator('#restart-ad');
  }

  async goto(): Promise<void> {
    await this.page.goto('/entry_ad');
  }

  async dismissModal(): Promise<void> {
    await this.modalCloseText.click();
  }
}
```

- [ ] **Step 2: Write the anti-pattern spec**

`tests/anti-patterns/entry-ad.spec.ts`:

```typescript
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
```

- [ ] **Step 3: Run the anti-pattern spec and confirm it fails as expected**

Run: `npx playwright test tests/anti-patterns/entry-ad.spec.ts`
Expected: `1 failed` — Playwright's error names `#modal` as intercepting the click.

- [ ] **Step 4: Write the fixed spec**

`tests/fixed/entry-ad.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { EntryAdPage } from '../../pages/entry-ad.page';

test.describe('Entry Ad', () => {
  // Root cause: a modal overlay appears ~500ms after page load via
  // setTimeout and intercepts clicks on the underlying page until it's
  // dismissed. Waiting for the modal's visible state and dismissing it
  // deterministically, instead of interacting immediately, avoids racing
  // that timer.
  test('restart-ad link is clickable after the modal is dismissed', async ({ page }) => {
    const entryAdPage = new EntryAdPage(page);
    await entryAdPage.goto();

    await expect(entryAdPage.modal).toBeVisible();
    await entryAdPage.dismissModal();
    await expect(entryAdPage.modal).toBeHidden();

    await expect(entryAdPage.restartAdLink).toBeVisible();
  });
});
```

- [ ] **Step 5: Run the fixed spec and confirm it passes**

Run: `npx playwright test tests/fixed/entry-ad.spec.ts`
Expected: `1 passed`.

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors.

- [ ] **Step 7: Commit**

```bash
git add pages/entry-ad.page.ts tests/anti-patterns/entry-ad.spec.ts tests/fixed/entry-ad.spec.ts
git commit -m "feat: add Entry Ad scenario"
```

---

### Task 7: JavaScript Alerts

**Files:**
- Create: `pages/js-alerts.page.ts`
- Create: `tests/anti-patterns/js-alerts.spec.ts`
- Create: `tests/fixed/js-alerts.spec.ts`

**Interfaces:**
- Produces: `JsAlertsPage` class — `constructor(page: Page)`, `goto(): Promise<void>`, `onDialog(handler: (dialog: Dialog) => void): void`, readonly locators `confirmButton`, `resultText`.

- [ ] **Step 1: Create the page object**

`pages/js-alerts.page.ts`:

```typescript
import { Page, Locator, Dialog } from '@playwright/test';

export class JsAlertsPage {
  readonly page: Page;
  readonly confirmButton: Locator;
  readonly resultText: Locator;

  constructor(page: Page) {
    this.page = page;
    this.confirmButton = page.getByRole('button', { name: 'Click for JS Confirm' });
    this.resultText = page.locator('#result');
  }

  async goto(): Promise<void> {
    await this.page.goto('/javascript_alerts');
  }

  onDialog(handler: (dialog: Dialog) => void): void {
    this.page.on('dialog', handler);
  }
}
```

- [ ] **Step 2: Write the anti-pattern spec**

`tests/anti-patterns/js-alerts.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { JsAlertsPage } from '../../pages/js-alerts.page';

test('confirm dialog is accepted (anti-pattern: handler registered after the click)', async ({ page }) => {
  const jsAlertsPage = new JsAlertsPage(page);
  await jsAlertsPage.goto();

  // ANTI-PATTERN: confirm() blocks the page until the dialog is resolved.
  // Playwright auto-dismisses any dialog that has no listener attached at
  // the moment it fires, so registering the handler after click() has
  // already resolved is too late — the dialog was already auto-dismissed
  // as "Cancel" before the handler existed.
  await jsAlertsPage.confirmButton.click();
  jsAlertsPage.onDialog((dialog) => dialog.accept());

  await expect(jsAlertsPage.resultText).toHaveText('You clicked: Ok');
});
```

- [ ] **Step 3: Run the anti-pattern spec and confirm it fails as expected**

Run: `npx playwright test tests/anti-patterns/js-alerts.spec.ts`
Expected: `1 failed` — the result text reads `You clicked: Cancel`, not `Ok`.

- [ ] **Step 4: Write the fixed spec**

`tests/fixed/js-alerts.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { JsAlertsPage } from '../../pages/js-alerts.page';

test.describe('JavaScript Alerts', () => {
  // Root cause: native confirm() blocks the page until answered, and
  // Playwright auto-dismisses any dialog with no listener attached at the
  // moment it fires. Registering the page.on('dialog') handler before
  // triggering the action guarantees it's already in place when the
  // dialog needs a decision.
  test('confirm dialog is accepted', async ({ page }) => {
    const jsAlertsPage = new JsAlertsPage(page);
    await jsAlertsPage.goto();

    jsAlertsPage.onDialog((dialog) => dialog.accept());
    await jsAlertsPage.confirmButton.click();

    await expect(jsAlertsPage.resultText).toHaveText('You clicked: Ok');
  });
});
```

- [ ] **Step 5: Run the fixed spec and confirm it passes**

Run: `npx playwright test tests/fixed/js-alerts.spec.ts`
Expected: `1 passed`.

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors.

- [ ] **Step 7: Commit**

```bash
git add pages/js-alerts.page.ts tests/anti-patterns/js-alerts.spec.ts tests/fixed/js-alerts.spec.ts
git commit -m "feat: add JavaScript Alerts scenario"
```

---

### Task 8: File Upload

**Files:**
- Create: `tests/fixtures/upload-test.txt`
- Create: `pages/file-upload.page.ts`
- Create: `tests/anti-patterns/file-upload.spec.ts`
- Create: `tests/fixed/file-upload.spec.ts`

**Interfaces:**
- Produces: `FileUploadPage` class — `constructor(page: Page)`, `goto(): Promise<void>`, readonly locators `fileInput`, `submitButton`, `uploadedFiles`.

**Correction (found before Task 8 implementation, verified live):** the
original anti-pattern design read the confirmation text via
`fileUploadPage.uploadedFiles.textContent()` after an unawaited click,
expecting the missing `await` to cause a race. Live testing showed this
reliably PASSES instead (5/5 trials) — Playwright's `Locator.textContent()`
has its own built-in auto-wait for the element to attach to the DOM, so it
absorbs the race regardless of whether the click was awaited. The genuine
anti-pattern requires bypassing that auto-wait entirely: a raw
`page.evaluate()` DOM snapshot has no retry logic, so it reads whatever is
in the DOM at that exact instant. Verified live: 5/5 trials of
unawaited-click + `page.evaluate()` snapshot returned `null` (element
doesn't exist yet). The page object itself (`uploadedFiles` locator) is
unaffected — it's still what the FIXED spec uses, since that's exactly the
auto-waiting behavior the fix relies on. Only the anti-pattern spec's
reading mechanism changes.

- [ ] **Step 1: Create the fixture file**

`tests/fixtures/upload-test.txt`:

```
flaky-tests-playwright upload fixture
```

- [ ] **Step 2: Create the page object**

`pages/file-upload.page.ts`:

```typescript
import { Page, Locator } from '@playwright/test';

export class FileUploadPage {
  readonly page: Page;
  readonly fileInput: Locator;
  readonly submitButton: Locator;
  readonly uploadedFiles: Locator;

  constructor(page: Page) {
    this.page = page;
    this.fileInput = page.locator('#file-upload');
    this.submitButton = page.locator('#file-submit');
    this.uploadedFiles = page.locator('#uploaded-files');
  }

  async goto(): Promise<void> {
    await this.page.goto('/upload');
  }
}
```

- [ ] **Step 3: Write the anti-pattern spec**

`tests/anti-patterns/file-upload.spec.ts`:

```typescript
import path from 'path';
import { test, expect } from '@playwright/test';
import { FileUploadPage } from '../../pages/file-upload.page';

test('upload confirmation shows the filename (anti-pattern: unawaited click + raw DOM snapshot)', async ({ page }) => {
  const fileUploadPage = new FileUploadPage(page);
  await fileUploadPage.goto();
  await fileUploadPage.fileInput.setInputFiles(path.join(__dirname, '../fixtures/upload-test.txt'));

  // ANTI-PATTERN: the submit button triggers a real page navigation, not
  // an in-page AJAX update. Forgetting to await the click means the next
  // line races that navigation. Reading the confirmation via a raw
  // page.evaluate() DOM query (no Playwright auto-waiting, unlike a
  // Locator) reads whatever is on the page at that exact instant — before
  // the navigation has completed.
  fileUploadPage.submitButton.click();
  const text = await page.evaluate(() => document.querySelector('#uploaded-files')?.textContent ?? null);

  expect(text).toContain('upload-test.txt');
});
```

- [ ] **Step 4: Run the anti-pattern spec and confirm it fails as expected**

Run: `npx playwright test tests/anti-patterns/file-upload.spec.ts`
Expected: `1 failed` — the DOM snapshot reads `null` because `#uploaded-files`
doesn't exist yet at that instant (the navigation hasn't completed).

- [ ] **Step 5: Write the fixed spec**

`tests/fixed/file-upload.spec.ts`:

```typescript
import path from 'path';
import { test, expect } from '@playwright/test';
import { FileUploadPage } from '../../pages/file-upload.page';

test.describe('File Upload', () => {
  // Root cause: submitting the form causes a full page navigation to the
  // confirmation page. setInputFiles() sets the file synchronously, but the
  // confirmation text only exists after that navigation completes — a
  // web-first assertion on the confirmation element waits for it rather
  // than reading it the instant the click call resolves.
  test('upload confirmation shows the filename', async ({ page }) => {
    const fileUploadPage = new FileUploadPage(page);
    await fileUploadPage.goto();
    await fileUploadPage.fileInput.setInputFiles(path.join(__dirname, '../fixtures/upload-test.txt'));
    await fileUploadPage.submitButton.click();

    await expect(fileUploadPage.uploadedFiles).toHaveText('upload-test.txt');
  });
});
```

- [ ] **Step 6: Run the fixed spec and confirm it passes**

Run: `npx playwright test tests/fixed/file-upload.spec.ts`
Expected: `1 passed`.

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors.

- [ ] **Step 8: Commit**

```bash
git add tests/fixtures/upload-test.txt pages/file-upload.page.ts tests/anti-patterns/file-upload.spec.ts tests/fixed/file-upload.spec.ts
git commit -m "feat: add File Upload scenario"
```

---

### Task 9: GitHub Actions CI

**Files:**
- Create: `.github/workflows/playwright.yml`

**Interfaces:**
- Consumes: `npm test` script from Task 1's `package.json` (runs `tests/fixed` only).

- [ ] **Step 1: Create the workflow**

`.github/workflows/playwright.yml`:

```yaml
name: Playwright Fixed Suite

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run typecheck

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run fixed Playwright suite
        run: npm test

      - name: Upload HTML report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

Note: `tests/anti-patterns/**` is never referenced by this workflow — `npm
test` runs `playwright test tests/fixed` only, so the intentionally-flaky
specs can never affect CI's pass/fail status.

- [ ] **Step 2: Verify the workflow YAML is syntactically valid**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/playwright.yml'))" && echo OK`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/playwright.yml
git commit -m "ci: add GitHub Actions workflow for the fixed Playwright suite"
```

---

### Task 10: README

**Files:**
- Create: `README.md`

**Interfaces:**
- None (documentation only).

- [ ] **Step 1: Write the README**

`README.md`:

```markdown
# Flaky Tests — Playwright Demo

A portfolio project demonstrating how to diagnose and fix flaky UI tests,
built against [the-internet.herokuapp.com](https://the-internet.herokuapp.com/),
a site purpose-built with pages that trigger real timing/race-condition
bugs.

Each of 7 scenarios ships as an intentionally flaky **anti-pattern** test
alongside a properly fixed version. A short comment block above each fixed
test explains the root cause of the flake and why the fix works. The goal is
to demonstrate judgment about *why* a test flakes, not just produce a green
CI badge.

## Scenarios

| Scenario | Page | Root cause of flake | Fix technique |
|---|---|---|---|
| Dynamic Loading | `/dynamic_loading/1` | Element hidden until an async load finishes | Web-first assertion (`expect(locator).toBeVisible()`) auto-waits instead of a hard sleep |
| Dynamic Controls | `/dynamic_controls` | Text input re-enables only after a delayed AJAX call | Locator auto-waits for actionable/enabled state before interacting |
| Disappearing Elements | `/disappearing_elements` | A nav element is randomly present or absent on a given page load | Conditional check (`locator.count()`) instead of assuming presence |
| Infinite Scroll | `/infinite_scroll` | Loaded-chunk count grows asynchronously as the page is scrolled | Custom `expect.poll()` util waits for the count to increase, rather than asserting a fixed count immediately |
| Entry Ad | `/entry_ad` | A modal overlay appears ~500ms after load and intercepts clicks until dismissed | Wait for the modal's visible state and dismiss it deterministically, instead of interacting immediately |
| JavaScript Alerts | `/javascript_alerts` | Native `confirm()` dialogs race the action that triggers them | Register `page.on('dialog')` handler *before* performing the triggering action |
| File Upload | `/upload` | Test reads the upload confirmation text before the triggering navigation completes | `setInputFiles()` plus an awaited click and a web-first assertion on the confirmation element |

Fix technique selection follows a "native Playwright first" principle: 6 of
7 scenarios are fixed using nothing but Playwright's built-in auto-waiting
and web-first assertions. A custom utility in `utils/` is introduced only
for Infinite Scroll, where Playwright's built-ins genuinely don't cover the
situation.

## Project structure

```
pages/    # one lightweight Page Object per scenario, shared by both specs
utils/    # poll-for-count.ts (Infinite Scroll)
tests/
  anti-patterns/  # intentionally flaky, NEVER run in CI
  fixed/          # correct versions, the only suite CI runs
  fixtures/       # static file used by the File Upload scenario
```

## Getting started

```bash
npm install
npx playwright install chromium
npm run typecheck            # tsc --noEmit
npm test                     # run the fixed suite (what CI runs)
npm run test:anti-patterns   # run the flaky versions and watch them fail
npm run test:report          # open the last HTML report
```

## Why `tests/anti-patterns` is excluded from CI

Running the anti-pattern suite in CI would either require retries/flake
tolerance (undermining the point of `retries: 0`) or produce a red pipeline
by design — neither serves the goal of a clean, green badge that still
demonstrates the underlying bugs when read directly.

## CI

See `.github/workflows/playwright.yml`. Runs `npm test` (the fixed suite
only) on push to `main`, on pull requests, and on manual dispatch; publishes
the HTML report as a 30-day artifact.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README"
```

---

### Task 11: Connect the GitHub remote and push

**Files:** None — repository operations only.

**Interfaces:** None.

- [ ] **Step 1: Add the GitHub remote**

Run: `git remote add origin https://github.com/leedchris2012/flaky-tests-playwright.git`
Expected: exits 0, no output.

- [ ] **Step 2: Confirm with the user before pushing**

This pushes the project's full commit history to a shared remote for the
first time — confirm with the user before running the push in Step 3.

- [ ] **Step 3: Push**

Run: `git push -u origin main`
Expected: exits 0; `main` now tracks `origin/main` and the GitHub Actions
workflow from Task 10 runs automatically on GitHub.
