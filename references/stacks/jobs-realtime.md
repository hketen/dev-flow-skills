# Jobs and realtime rules

Applies on top of `references/backend.md`. The project's own instruction files and conventions win. Checked against official docs on 2026-10-16; installed versions and bundled docs beat this file.

## Check first

- Read detect `jobs`, `realtime` and `versions.bullmq`. Check the lockfile for the resolved BullMQ major.
- Find every scheduler: `node-cron`, `croner`, `@nestjs/schedule`, `setInterval` loops, BullMQ schedulers, platform cron.
- Find how many replicas run the code (compose `replicas`, k8s manifests, PM2 cluster, serverless). Ask the user if unknown.

## Version traps

| Version | Trap | Do |
|---|---|---|
| BullMQ < 5.16 | No Job Schedulers. | Use `repeat` only here; plan an upgrade. |
| BullMQ 5.16–5.x | `add(..., { repeat })` works but is legacy. | Write new schedules with `upsertJobScheduler`. |
| BullMQ 6.x | `repeat`, `getRepeatableJobs`, `removeRepeatable*` and `debounce` are removed. v6 errors on legacy repeat data in Redis. | Use `upsertJobScheduler`, `getJobSchedulers`, `removeJobScheduler`, `deduplication`. Migrate schedulers on v5 before the upgrade. |
| BullMQ 6.x | `queue.resume()` returns a promise. Flow jobs without `jobId` get UUIDs. | `await queue.resume()`. Never parse flow job IDs as numbers. |

## Rules

- Make every job handler idempotent. A job can run twice after a stall or retry.
- Set `maxRetriesPerRequest: null` on the ioredis connection of a Worker. Keep the default on Queue producers so HTTP requests fail fast.
- Redis for BullMQ needs `maxmemory-policy noeviction`.
- Dedupe with a deterministic `jobId` or `deduplication.id`. A removed job no longer dedupes (`removeOnComplete`, `removeOnFail`).
- Handle `SIGTERM` and `SIGINT`: `await worker.close()`, then close queues and Redis, then exit.
- Set `attempts` and `backoff` explicitly for jobs that call external APIs.
- In-process cron runs on every replica. Use a BullMQ Job Scheduler, a platform cron, or a distributed lock instead.
- Socket.IO on more than one process needs sticky sessions (or WebSocket-only transport) and an adapter (Redis, Redis Streams, Postgres, cluster).
- Plain `ws` does not detect dead peers. Add a ping/pong heartbeat that terminates sockets that miss a pong.
- Authenticate WebSocket and Socket.IO connections at handshake. Check authorization again for each room join or event.
- Validate every incoming realtime message with a schema.
- Put job payloads under a size limit. Store large data elsewhere and pass an ID.

## Verify

- Unit-test handlers as plain functions with in-memory fixtures.
- Integration tests: use a local Redis (Testcontainers or compose service), never a shared or production Redis.
- Never enqueue jobs into a real queue to test. Workers on that queue can send mail or charge cards.

Sources: https://docs.bullmq.io/guide/migrations/migrate-from-v5-to-v6, https://docs.bullmq.io/guide/job-schedulers, https://docs.bullmq.io/guide/going-to-production, https://docs.bullmq.io/guide/jobs/job-ids, https://docs.bullmq.io/guide/jobs/deduplication, https://socket.io/docs/v4/using-multiple-nodes/, https://github.com/websockets/ws/blob/master/README.md
