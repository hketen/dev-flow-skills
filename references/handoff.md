# Handoff

Read after the user said yes to the handoff question in SKILL.md step 6, or asked for a handoff on their own.

## 1. Consistency check (before you write)

Check the whole change set of this session from start to end, not only the last edit:

1. List every file changed this session (`git status`, `git diff` against the start of the task).
2. For each changed symbol, route, field, config key or file path: grep the callers, tests, fixtures, docs, comments and exports. Each one must match the new state.
3. Check that docs (README, AGENTS.md, CLAUDE.md, the old handoff, the detect `profile`) do not contradict the code. No reference may point to a deleted or renamed path.
4. Check that the report from step 6 matches the files: every claim in `Done`, `Changed` and `Verified` is true.
5. If this session caused an inconsistency, fix it, then run the verification for that file again.
6. If an inconsistency was there before this session, do not fix it. Put it in `Open / next` and tell the user.

## 2. Write the file

### File

- Path: `HANDOFF.md` at the git root (the detected project dir when there is no git). Reuse an existing `handoff.md` / `HANDOFF.md` instead of creating a second one.
- Existing file: rewrite it as the current state of the project. Merge still-open items and still-valid gotchas from the old file; drop what this task finished. It is a snapshot, not a log.
- Never commit it unless asked. If it is not ignored by git, say so in one line; do not edit `.gitignore` on your own.
- Language: the repo's documentation language (default English), with the ASD-STE100 rules from SKILL.md. At most ~60 lines. No secrets, tokens, hosts, IPs, connection strings or personal data.

### Content

Write it for an agent starting a fresh chat with no history: facts it cannot get cheaply from the code. Only what happened in this session; claim only what you ran. Omit empty sections.

```markdown
# Handoff - <project> (<YYYY-MM-DD>)

Branch: <branch> | Ticket: <key> | Stack: <one line from detect>

## Goal
One or two sentences: what was asked and why.

## Done
- Outcome-level bullets (not a file diff).

## Changed
- `path` - what changed and why (key files only).

## Problems fixed
- Symptom -> root cause -> fix (file:line).

## Decisions
- Choice made, alternative rejected, reason. Assumptions the user did not confirm.

## Verification
- `command` -> actual result. `Not verified: reason` for anything not run.

## Open / next
- Unfinished slices, failing checks, follow-ups, in priority order.

## Gotchas
- Traps hit this session (env, versions, flaky commands, things that must never run).

## Resume
- Commands to get going: install, run, test (from detect `scripts`).
```

After writing, reply with one line in the chat language: the path, the section count, and the consistency result (`N fixed, M open` or `no inconsistencies`). Do not repeat the content in chat.
