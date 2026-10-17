# Frontend rules

The project's own instruction files and conventions win. Checked against official docs on 2026-10-16; installed versions and bundled docs beat this file.

## Check first

- Read the installed version from `node_modules/<pkg>/package.json`, not from memory or the `package.json` range.
- Read every path in detect `bundledDocs` before you write framework code. Bundled docs match the installed version.
- Read the stack file for each detected framework (`references/stacks/*.md`).
- Read nearby components for: routing, styling system, data layer, forms, i18n. Reuse them.
- Add a dependency only when nothing equivalent exists. List it in the plan.

## Components

- Keep components small, typed, one job.
- Derive values during render. Do not copy props into state. Do not sync state with effects.
- Use effects only for external systems (subscriptions, DOM APIs, timers). Clean them up.
- Give dynamic lists stable keys. Do not use the index when order can change.

## Data and state

- Use the project's data layer (query library, loaders, server components). Do not fetch in render.
- Show loading, error and empty states. Ignore or cancel stale responses.
- Keep state local. Put filters, sort, pagination and tab in the URL. Use a global store only for shared state.
- Keep the server/client boundary explicit. Put the client marker (for example `'use client'`) as low in the tree as possible.

## Secrets and env

- `NEXT_PUBLIC_*`, `VITE_*` and `PUBLIC_*` values are inlined into client bundles at build time. Anyone can read them.
- Never put a key, token or password in a public-prefixed variable. Never widen the prefix (for example `envPrefix: ''`).
- Public values freeze at build. A reused image or promoted build keeps the old values.
- Never import server-only modules or read server env vars in client code.

## Forms

- Use one schema source. Reuse the backend schema or shared types when the repo has them.
- Validate again on the server. Client validation is only for UX.
- Attach errors to their fields. Disable submit while pending. Keep user input on failure.

## Hydration-safe rendering (SSR, SSG, RSC)

- Server HTML and the first client render must match.
- Do not read `window`, `localStorage`, `Date.now()`, `Math.random()`, locale or timezone during render. Read them after mount.
- Do not branch render output on `typeof window`.
- Write valid HTML nesting: no `<div>` in `<p>`, no `<a>` in `<a>`, no `<button>` in `<button>`.
- Use `suppressHydrationWarning` only on one element with known-different text. It works one level deep.

## Accessibility floor: WCAG 2.2 AA

- Use native elements first (`button`, `a`, `label`, `dialog`). Do not make a `div` clickable.
- Give every input a programmatic label. Give images alt text. Do not use color alone to carry meaning.
- Keep focus visible and not hidden behind sticky headers or overlays.
- Keep tab order logical. Escape closes overlays. Return focus to the trigger.
- Make pointer targets at least 24×24 CSS px, or give them enough spacing.
- Give every drag action a single-pointer alternative.
- Do not ask users to solve puzzles or retype data to log in. Allow paste and password managers.
- Do not ask for data the user already entered in the same flow.
- Respect `prefers-reduced-motion`.

## Performance

- Keep INP at 200 ms or less. Keep event handlers short. Move non-urgent updates into a transition or after paint.
- Lazy-load heavy routes and components. Import specific modules, not whole libraries.
- Give images dimensions. Use the framework image and font components.
- Virtualize lists with more than a few hundred rows.

## Safety

- Do not render unsanitized HTML (`dangerouslySetInnerHTML`, `v-html`, `innerHTML`).
- Follow the project's auth and token storage pattern. Do not invent one.

## i18n and copy

- If the project has an i18n library, send every user-facing string through it.
- Write interface copy in the project's existing locale, not the chat language.

## Tests (only if chosen)

- Query by role, label and text (Testing Library, Playwright). Use test IDs last.
- Assert visible behavior. Do not snapshot markup.
- Do not use fixed waits. Use assertions that retry.
- Write E2E tests only for critical flows, and only when a runner exists.

## Verify the surface

- Reuse a running dev server if one exists. Do not start a second one.
- Open the page with the browser tool. Exercise the changed path.
- Check console errors, hydration warnings and a narrow viewport.
- A passing type-check or build is not UI verification.
- Never start a watcher in a blocking command (`vitest` without `run`, `--watch`).

Sources: https://vite.dev/guide/env-and-mode, https://nextjs.org/docs/app/guides/environment-variables, https://docs.astro.build/en/guides/environment-variables/, https://nextjs.org/docs/messages/react-hydration-error, https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/, https://web.dev/articles/inp, https://nextjs.org/docs/app/guides/authentication, https://playwright.dev/docs/best-practices
