# Astro rules

Applies on top of `references/frontend.md`. The project's own instruction files and conventions win. Checked against official docs on 2026-10-16; installed versions and bundled docs beat this file.

## Check first
- `frameworks.astro` major (5, 6 or 7) and the UI integrations in `astro.config.*` (`@astrojs/react`, `vue`, `svelte`).
- Content: `src/content.config.ts` and its loaders. Markdown: `markdown.processor` in config.
- Server code: adapter in config, `src/middleware.ts`, `src/actions/`, `src/fetch.ts` (7+), `env.schema` for `astro:env`.

## Version traps
| Version | Trap | Do |
|---|---|---|
| 5+ | `output: 'hybrid'` is gone; `static` covers it | Add an adapter and `export const prerender = false` per route |
| 5+ | Content Layer: collections need a `loader` | `defineCollection({ loader: glob({...}), schema })` from `astro/loaders` |
| 5+ | `<ViewTransitions />` renamed | Use `<ClientRouter />` (6 removes the old name) |
| 6+ | Legacy collections removed; entry `id` is the slug | Use `entry.id`, `filePath`, `getEntry()`, `render(entry)` from `astro:content` |
| 6+ | `Astro.glob()` removed | Use `import.meta.glob()` (returns no Promise) or `getCollection()` |
| 6+ | Zod 4; `z` from `astro:content`/`astro:schema` deprecated | `import { z } from 'astro/zod'`; use `z.email()`, `z.url()` |
| 6+ | Node 22.12+ | Do not target older Node |
| 7+ | Rust compiler: no HTML auto-fix; unclosed tags and attributes error | Close every tag; quote every attribute |
| 7+ | `compressHTML: 'jsx'`: whitespace between inline tags is removed | Write `{' '}` where a space must render |
| 7+ | Markdown uses Sätteri; remark/rehype plugins ignored | Use `unified()` from `@astrojs/markdown-remark` for those plugins |
| 7+ | `src/fetch.ts` is reserved; `@astrojs/db` removed | Rename other `fetch.ts` files; use Drizzle or `node:sqlite` |

## Rules
- Ship zero JS by default. Add `client:*` only to components that need interactivity; prefer `client:visible` or `client:idle`.
- Pass only serializable props to hydrated islands. Props go to the browser; never pass secrets.
- Use `server:defer` for per-user or slow parts of a cached page, with a fallback slot.
- Only `PUBLIC_` env vars reach the browser. Prefer `astro:env` with `access: "secret"` for secrets.
- Actions are public endpoints at `/_actions/<name>`. Check the user inside each handler and validate with `input`.
- Pages that read cookies or request headers need an adapter and `prerender = false`.
- Use `<Image>`/`<Picture>` from `astro:assets` with width and height for local images.

## Verify
- `astro check`, then `astro build`; a build compiles every `.astro` file and catches strict-markup errors.
- Run `astro dev`, or `astro preview` after a build, and open changed pages.
- Content loaders must read local or mock data during verification, never a production CMS write token.

Sources: https://astro.build/blog/astro-5, https://docs.astro.build/en/guides/upgrade-to/v6/, https://astro.build/blog/astro-7/, https://docs.astro.build/en/guides/upgrade-to/v7/, https://docs.astro.build/en/guides/server-islands/, https://docs.astro.build/en/guides/environment-variables/, https://docs.astro.build/en/guides/actions/
