# Mongoose rules

Applies on top of `references/backend.md`. The project's own instruction files and conventions win. Checked against official docs on 2026-10-16; installed versions and bundled docs beat this file.

## Check first
- `versions.mongoose`: 8 and 9 differ in hooks and update options.
- Bootstrap `mongoose.set(...)` calls: `sanitizeFilter`, `strictQuery`, `runValidators`, `autoIndex`, `updatePipeline`.
- Find how the repo changes data shape: migration scripts folder, a migrate lib, or none.

## Version traps
| Version | Trap | Do |
|---|---|---|
| ≥ 7 | `strictQuery` is `false`: unknown filter keys go to MongoDB unchanged. | Build filters from validated fields only. |
| 9 | Pre middleware gets no `next()`. `function (next, done)` hooks are removed. | Write `async function () {}`. Throw to fail. |
| 9 | Update pipelines (array updates) throw. | Pass `updatePipeline: true` only when you need a pipeline. |
| ≥ 9.2 | `new` and `returnOriginal` print deprecation warnings. | Write `returnDocument: "after"`. On 8, `new: true` is fine. |
| 9 | `UUID` paths return `bson.UUID`, not strings. `isValidObjectId(6)` is `false`; `new ObjectId(6)` throws. | Call `.toString()` where code compares strings. |
| 9 | Types: `FilterQuery` → `QueryFilter`. Index `background` option removed. Node ≥ 20.19. | Use the new names. |

## Rules
- Operator injection: `{ email: req.body.email }` accepts `{ "$ne": null }`. Enable `mongoose.set("sanitizeFilter", true)` or validate each value as a primitive.
- With `sanitizeFilter`, wrap intended operators in `mongoose.trusted()`. Keep Mongoose patched: older releases let `$nor` bypass it.
- Never pass `req.body` to `create`, `new Model()`, `updateOne` or `findByIdAndUpdate`. Pick allowed fields; this blocks writes to `role` or `owner`.
- Update validators are off by default. Pass `runValidators: true` on `updateOne`, `updateMany` and `findOneAndUpdate`, or set it globally.
- `findOneAndUpdate` returns the document before the update by default.
- `lean()` returns plain objects: no getters, virtuals, `toJSON` transforms or `save()`. Do not `lean()` when a transform hides fields such as a password hash.
- `unique: true` builds an index. It is not a validator. Handle duplicate-key error 11000.
- Set `autoIndex: false` in production. Build indexes in a deploy step with `createIndexes()`.
- `syncIndexes()` drops every index not in the schema. Never run it against a shared DB without review.
- Shape changes: add the new field as optional, backfill in batches, read both shapes, switch, then remove the old field later.
- Transactions need a replica set. Pass the `session` to every operation inside, or use `connection.transaction(fn)`.

## Verify
- Run tests against `mongodb-memory-server` or a local container. Never a shared cluster.
- Add an injection test: a filter value `{ "$ne": null }` must not match records.

Sources: https://mongoosejs.com/docs/migrating_to_9.html, https://mongoosejs.com/docs/migrating_to_7.html, https://mongoosejs.com/docs/api/mongoose.html, https://mongoosejs.com/docs/validation.html, https://mongoosejs.com/docs/tutorials/lean.html, https://mongoosejs.com/docs/guide.html, https://mongoosejs.com/docs/api/model.html, https://github.com/Automattic/mongoose/security/advisories/GHSA-wpg9-53fq-2r8h
