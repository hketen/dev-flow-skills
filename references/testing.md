# Testing rules

The project's own instruction files and conventions win. Checked against official docs on 2026-10-16; installed versions and bundled docs beat this file.

## Check first

- Read `tests` (runner, e2e, files, msw, testcontainers) and `versions` (vitest, jest, msw) from detect.
- If test files exist, open up to two. Copy their structure, helpers, fixtures and naming.
- Use the detected runner only. Never mix `jest.*` and `vi.*` APIs. Never migrate runners unless the user asks.

## Never

- Never start a watcher. Run `vitest run`, `jest --watchAll=false`, `node --test` without `--watch`, `playwright test`.
- Never delete, skip, loosen or snapshot-update a failing test to go green. Stop and report the failure to the user.
- Never point tests at shared, staging or production resources: databases, queues, mail, payment or real third-party APIs.

## Version traps

| Version | Trap | Do |
|---|---|---|
| Vitest ≥4 | `workspace` is replaced by `projects`. | Configure `test.projects`. |
| Vitest ≥4 | `coverage.all` is removed. Coverage shows only files that tests load. | Set `coverage.include` (e.g. `['src/**']`). |
| Vitest ≥4 | Browser provider is a factory import. | Import `playwright` from `@vitest/browser-playwright`; pass `provider: playwright()`. |
| Vitest 5 | `vi.mock`, `vi.unmock` and `vi.hoisted` throw when not at module top level. | Put them at the top of the file. |
| Vitest 5 | Unawaited `.resolves`, `.rejects` and `toMatchFileSnapshot` fail the test. | `await expect(p).resolves...`. |
| Vitest 5 | `clearMocks` is on: call history resets before each test. | Trigger the call inside the test that asserts it. |
| Vitest 5 | Requires Node ≥22.12 and Vite ≥6.4. Config is not looked up in parent folders. Artifacts go to `.vitest/`. | Run from the folder that holds the config. |
| Jest 30 | ESM support is still experimental and needs `--experimental-vm-modules`. `--testPathPattern` is now `--testPathPatterns`. | Keep the repo's Jest setup. Do not convert it to ESM unasked. |
| node:test | `mock.module` needs `--experimental-test-module-mocks`. | Prefer dependency injection over module mocks. |
| MSW 3 | Requires Node ≥22. Imports moved: `msw/http`, `msw/graphql`, `msw/ws`. `onUnhandledRequest` is renamed `onUnhandledFrame`. | v3: `onUnhandledFrame: 'error'`. v2: import from `msw`, `onUnhandledRequest: 'error'`. |

## Rules

- Test behaviour through the public surface: HTTP via the framework's inject or a client against the app instance, exported functions, rendered UI.
- Assert observable results: return values, responses, DB rows, text found by role. Not private calls or internal state.
- Mock only system boundaries: external HTTP (MSW or the project's tool), clock, randomness. Do not mock your own modules or the ORM.
- Use a real database for data code: Testcontainers or the project's local test DB. Start containers in `globalSetup` and pass connection data to tests.
- Isolate every test: transaction rollback, truncate, or unique data. Never depend on test order.
- Fake timers: restore real timers after each test.
- Avoid large snapshots. Assert the fields that matter.
- New behaviour gets one test that fails without the change.

## Playwright

- Locate by role, label or text: `getByRole`, `getByLabel`. Avoid CSS and XPath selectors.
- Use web-first assertions: `await expect(locator).toBeVisible()`. They retry.
- Never use `page.waitForTimeout`. Wait on a locator or a response.
- Use the configured `baseURL` and `webServer`. Never point e2e tests at production.

## Verify

- Run only the affected test files first, then the full suite once, with the commands from `scripts`.
- Report the exact command and the pass/fail count. Report flaky tests; do not retry until green.

Sources: https://v4.vitest.dev/guide/migration, https://vitest.dev/guide/migration, https://vitest.dev/guide/cli, https://jestjs.io/docs/ecmascript-modules, https://jestjs.io/docs/upgrading-to-jest30, https://nodejs.org/api/test.html, https://mswjs.io/docs/migrations/2.x-to-3.x, https://playwright.dev/docs/best-practices, https://playwright.dev/docs/api/class-page#page-wait-for-timeout, https://node.testcontainers.org/quickstart/global-setup/
