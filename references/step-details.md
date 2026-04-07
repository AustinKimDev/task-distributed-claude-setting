# Inner Work Loop — Step Details

Read this file when executing each STEP.

---

## STEP 1 — Discovery

Purpose: Understand the real problem before writing any code.

Think through:
- What is actually being asked? What is NOT?
- Constraints, failure modes, affected areas
- Simplest possible solution first
- Can this task be split into parallel workstreams? (evaluate early)

Skill hooks:
- office-hours — New feature idea, direction unclear
- brainstorming — Vague idea, multiple valid approaches

⚡ office-hours + brainstorming can run in parallel.
Standard: skip to STEP 2 if scope is already clear.

---

## STEP 2 — Planning & Design

Purpose: Lock down approach, plan implementation, evaluate libraries, design parallelization.

#### Standard — Unified Proposal (1 approval)

## 제안 및 계획: [task]
### 이해한 내용
### 제약사항 및 리스크
### 접근법
### 라이브러리 & 도구
### 작업 목록 (file/layer — what to do — done criteria)
### 병렬화 계획
### 완료 기준
이대로 진행할까요?
→ PAUSE.

#### Critical — Two-phase approval

STEP 2A — Direction + alternatives + library candidates → PAUSE.
STEP 2B — Work list + parallelization plan + completion criteria → PAUSE.

#### Library & Tool Selection

See references/library-selection.md.

Skill hooks — Planning:
- autoplan — New project or large feature, multi-dimensional review needed
- plan-eng-review — Backend logic, API design, data model decisions
- writing-plans — After approach approved, break into tasks before implementation

⚡ Sequential: autoplan → plan-eng-review → writing-plans

Skill hooks — Design (when UI/frontend involved):
- /teach-impeccable — First time only per project (when .impeccable.md missing)
- design-shotgun — New UI with no existing design reference
- design-html — After design-shotgun direction is picked
- /typeset + /arrange — New page/component with significant text content

---

## STEP 3 — Implementation

Purpose: Write code inside the worktree. 1 logical change = 1 commit.

Rules:
- All edits inside worktree only. Never modify main branch directory.
- ⚠️ Every logical change MUST be committed. Uncommitted changes = incomplete work.
- Unexpected issue → Stop → Report with A/B alternatives → Wait
- Do NOT silently fix adjacent issues
- If parallelization plan exists, dispatch agents NOW. Assign model per references/model-routing.md.
- Install approved libraries before writing code that depends on them.

Skill hooks:
- test-driven-development — Auto-fires for all logic. RED→GREEN→REFACTOR
- executing-plans — When writing-plans produced 5+ tasks
- dispatching-parallel-agents — 3+ independent tasks, no file overlap
- /clarify — UI with user-facing text
- /animate — UI with state transitions, interactive elements

---

## STEP 4 — Build & Test

Purpose: Mechanical verification. Build, lint, test.

- Run build command + linter/formatter
- Run full test suite
- Logic change → new tests must exist (from STEP 3 TDD)
- Bug fix → regression test must exist
- 3 consecutive failures → Stop, report with A/B alternatives

---

## STEP 5 — Review & QA

Purpose: Quality verification after build passes. Catch issues humans and linters miss.

### Review scope by tier

**Fast**: Skip review. STEP 4 passes → completion report.

**Standard**:
- /review (code quality)
- Conditional: /cso (auth/input/API changes), /audit (UI changes)
- → /polish (always last)

**Critical**:
⚡ Run in parallel (model per references/model-routing.md):
- Sub-agent 1 (sonnet): /review
- Sub-agent 2 (sonnet): /cso
- Sub-agent 3 (sonnet): /audit + /critique (when UI involved)
- Sub-agent 4 (sonnet): /qa (when staging URL available)
↓ Synthesize all findings
→ /harden (fix audit issues)
→ /polish (always last)

Skill hooks — Code review:
- verification-before-completion — Auto-fires before declaring done
- /review — Detect bugs that pass CI but break in production
- /cso — OWASP+STRIDE, when auth/input/API/data storage changes

Skill hooks — UI quality:
- /audit — a11y, performance, responsive inspection
- /critique — Visual hierarchy, clarity, AI slop detection
- /harden — ARIA, touch targets 44px, focus, i18n
- /polish — Alignment, missing states, transitions (always last)

Skill hooks — QA:
- /qa — Real browser testing, fix bugs then re-verify
- /benchmark — Core Web Vitals, before/after comparison

⚡ /benchmark + /qa can run in parallel.

---

## STEP 6 — Pre-Merge Report

Deferred questions first:

## 구현 중 확인이 필요한 사항
1. [question] — [context]

Then merge report (see references/merge-report.md).

---

## Post-Merge — Ship & Reflect

- /ship — Sync main, test, coverage, push, open PR
- /land-and-deploy — Merge PR → CI → verify production health
- /canary — Post-deploy console error/perf regression monitoring
- /document-release — Diff-based doc update
- /retro — Weekly retrospective
- /learn — Save session learnings

⚡ /document-release + /learn can run in parallel.
