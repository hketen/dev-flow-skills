# Hono rules

Applies on top of `references/backend.md`. The project's own instruction files and conventions win. Checked against official docs on 2026-10-16; installed versions and bundled docs beat this file.

## Check first
- `frameworks.hono` and the runtime: `@hono/node-server` (Node), `wrangler.toml`/`wrangler.jsonc` (Cloudflare Workers), `bun` in `pm` or scripts (Bun).
- Validator package in use: `@hono/zod-validator`, `@hono/standard-validator`, or `hono/validator`.
- RPC in use: look for `hc<` imports and an exported `AppType`.

## Version traps
| Version | Trap | Do |
|---|---|---|
| 4.x | CORS with `credentials: true` and no `origin` reflected any origin. | Always pass an explicit `origin` list with credentials. Check advisories for `hono`. |
| 4.x | `@hono/node-ws` is deprecated. | Use `upgradeWebSocket` from `@hono/node-server` with `ws`. |

## Rules
- Write handlers inline after the path. Separate "controller" functions lose path-param and validator types; use `factory.createHandlers()` if you must split.
- Put validators inline in the route, before the handler. Read input only through `c.req.valid('json' | 'form' | 'query' | 'param' | 'header' | 'cookie')`.
- Header validator keys are lowercase (`idempotency-key`).
- `json`/`form` validators need a matching `Content-Type`. Without it the value is `{}`.
- RPC: chain routes (`new Hono().get(...).post(...)`) and export `typeof` the chained value. Unchained `app.get` calls lose client types.
- RPC: return `c.json(body, status)` with an explicit status. `c.notFound()` gives the client `unknown`.
- RPC in a monorepo: set `strict: true` in client and server tsconfig.
- Large RPC apps slow the IDE. Precompile the client type with `tsc` as the docs show; do not split types by hand.
- Mount `cors()` before the routes it covers.
- Add `bodyLimit({ maxSize })` to routes that read bodies. On Bun, raise `maxRequestBodySize` too for bodies over 128 MiB.
- Workers: read config and bindings from `c.env`, typed through `new Hono<{ Bindings }>()`. No `process.env`.
- Node: `serve()` returns the server; close it on `SIGTERM`/`SIGINT`.
- Node `serveStatic` resolves `root` from `process.cwd()`. Use an absolute path from `import.meta.url`.
- Do not register `app.head()`; Hono answers HEAD with the GET route.

## Verify
- Call `app.request(path, init)` or `testClient(app)` from `hono/testing`. No port, no deploy.
- Set `Content-Type` in test requests that send JSON or form bodies.
- Workers: run `wrangler dev` locally only. Never `wrangler deploy` during verification.

Sources: https://hono.dev/docs/guides/validation, https://hono.dev/docs/guides/rpc, https://hono.dev/docs/guides/best-practices, https://hono.dev/docs/middleware/builtin/cors, https://hono.dev/docs/middleware/builtin/body-limit, https://hono.dev/docs/getting-started/nodejs, https://hono.dev/docs/getting-started/cloudflare-workers, https://hono.dev/docs/helpers/testing, https://github.com/honojs/hono/security/advisories/GHSA-88fw-hqm2-52qc
