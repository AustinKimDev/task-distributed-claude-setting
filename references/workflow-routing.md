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
| Design live pick (feature list → live variant picking) | Standard | workflows/design-live-pick.md |
| Infrastructure change    | Critical                | workflows/infra.md             |

No matching workflow → follow default Inner Work Loop.
