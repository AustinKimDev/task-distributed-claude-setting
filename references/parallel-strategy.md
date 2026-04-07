# Parallel Execution Strategy

Default mindset: parallelize aggressively. Single-agent sequential is the wrong default.
Use teammate mode (teammateMode) or sub-agents (Task tool) to run independent work simultaneously.
Every Standard/Critical task MUST include a parallelization evaluation at STEP 2.

**Model selection**: Each agent MUST have its model explicitly set per references/model-routing.md.
Mixed models in a parallel batch is expected (e.g., haiku for search + sonnet for implementation).

## Task-level parallelization — MANDATORY evaluation at STEP 2

Before writing any code, evaluate whether the task can be split into parallel workstreams.
This is NOT optional. The STEP 2 proposal MUST include a parallelization plan.

Single-layer task (e.g. backend-only bug fix):
→ single agent, single worktree. Parallel within skills only.

Multi-layer task (e.g. fullstack feature with backend + frontend):
→ MUST split into parallel agents with separate worktrees. Assign model per references/model-routing.md.
Agent A (sonnet): backend (API, DB, logic) → own worktree
Agent B (sonnet): frontend (UI, components) → own worktree
Agent C (sonnet): tests → waits for handoff, then own worktree
→ Each agent runs STEP 3-5 independently.
→ Results merge before STEP 6.

Multi-concern task (e.g. feature + docs + tests):
→ MUST split into parallel agents. Assign model per references/model-routing.md.
Agent A (sonnet): feature implementation
Agent B (sonnet): documentation (parallel)
Agent C (sonnet): integration tests (after A handoff)

Decision tree:
Task touches 1 layer, 1 concern → single agent OK
Task touches 2+ layers → MUST parallelize by layer
Task touches 2+ concerns → MUST parallelize by concern
3+ independent subtasks exist → MUST use dispatching-parallel-agents

## Within a STEP — run independent skills in parallel

Multiple skills at the same STEP that don't depend on each other's output → run simultaneously via sub-agents.
Synthesize all results before proceeding to the next STEP.

## Across STEPs — pipeline different concerns

Agents can work on different STEPs simultaneously as long as dependencies are respected.

## Skill parallelization patterns

Independent (always parallel):
/review + /cso
/audit + /critique
/benchmark + /qa
office-hours + brainstorming

Sequential (must wait):
/audit → /harden
/critique → /bolder or /quieter
design-shotgun → design-html
writing-plans → executing-plans
everything → /polish (always last)

## When NOT to parallelize

- Hard dependency between outputs
- File conflict between agents
- User approval gates (STEP 2 pause)
