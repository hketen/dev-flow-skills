# Strapi rules

Applies on top of `references/backend.md` (server) and `references/frontend.md` (admin panel). The project's own instruction files and conventions win. Checked against official docs on 2026-10-16; installed versions and bundled docs beat this file.

## Check first
- `frameworks["@strapi/strapi"]` major: 4 or 5. Plugins: `@strapi/sdk-plugin` (5) or `@strapi/helper-plugin` (4).
- Layout: `src/api/<name>/` (content-types, controllers, services, routes), `src/plugins/`, `config/plugins.*`, `src/admin/`.
- Frontend clients: look for `attributes` access or the `Strapi-Response-Format: v4` header.

## Version traps
| Version | Trap | Do |
|---|---|---|
| 5 | Content API identifies documents by `documentId`, not `id` | Use `documentId` in routes, relations and clients |
| 5 | REST responses are flat; no `data.attributes` | Read fields from `data` directly; `Strapi-Response-Format: v4` only during migration |
| 5 | Entity Service deprecated | Use `strapi.documents(uid)`; no `findPage()` |
| 5 | Document Service `findMany()` always returns an array | Use `findFirst()` for one item |
| 5 | `publicationState` removed; `published_at` does not publish | Use `status` and `publish()`/`unpublish()`/`discardDraft()` |
| 5 | Document Service defaults to `draft`; REST defaults to `published` | Set `status` explicitly; a REST write without it publishes immediately |
| 5 | Lifecycle hooks fire differently (publish runs create and delete hooks) | Use Document Service middlewares, not Entity Service decorators |
| 5 | REST input is validated: unknown fields, `createdAt`, forbidden relations give 400 | Send only writable schema fields |
| 5 | Users & Permissions `register.allowedFields` defaults to `[]` | Allowlist extra signup fields explicitly |
| 5 | `helper-plugin` removed; admin uses Vite, Design System 2, `react-router-dom` 6 | Do not copy v4 admin snippets into a v5 plugin |
| 5 | `strapi develop` watches admin by default; `watch-admin` command removed | Use `--no-watch-admin` to opt out |

## Rules
- Custom controllers that replace core actions: call `validateQuery`, `sanitizeQuery` and `sanitizeOutput`. Skipping them leaks private fields.
- `config: { auth: false }` makes a route public. Add a policy or keep auth on.
- A custom field needs registration on the server (`strapi.customFields.register`) and in the admin (`app.customFields.register`).
- Plugin admin code needs a rebuild: run `strapi build` before you test a production-mode admin.
- Do not hand-edit `types/generated/*`. Regenerate with `strapi ts:generate-types`, or on restart when `autogenerate: true`.
- Never run `strapi transfer`, `import` or `export` against a remote instance during a task.

## Verify
- `strapi develop` with a local SQLite or Docker database, then the project's test script.
- Plugins on 5: `npm run build && npm run verify` in the plugin; link with `watch:link`.
- Call changed REST routes as public, as an authenticated user, and as an admin; compare what each receives.

Sources: https://docs.strapi.io/cms/migration/v4-to-v5/breaking-changes, https://docs.strapi.io/cms/migration/v4-to-v5/breaking-changes/use-document-id, https://docs.strapi.io/cms/migration/v4-to-v5/breaking-changes/new-response-format, https://docs.strapi.io/cms/migration/v4-to-v5/breaking-changes/entity-service-deprecated, https://docs.strapi.io/cms/migration/v4-to-v5/breaking-changes/lifecycle-hooks-document-service, https://docs.strapi.io/cms/migration/v4-to-v5/breaking-changes/default-input-validation, https://docs.strapi.io/cms/api/document-service/status, https://docs.strapi.io/cms/backend-customization/controllers, https://docs.strapi.io/cms/features/custom-fields, https://docs.strapi.io/cms/plugins-development/create-a-plugin, https://docs.strapi.io/cms/cli, https://docs.strapi.io/cms/typescript/development
