# Design rules

Applies only when the task makes visual decisions: new screen, restyle, landing page, new component look. Logic changes inside an existing UI skip this file.

1. Existing design system wins. If detect shows `ui` libs, or the repo has `components.json` (shadcn), tokens, a theme file or CSS variables, extend them: reuse tokens, components, spacing and type scale. Stop here.
2. No system, and the user gave a visual brief: the brief's own words win over every default below.
3. No system, no brief: read `references/design/frontend-design.md` and follow it (token plan in at most 8 lines, review it against generic defaults, then build).
4. Read `references/design/minimalist-ui.md` instead only when the user asks for minimal, editorial, clean or Notion-like. It conflicts with the frontend-design defaults (warm off-white plus serif). Do not mix them.
5. Quality floor either way: visible keyboard focus, contrast, responsive down to mobile, reduced motion respected.
6. Look at the result. Screenshot with the browser tool when available and fix what you see before reporting.
