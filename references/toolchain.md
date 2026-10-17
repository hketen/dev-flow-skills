# Toolchain rules

The project's own instruction files and conventions win. Checked against official docs on 2026-10-16; installed versions and bundled docs beat this file.

## Check first

- Read `pm`, `pmPolicy`, `versions`, `tsconfig`, `lint`, `module` and `monorepo` from detect.
- Use repo scripts and local binaries. Never run `npx <tool>@latest` in an existing repo.

## Package manager

- Use only the detected package manager. Never create a second lockfile.
- CI and Docker use frozen installs: `npm ci`, `pnpm install --frozen-lockfile`, `yarn install --immutable`, `bun install --frozen-lockfile`.

## Adding a dependency

1. Check the standard library and installed deps first. Never add a dependency for a few lines.
2. Ask the user before you add one. Name the package, version and reason.
3. Verify on the registry: exact name (typosquats), maintainer, release date, downloads.
4. Add it in the package that imports it. Never import an undeclared package.
5. Keep the repo's range style. If a cooldown blocks the newest version, take the newest allowed one.

## Install-script gates and cooldowns

Never disable a gate globally. Approve only the one package that needs a native build, and tell the user.

| Version | Trap | Do |
|---|---|---|
| npm ≥12 | Dependency install scripts and implicit `node-gyp` builds do not run. Git and remote-tarball deps do not resolve. | Run `npm approve-scripts` for that package. Commit the allowlist in `package.json`. |
| npm | `min-release-age` in `.npmrc` hides new versions. | Keep it. Use `min-release-age-exclude` only for a user-approved urgent fix. |
| pnpm 10 | Dependency scripts are blocked. | Add the package to `onlyBuiltDependencies`. |
| pnpm ≥11 | `onlyBuiltDependencies` is removed. `.npmrc` holds auth and registry only. `minimumReleaseAge` defaults to 1 day. | Write `allowBuilds: { pkg: true }` and other settings in `pnpm-workspace.yaml`. |
| Bun | Scripts run only for `trustedDependencies`. A defined list replaces Bun's default list. | Re-list needed defaults when you add one. |

## TypeScript

| Version | Trap | Do |
|---|---|---|
| TS ≥6 | `strict` is on, `types` defaults to `[]`, `rootDir` defaults to the tsconfig folder. | Set `types` (e.g. `["node"]`) and `rootDir` explicitly. Output in `dist/src/` means `rootDir` is wrong. |
| TS ≥6 | `baseUrl` and `moduleResolution: node`/`node10` are deprecated. TS 7 rejects them. | Write `paths` relative to the tsconfig. Use `bundler` for bundled apps, `nodenext` for Node-run code. |
| TS 7 | No compiler API. typescript-eslint supports `<6.1`. Vue, Svelte, Astro, MDX and Angular templates need TS 6. | Keep TS 6 for tools: `"typescript": "npm:@typescript/typescript6"`. Ask before a TS 7 bump. |

- Never add `@ts-ignore`, `@ts-nocheck`, `as any`, or file-wide `eslint-disable` to go green. Fix the cause.
- Last resort: `// @ts-expect-error <reason>` on one line. Never weaken compiler flags.

## Node runtime

| Version | Trap | Do |
|---|---|---|
| ≥22.18 | `node file.ts` strips types. No type check. tsconfig and `paths` are ignored. `.tsx` fails. | Run `tsc --noEmit` separately. Write `.ts` extensions and `import type`. |
| ≥22.18 | Only erasable syntax runs: no `enum`, runtime `namespace`, parameter properties or decorators. Node 26 removed `--experimental-transform-types`. | Set `erasableSyntaxOnly` and `verbatimModuleSyntax`. Decorator code (Nest, TypeORM) needs tsc, SWC or tsx. |
| ≥20.19, ≥22.12 | `require(esm)` works. It throws `ERR_REQUIRE_ASYNC_MODULE` if the graph has top-level await. | No top-level await in modules that CJS may require. Match `module` from detect. |
| stable ≥22.21, ≥24.10 | `--env-file` and `--env-file-if-exists` are native. | Prefer them over adding dotenv. Keep dotenv if the repo uses it. |

## Lint and format

- ESLint 10 removed eslintrc: `.eslintrc*`, `.eslintignore` and `/* eslint-env */` fail. Write only `eslint.config.*`.
- ESLint 10 looks up config from each linted file's folder. Expect per-package configs in monorepos.
- Use the one linter and formatter in `lint`. Never add a second one or reformat untouched files.

## Monorepo

- Run tasks through the orchestrator or a filter: `pnpm --filter <pkg>`, `turbo run <task> --filter=<pkg>`, `nx run <proj>:<task>`.
- Reference internal packages with `workspace:*`. Use `catalog:` when the workspace defines catalogs.
- Turborepo strict env mode hides undeclared vars. Declare output-changing vars in `env`; secrets go in `passThroughEnv`.
- Keep the existing internal-package strategy: source export (just-in-time) or compiled `dist`.
- Nx upgrades: `nx migrate <version>`, then `nx migrate --run-migrations`. Never hand-edit across majors.
- With `.changeset/`, add a changeset. Never hand-bump versions.

## Publishing a library

- In each `exports` block put `types` first and `default` last. Run `publint` and `attw --pack .` before release.
- New libraries for Node ≥20.19: prefer ESM-only. Use tsdown, not tsup; tsup is unmaintained.
- Publish from CI with npm trusted publishing (OIDC, `id-token: write`). Never store an npm token.

Sources: https://github.blog/changelog/2026-07-08-npm-install-time-security-and-gat-bypass2fa-deprecation/, https://docs.npmjs.com/cli/v11/using-npm/config/, https://github.com/pnpm/pnpm/releases/tag/v10.0.0, https://pnpm.io/blog/releases/11.0, https://bun.com/docs/pm/lifecycle, https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/, https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/, https://typescript-eslint.io/users/dependency-versions/, https://nodejs.org/api/typescript.html, https://nodejs.org/api/modules.html, https://nodejs.org/api/cli.html, https://eslint.org/blog/2026/02/eslint-v10.0.0-released/, https://turborepo.dev/docs/crafting-your-repository/using-environment-variables, https://nx.dev/docs/guides/tips-n-tricks/advanced-update, https://pnpm.io/using-changesets, https://publint.dev/rules, https://github.com/egoist/tsup, https://docs.npmjs.com/trusted-publishers
