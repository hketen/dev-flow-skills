# Tailwind CSS and shadcn/ui rules

Applies on top of `references/frontend.md`. The project's own instruction files and conventions win. Checked against official docs on 2026-10-16; installed versions and bundled docs beat this file.

## Check first

- Read `versions.tailwindcss`. v3 and v4 need different config and class names.
- v4: find the main CSS file (`@import "tailwindcss"`, `@theme`). v3: read `tailwind.config.*`.
- shadcn: read `components.json` (`style`, `tailwind.css`, `aliases`, `rsc`). Read an existing `components/ui/*` file for its primitive imports.

## Version traps

| Version | Trap | Do |
|---|---|---|
| v4 | `@tailwind base/components/utilities` replaced | Use `@import "tailwindcss"` |
| v4 | JS config not auto-loaded | Put tokens in CSS `@theme`; do not create `tailwind.config.js`; legacy config needs `@config` |
| v4 | PostCSS and Vite plugins moved | Use `@tailwindcss/postcss` or `@tailwindcss/vite` |
| v4 | Scale renamed: `shadow-sm`→`shadow-xs`, `shadow`→`shadow-sm`, same for `rounded`, `blur`, `drop-shadow` | Use v4 names |
| v4 | `outline-none`→`outline-hidden`; `ring` is 1px | Use `ring-3` for the old ring |
| v4 | `border-*`, `divide-*`, `ring` default to `currentColor` | Always set a border/ring color |
| v4 | `bg-opacity-*`, `text-opacity-*` removed | Use `bg-black/50` |
| v4 | Important `!` moves to the end | Write `bg-red-500!` |
| v4 | `hover:` applies only on hover-capable devices; buttons use `cursor: default` | Do not rely on hover for touch |
| v4 | Sass, Less, Stylus unsupported; CSS modules / Vue `<style>` lack theme | Use `@reference "<main.css>"` before `@apply` |
| v4 | Needs Safari 16.4+, Chrome 111+, Firefox 128+ | Stay on v3.4 if older browsers are required |
| shadcn, Tailwind v4 | Components target React 19: no `forwardRef`, `data-slot`, OKLCH, `@theme inline` | Do not paste v3-era components |
| shadcn, Jul 2026 | `init` defaults to Base UI; Radix via `-b radix` | Match the primitive library already in use |

## Rules

- Add components with the CLI: `npx shadcn@latest add <name>`. Use `--dry-run` or `--diff` to preview.
- Edit the copied file in `components/ui/`. You own it. Do not wrap it in a second component for small changes.
- Base UI uses `render`; Radix uses `asChild`. Check imports (`@base-ui/react` vs `radix-ui` / `@radix-ui/*`) first.
- Do not mix Base UI and Radix versions of the same component.
- Do not edit `style` or `cssVariables` in `components.json`; they are fixed after init. Change `baseColor` only via `npx shadcn@latest migrate base-color`.
- Use theme tokens (`bg-background`, `text-primary`). Do not hard-code colors that tokens cover.
- Merge classes with the project's `cn()` helper.
- Do not build class names from string pieces (`bg-${color}-500`). The scanner cannot see them.
- Upgrade v3→v4 with `npx @tailwindcss/upgrade` on a clean branch. It needs Node 20+.

## Verify

- Run the dev server. Open changed screens with the browser tool in light, dark and narrow widths.
- Check focus rings and borders after any v4 change.

Sources: https://tailwindcss.com/docs/upgrade-guide, https://ui.shadcn.com/docs/tailwind-v4, https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default, https://ui.shadcn.com/docs/cli, https://ui.shadcn.com/docs/components-json
