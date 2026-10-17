# Drizzle rules

Applies on top of `references/backend.md`. The project's own instruction files and conventions win. Checked against official docs on 2026-10-16; installed versions and bundled docs beat this file.

## Check first
- `versions['drizzle-orm']`: 0.x or 1.x. On npm, `latest` is 0.45.x and 1.0 is on the `rc` tag.
- `drizzle.config.*`: `schema`, `dialect`, `out` (migrations folder, default `./drizzle`), `schemaFilter`.
- Find the repo workflow: migrations folder + `drizzle-kit migrate` or runtime `migrate()`, or `push` only. Keep it.

## Version traps
| Version | Trap | Do |
|---|---|---|
| 0.x | Relations use `relations()`; `drizzle(url, { schema })`; `db.query` takes callbacks: `where: (t, { eq }) => eq(t.id, 1)`. | Write callback `where`/`orderBy`. |
| 1.x | RQB v1 removed. `db.query` takes objects: `where: { id: 1 }`, `orderBy: { id: "asc" }`. Relations use `defineRelations()` and `drizzle(url, { relations })`. | Match the installed major. Old API is only at `db._query` and `drizzle-orm/_relations`. |
| 1.x | Migrations folder has no `meta/_journal.json`. Each migration is a folder with `migration.sql` and `snapshot.json`. | Convert old folders with `drizzle-kit up`. Never build the layout by hand. |
| 1.x | `push` and `pull` manage all DB schemas by default (0.x: `public` only). | Set `schemaFilter` when other tools own schemas in the same DB. |
| 1.x | `casing` on `drizzle()` replaced by `snakeCase.table`/`camelCase.table`. `getTableColumns` → `getColumns`. `.array().array()` → `.array("[][]")`. `drizzle-zod` etc. → `drizzle-orm/zod`. | Use the API of the installed major. |
| 1.x | The migrator applies every missing migration, not only newer ones. `generate` reports branch conflicts. | Run `drizzle-kit check` after you merge branches with migrations. |

## Rules
- Keep `drizzle-orm` and `drizzle-kit` on the same major and channel. Do not move to `@rc` or `@latest` unless the user asks.
- Repo with a migrations folder: change the schema, run `drizzle-kit generate`, read the SQL, commit both. Never `push` there.
- Use `push` only on a local, throwaway DB. Never pass `--force`: it accepts data-loss statements without a prompt.
- `generate` asks if a column was renamed or replaced. A wrong answer generates DROP + ADD and loses data.
- Write data backfills and triggers in `drizzle-kit generate --custom --name=<name>`.
- Never edit or delete an applied migration or its snapshot. Add a new migration.
- Inside `db.transaction(async (tx) => ...)`, send every query through `tx`, not `db`.

## Verify
- `drizzle-kit generate` reads the schema and the old snapshots. It needs no DB. Read the new SQL.
- `drizzle-kit check` validates the migrations folder.
- Run `migrate` or `push --explain` (1.x dry run) only against localhost or a test container.

Sources: https://orm.drizzle.team/docs/v0-v1-changes, https://orm.drizzle.team/docs/relations-v1-v2, https://orm.drizzle.team/docs/upgrade-v1, https://orm.drizzle.team/docs/drizzle-kit-push, https://orm.drizzle.team/docs/drizzle-kit-generate, https://orm.drizzle.team/docs/kit-custom-migrations
