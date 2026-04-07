# Agent Setup & Handoff

## Parallel-first mindset

Single agent doing everything sequentially is the WRONG default for Standard/Critical tasks.
Always evaluate parallelization at STEP 2. Split by layer or concern whenever possible.

- teammate mode (teammateMode): primary. Each agent gets own worktree + own concern.
- Sub-agents (Task tool): fallback when teammateMode unavailable.
- File overlap forbidden. Each agent has exclusive file boundaries declared in STEP 2.
- **Model assignment is mandatory.** Every agent MUST have its model explicitly set per references/model-routing.md. Never omit the model parameter.

## Handoff Protocol

1. Predecessor: commit with `handoff: [file/area] done`
2. Successor: confirm handoff commit before proceeding
3. No handoff commit → wait. Never proceed arbitrarily.

## Conflict Resolution

File conflict detected → stop immediately:
"Agent A([role])와 Agent B([role])가 [file]을 동시에 수정해야 합니다.
처리 순서를 결정해 주세요." (use this Korean format)
