# Next.js rules

Applies on top of `references/frontend.md` and `references/stacks/react.md`. The project's own instruction files and conventions win. Checked against official docs on 2026-10-16; installed versions and bundled docs beat this file.

## Check first

- 16.2+: read the relevant guide in `node_modules/next/dist/docs/` before you write code. ≤16.1: read `.next-docs/` if present.
- Keep the `<!-- BEGIN:nextjs-agent-rules -->` block in `AGENTS.md`. `next dev` re-adds it. Commit it.
- Read `next.router`, `next.interceptor`, `next.cacheComponents`, `next.reactCompiler` from detect.

## Version traps

| Version | Trap | Do |
|---|---|---|
| 15+ | `cookies()`, `headers()`, `draftMode()`, `params`, `searchParams` are Promises | `await` them; 16 removes sync access |
| 15+ | `fetch` and GET route handlers are not cached | Opt in: `cache: 'force-cache'`, `dynamic = 'force-static'` |
| 16+ | `middleware.ts` deprecated | Write `proxy.ts` exporting `proxy` (Node runtime), at root or `src/`; ≤15 use `middleware.ts` |
| 16+ | `revalidateTag(tag)` deprecated | `revalidateTag(tag, 'max')`; in Server Actions use `updateTag(tag)` for read-your-writes; no tags on the data: `revalidatePath(path)` |
| 16+ | `cacheComponents: true` replaces `experimental.ppr` / `dynamicIO` | If on: `'use cache'` + `cacheLife`/`cacheTag`; request data inside `<Suspense>`; no `runtime` export |
| 16+ | `next lint` removed; `next build` does not lint | Run ESLint or Biome directly |
| 16+ | Turbopack is default for dev and build | Custom `webpack` config needs `--webpack` |
| 16+ | Parallel route slots without `default.js` fail the build | Add `default.js` returning `null` or `notFound()` |
| 16+ | `images.domains` deprecated; `quality` coerced to `images.qualities` (default `[75]`) | Use `images.remotePatterns`; list extra qualities |
| 16+ | `serverRuntimeConfig`, `publicRuntimeConfig`, AMP removed | Use env vars |
| 16.x (current docs) | `runtime = 'edge'` deprecated | Do not add it; Node is the default runtime |

## Rules

- Treat every Server Action as a public POST endpoint. In each one: validate input, authenticate, authorize the specific resource.
- Never make proxy or middleware the only auth check. Check again in the DAL, page or action.
- Put DB and secret access in a Data Access Layer. Start each DAL file with `import 'server-only'`. Only the DAL reads `process.env`.
- Pass minimal, serializable DTOs to Client Components. Never pass whole DB rows.
- Never put secrets in `NEXT_PUBLIC_*`. They are inlined at `next build`.
- Put `'use client'` on the leaf that needs interactivity, not on layouts.
- Give every `<Image>` `width`/`height`, or `fill` with `sizes`.
- RSC in use: check `next` and `react-server-dom-*` against current React and Next security advisories. Report a version below the patched line.
- Use `PageProps<'/route'>` and `LayoutProps<'/route'>` types when the installed version has them.

## Verify

- `next dev` writes `.next/dev/lock`. If a server runs, reuse its URL. Do not start a second one.
- Open changed routes with the browser tool. Check console, hydration warnings, and the `next dev` terminal.
- Run `next build` only when no other build runs. It must not need production secrets or remote DBs.

Sources: https://nextjs.org/docs/app/guides/ai-agents, https://nextjs.org/blog/next-16, https://nextjs.org/docs/app/guides/upgrading/version-15, https://nextjs.org/docs/app/api-reference/file-conventions/proxy, https://nextjs.org/docs/app/guides/data-security, https://nextjs.org/docs/app/guides/authentication, https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents, https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config/runtime, https://nextjs.org/docs/app/guides/environment-variables, https://react.dev/blog/2025/12/03/critical-security-vulnerability-in-react-server-components
