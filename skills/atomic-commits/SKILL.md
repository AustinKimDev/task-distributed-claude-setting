---
name: atomic-commits
description: Use when implementing any code changes — enforces committing after each logical feature, fix, or refactor is complete instead of batching all changes into one commit at the end
---

# Atomic Commits

## Core Principle

**One logical change = one commit. Commit IMMEDIATELY when a feature, fix, or refactor is complete — before starting the next change.**

## When to Commit

Commit after completing any of these:

- A bug fix (even a one-liner)
- A new feature or component
- A refactor that doesn't change behavior
- A config/infrastructure change
- A test addition or fix

**"Complete" means:** the code builds, the change is self-contained, and reverting this commit alone would cleanly undo exactly one thing.

## The Rule

```
FINISH FEATURE → COMMIT → NEXT FEATURE
```

Never:
```
FINISH FEATURE → START NEXT FEATURE → ... → COMMIT EVERYTHING
```

## Commit Process

1. Stage only files related to THIS change (not `git add .`)
2. Write a conventional commit message (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`)
3. Verify the commit was created
4. THEN start the next change

## Red Flags — STOP and Commit Now

If any of these are true, you have uncommitted work that should be a separate commit:

- You're about to edit a file for a DIFFERENT purpose than what you just finished
- You've fixed a bug and are now starting a new feature
- You've been editing for 10+ minutes without committing
- You have changes spanning 3+ unrelated files
- The user asked for multiple things and you've finished one of them

## Rationalization Table

| Excuse | Reality |
|--------|---------|
| "I'll commit everything together at the end" | Atomic commits enable selective revert. One giant commit is useless for debugging. |
| "These changes are related" | Related != same commit. A bug fix and a feature using that fix are two commits. |
| "It's just a small change, I'll include it with the next one" | Small changes deserve their own commit. That's the whole point. |
| "I'm not done with the overall task yet" | The OVERALL task isn't the unit. Each LOGICAL CHANGE is the unit. |
| "Committing now would break the flow" | Not committing breaks `git bisect`, `git revert`, and code review. |
| "The user didn't ask me to commit" | Atomic commits are a professional standard, not an optional request. |
| "I'll do it after I verify everything works together" | Each commit should build independently. If it doesn't, that's a design problem. |

## Commit Message Format

```
<type>: <what changed in one line>
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `style`, `perf`

Examples:
- `fix: prevent PM report tab from disappearing after task completion`
- `refactor: group child tasks under parent in TaskListPanel`
- `feat: add skeleton loading for action item extraction`

## What NOT to Do

- `git add .` or `git add -A` without reviewing what's staged
- Commit message that describes multiple unrelated changes ("fix report + redesign list + update diff viewer")
- Amending a previous commit to sneak in unrelated changes
- Waiting for the user to say "commit" — commit proactively after each logical unit
