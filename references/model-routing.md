# Model Routing & Thinking Policy

Opus (main session) is the orchestrator. It classifies, plans, dispatches, and synthesizes.
Actual work is delegated to subagents — opus does NOT do implementation directly.

## Orchestration Pattern

```
User request
  → Opus: classify, plan, decompose
    → Subagent A (sonnet/haiku): implement task 1  ─┐
    → Subagent B (sonnet/haiku): implement task 2  ─┤ parallel
    → Subagent C (sonnet/haiku): implement task 3  ─┘
  → Opus: synthesize results, resolve conflicts, present merge report
```

Even single tasks: opus plans → sonnet subagent executes → opus reviews.
Exception: Fast tasks (1-2 file text/comment changes) — opus may handle directly.

## Model Selection Table

| Difficulty | Model | When to use |
| --- | --- | --- |
| **Trivial** | haiku | File exploration, simple search, glob/grep wrapping, format conversion, simple text generation |
| **Moderate** | sonnet | Single-file edits, bug fixes, test writing, code review, refactoring, general implementation |
| **Complex** | opus | Architecture design, multi-file cascading changes, security audits, complex debugging, tasks requiring judgment calls |

## Rules

1. **Default subagent model is sonnet.** Use sonnet unless there is an explicit reason for another model.
2. **Exploration/search-only subagents use haiku.** Explore-type agents, simple file lookups, etc.
3. **Use opus subagents sparingly.** Only for architecture decisions, complex multi-step reasoning, and Critical-classified tasks.
4. **Always specify the model parameter when spawning subagents.** Never omit it.
5. **Opus main session orchestrates, not implements.** Opus decomposes tasks, dispatches subagents, and synthesizes.
6. **Parallel by default.** Independent subtasks → parallel subagents. Sequential only when hard dependency exists.

## Model per Agent Role

| Agent role | Model | Rationale |
| --- | --- | --- |
| Explore / search / file lookup | haiku | Read-only, no reasoning needed |
| Implementation (single concern) | sonnet | Standard coding, well-scoped |
| Test writing | sonnet | Mechanical, pattern-based |
| Code review | sonnet | Analysis within bounded scope |
| Documentation | sonnet | Straightforward writing |
| Architecture / design decisions | opus | Multi-factor trade-off reasoning |
| Security audit | opus | Requires deep adversarial thinking |
| Complex debugging (multi-file) | opus | Cross-cutting root cause analysis |
| Merge conflict resolution | opus | Requires understanding both sides |

## Thinking Mode

Do not use deep thinking for every task. Decide based on task complexity.

- **Thinking NOT needed**: Simple edits, text changes, search, file creation, formatting
- **Thinking needed**: Architecture design, complex bug analysis, trade-off comparisons, security audits, multi-step reasoning

Default is thinking OFF. Only enable when complex reasoning is required.

## Integration with Parallel Strategy

When dispatching parallel agents (see parallel-strategy.md):
- Each agent MUST have model explicitly set per this table
- Mixed models in a parallel batch is expected and correct (e.g., haiku for search + sonnet for implementation)
- The orchestrator (opus) waits for all agents, then synthesizes

When handing off between agents (see agent-handoff.md):
- Successor agent model is chosen independently based on ITS task difficulty
- A haiku search agent can hand off to a sonnet implementation agent
