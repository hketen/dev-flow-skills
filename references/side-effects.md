# Side-effect code rules

Applies to code that moves money, places orders or trades, sends mail/SMS/push, writes to cloud storage or remote databases, or clones, drops or restores data. Applies on top of `references/backend.md`. The project's own instruction files and conventions win. Checked against official docs on 2026-10-16.

## Check first

- Read detect `sideEffects`, `jobs` and `scripts`. Every listed package acts on the outside world.
- Find the entry points that boot on import (bot loops, schedulers, `listen()`, queue workers, top-level `await connect()`). Do this before you write any test or script that imports project code.
- Find where targets come from: `.env`, config files, CLI arguments, state files. Read the code that loads them, never the files.
- Find existing safe switches: dry-run flags, sandbox or test-mode keys, a mail catcher in compose.

## Never

- Never run, start or smoke-run the program against a real target. This includes `start`, `dev`, `node src/index.js`, and importing a module that boots it.
- Never print, open, copy or commit config, credential, account or state files. Never put secrets or connection strings in a command line you show.
- Never hand-edit a state file that a running process writes.
- Never invent a live flag, testnet flag or paper mode unless the user asks. If asked, make the safe mode the default and require an explicit opt-in for live.
- Never run drop, delete, overwrite, restore, clone or bulk-update tools. A "temporary" script is no exception.

## Plan items that need explicit approval

- Order size, side, symbol, amount, currency, leverage, stop/target levels.
- Retry count, backoff, idempotency keys, deduplication, schedule frequency.
- Recipient selection, send loops, batch sizes, rate limits.
- Any drop, delete, overwrite, restore or bulk update, and any change to the target selection logic.

## Writing the code

- Make every external call idempotent. Send an idempotency key when the provider supports one.
- Keep pure logic (pricing, sizing, filtering, templating) in modules with no side-effect imports. Test those modules.
- Never call a payment, mail or HTTP API inside a database transaction.
- Webhooks: verify the signature on the raw, unparsed body. Store processed event IDs and skip repeats. Return 2xx fast and do slow work in a job.
- Log the action and its target ID. Never log full payloads with personal data, card data or secrets.

## Verify

- Unit-test pure functions with in-memory fixtures only. Tests must not import modules with side effects at load.
- Mock the client at the module boundary. Never point a test at a real endpoint.
- Run lint and type checks that do not execute project code.
- Use a provider sandbox only when the code already supports it and the user confirms the target is not production: Stripe test-mode keys (`sk_test_`), Paddle sandbox, a local mail catcher such as Mailpit.
- CLI tools: run `--help` or argument parsing only. Never pass connection strings.
- Report what you did not run, for example `Not verified: starts live trading` or `Not verified: sends real email`.

Sources: https://docs.stripe.com/webhooks, https://docs.stripe.com/webhooks/process-undelivered-events, https://docs.stripe.com/keys, https://docs.stripe.com/api/idempotent_requests, https://developer.paddle.com/webhooks/signature-verification, https://developer.paddle.com/sdks/sandbox/, https://mailpit.axllent.org/, https://www.prisma.io/docs/orm/prisma-client/queries/transactions
