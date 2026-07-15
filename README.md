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
