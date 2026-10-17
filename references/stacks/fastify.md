# Fastify rules

Applies on top of `references/backend.md`. The project's own instruction files and conventions win. Checked against official docs on 2026-10-16; installed versions and bundled docs beat this file.

## Check first
- `frameworks.fastify`: the resolved major decides the table below.
- Open `references/stacks/fastify/INDEX.md`. Read only the rule files your task needs (plugins, schemas, hooks, testing, ...).
- `@fastify/*` plugin majors must match the Fastify major. Check their peer ranges before you add one.

## Version traps
| Version | Trap | Do |
|---|---|---|
| 5.x | Shorthand schemas fail; `jsonShortHand` removed. | Write full JSON Schema: `type: 'object'`, `properties`, `required` for body, querystring, params, response. |
| 5.x | `listen(port)` removed. | Call `listen({ port, host })`. Use `host: '0.0.0.0'` in containers. |
| 5.x | A plugin that is `async` and also calls `done` fails. | Use `async (app, opts) => {}` or `(app, opts, done) => { done() }`, never both. |
| 5.x | `reply.redirect(code, url)` order changed. | Call `reply.redirect(url, code)`. |
| 5.x | `logger` no longer takes a logger instance. | Pass a custom pino instance as `loggerInstance`. |
| 5.x | Removed: `request.connection`, `reply.getResponseTime()`, `request.routeConfig`/`routeSchema`/`routerPath`, route `version` option. | Use `request.socket`, `reply.elapsedTime`, `request.routeOptions.*`, `constraints`. |
| 5.x | `decorateRequest` with an object or array is rejected (shared across requests). | Decorate with `null` and set it in an `onRequest` hook, or use a getter. |
| 5.x | `req.hostname` has no port; `req.params` has no prototype; semicolon query delimiter off. | Use `req.host`/`req.port`; use `Object.hasOwn`. |
| 5.x | Requires Node 20+. | Check `node.pin` before you upgrade. |
| 5.x | Type providers split validator and serializer types. | Upgrade `@fastify/type-provider-*` with Fastify. |

## Rules
- Return the payload from `async` handlers, or call `reply.send()` and `return reply`. Never do both.
- Encapsulation is real: wrap shared decorators and hooks with `fastify-plugin`, or child contexts cannot see them.
- Add a `response` schema to every route. It strips extra fields and blocks accidental data leaks.
- Set `bodyLimit` for routes that accept uploads or large JSON; keep the default elsewhere.
- Register `@fastify/helmet`, `@fastify/cors`, `@fastify/rate-limit` with explicit options. No `origin: true` with credentials.
- Set `trustProxy` to the hop count or proxy address, not `true`, when you rate-limit by IP.

## Verify
- Test with `app.inject()` after `await app.ready()`. Do not open a port.
- Close the app in test teardown with `await app.close()`.

Sources: https://fastify.dev/docs/latest/Guides/Migration-Guide-V5/, https://fastify.dev/docs/latest/Reference/Server/, https://fastify.dev/docs/latest/Reference/Routes/, https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/, https://fastify.dev/docs/latest/Guides/Testing/
