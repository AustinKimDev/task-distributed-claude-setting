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

## Task Classification

On receiving a task, declare classification FIRST before doing anything else.

이 작업을 [Fast / Standard / Critical]으로 분류했습니다.
이유: [one line]

### Confirmation

- **Fast**: Proceed immediately. Post-task report only.
- **Standard**: Wait for confirmation. Approval at STEP 2.
- **Critical**: Wait for confirmation. Approval at STEP 2A.
- User already declared classification → accept, no re-confirm.

### Fast

All true simultaneously: 1-2 files, no logic change, no Breaking Change.
Text/comment/style changes exempt from test conditions.

### Standard

Feature dev, bug fix, refactor, dependency update.
classify → confirm → STEP 2 (1 approval) → worktree → implement → verify → merge report

### Critical

DB schema, public API contract, auth/permission, infrastructure.
classify → confirm → STEP 2A/2B (2 approvals) → worktree → implement → verify → merge report

### Multi-Task

Multiple tasks at once → always decompose. Each gets own classification, worktree, agent.
All decomposed tasks run in parallel via separate sub-agents, each with own worktree.

이 요청을 N개 작업으로 분리했습니다.

1. [task] → [classification] → [branch] → Agent A
2. [task] → [classification] → [branch] → Agent B
   File conflicts: [none / list]
   → All tasks run in parallel. Each agent runs independent Inner Work Loop.

---

## Workflow Routing

After classification, read the matching workflow file from `.claude/workflows/` and follow its procedure.
The workflow file defines which skill hooks to activate or skip for each task type.

| Task Type                | Classification          | File                           |
| ------------------------ | ----------------------- | ------------------------------ |
| New project setup        | Critical                | workflows/new-project.md       |
| New feature              | Standard                | workflows/new-feature.md       |
| Improvement / Refactor   | Standard                | workflows/refactor.md          |
| Bug investigation        | — (no worktree)         | workflows/bug-investigation.md |
| Bug fix                  | Standard                | workflows/bug-fix.md           |
| Performance optimization | Standard                | workflows/performance.md       |
| Security hardening       | Critical                | workflows/security.md          |
| Test writing             | Standard                | workflows/testing.md           |
| Doc update               | Fast or Standard        | workflows/docs.md              |
| Code review              | — (no worktree)         | workflows/code-review.md       |
| Dependency update        | Standard                | workflows/deps-update.md       |
| Emergency hotfix         | Critical (shortcuts OK) | workflows/hotfix.md            |
| Legacy migration         | Critical                | workflows/legacy-migration.md  |
| DB schema change         | Critical                | workflows/db-schema.md         |
| UI/UX improvement        | Standard                | workflows/ui-ux.md             |
| Infrastructure change    | Critical                | workflows/infra.md             |

No matching workflow → follow default Inner Work Loop.

---

## Inner Work Loop

⚠️ Every step runs inside the worktree. Never touch main branch directory.
Each step has skill hooks that auto-fire when applicable. Workflow files can skip or override hooks.
Skills are MANDATORY when their trigger condition is met — do not skip to the next step until all applicable hooks have run.

### Outer Loop

1. CLASSIFY → Fast: proceed / Standard+Critical: wait
2. CREATE worktree (.worktrees/[branch]) or branch (Fast)
3. RUN Inner Work Loop (STEP 1-5, see references/step-details.md)
4. PRESENT merge report → wait for approval or feedback
5. MERGE (after approval):
   - Verify all changes in worktree are committed (no uncommitted changes allowed)
   - `cd [project root]` (main branch directory)
   - `git merge [worktree-branch]` ← MUST use git merge. Never apply changes by directly writing/editing files in main.
   - ⚠️ NEVER apply changes by directly writing/editing files in main. Always use git merge.
6. CLEANUP:
   - `git worktree remove .worktrees/[branch-name]`
   - `git branch -d [branch-name]` (optional cleanup)

### Step Summary

| STEP                | Purpose                                                            | Reference                                                                                    |
| ------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| 1. Discovery        | Understand problem, confirm scope                                  | references/step-details.md                                                                   |
| 2. Planning         | Lock approach, evaluate libraries, design parallelization          | references/step-details.md, references/library-selection.md, references/parallel-strategy.md |
| 3. Implementation   | Write code in worktree, TDD, 1 change = 1 commit                   | references/step-details.md                                                                   |
| 4. Build & Test     | Build, lint, run tests                                             | references/step-details.md                                                                   |
| 5. Review & QA      | Quality verification (Fast: skip, Standard: light, Critical: full) | references/step-details.md                                                                   |
| 6. Pre-Merge Report | Write merge report                                                 | references/merge-report.md                                                                   |

Parallelization strategy: references/parallel-strategy.md
Worktree policy: references/worktree-policy.md
Agent handoff: references/agent-handoff.md

---

## Skill Routing

