# TypeORM rules

Applies on top of `references/backend.md`. The project's own instruction files and conventions win. Checked against official docs on 2026-10-16; installed versions and bundled docs beat this file.

## Check first
- `versions.typeorm`: 0.3 or 1.x. On npm, `latest` is 1.x and `legacy` is 0.3.x.
- The `DataSource` file: `synchronize`, `migrations`, `migrationsRun`, `migrationsTransactionMode`, `invalidWhereValuesBehavior`.
- Entities use decorators. Keep the project compiler (tsc, SWC, tsx); Node type stripping cannot run them.

## Version traps
| Version | Trap | Do |
|---|---|---|
| ≥ 0.3 | `findOne(id)` and `findOne()` with no options are removed. | Write `findOneBy({ id })` or `findOne({ where: { id } })`. |
| 0.3 | `null` or `undefined` in `findOneBy`/`find` `where` drops the condition. `findOneBy({ id: undefined })` returns the first row. | Assert ids before every query. Use `IsNull()` to match null. |
| 1.x | `null`/`undefined` in find `where` throws `TypeORMError`. `.where()` on QueryBuilder is not guarded. | Keep the default. Never set `invalidWhereValuesBehavior` to `ignore`. |
| 1.x | Removed: `Connection`, `createConnection`, global `getRepository`/`getManager`/`getConnection`, `findByIds`, `findOneById`, `exist`, `@EntityRepository`, string-array `select`/`relations`, `join` find option, `TYPEORM_*` env config. | Use `dataSource.getRepository`, `findBy({ id: In(ids) })`, `exists`, `Repository.extend`, object `select`/`relations`. |
| 1.x | Drivers: `mysql` → `mysql2`; `sqlite3` → `better-sqlite3` (`type: "better-sqlite3"`); MongoDB driver ≥ 7; Node ≥ 20. | Install the supported driver. |
| 1.x | `nullable: false` `ManyToOne` loads with INNER JOIN. Rows with orphan FKs disappear. | Check data integrity before you trust counts. |
| 1.x | `remove` cascades now delete one-to-many children. `orphanedRowAction: "nullify"` deletes children with non-null FKs. | Check cascade options before `save`/`remove` on loaded relations. |

## Rules
- Upgrade 0.3 → 1.x with `npx @typeorm/codemod v1 src/ --dry` first, and only after the user approves.
- `synchronize: true` only for a local throwaway DB. It can drop production data.
- Schema changes: edit entities, run `migration:generate` against a local DB, read the SQL for DROP and locks, commit.
- Never edit an applied migration. Add a new one. Keep `down()` correct.
- `migrationsTransactionMode` default `all` runs every pending migration in one transaction. For `CREATE INDEX CONCURRENTLY`, set mode `each` and `transaction = false` on that migration.
- In `dataSource.transaction(async (manager) => ...)`, use only `manager`. Never the global manager or an injected repository.
- With `createQueryRunner()`: `connect`, `startTransaction`, commit or roll back, and `release()` in `finally`. A missed release leaks a pool connection.
- Never call HTTP, mail or payment code inside a transaction.
- Write QueryBuilder conditions with parameters (`"u.id = :id", { id }`), never string interpolation.

## Verify
- Run `migration:generate`, `migration:run` and `migration:show` only against localhost or a test container.
- After `migration:run`, `migration:generate` exits with code 1 when entities and DB match.

Sources: https://typeorm.io/docs/releases/1.0/upgrading-from-0.3/, https://github.com/typeorm/typeorm/blob/0.3.0/CHANGELOG.md, https://github.com/typeorm/typeorm/issues/11873, https://typeorm.io/docs/data-source/data-source-options/, https://typeorm.io/docs/migrations/setup, https://typeorm.io/docs/migrations/generating, https://typeorm.io/docs/migrations/status, https://typeorm.io/docs/transactions, https://github.com/typeorm/typeorm/blob/master/packages/typeorm/src/migration/MigrationInterface.ts
