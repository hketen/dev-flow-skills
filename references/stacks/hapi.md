# hapi rules

Applies on top of `references/backend.md`. The project's own instruction files and conventions win. Checked against official docs on 2026-10-16; installed versions and bundled docs beat this file.

## Check first
- `frameworks.hapi` or `frameworks["@hapi/hapi"]`: the major decides the API. `hapi` (unscoped) exists up to 18.1; `@hapi/hapi` is the current name.
- Code style confirms it: `reply(x)` means ≤16; `return x` or `h.response(x)` means 17+.
- Read the entry file, one plugin, one route file and one `ext` hook before you edit.

## Version traps
| Version | Trap | Do |
|---|---|---|
| ≤16 vs 17+ | Server: `new Server()` + `server.connection({ port, labels })` became `new Server({ port, host })`. No labels, no `select()`. | Write the style of the installed major only. |
| ≤16 vs 17+ | Plugin: `exports.register = (server, opts, next)` + `.attributes` became `{ name, register: async (server, opts) => {} }`. | `await server.register(...)` on 17+. |
| ≤16 vs 17+ | Handler `(request, reply)` + `reply(x)` became `async (request, h)` + `return x`. Ext hooks return `h.continue`. | Never mix the two styles in one file. |
| ≤16 vs 17+ | Errors: `reply(Boom.x())` became `throw Boom.x()`. Boom 7+ has no `Boom.create`/`Boom.wrap`. | Use `Boom.boomify(err)` to wrap. |
| ≤16 vs 17+ | `server.decorate('reply', ...)` became `'toolkit'`; route `config` became `options`; `request.id` became `request.info.id`. | Use the 17+ names on 17+. |
| 17+ | Domain protection removed: a throw in a callback, emitter or timer exits the process. | `util.promisify` callback APIs and `await` them inside the handler. |
| 19+ | No default Joi compiler. Bare-object schemas fail. | Call `server.validator(Joi)` or wrap with `Joi.object()`. |
| 19+ | `payload.multipart` defaults to `false`; empty response is `204`. | Enable multipart per route; expect 204 in tests. |

## Rules
- ≤16: `reply()` does not stop execution. Write `return reply(x)` and answer exactly once.
- Upgrading 16 to 17+ rewrites every handler, hook and plugin. Do it only as its own planned task.
- Validate `payload`, `query` and `params` with route `validate` if the project uses Joi. Adding Joi is a dependency decision: ask the user.
- Never pass `request.payload` or `request.query` objects straight into a DB query or model constructor. Cast to primitives first.
- Do not copy `failAction: 'ignore'` into new routes. It hides bad input.
- Keep `cors.origin` an explicit list. Do not widen it.
- Reuse the project's error helpers and error shape. Do not add a second one.
- No `*Sync` file or crypto calls on a request path.
- Old dependency trees may not install on a new Node. Report the error; do not upgrade dependencies to make it start.

## Verify
- Test through `server.inject()`: callback form on ≤16, `await server.inject(opts)` on 17+.
- Build the server without `start()`, seeding or cron in tests. If one `init()` does all of it, plan a small extraction first.
- Use a local or in-memory database; mock only external APIs.

Sources: https://github.com/hapijs/hapi/issues/3658, https://github.com/hapijs/hapi/issues/4017, https://github.com/hapijs/hapi/blob/master/API.md, https://github.com/hapijs/boom/blob/master/API.md