When the user's request matches a trigger below, invoke the skill as FIRST action.
Do NOT answer directly. Do NOT use other tools first.

| Trigger                       | Skill               | Purpose                                  |
| ----------------------------- | ------------------- | ---------------------------------------- |
| 새 아이디어, "만들 가치 있나" | office-hours        | Reframe + design doc                     |
| "전체 리뷰해줘"               | autoplan            | CEO→Design→Eng auto review               |
| 설계 검토, 아키텍처           | plan-eng-review     | Finalize architecture, edge cases        |
| 버그, 에러, "왜 안 돼"        | investigate         | Hypothesis-based root cause analysis     |
| "코드 리뷰해줘"               | /review             | Detect production bugs                   |
| "보안 점검"                   | /cso                | OWASP+STRIDE analysis                    |
| "디자인이 별로"               | /critique → /audit  | UX + technical diagnosis                 |
| "디자인 시스템 만들자"        | design-consultation | Research + build design system           |
| 디자인 시안 필요              | design-shotgun      | Multiple mockups → compare → pick        |
| 배포, PR, "배포해줘"          | /ship               | Sync main → test → PR                    |
| "프로덕션 반영"               | /land-and-deploy    | Merge PR → CI → health check             |
| "스테이징 테스트"             | /qa [url]           | Browser test → fix → re-verify           |
| 성능, "느려"                  | /benchmark          | Core Web Vitals baseline                 |
| "배포 후 모니터링"            | /canary             | Error/perf monitoring loop               |
| "문서 업데이트"               | /document-release   | Diff-based doc update                    |
| "이번 주 회고"                | /retro              | Deploy streak, test health               |
| "이거 기억해"                 | /learn              | Save session learnings                   |
| "조심해"                      | /guard              | Activate /careful + /freeze              |
| 아이디어 구조화 필요          | brainstorming       | Expose assumptions, explore alternatives |
| 태스크 분해 필요              | writing-plans       | Break into 2-5 min tasks                 |

### Always Active (auto-fires on every interaction)

- Writing code → test-driven-development
- Bug or error mentioned → systematic-debugging
- Claiming "done" → verification-before-completion
- UI/frontend context → Impeccable commands available
- Tech stack keyword → Fullstack Dev expert activates
- Marketing context → Marketing skills activate

---

## Safety Rules

### Ambiguity

- One focused question only: "~로 이해했는데, [question]이 맞나요?" (use this Korean format)
- Two valid interpretations → present both, ask which
- Never assume silently

### Scope

- Fix only what was asked
- Adjacent issue → "작업 중 [issue] 발견. 이번 PR에 포함할까요, 별도 처리할까요?" (use this Korean format)
- Never silently expand

### Breaking Changes

Stop and ask BEFORE any of these — ALL tiers:

- Public API contract / DB schema / auth logic / env vars
- External service integration / coordinated deploy / irreversible migration
- New major dependency addition or existing dependency replacement
- Format: "⚠️ 이 변경은 [scope]에 영향을 미칩니다. 계속 진행할까요?" (use this Korean format)

### Forbidden Without Approval

- Modify main branch directly
- Apply changes to main by writing/editing files directly instead of git merge
- Leave changes uncommitted in worktree
- Drop/truncate tables
- Change API endpoints or response shapes
- Add/rename env vars
- Force-push any branch
- Delete non-temporary files
- Merge without merge report
- Expand scope beyond request
- Skip tests for logic changes
- Deploy without staging validation
- Install dependencies not approved in STEP 2

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

---

## LLM Wiki — Your Persistent Brain

The Obsidian vault IS your long-term memory. Treat it as your brain, not an optional reference.

Vault: `<YOUR_OBSIDIAN_VAULT_PATH>` (e.g. `~/Library/Mobile Documents/com~apple~CloudDocs/obsidian/my-vault/`)
Schema: vault의 `_위키-스키마.md` 참조. hooks가 자동으로 트리거함.

### BEFORE Starting Work (MANDATORY)

1. **Read the wiki index** — scan `_위키-스키마.md` and relevant topic files in the vault.
2. **Search for related notes** — grep the vault for keywords related to the current task (project name, tech stack, domain terms).
3. **Apply what you find** — prior decisions, gotchas, patterns, preferences. Do NOT re-discover what is already documented.

Skipping this step = ignoring your own past knowledge. Do not do it.

### AFTER Completing Work (MANDATORY)

1. **Record learnings** — new decisions, gotchas, patterns discovered during the task.
2. **Update existing notes** — if prior notes are outdated or incomplete, fix them.
3. **Link related notes** — connect new knowledge to existing entries.

Follow the vault's `_위키-스키마.md` for formatting rules.

### What to Record

- Architecture decisions and WHY (not just what)
- Gotchas and workarounds that cost time
- Library/tool evaluations and outcomes
- User preferences discovered during work
- Debugging insights that would save time next occurrence
