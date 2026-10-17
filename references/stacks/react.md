# React rules

Applies on top of `references/frontend.md`. The project's own instruction files and conventions win. Checked against official docs on 2026-10-16; installed versions and bundled docs beat this file.

## Check first

- Read `versions.react`. Write only APIs that exist in that major.
- Compiler on? Look for `next.reactCompiler`, `babel-plugin-react-compiler`, or `reactCompilerPreset` in the Vite config.
- Read `versions` for `zod`, query and store libraries before you use their APIs.
- Electron: render the UI in a browser via its dev script. Do not run packaging scripts.

## Version traps

| Version | Trap | Do |
|---|---|---|
| ≤17 | No `createRoot` | Use `ReactDOM.render` |
| 18+ | `ReactDOM.render` runs in legacy mode | Use `createRoot` / `hydrateRoot` |
| 18+ | StrictMode remounts components in dev | Clean up effects; do not "fix" double calls |
| 19+ | `propTypes`, function `defaultProps` silently ignored | Use TS types and default parameters |
| 19+ | Removed: `ReactDOM.render/hydrate`, `unmountComponentAtNode`, `findDOMNode`, string refs, legacy context, `react-dom/test-utils` | Use `createRoot`, ref objects, `createContext`; import `act` from `react` |
| 19+ | `ref` is a regular prop | Do not add `forwardRef` to new components |
| 19+ | `useFormState` deprecated | Use `useActionState(action, initialState)`; action is `(previousState, payload)` |
| 19.2+ | `useEffectEvent` exists | Use it for non-reactive effect logic; do not silence `exhaustive-deps` |
| 19.3+ | `use(browser())` exists | Use it inside Suspense for browser-only UI, not a `mounted` state |

## Rules

- Do not call `setState` synchronously in an effect. Derive in render, move logic to the event handler, or change `key`.
- Do not fetch in `useEffect` when the project has a data layer.
- eslint-plugin-react-hooks 7+: `recommended` enables compiler rules (`set-state-in-effect`, `refs`, `purity`, `immutability`). Fix violations. Do not disable rules.
- React Compiler on: do not add new `useMemo`, `useCallback` or `memo`. Keep existing ones.
- React Compiler on: use `useWatch({ control, name })`, not react-hook-form `watch()`. An `incompatible-library` warning means the component is not optimized.
- TanStack Query 5: one object argument, `gcTime`, `isPending`, `placeholderData: keepPreviousData`. Queries have no `onSuccess`/`onError`.
- Zustand 5: wrap selectors that return a new object or array in `useShallow`. Else: infinite render loop.
- Redux Toolkit 2: use the builder callback for `extraReducers` and `createReducer`.
- Zod 4 with react-hook-form: use `@hookform/resolvers` 5.1+. Let types infer from the schema. Use `{ error }`, not `{ message }`. `.default()` takes an output value.
- Never scaffold Create React App. It is deprecated. Use Vite or a framework.
- Vite 8: write `build.rolldownOptions`, not `rollupOptions`. Check CJS default imports. Default target is Safari 16.4 / Chrome 111.
- Only `VITE_*` vars reach the client, and they are public.

## Verify

- Run the project's typecheck, lint and `vitest run` scripts. Open the page with the browser tool; check the console.

Sources: https://react.dev/blog/2024/04/25/react-19-upgrade-guide, https://react.dev/blog/2022/03/08/react-18-upgrade-guide, https://react.dev/reference/react/useActionState, https://react.dev/blog/2026/09/09/react-19-3, https://react.dev/reference/eslint-plugin-react-hooks, https://react.dev/blog/2025/10/07/react-compiler-1, https://tanstack.com/query/latest/docs/framework/react/guides/migrating-to-v5, https://zustand.docs.pmnd.rs/reference/migrations/migrating-to-v5, https://redux-toolkit.js.org/usage/migrating-rtk-2, https://zod.dev/v4/changelog, https://github.com/react-hook-form/resolvers/releases/tag/v5.1.0, https://react.dev/blog/2025/02/14/sunsetting-create-react-app, https://vite.dev/guide/migration
