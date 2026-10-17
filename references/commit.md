# Commit message

Read this file when the user asks for a commit message or a commit, and before any version bump. Output the message in a code block. Do not run `git commit`, stage files or amend unless the user asks for that action (a version bump the user asked for counts).

Language: use the language of the last commits in the repo (`git log -5 --format=%s`). Default English. Use ASD-STE100 rules in that language.

## Subject line

- Format: `<type>(<scope>): <imperative summary>`. The scope is optional. When detect shows `git.ticket`, use the ticket key as the scope if the last commits do that.
- Types: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `chore`, `build`, `ci`, `style`, `revert`.
- Imperative mood: "add", "fix", "remove". Not "added", "adds" or "adding".
- Max 50 characters when possible. Hard limit 72. No period at the end.
- Use the capitalization of the last commits after the colon.

## Body

- Write no body when the subject is clear.
- Write a body only for a reason that is not clear from the diff, a breaking change, migration notes or linked issues.
- Always write a body for breaking changes, security fixes, data migrations and reverts.
- Wrap at 72 characters. Use `-` for bullets. Put `Closes #42` or `Refs #17` at the end.

## Never

- "This commit does X", "I", "we", "now", "currently". The diff shows what changed.
- AI attribution ("Generated with ..."), unless a project rule requires an `Assisted-by` trailer.
- Emoji, unless the project uses them.
- The file name again when the scope already says it.

## Version bump commit

A version bump commit (`pnpm version`, `npm version`, a release commit) never has only the version number as its message. The message tells what the version contains.

1. Find the previous version tag: `git describe --tags --abbrev=0`.
2. Read the commits since that tag: `git log <tag>..HEAD --format=%s`.
3. Write the subject as `<version>: <summary of the main changes>`. Hard limit 72 characters.
4. Write a body with one `-` bullet for each group of changes: features, fixes, migrations, config.
5. Give the subject to the bump command: `pnpm version patch -m "%s: <summary>"`. The tool replaces `%s` with the new version; `npm version` uses the same flag.
6. For the body, run `git commit --amend` after the bump. Then move the local tag to the amended commit with `git tag -f <tag>`. Do both before the push.
7. Never amend a commit or move a tag that is already pushed.

Example:

```
0.3.5: team invites, faster search, billing fixes

- feat: invite teammates by e-mail with role selection
- perf: search index on projects.name, debounced input
- fix: proration on mid-cycle plan change
- db: migration 0031 (invites table)
```

## Examples

```
feat(api): add GET /users/:id/profile

Mobile client needs profile data without the full user payload
to reduce LTE bandwidth on cold-launch screens.

Closes #128
```

```
feat(api)!: rename /v1/orders to /v1/checkout

BREAKING CHANGE: clients on /v1/orders must migrate to /v1/checkout
before 2026-06-01. Old route returns 410 after that date.
```
