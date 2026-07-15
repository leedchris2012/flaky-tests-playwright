# Flaky Tests Playwright Demo — Design

## Overview

A portfolio project demonstrating how to diagnose and fix flaky UI tests, built
against [the-internet.herokuapp.com](https://the-internet.herokuapp.com/), a
site purpose-built with pages that trigger real timing/race-condition bugs.

Each of 7 scenarios ships as an intentionally flaky "anti-pattern" test
alongside a properly fixed version. A short comment block above each fixed
test explains the root cause of the flake and why the fix works. Audience is
interviewers/hiring managers browsing GitHub — the goal is to demonstrate
judgment about *why* a test flakes, not just produce a green CI badge.

This is a new, standalone repo — separate from `my-api-testing-project`
(API/FakeStoreAPI-focused) and `my-playwright-project` (Sauce Demo
functional/visual E2E) — because this project is UI-based against a
different target site and has a distinct narrative (flaky-test diagnosis
rather than general test coverage).

## Repo structure

```
flaky-tests-playwright/
├── pages/                          # lightweight POM, one file per scenario
│   ├── dynamic-loading.page.ts
│   ├── dynamic-controls.page.ts
│   ├── disappearing-elements.page.ts
│   ├── infinite-scroll.page.ts
│   ├── entry-ad.page.ts
│   ├── js-alerts.page.ts
│   └── file-upload.page.ts
├── utils/
│   └── poll-for-count.ts           # expect.poll wrapper for Infinite Scroll
├── tests/
│   ├── anti-patterns/              # intentionally flaky, NOT run in CI
│   │   └── <scenario>.spec.ts
│   └── fixed/                      # correct versions, run in CI
│       └── <scenario>.spec.ts
├── playwright.config.ts            # retries: 0 on fixed suite — proves determinism
├── .github/workflows/playwright.yml
└── README.md
```

Each scenario has one POM file shared by both its anti-pattern and fixed
spec, so the diff between the two specs is purely about waiting strategy,
not selectors — keeps the "what changed" story focused on the fix itself.

## Scenarios

Each row is one pair of specs (`tests/anti-patterns/<name>.spec.ts` and
`tests/fixed/<name>.spec.ts`) sharing one POM file.

| Scenario | Page | Root cause of flake | Fix technique |
|---|---|---|---|
| Dynamic Loading | `/dynamic_loading` | Element hidden/absent until an async load finishes | Web-first assertion (`expect(locator).toBeVisible()`) auto-waits instead of a hard sleep |
| Dynamic Controls | `/dynamic_controls` | Button/checkbox re-enables only after a delayed AJAX call | Locator auto-waits for actionable/enabled state before interacting |
| Disappearing Elements | `/disappearing_elements` | A nav element is randomly present or absent on a given page load | Conditional check (`locator.count()` / `isVisible()`) instead of assuming presence |
| Infinite Scroll | `/infinite_scroll` | Paragraph count grows asynchronously as the page is scrolled | Custom `expect.poll()` util waits for the count to increase, rather than asserting a fixed count immediately |
| Entry Ad | `/entry_ad` | A modal overlay (`#modal`) appears ~500ms after page load via `setTimeout` and intercepts clicks on the underlying page until dismissed | Wait for/dismiss the modal deterministically (e.g. wait for its visible state, then close it) instead of interacting immediately or on a fixed sleep |
| JavaScript Alerts | `/javascript_alerts` | Native `alert`/`confirm`/`prompt` dialogs race the action that triggers them | Register `page.on('dialog')` handler *before* performing the triggering action |
| File Upload | `/upload` | Test asserts the upload confirmation text before the upload has actually completed | `setInputFiles()` plus waiting on the confirmation element itself |

(Originally "Slow Resources" at `/slow` — swapped for Entry Ad after verifying
against the live site: `/slow`'s 30s delay is an invisible background AJAX
call with no DOM effect, so there was nothing to wait on or demonstrate.)

(Drag and Drop at `/drag_and_drop` was dropped entirely during implementation.
The scenario's premise — that Playwright's built-in `dragTo()` fails to
trigger this page's native HTML5 drag listeners, requiring a manual mouse
sequence workaround — no longer holds with the installed Playwright version
(1.61.1): live testing showed `dragTo()` succeeding reliably (3/3 trials),
and even a naive single-jump manual mouse sequence with no intermediate
move steps also succeeded reliably (5/5 trials). Modern Chromium/Playwright
have fixed native drag-event simulation, so there is no longer a
reproducible flake to demonstrate on this page. Confirmed with the user
before dropping the scenario rather than forcing a stale premise.)

Fix technique selection follows a "native Playwright first" principle:
6 of 7 scenarios are fixed using nothing but Playwright's built-in
auto-waiting and web-first assertions. A custom utility in `utils/` is
introduced only for Infinite Scroll, where Playwright's built-ins genuinely
don't cover the situation — this keeps the portfolio's core message ("use
the tool correctly before reaching for custom code") honest rather than
padding every scenario with unnecessary machinery.

## Testing approach / tooling

- TypeScript + `@playwright/test`.
- Lightweight Page Object Model: one small page object per scenario,
  imported by both its anti-pattern and fixed spec.
- No API layer or schema validation needed — this project is pure UI/browser
  testing against server-rendered pages.
- `tsc --noEmit` typecheck script, matching the CI setup already used in
  `my-api-testing-project`.
- `playwright.config.ts` sets `retries: 0`. The fixed suite is expected to
  pass deterministically on the first try — retries are deliberately not
  used to paper over flakiness, since the entire point of the project is
  fixing root causes rather than masking them.

## CI

GitHub Actions workflow runs:
1. `tsc --noEmit` (typecheck)
2. `npx playwright test tests/fixed` (fixed suite only)

`tests/anti-patterns/**` is excluded from the CI test glob entirely. Those
specs exist for reading and demonstration — running them in CI would either
require retries/flake-tolerance (undermining the "retries: 0 proves
determinism" point) or produce a red pipeline by design, neither of which
serves the portfolio goal of a clean, green badge.

## Documentation

- Top-level `README.md` indexes all 7 scenarios with a one-line root cause
  each, plus standard setup/run instructions.
- Each `tests/fixed/<scenario>.spec.ts` carries a short plain-language
  comment block above the test explaining the root cause and why the fix
  works, in the same style already used in `my-api-testing-project`.
- No separate per-scenario README files — explanation lives in the code
  next to what it explains.

## Out of scope

- Visual regression / snapshot testing (that's `my-playwright-project`'s
  focus, not this one).
- API testing (that's `my-api-testing-project`'s focus).
- Cross-browser matrix (chromium-only is sufficient; flakiness patterns
  here are DOM-timing issues, not browser-engine differences).
