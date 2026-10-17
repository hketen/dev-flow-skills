# React Router and TanStack Start rules

Applies on top of `references/frontend.md`. The project's own instruction files and conventions win. Checked against official docs on 2026-10-16; installed versions and bundled docs beat this file.

## Check first
- `frameworks` and `versions`: `react-router` major, `@react-router/dev`, legacy `@remix-run/*`, `@tanstack/react-start`.
- Mode: `react-router.config.ts` plus `app/routes.ts` means framework mode. `createBrowserRouter` alone means data mode.
- TanStack Start: read `src/start.ts` (middleware) and the skills shipped in `node_modules/@tanstack/*` if present.

## Version traps
| Version | Trap | Do |
|---|---|---|
| Remix v2 | React Router 7 is the next Remix major | Import from `react-router`; `@remix-run/react` and `@remix-run/server-runtime` map to it |
| RR 7.0+ | `json()` and `defer()` are removed | Return plain objects or raw promises; use `data()` for status and headers |
| RR 7.x | Middleware needs `future.v8_middleware` | Check the flag before you write `middleware` exports |
| RR 8.0+ | `react-router-dom` is removed; ESM only | Import `RouterProvider`/`HydratedRouter` from `react-router/dom`, all else from `react-router` |
| RR 8.0+ | Middleware always on; `context` is a `RouterContextProvider` | `getLoadContext` must return a `RouterContextProvider`, not a plain object |
| RR 8.0+ | `meta` args lose `data` | Use `loaderData` in `meta` and `matches` |
| RR 8.0+ | Floor: Node 22.22, React 19.2.7, Vite 7 | Do not add code that needs older runtimes |
| RR 8.0+ | `@react-router/dev/vite/cloudflare` removed | Use `@cloudflare/vite-plugin` |
| RR 7.9+ | RSC framework mode is `unstable_` | Do not adopt it unless the project already uses it |
| Start, June 2026+ | `inputValidator()` is deprecated | Use `.validator()` on `createServerFn` and middleware |

## Rules
- Type route modules with `import type { Route } from "./+types/<file>"`. Run `react-router typegen` after route changes.
- Do not edit or commit `.react-router/`; it is generated.
- Everything a `loader` returns goes to the browser. Return only fields the page needs.
- Put secrets and DB code in `*.server.ts` files. Never name a route module `.server` or `.client`.
- Check authorization in every `action` and `loader`, or in route middleware that covers them.
- RSC server functions (unstable) are public endpoints. Each one does its own access checks.
- TanStack Start: every `createServerFn` is an HTTP endpoint. Validate input with `.validator(schema)` and check the session inside the handler.
- Start installs CSRF middleware only when `src/start.ts` is absent. If the file exists, add `createCsrfMiddleware()` explicitly.
- Start: keep DB helpers in `*.server.ts`; import server functions statically, never with dynamic `import()`.
- Use `createIsomorphicFn` for code that differs between server and browser.

## Verify
- `react-router typegen && tsc`, then the project's test script.
- Exercise actions with the dev server and a local or test database only.
- For a server function, test one call with invalid input and one without a session. Both must fail.

Sources: https://reactrouter.com/changelog, https://reactrouter.com/upgrading/remix, https://reactrouter.com/explanation/type-safety, https://reactrouter.com/api/framework-conventions/server-modules, https://tanstack.com/start/latest/docs/framework/react/guide/server-functions, https://tanstack.com/blog/tanstack-start-1-0, https://github.com/TanStack/router/pull/7566
