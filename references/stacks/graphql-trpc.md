# GraphQL / tRPC rules

Applies on top of `references/backend.md`. The project's own instruction files and conventions win. Checked against official docs on 2026-10-16; installed versions and bundled docs beat this file.

## Check first
- `frameworks`: `@apollo/server`, `graphql-yoga`, `graphql`, `dataloader`, `@as-integrations/*`, `@trpc/server`, `@trpc/client`, `@trpc/react-query`, `@trpc/tanstack-react-query`.
- Find the per-request context factory (Apollo `context`, Yoga `context`, tRPC `createContext`). Most rules below live there.
- Schema-first or code-first: match the existing style and codegen step. Do not edit generated types.

## Version traps
| Version | Trap | Do |
|---|---|---|
| Apollo Server 4 | End-of-life since 2026-01-26. | Plan the upgrade to 5 with the user; do not add new v4 code paths. |
| Apollo Server 5 | `@apollo/server/express4` removed. Needs Node 20+ and `graphql` 16.11+. | Import `expressMiddleware` from `@as-integrations/express4` or `/express5` (match the Express major). |
| Apollo Server 5 | Variable coercion errors return 400 (were 200). `startStandaloneServer` no longer runs on Express. | Update tests and clients that expect 200. |
| tRPC 11 | `transformer` moved from the client to each link. | Put `transformer: superjson` on every HTTP/WS link, matching the server. |
| tRPC 11 | React Query v5 peer: `isLoading` became `isPending`. `.interop()` removed. TypeScript 5.7.2+ required. | Write v5 query flags; check `versions.typescript`. |

## Rules
- Create DataLoaders per request in the context factory. A module-level loader caches one user's data for every user.
- Batch functions return one result per key, in key order. Return `null` or an `Error` for missing keys.
- Call `loader.clear(key)` after a mutation changes that row in the same request.
- Fix N+1 with DataLoader or joins. Never query inside a field resolver loop.
- Limit query depth, aliases/breadth and cost before execution. Use the server's plugin (for example GraphQL Armor) or trusted documents.
- Paginate every list field that can grow. Set a maximum page size.
- Authorize in resolvers or tRPC procedures (or middleware they share). Schema visibility is not access control.
- tRPC: build `protectedProcedure` from middleware that checks `ctx.user` and throws `TRPCError({ code: 'UNAUTHORIZED' })`. Check ownership inside the procedure.
- tRPC: validate every `.input()` with a schema. Never trust client types at runtime.
- tRPC: upgrade all `@trpc/*` packages to the same major together. Clients use the server's types, so deploy client and server together or keep changes additive.
- Apollo: keep `csrfPrevention` on. Leave `introspection` and `includeStacktraceInErrorResponses` at their production defaults; never force them `true` in production.
- Mask internal errors. Return a generic message and log the real one.
- Subscriptions: use `graphql-ws`. `subscriptions-transport-ws` is unmaintained.

## Verify
- Apollo: `server.executeOperation({ query, variables }, { contextValue })` in tests. No port needed.
- tRPC: `t.createCallerFactory(appRouter)(ctx)` to call procedures with a fake context.
- Test one unauthenticated and one wrong-owner call per protected operation.

Sources: https://www.apollographql.com/docs/apollo-server/previous-versions, https://www.apollographql.com/docs/apollo-server/migration, https://www.apollographql.com/docs/apollo-server/api/apollo-server, https://www.apollographql.com/docs/apollo-server/testing/testing, https://www.apollographql.com/docs/apollo-server/data/subscriptions, https://github.com/graphql/dataloader, https://graphql.org/learn/security/, https://trpc.io/docs/migrate-from-v10-to-v11, https://trpc.io/docs/server/authorization, https://trpc.io/docs/server/server-side-calls
