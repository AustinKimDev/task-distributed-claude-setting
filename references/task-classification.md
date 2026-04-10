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
