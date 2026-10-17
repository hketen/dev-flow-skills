# Express / Koa rules

Applies on top of `references/backend.md`. The project's own instruction files and conventions win. Checked against official docs on 2026-10-16; installed versions and bundled docs beat this file.

## Check first
- `frameworks.express` or `frameworks.koa`: the resolved major decides every row below.
- Express 5 upgrade: run `npx codemod@latest @expressjs/v5-migration-recipe` only when the user approves it.

## Version traps
| Version | Trap | Do |
|---|---|---|
| Express 4 | Rejected promises in handlers do not reach the error middleware. | Wrap async handlers (`try/catch` + `next(err)`) or keep the project's wrapper. |
| Express 5 | Rejected promises go to the error middleware. | Drop new `asyncHandler`/`express-async-errors` wrappers. |
| Express 5 | path-to-regexp v8: `/*` and `?` fail at boot; regex chars are reserved in string paths. | Write `/*splat` (`/{*splat}` to match root too) and `/:file{.:ext}`. |
| Express 5 | `req.params.splat` is an array; unmatched params are absent; `req.params` has no prototype. | Join the array; use `Object.hasOwn`. |
| Express 5 | Removed: `app.del`, `req.param()`, `res.send(status)`, `res.json(obj, status)`, `res.redirect(url, status)`, `'back'`, `res.sendfile`, singular `req.accepts*`. | Write `res.status(n).json(x)`, `res.sendStatus(n)`, `res.redirect(n, url)`, `req.get('Referrer') \|\| '/'`. |
| Express 5 | `req.query` is a getter. Writes are lost. Default parser is `simple` (no `a[b]=1`). | Parse into a new variable. Set `query parser` to `extended` only for nested queries. |
| Express 5 | `req.body` is `undefined` without a parser. `urlencoded` `extended` defaults to `false`. | Mount `express.json({ limit })` before routes; guard `req.body`. |
| Express 5 | `express.static` ignores dot-directories (`.well-known` gives 404). | Mount that path with `dotfiles: 'allow'`. |
| Express 5 | `app.listen` passes bind errors to the callback. | Check the callback `error` argument. |
| Express 5 | `express-mongo-sanitize` assigns `req.query` and throws or does nothing. | Do not add it; validate input and use Mongoose `sanitizeFilter`. |
| Koa 3 | `ctx.throw(status, message, props)` changed to `ctx.throw(status, error, props)`. | Pass an `Error` or `http-errors` object. |
| Koa 3 | Generator middleware and `redirect('back')` removed; query uses `URLSearchParams`. | Use `async (ctx, next)`, `ctx.back()`, `getAll()` for repeated keys. |

## Rules
- Error middleware has 4 arguments `(err, req, res, next)` in Express 4 and 5. Keep all 4 or Express treats it as normal middleware.
- In the error handler, call `next(err)` when `res.headersSent` is true.
- Mount the error handler after all routes. Log the real error; send a generic 500 body.
- Set `trust proxy` to the exact hop count or proxy subnet. Never `true` with IP rate limits.
- Pass callback and timer errors to `next(err)` yourself in both versions.
- Validate `req.body`, `req.query`, `req.params` at the route. Never spread them into DB queries.
- Koa: `await next()` in every middleware that passes control. Keep request data in `ctx.state`.
- Express 4: check advisories for `path-to-regexp` and `express`. Avoid two params in one segment (`/:a-:b`).

## Verify
- Test routes in-process with `supertest(app)` when it is installed; do not call `listen` on a real port.
- When you change error handling, test the failure mode you changed (a throw or a rejection).

Sources: https://expressjs.com/en/guide/migrating-5/, https://expressjs.com/en/guide/error-handling/, https://expressjs.com/en/guide/behind-proxies/, https://github.com/fiznool/express-mongo-sanitize/issues/202, https://github.com/advisories/GHSA-9wv6-86v2-598j, https://github.com/koajs/koa/blob/master/docs/migration-v2-to-v3.md
