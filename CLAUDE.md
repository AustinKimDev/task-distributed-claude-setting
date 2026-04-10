@RTK.md

# CLAUDE.md

## Language & Project Context

Always respond in Korean. All explanations, reports, questions, and status updates in Korean.
Code, variable names, comments, and commit messages follow project conventions.

- Project: [name]
- Stack: [backend] + [frontend/mobile] + [DB] + [infra]
- Main branch: main
- Test command: [e.g. dotnet test / npm test / pytest]
- Deploy platform: [e.g. Vercel / AWS / Railway]
- Teammate mode: [enabled / disabled]
- Stage: [MVP / beta / production]
- External services: [e.g. Stripe, LiveKit, OpenAI]
- Known constraints: [do-not-touch areas]

※ Per-project values are generated via the generate-context skill.

---

## Core Principles

1. Ask before assuming. One focused question. Do not guess.
2. Smallest safe change. Report adjacent issues — do not fix silently.
3. No surprises. Stop and ask before any destructive or breaking change.
4. Worktree first. Standard/Critical → worktree. Fast → branch only if single-agent.
5. Tests follow logic. Logic change → tests required. Style/text/doc → not required.
6. Docs follow code. Behavior change → update docs in the same PR.
7. Parallelize aggressively. Default to multiple agents with separate worktrees. Single-agent sequential is the fallback, not the default.
8. Leverage existing tools. Evaluate libraries/packages before implementing from scratch. Do not reinvent the wheel.
9. Git discipline. Every change is committed inside the worktree. Merging uses git merge, never direct file writes to main.

---

## References — Read on demand

On receiving ANY task, read task-classification.md FIRST. Then follow the chain.

| When | Read |
|------|------|
| FIRST action on ANY task — before planning, coding, or asking questions | references/task-classification.md |
| Immediately after classification — match task type to workflow file | references/workflow-routing.md |
| Executing a workflow — outer loop (worktree, merge), step sequence, skill hooks | references/inner-work-loop.md |
| User mentions a keyword/phrase that may map to a skill (e.g. "배포", "버그", "리뷰") | references/skill-routing.md |
| About to: delete, force-push, change API/schema/env, expand scope, or hit ambiguity | references/safety-rules.md |
| Session start/end, unfamiliar project context, or before asking user a question the wiki might already answer | references/llm-wiki.md |

---

## Conventions

### Branch Naming

feat/ fix/ hotfix/ refactor/ perf/ chore/ docs/ test/

### Commit Message

[type]: [description, imperative mood]

---

## Model Routing & Thinking Policy

Full specification: references/model-routing.md (MUST read before dispatching any subagent).

Summary: Opus orchestrates (classify, plan, dispatch, synthesize). Subagents do the actual work.
Default subagent model is sonnet. Exploration/search uses haiku. Opus only for complex reasoning.
Always specify the model parameter — never omit it.

