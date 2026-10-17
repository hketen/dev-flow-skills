# Prisma rules

Applies on top of `references/backend.md`. The project's own instruction files and conventions win. Checked against official docs on 2026-10-16; installed versions and bundled docs beat this file.

## Check first
- `versions.prisma` and the generator in `schema.prisma`: `prisma-client-js` = v6 style; `prisma-client` + `output` = v7; `// use prisma-8` or `@prisma/orm-postgres` = v8.
- `prisma.config.ts` and `package.json` scripts give the schema path, migrations folder and DB URL.
- Run the repo binary (`npx prisma`, `pnpm prisma`). It runs the installed major.

## Version traps
| Version | Trap | Do |
|---|---|---|
| npm `latest` (Oct 2026) | `prisma@latest` installs v8 RC, a different query API (`db.orm.public.User.where(...).all()`). v7 is `prisma@prev`. | Never run `npx prisma@latest` or unpinned `npm i prisma`. Pin `prisma@7` and `@prisma/client@7` unless the repo is on v8. |
| 6 | Client generates into `node_modules`; `migrate dev` runs `generate` and seed. | Import `@prisma/client`. Do not add v7 config to a v6 repo. |
| 7 | `prisma-client` generator requires `output`. | Import from the generated path, never from `@prisma/client`. |
| 7 | Every client needs a driver adapter. Pool settings come from the driver: `pg` has no connect timeout (v6: 5 s). | Write `new PrismaClient({ adapter })`. Set pool size and timeouts on the adapter. |
| 7 | DB URLs move to `prisma.config.ts`; the CLI migrates with `datasource.url`. The CLI does not load `.env`. | Put the direct (unpooled) URL in `url`. Load env in the config (`import "dotenv/config"`). |
| 7 | ESM only. Node ≥ 20.19, TypeScript ≥ 5.4. MongoDB is not supported. | Keep ESM config. Keep MongoDB projects on v6. |
| 7 | `migrate dev` runs no `generate` and no seed. `$use` middleware is removed. | Run `prisma generate` and `prisma db seed` yourself. Use `$extends`. |
| 7 | The `pg` adapter rejects invalid TLS certificates (P1010). | Configure the CA. Ask before you set `rejectUnauthorized: false`. |
| 8 RC | A schema file without `// use prisma-8` is skipped with no warning. | Start every v8 schema file with that line. |

## Rules
- Never edit generated client files. Change the schema, then run `prisma generate`.
- Interactive `$transaction` defaults: `timeout` 5000 ms, `maxWait` 2000 ms (P2028 when exceeded). Never call HTTP, mail, payment or queue code inside it.
- Inside `$transaction(async (tx) => ...)`, send every query through `tx`, not the outer client.
- A field rename generates DROP + ADD and loses data. Use `migrate dev --create-only`, then edit the SQL to `RENAME` or split into expand/contract steps.
- Put `CREATE INDEX CONCURRENTLY` alone, on one line, in its own migration. Multi-statement files run in one transaction and fail.
- Edit a migration only before any database applies it. After that, add a new migration. `migrate deploy` warns on modified files.
- `migrate dev`, `migrate reset` and `db push` are for a local database only. They can reset schemas and drop data.
- Deploy pipelines apply migrations with `migrate deploy` only.
- Do not use `db push` in a repo that has a migrations folder. It creates drift, and `migrate dev` then asks to reset.

## Verify
- `prisma validate`, then `prisma generate`, then the type-check.
- Check `DATABASE_URL` points to localhost or a test container before any migrate command.
- Create the migration with `migrate dev --create-only` on the local DB. Read the SQL for DROP, RENAME and table locks.
- `prisma migrate status` on the local DB shows pending or failed migrations.

Sources: https://www.prisma.io/changelog/2026-10-02, https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7, https://www.prisma.io/docs/orm/v7/prisma-client/queries/transactions, https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/development-and-production, https://github.com/prisma/orm/issues/22922
