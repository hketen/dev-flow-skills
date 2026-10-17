# Backend rules

The project's own instruction files and conventions win. Checked against official docs on 2026-10-16; installed versions and bundled docs beat this file.

## Check first

- Read existing code for framework, layering, error shape, validation lib, query layer, logger and config loading. Reuse them.
- Read `frameworks`, `versions` and `node.pin` from detect. Write APIs for the installed major, not the newest one you remember.
- Stack files from the `read` list hold framework, ORM and queue traps. Dependency and TypeScript rules are in `references/toolchain.md`.
- Check `sideEffects` before you touch code that sends mail, charges money, or calls other external systems.

## Node runtime traps

| Version | Trap | Do |
|---|---|---|
| Node ≥15 | An unhandled rejection crashes the process by default. | In global `unhandledRejection`/`uncaughtException` handlers, log, flush, then exit 1. Never resume. |
| Node 20 | End of life since 2026-04-30. | Target Node 22 or later for new work. Read `node.pin` first. |
| Node ≥24 | `url.parse()` gives a runtime deprecation warning and is unsafe. | Use `new URL()`. |
| all | `fetch` has no total deadline. undici header and body timeouts are 300 s each. | Pass `signal: AbortSignal.timeout(ms)` to every outbound call. |

## Boundaries

- Validate every external input at the edge: body, query, params, headers, env, webhooks, queue payloads, third-party responses. TS types do not exist at runtime.
- Parse into a new object. Derive types from the schema when the lib allows it.
- Parse env once at startup and fail fast. `Boolean("false")` is `true`: parse booleans with an explicit enum.
- Authorize on the server for every object you load by id: check owner or tenant. Authentication alone is not enough.
- Never trust client-sent ids, roles or prices.
- Write ORM inputs from an allowlist of fields. Never spread the request body into `create`/`update`.
- Return an explicit selection of fields. Never return full ORM rows.
- Set a body size limit on every parser.
- Secrets come from env or config. Never log, return or commit them.

## Errors

- Use one error shape. Map domain errors to HTTP status in one place. Handlers throw; they do not format.
- No empty `catch`. Wrap with `new Error(msg, { cause })`. Never send stack traces or internal messages to clients.
- Make sure async failures reach the error handler. Check the framework version: some majors forward rejections, some need a wrapper.

## Data

- Use parameterized queries only. Never build SQL or Mongo filters from string concatenation or raw user objects.
- A loop that contains `await query` is an N+1. Batch, join, or use a per-request DataLoader.
- Put multi-write invariants in one transaction. Never call HTTP, mail or payment APIs inside a DB transaction.
- Retried writes, jobs and webhooks need an idempotency key or a unique constraint.
- Keep migrations backward compatible: add, backfill, switch reads, then drop in a later release.
- Never edit an applied migration. Add a new one. Index new filter and sort columns.
- Paginate list endpoints with a capped limit.

## Runtime

- No `*Sync` I/O or CPU-heavy work on the request path. Use a worker thread or a queue.
- Cap concurrency on user-sized `Promise.all`. Stream large bodies and files.
- Retry only idempotent calls, with backoff and jitter.
- On SIGTERM: stop accepting, drain in-flight work, close pools and queues, flush logs, exit before a hard deadline.
- With more than one replica, in-process cron runs on every replica. Use the platform scheduler, a queue scheduler, or a lock.
- Never keep per-request state in module scope. Serverless and multi-tenant instances serve concurrent requests.

## API surface and logs

- Prefer additive changes. Put any breaking change to a route, response or event payload in the plan.
- Update OpenAPI specs, docs and in-repo clients when they exist.
- Use the project's logger with structured fields and a request id. Redact `authorization`, `cookie`, `password` and token fields.
- Log at boundaries, not in every function.

## Security scan (auth, uploads, URLs, shells, files)

- Hash passwords with argon2, bcrypt or scrypt. Use library crypto, never custom crypto.
- JWT: pin `algorithms`, check `exp`, `iss` and `aud`. Never use `decode` output for auth decisions.
- Session cookies: `HttpOnly`, `Secure`, `SameSite`. CORS: an explicit origin list. Never reflect `Origin` with credentials.
- User-supplied URL (SSRF): allowlist hosts, block private and link-local IPs, re-check every redirect.
- User-supplied path: resolve it against a fixed root and confirm the result stays inside.
- `child_process`: use `execFile` or `spawn` with an args array. Never `shell: true` with input.
- Never deep-merge untrusted objects. Reject `__proto__`, `constructor` and `prototype` keys.
- Rate-limit auth, OTP, password reset and expensive routes. Behind a proxy, set the exact trusted hop count.

## Tests

Only when the user chooses tests: read `references/testing.md`.

Sources: https://github.com/nodejs/Release/blob/main/schedule.json, https://nodejs.org/api/cli.html#--unhandled-rejectionsmode, https://nodejs.org/api/deprecations.html#DEP0169, https://github.com/nodejs/undici/blob/main/docs/docs/api/Client.md, https://owasp.org/API-Security/editions/2023/en/0x11-t10/, https://www.rfc-editor.org/rfc/rfc8725, https://portswigger.net/web-security/cors
