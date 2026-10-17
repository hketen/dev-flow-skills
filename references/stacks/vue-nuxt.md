# Vue, Nuxt and Pinia rules

Applies on top of `references/frontend.md`. The project's own instruction files and conventions win. Checked against official docs on 2026-10-16; installed versions and bundled docs beat this file.

## Check first
- `frameworks`: `vue`, `nuxt`, `pinia` versions. Nuxt 5 is not released; a `5.x` or nightly pin is pre-release.
- `nuxt.config.ts`: `future.compatibilityVersion`, `experimental.*` flags, and `srcDir`. They change the defaults below.
- Layout: if `app/pages` or `app/app.vue` exists, app code lives in `app/`. A root `pages/` means the Nuxt 3 layout.

## Version traps
| Version | Trap | Do |
|---|---|---|
| Vue 3.5+ | Destructured `defineProps` values are reactive but `watch(count)` fails | Pass a getter: `watch(() => count)`, `useX(() => count)` |
| Vue 3.5+ | New APIs: `useTemplateRef`, `useId`, `onWatcherCleanup` | Use `useId()` for SSR-safe ids, not counters or `Math.random()` |
| Vue 3.6 (RC) | Vapor mode is opt-in per SFC (`<script setup vapor>`) | Do not add `vapor` unless the project uses it; no Options API there |
| Nuxt 4 | `srcDir` is `app/`; `~` points to `app/`; `server/`, `shared/`, `public/` stay at root | Create files in the right root |
| Nuxt 4 | Same `useAsyncData` key shares `data`, `error`, `status` | One key per data source; same key needs same options |
| Nuxt 4 | `data` is a `shallowRef` | Replace the whole value, or pass `deep: true` |
| Nuxt 4 | `data`/`error` default to `undefined`, not `null` | Check `=== undefined` or use `status` |
| Nuxt 4 | `immediate: false` never fetches on key change until first `execute()` | Call `execute()` or `refresh()` yourself |
| Nuxt 4 | `getCachedData(key, nuxtApp, ctx)` runs on every fetch | Read `ctx.cause` before you return cached data |
| Nuxt 4.6+ | `nuxt/server` helpers fail (`NUXT_E8012`) with h3's auto-imported handler | Import `defineEventHandler` and helpers from `nuxt/server` together |
| compat 5 | Nitro auto-imports off, case-sensitive routes, Options API compiled out | Import server helpers explicitly |

## Rules
- Use `import.meta.server` and `import.meta.client`, not `process.server`/`process.client`.
- Never export a module-level `ref()` for state. It leaks across requests on the server. Use `useState(key)` or Pinia.
- Keys under `runtimeConfig.public` reach the browser. Put secrets only in top-level `runtimeConfig`.
- Give `useAsyncData` an explicit stable key when the handler is not inline in one component.
- Validate input in every `server/api` handler; use `readValidatedBody` or `getValidatedQuery` with a schema.
- Pinia: destructure state and getters with `storeToRefs(store)`; destructure actions from the store directly.
- Pinia setup stores: return every state ref. Hidden or readonly state breaks SSR and devtools.
- Pinia: call `useXStore()` inside `setup`, a composable, or a Nuxt plugin, not at module top level.

## Verify
- `nuxi typecheck` (or `vue-tsc --noEmit`), then the project's test script.
- Check SSR output: load the page with JavaScript off, then with it on. Look for hydration warnings.
- Use mock or local APIs; never point `NUXT_PUBLIC_*` or `runtimeConfig` at production.

Sources: https://blog.vuejs.org/posts/vue-3-5, https://github.com/vuejs/core/releases/tag/v3.6.0-rc.1, https://nuxt.com/blog/v4, https://nuxt.com/docs/4.x/getting-started/upgrade, https://nuxt.com/docs/4.x/api/advanced/import-meta, https://nuxt.com/docs/4.x/getting-started/state-management, https://nuxt.com/docs/4.x/guide/going-further/runtime-config, https://pinia.vuejs.org/core-concepts/
