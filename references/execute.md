# Execute

Run after go-ahead. When SKILL.md step 4 skipped the plan, skip the contract and fan-out too: edit, verify, report.

## 1. Goal contract

Write it in chat first, at most 6 lines. Derive it from the agreed plan.

```
Goal: one-sentence outcome
Done when: up to 5 checkable criteria; the last one is the verification (commands from detect `scripts` + a smoke run of the changed path)
Out of scope: what will not be touched
Slices: S1 files - change | S2 files - change | ...
```

Then start the todo list: one item per slice, plus `Verify`. Mark each item done the moment it is done.

## 2. Fan-out rule

Use subagents only when there are at least 2 slices with disjoint file sets and each slice is real work. Else run the slices inline, in order. Subagents start blank and re-read files, so every unneeded spawn costs tokens.

- Write shared contracts yourself first (types, API shape, schema, function signatures) so that slices cannot diverge.
- Start all independent slices in one batch. Dependent slices go in a later batch.
- Shared context for each subagent: the detect JSON line, the conventions you found, and the relevant lines pasted from the files in detect `read` (do not tell it to load a skill). Add the code rules from SKILL.md, the hard rules 3 to 10, the test choice with the "Anti-patterns" list from `references/tdd/GUIDE.md`, and the rule that code comments use the repo's language.
- Each subagent task: target files and non-goals, change steps, acceptance. Tell it to skip build, lint and tests mid-flight and to stay in scope.
- Read each result. Open changed files only where a result is ambiguous or touches a shared contract.

## 3. Verify once

Run in order, only what exists in detect `scripts` (or `rootScripts` through the workspace filter): typecheck, lint, tests (when chosen or present for the touched area), build (when build output or config changed). No typecheck script in a TS project: run the local `tsc --noEmit`. No script at all: run `build`. Then exercise the changed path: call the endpoint on a local server, run the script with safe input, or open the page with the browser tool. Code covered by `references/side-effects.md` follows its Verify section instead: never start it.

- Never start a watcher. A `test` script with watch mode runs once instead: `vitest run`, `jest --watchAll=false`.
- Dev servers: reuse a running one. Else start it in the background with a timeout, hit the path, stop it.
- Run commands with the detect `pm` and in the owning package. A failure that only appears on a different Node than `node.pin` is a runtime mismatch: report it, do not patch around it.
- An approved dependency that cannot be installed (offline, cooldown, blocked script): leave `package.json` and the lockfile untouched, report the exact install command, and mark dependent checks `Not verified`.
- Fix failures yourself or with one follow-up subagent. Report the decisive error lines, not full logs.
- Report anything not run as `Not verified: <reason>`.

## 4. Close

Mark the todo list done, send the report from SKILL.md step 6, then ask the handoff question from the same step.
