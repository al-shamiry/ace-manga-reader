---
name: commit
description: Draft a commit message for the current staged/unstaged changes in the style used for Ace Manga Reader. Outputs the message text only — does not run git commit and does not include a Co-Authored-By line.
user-invocable: true
argument-hint: "[optional hint about the change]"
---

# Commit Message Drafter

Draft a commit message for the current changes in the working tree, matching the style established in this project's git history.

## Hard Rules

1. **Never run `git commit`** — the user does the commit themselves.
2. **Never include a `Co-Authored-By:` trailer** — no Claude attribution.
3. **Never run `git add`** — the user controls staging.
4. **Output the message in a fenced code block** so it's easy to copy.

## Procedure

1. Inspect the change set with these commands (run them in parallel):
   - `git status -s`
   - `git diff --stat HEAD`
   - `git diff HEAD` (or `git diff --staged` if anything is staged)
2. Read recent commit subjects to calibrate tone: `git log --oneline -15`
3. Analyze what changed and why. If the user passed a hint as an argument, weight it heavily.
4. Draft the message following the format below.
5. Output the message in a fenced code block. Stop. Do not stage, commit, or push.

## Format

Conventional Commits, scoped:

```
type(scope): one-phrase subject
```

A body is **optional** and should only be included when the change has substantial detail worth bullet-pointing. Most commits in this repo are subject-only — favor that. Add a body only if:
- Multiple distinct sub-changes in one commit
- The "why" isn't obvious from the subject
- The user explicitly asks for one

When a body is warranted, format it as:

```
type(scope): one-phrase subject

- first detail (the why or the meaningful what)
- second detail
- third detail
```

### Subject rules

- **Lowercase** the entire subject (after the `type(scope):`).
- **No trailing period.**
- Keep it under ~72 characters.
- Use a short scope in parentheses that names the area touched (e.g. `loader`, `library`, `reader`, `settings`, `history`, `ui`, `window`, `theme`, `branding`, `release`, `empty-states`). Omit the scope only when the change is genuinely cross-cutting.
- **Prefer imperative phrasing** — start with a verb that says what the change does (`add`, `fix`, `replace`, `unify`, `move`, `rename`, `drop`, `extract`). Imperative reads more clearly than descriptive (`basic settings view`) because it states the action up front.

### Type vocabulary used in this repo

| Type | When |
|---|---|
| `feat` | New user-facing feature or capability |
| `fix` | Bug fix |
| `refactor` | Restructure without changing behavior |
| `perf` | Performance improvement |
| `style` | Visual / cosmetic changes (CSS, fonts, icons, copy that's purely presentational) |
| `docs` | README, CLAUDE.md, plan files, comments |
| `chore` | Tooling, deps, config, releases, anything that isn't product code |
| `ci` | GitHub Actions / workflow changes |
| `build` | Build system / bundler / Tauri config that affects the build itself |

### Examples from this repo's history (the target style)

```
feat(history): add reading history view
```
```
feat(settings): basic settings view with general, reading, and display sections
```
```
refactor(empty-states): unify empty states in a component
```
```
style(loader): editorial serif wordmark with jade sweep
```
```
fix(startup): display loader before app mounts
```
```
chore(branding): replace default Tauri icons with temp app logo
```
```
docs: refresh README for v0.3.0 release
```

## Edge cases

- **Mixed change set** — if the working tree mixes unrelated changes (e.g. a feature + an unrelated config tweak), point this out and suggest splitting. Then draft the message for the dominant change only.
- **Untracked files** — if there are untracked files that look meaningful (not lockfiles or scratch), mention them so the user can decide whether to include them. Don't assume they belong in the commit.
- **Nothing to commit** — if `git status -s` is empty, say so and stop.
- **Version bumps** — match the existing pattern: `chore(release): vX.Y.Z`
