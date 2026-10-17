# Serverless and edge rules

Applies on top of `references/backend.md`. The project's own instruction files and conventions win. Checked against official docs on 2026-10-16; installed versions and bundled docs beat this file.

## Check first

- Find the platform: `vercel.json` or `@vercel/functions` (Vercel), `wrangler.toml`/`wrangler.jsonc` (Cloudflare Workers), `serverless.yml`, SAM `template.yaml` or `@types/aws-lambda` (AWS Lambda).
- Cloudflare: read `compatibility_date` and `compatibility_flags` before you use any `node:*` module.
- Read detect `module`, `node.pin` and `data` to know the runtime and the database driver.

## Version traps

| Version | Trap | Do |
|---|---|---|
| Next.js ≥ 16.3 on Vercel | `export const runtime = 'edge'` is not supported. | Use the Node.js runtime. |
| Vercel, all | Vercel recommends migrating from edge to Node.js. | Never add a new edge function unless the user asks. |
| Workers, `compatibility_date` < 2026-08-04 | Node.js APIs need the `nodejs_compat` flag. | Add the flag, or move the date forward with user approval. |
| Workers, `compatibility_date` ≥ 2026-08-04 | Node.js compatibility is on by default. | Do not add the flag again. |
| Lambda Node 20/22/24 runtimes | `require()` of ES modules is disabled by Lambda. | Use `await import()` from CJS, or ship ESM. Set `NODE_OPTIONS=--experimental-require-module` only with user approval. |

## Rules

- One instance serves many requests at once (Vercel Fluid compute, Workers isolates). Never keep per-request or per-user data in module scope.
- Create SDK clients and database pools in module scope, outside the handler. Reuse them across invocations.
- Vercel + SQL database: create the pool in module scope and register it with `attachDatabasePool` from `@vercel/functions`. Suspended instances otherwise leak connections.
- Use the provider's pooled connection endpoint for Postgres where it exists. Never open a new connection per request.
- Workers: memory is 128 MB per isolate. CPU time is 10 ms on Free and 30 s by default on Paid (max 5 min).
- Workers: subrequests per invocation are 50 on Free and 10,000 on Paid. Batch outgoing calls.
- Workers: pass background work to `ctx.waitUntil()`. Work outside it can be canceled when the response ends.
- Lambda: make handlers idempotent. Events can arrive more than once.
- Lambda: never store user data or secrets in the execution environment between invocations.
- Read secrets from platform env bindings at request time or at init. Never bundle them.
- Set an explicit timeout on every outgoing `fetch`. Platform limits end the function, not your call.

## Verify

- Run locally with the platform emulator: `vercel dev`, `wrangler dev`, `sam local invoke`. Use local or test credentials only.
- Never run `vercel deploy`, `wrangler deploy`, `sam deploy` or `serverless deploy` to test a change.
- Unit-test handlers as plain functions with fake events.

Sources: https://vercel.com/docs/functions/runtimes/edge, https://vercel.com/kb/guide/connection-pooling-with-functions, https://developers.cloudflare.com/changelog/post/2026-08-04-nodejs-compat-default/, https://developers.cloudflare.com/workers/configuration/compatibility-flags/, https://developers.cloudflare.com/workers/platform/limits/, https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html, https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html
