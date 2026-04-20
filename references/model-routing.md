# Model Routing & Thinking Policy

Opus (main session) orchestrates: classifies, plans, dispatches, synthesizes.
Subagents execute. Opus does NOT implement directly.
Exception: Fast-classified tasks (1–2 file text/comment changes) — opus may handle in-session.

Three independent axes control cost/quality:
1. **Model** — which Claude model (capability tier)
2. **Effort** — reasoning budget (low / medium / high)
3. **Thinking** — extended thinking ON/OFF (and budget when ON)

Choose each axis separately. Do not collapse them.

---

## Current Model Lineup (2026-04)

| Model | ID | Strengths | Typical use |
| --- | --- | --- | --- |
| **Opus 4.7** | `claude-opus-4-7` (1M context available) | Deepest reasoning, large-context synthesis | Orchestration, architecture, security audit, cross-repo analysis |
| **Sonnet 4.6** | `claude-sonnet-4-6` | Balanced quality/speed, strong coding | Default implementation, test writing, code review |
| **Haiku 4.5** | `claude-haiku-4-5-20251001` | Fast, cheap, good at structured tasks | File exploration, search, format conversion |

**1M context** (Opus 4.7): enable when task genuinely needs it (large codebase read, multi-repo synthesis, long transcript analysis). Default to standard context otherwise — 1M has higher cost/latency.

---

## Axis 1 — Model Selection

| Difficulty | Model | When to use |
| --- | --- | --- |
| **Trivial** | haiku | Read-only exploration, glob/grep wrapping, format conversion, simple text generation |
| **Moderate** | sonnet | Single-concern edits, bug fixes, test writing, code review, refactoring, standard implementation |
| **Complex** | opus | Architecture, multi-file cascading change, security audit, complex debugging, judgment-heavy trade-offs |

Default subagent model: **sonnet**. Override only with explicit reason.

## Axis 2 — Effort (reasoning budget)

Effort controls how much deliberation the model performs before responding. Orthogonal to model choice.

| Effort | When to use |
| --- | --- |
| **low** | Mechanical tasks with clear spec — formatting, renames, obvious fixes, lookups |
| **medium** | Default. Most implementation and review work |
| **high** | Trade-off decisions, subtle bugs, ambiguous requirements, security-sensitive paths |

Rules:
- Default is **medium**.
- Do not pair `haiku + high` — wasted budget, haiku's ceiling isn't in reasoning depth.
- Do not pair `opus + low` — if the task is low-effort, sonnet handles it cheaper.
- Valid high-value combos: `sonnet + high` (nuanced single-domain work), `opus + high` (architecture, cross-cutting).

## Axis 3 — Thinking (extended thinking)

Thinking ON = model produces a visible reasoning trace before response. Costs latency + tokens.

| State | When to use |
| --- | --- |
| **OFF** | Simple edits, text changes, search, file creation, formatting, known patterns |
| **ON (low budget)** | Multi-step planning, design decisions under constraints |
| **ON (high budget)** | Architecture design, complex bug root-cause, security audits, trade-off comparisons |

Default: **OFF**. Enable only when the reasoning trace itself adds value (planning, debugging narrative, audit rationale). Interleaved thinking (thinking between tool calls) is appropriate for multi-step debugging and orchestration.

---

## Combined Decision Matrix

Pick the row that matches the task. These are defaults — override with reason.

| Task pattern | Model | Effort | Thinking |
| --- | --- | --- | --- |
| File exploration, glob/grep, read-only lookup | haiku | low | OFF |
| Format conversion, rename, mechanical edit | haiku | low | OFF |
| Single-file bug fix with known cause | sonnet | medium | OFF |
| Test writing (pattern-based) | sonnet | medium | OFF |
| Code review (bounded scope) | sonnet | medium | OFF |
| Documentation update | sonnet | low | OFF |
| Multi-file refactor | sonnet | high | ON (low) |
| Subtle bug, unclear cause | sonnet | high | ON (low) |
| Architecture / API design | opus | high | ON (high) |
| Security audit | opus | high | ON (high) |
| Cross-repo / large-context synthesis | opus (1M) | high | ON (high) |
| Merge conflict resolution (semantic) | opus | high | ON (low) |
| Orchestration / decomposition (main session) | opus | medium | ON (low) |

---

## Orchestration Pattern

```
User request
  → Opus (main): classify, plan, decompose
    → Subagent A (per matrix): task 1  ─┐
    → Subagent B (per matrix): task 2  ─┤ parallel
    → Subagent C (per matrix): task 3  ─┘
  → Opus: synthesize, resolve conflicts, merge report
```

Single-task flow: opus plans → sonnet subagent executes → opus reviews.

## Rules

1. **Always specify `model` on subagent dispatch.** Never omit.
2. **Opus main session orchestrates, not implements.** Only Fast-classified tasks exception.
3. **Default subagent: sonnet + medium + thinking OFF.** Deviations need reason.
4. **Exploration/search subagents: haiku + low + thinking OFF.**
5. **Parallel by default** for independent subtasks (see parallel-strategy.md).
6. **Mixed configs in a parallel batch are expected** — e.g., haiku/low search + sonnet/medium impl.

## Notes on API vs Harness

- Agent tool `model` param accepts `haiku` / `sonnet` / `opus` — resolves to the harness-pinned version.
- **Effort** and **thinking** are typically controlled at the harness/API layer, not per-Agent-tool-call. When they are not exposed on dispatch, treat this matrix as guidance for harness defaults and for judging whether to escalate a task to opus orchestration.
- 1M context is a session-level control — mention to the user when the task would clearly benefit.

## Cross-references

- **parallel-strategy.md** — when to fan out, worktree boundaries
- **agent-handoff.md** — successor model chosen independently by its own task difficulty
- **task-classification.md** — Fast / Standard / Critical → influences effort + thinking defaults
