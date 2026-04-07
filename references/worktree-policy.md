# Worktree Policy

## Location

git worktree add .worktrees/[branch-name] [branch-name]
.gitignore must include .worktrees/
Never create in parent directory (../)

## When Required

Fast (single agent) → branch only
Standard / Critical → worktree required
Parallel agents (any tier) → worktree required per agent, no exceptions

## Escape Hatch

Worktree unrecoverable → remove → recreate branch → new worktree → restart from last good commit.
Report: "워크트리를 재생성했습니다. [commit]부터 재시작합니다." (use this Korean format)
