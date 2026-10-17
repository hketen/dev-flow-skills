# Payload CMS rules

Applies on top of `references/backend.md` and `references/frontend.md`. The project's own instruction files and conventions win. Checked against official docs on 2026-10-16; installed versions and bundled docs beat this file.

## Check first
- `frameworks.payload` major. Payload 3 is stable; Payload 4 is beta (`4.0.0-beta.*`) as of this date.
- `payload.config.ts`: DB adapter (`db-mongodb`, `db-postgres`, `db-sqlite`), `migrationDir`, `prodMigrations`, `typescript.outputFile`.
- `package.json` scripts: `payload`, `generate:types`, `generate:importmap`. Use them instead of global CLIs.

## Version traps
| Version | Trap | Do |
|---|---|---|
| 3.x | Local API skips all access control by default, even when you pass `user` | For user-driven calls pass `overrideAccess: false` and `user` (or `req`) |
| 4.x | Default flips to `overrideAccess: false`, also for `payload.jobs.*` | Trusted scripts, seeds and cron jobs need explicit `overrideAccess: true` |
| 3 to 4 | Silent behaviour change; no type error | Run `npx @payloadcms/codemod upgrade` only on request; review each inserted `true` |

## Rules
- Write the `overrideAccess` value explicitly on every Local API call. Then the code is correct on 3 and 4.
- Define `access` on every collection. The default allows any logged-in user, from any auth collection.
- Field-level access returns a boolean only. Collection `read`/`update`/`delete` may return a `Where` query.
- Access functions also run without a document for the admin UI. Check `id`, `data`, `doc` for `undefined`.
- In hooks, pass `req` to nested Local API calls so they join the request transaction.
- Do not pass `req` to a call you do not `await`. A failure then returns OK for rolled-back data.
- MongoDB transactions need a replica set. SQLite transactions are off unless `transactionOptions: {}` is set.
- Do not edit `payload-types.ts` or the admin `importMap.js`. Run `payload generate:types` and `payload generate:importmap` after config changes.
- Postgres/SQLite: dev uses push mode. Do not mix push and migrations on the same database.
- Create schema migrations with `payload migrate:create <name>` and review the SQL. Never edit a migration that already ran elsewhere.
- Get the client with `getPayload({ config })` from `payload` in server code only.

## Verify
- `payload generate:types`, then `tsc --noEmit` and the project's test script.
- Run `payload migrate:status` and `payload migrate` against a local database only.
- Test access as two users: one owner, one other. The other user must get no data.
- Never run migrate commands with a production `DATABASE_URL`/`DATABASE_URI`.

Sources: https://payloadcms.com/docs/local-api/access-control, https://github.com/payloadcms/payload/pull/17869, https://github.com/payloadcms/payload/releases, https://payloadcms.com/docs/access-control/overview, https://payloadcms.com/docs/access-control/fields, https://payloadcms.com/docs/database/transactions, https://payloadcms.com/docs/database/migrations, https://payloadcms.com/docs/typescript/generating-types, https://payloadcms.com/docs/custom-components/overview
