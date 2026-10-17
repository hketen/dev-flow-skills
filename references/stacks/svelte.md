# Svelte and SvelteKit rules

Applies on top of `references/frontend.md`. The project's own instruction files and conventions win. Checked against official docs on 2026-10-16; installed versions and bundled docs beat this file.

## Check first
- `frameworks`: `svelte` major (4 or 5) and `@sveltejs/kit` major (2 or 3).
- Kit 2 reads `svelte.config.js`. Kit 3 reads options from `sveltekit({...})` in `vite.config.*`.
- Runes mode: `compilerOptions.runes`, or runes already used in nearby components. Match the file you edit.
- Flags: `compilerOptions.experimental.async` and `experimental.remoteFunctions`.

## Version traps
| Version | Trap | Do |
|---|---|---|
| Svelte 5 | Runes replace `let` state, `$:`, `export let` | Use `$state`, `$derived`, `$effect`, `$props()` |
| Svelte 5 | `on:click` and `createEventDispatcher` are legacy | Use `onclick={...}` and callback props |
| Svelte 5 | Slots are legacy | Use snippets and `{@render children?.()}` |
| Svelte 5 | Components are not classes | Use `mount()`/`hydrate()`, not `new App()` |
| Svelte 5 | `await` in markup needs `experimental.async` | Check the flag first |
| Kit 3 | `svelte.config.js` is not supported | Put options in `sveltekit({...})` in `vite.config.*` |
| Kit 3 | `$lib` is gone | Use `#lib/x.js` from `package.json` `imports`, with file extensions |
| Kit 3 | `$app/stores` removed; `$app/environment` renamed | Use `$app/state` and `$app/env` |
| Kit 3 | `$env/*` deprecated | Use `$app/env/private` and `$app/env/public` |
| Kit 3 | `invalidateAll` deprecated; `json()`/`text()` deprecated | Use `refreshAll`, `Response.json()`, `new Response()` |
| Kit 3 | `error(status, msg)` takes a string only | Pass extra fields as a third argument |
| Kit 3 | `*.remote.ts` files need `experimental.remoteFunctions` | Do not add remote functions without the flag |
| Kit 3 | `csrf.checkOrigin` removed | Use `csrf.trustedOrigins` |
| Kit 3 | Floor: Node 22.17, TS 6, Svelte 5.57.1, Vite 8.0.12 | Do not lower them |

## Rules
- Prefer `$derived` to `$effect` for values computed from state. Use `$effect` only for side effects.
- Do not mix Svelte 4 syntax into a runes-mode component.
- Universal `load` (`+page.ts`) runs in the browser too. Put DB access and secrets in `+page.server.ts`.
- Put server-only code in `src/lib/server/` or `*.server.ts`. Import private env only there.
- Guard auth in `hooks.server.ts` or each `+page.server.ts` load. A guard in `+layout.server.ts` needs `await parent()` in every child.
- Treat each form action and remote function as a public endpoint: validate input and check the user inside it.
- Return `fail(status, data)` for invalid form input; never return secrets in action data.

## Verify
- `svelte-kit sync && svelte-check`, then the project's test script.
- Run `npx sv migrate` only when the user asks for an upgrade.
- Test actions against a local database; submit one invalid and one unauthenticated request.

Sources: https://svelte.dev/docs/svelte/v5-migration-guide, https://svelte.dev/docs/kit/migrating-to-sveltekit-3, https://github.com/sveltejs/kit/releases/tag/%40sveltejs/kit%403.0.0, https://svelte.dev/docs/kit/load, https://svelte.dev/docs/kit/server-only-modules, https://svelte.dev/docs/kit/form-actions
