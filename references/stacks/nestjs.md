# NestJS rules

Applies on top of `references/backend.md`. The project's own instruction files and conventions win. Checked against official docs on 2026-10-16; installed versions and bundled docs beat this file.

## Check first
- `frameworks["@nestjs/core"]` major and the adapter (`@nestjs/platform-express` or `-fastify`). With Fastify, also read `references/stacks/fastify.md`.
- Read the migration guide of the installed major on docs.nestjs.com before you use a version-specific API.
- Match the existing module layout, ORM module, validation style and test runner.

## Version traps
| Version | Trap | Do |
|---|---|---|
| 11+ (Express 5) | Unnamed wildcards (`@Get('users/*')`, `forRoutes('*')`) warn or fail. | Write `users/*splat`; `forRoutes('{*splat}')` for all paths. |
| 11+ (Express 5) | Query parser is `simple`: `a[b]=1` and `x[]=1` stop parsing. | Set `app.set('query parser', 'extended')` only if the API needs it. |
| 11+ | Shutdown hooks run in reverse module order; global-module middleware runs first. | Do not rely on old hook order. |
| 11+ | `@nestjs/config` 4: internal config beats `process.env`. | Check overrides in `ConfigService.get`. |
| 11+ | Node 20+ required. | Check `node.pin`. |
| 12 | Packages are ESM-only. CJS apps need Node 20.19+ or 22.12+ (`require(esm)`). | Check Node first. Do not convert the app to ESM unasked. |
| 12 | Jest loads v12 only on Node 24.9+ (else `ERR_REQUIRE_ASYNC_MODULE`). | Run Jest on Node 24.9+ or use Vitest. |
| 12 | `@nestjs/config` `validationSchema` takes Standard Schema; Joi needs v18+, its options move to `validationOptions.libraryOptions`. | Use Zod/Valibot or upgrade Joi. |
| 12 | `@Optional()` is not inherited; Terminus `HealthIndicator`/`HealthCheckError` and `subscriptions-transport-ws` removed. | Redeclare the constructor; use `HealthIndicatorService`; use `graphql-ws`. |
| 12 | Schema-first validation: `@Body({ schema })` + `StandardSchemaValidationPipe`. | Use it only where the project already does. |

## Rules
- One feature module per domain. Export only what other modules use. `@Global()` only for config/logging.
- Controllers bind DTOs and call one service. Services own logic and ORM access.
- Never use ORM entities as request DTOs. Shape responses with DTOs or a serializer so secrets never leave.
- `ValidationPipe` globally with `whitelist`, `forbidNonWhitelisted`, `transform`. Nested DTOs need `@ValidateNested()` + `@Type(() => X)`.
- Do not mix class-validator and Standard Schema in one module.
- Pipeline: middleware, guards, interceptors, pipes, handler, interceptors, filters. Authn/authz in guards; ownership checks in services.
- Circular imports: extract a shared module. Do not import a barrel `index.ts` from the same folder. `forwardRef` is the last resort.
- Request-scoped providers make every consumer request-scoped. Prefer `AsyncLocalStorage`/CLS.
- Read config through `ConfigService`, validated at boot. No `process.env` in providers.
- Call `app.enableShutdownHooks()`. Close DB, queue and Redis clients in `onModuleDestroy`/`onApplicationShutdown`.
- `@nestjs/schedule` runs on every instance. Use a queue or a lock with more than one instance.
- Use `nest upgrade` (v12+) or move all `@nestjs/*` packages to the same major together.

## Verify
- Unit: `Test.createTestingModule`; `overrideProvider` only for external APIs, clock and mailers.
- e2e: `supertest(app.getHttpServer())` after `app.init()`. Pipes, filters and guards set in `main.ts` do not apply here. Share one `configureApp(app)` with `main.ts`.

Sources: https://docs.nestjs.com/migration-guide, https://docs.nestjs.com/v11/migration-guide, https://docs.nestjs.com/application/validation, https://github.com/typestack/class-validator#validating-nested-objects, https://docs.nestjs.com/fundamentals/circular-dependency, https://docs.nestjs.com/fundamentals/injection-scopes, https://docs.nestjs.com/fundamentals/lifecycle-events
