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
