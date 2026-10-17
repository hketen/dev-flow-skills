# Infrastructure rules

Applies to Dockerfiles, compose files, reverse proxies, CI pipelines and deploy scripts. The project's own instruction files and conventions win. Checked against official docs on 2026-10-16; installed versions and bundled docs beat this file.

## Check first

- Detect `infra`, `pm`, `node.pin` and `scripts`. Read the existing Dockerfile, compose file and CI file before you change one.
- CI files define "green". Run the same commands locally, not invented ones.
- Treat every edit to a pipeline, compose file or deploy script as a plan item. Get approval before you apply it.

## Dockerfile (Node)

- Use a multi-stage build. Build with dev dependencies, then copy only `dist` and production dependencies to the runtime stage.
- Install with the frozen command of the detected PM (`npm ci`, `pnpm install --frozen-lockfile`, `yarn install --immutable`, `bun install --frozen-lockfile`). Never run plain `npm install`.
- Install production dependencies only in the runtime stage (`npm ci --omit=dev`, `pnpm deploy --prod`, or `pnpm install --prod`).
- Use the Node major from `node.pin` in `FROM`. Pin a tag, not `latest`.
- Set `USER node` in the runtime stage. Images run as root by default.
- Use exec form: `CMD ["node", "dist/index.js"]`. Never use `npm start` or shell form; npm and the shell do not forward `SIGTERM`.
- Node does not handle signals as PID 1. Add an init: `docker run --init`, compose `init: true`, or `tini`/`dumb-init` in the image.
- Set `NODE_ENV=production` in the runtime stage.
- Keep a `.dockerignore` that excludes `node_modules`, `.git`, `.env*`, `dist`, coverage and logs.
- Never `COPY .env` or pass secrets as `ARG`/`ENV`. Use runtime env or BuildKit secret mounts.
- Client-side public env values (`NEXT_PUBLIC_*`, `VITE_*`) are fixed at build time. One image cannot serve two environments with different values.
- Add a `HEALTHCHECK` or a compose `healthcheck` that calls a cheap health endpoint.

## Compose

- Use `docker compose` (v2), not `docker-compose`.
- Use named volumes for database data. Bind mount source code in development only.
- Use `depends_on: {db: {condition: service_healthy}}` and give the dependency a `healthcheck`.
- Published ports are reachable from outside the host by default, and they bypass ufw. Bind internal services to loopback: `"127.0.0.1:5432:5432"`, or use `expose` only.
- Reference secrets with `env_file` or `${VAR}`. Never inline values. Never print, `cat` or commit env files.
- Verify with `docker compose config --quiet`. Without `--quiet` it prints resolved secrets.
- Never run `docker compose down -v`, `docker volume rm`, `docker system prune` or `docker volume prune` without explicit approval. They delete database volumes.
- Never run dump, restore, import or seed scripts against a real database unless the user asks.

## Reverse proxy

- Route to the service name on a shared Docker network, not to a host port.
- Forward `Host`, `X-Forwarded-For` and `X-Forwarded-Proto`. Trust the proxy in the app for one hop only (Express `trust proxy`, Fastify `trustProxy`).
- WebSocket routes need `Upgrade`/`Connection` headers and a long read timeout.
- Never commit TLS keys or certificates.

## CI: GitHub Actions

- Pin third-party actions to a full commit SHA with a version comment: `uses: org/action@<sha> # v4.2.0`.
- If `.github/workflows/actions.lock` exists, regenerate it with `gh actions-lock` after you change a `uses:` line.
- Set top-level `permissions: contents: read`. Grant write scopes per job only.
- Set `persist-credentials: false` on `actions/checkout` when the job does not push.
- Never check out or run fork PR code under `pull_request_target` or `workflow_run`. Never add `allow-unsafe-pr-checkout`. Use `pull_request` for untrusted code.
- Never put `${{ github.event.* }}` text directly in `run:`. Pass it through `env:` to stop script injection.
- JavaScript actions run on Node 24; Node 20 actions no longer run (since 2026-09-23). Bump old action versions.
- Take the PM version from `packageManager`. `pnpm/setup` needs pnpm 11+; use `pnpm/action-setup` for pnpm 10.
- Publish to npm with OIDC trusted publishing, not a long-lived `NPM_TOKEN`.

## CI: GitLab CI and Bitbucket Pipelines

- Apply the same rules: frozen installs, pinned images and includes, least-privilege tokens, no secrets in YAML.
- GitLab: store secrets as masked, protected variables. Pin `include:` to a tag or SHA. Never run fork MR pipelines in the parent project with secrets unless the user approves.
- Bitbucket: `bitbucket-pipelines.yml` must be at the repository root. Store secrets as Secured variables.
- Never trigger a deploy, manual or custom pipeline to test a change.

## Verification limits

Can verify offline: `docker compose config --quiet`, `docker build` without push, `hadolint`, `shellcheck`, `actionlint`, YAML structure.

Cannot verify offline; report as `Not verified`: network reachability, TLS and DNS, real health and start-up time, volume permissions, data integrity, migrations on real data, secrets in the CI provider, deploy targets.

Sources: https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md, https://docs.docker.com/engine/network/port-publishing/, https://docs.docker.com/engine/network/packet-filtering-firewalls/, https://docs.docker.com/reference/cli/docker/compose/down/, https://docs.docker.com/reference/cli/docker/compose/config/, https://docs.docker.com/reference/compose-file/services/, https://docs.github.com/en/actions/reference/security/secure-use, https://github.blog/changelog/2026-06-18-safer-pull_request_target-defaults-for-github-actions-checkout/, https://github.blog/changelog/2026-09-23-node-20-is-no-longer-available-in-github-actions/, https://github.blog/changelog/2026-10-14-github-actions-workflow-lockfiles-in-public-preview/, https://pnpm.io/continuous-integration, https://github.com/pnpm/action-setup, https://docs.gitlab.com/ci/variables/, https://docs.gitlab.com/ci/pipeline_security/, https://support.atlassian.com/bitbucket-cloud/docs/variables-and-secrets/
