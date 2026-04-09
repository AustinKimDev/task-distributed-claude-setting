#!/bin/bash
# Main Branch Protection - PreToolUse Hook for Edit|Write
# Blocks file edits when on main/master branch, but ONLY for files inside the current git repo.

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | node -e "
  let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{
    try{console.log(JSON.parse(d).tool_name||'')}catch{console.log('')}
  })
" 2>/dev/null)

# Only check Edit and Write tools
if [[ "$TOOL_NAME" != "Edit" && "$TOOL_NAME" != "Write" ]]; then
  echo '{}'
  exit 0
fi

# Extract file_path from tool input
FILE_PATH=$(echo "$INPUT" | node -e "
  let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{
    try{const p=JSON.parse(d);console.log(p.tool_input?.file_path||'')}catch{console.log('')}
  })
" 2>/dev/null)

# If no file path, allow
if [[ -z "$FILE_PATH" ]]; then
  echo '{}'
  exit 0
fi

# Get the git repo root for the TARGET FILE (not the cwd)
FILE_DIR=$(dirname "$FILE_PATH")
REPO_ROOT=$(git -C "$FILE_DIR" rev-parse --show-toplevel 2>/dev/null)
if [[ -z "$REPO_ROOT" ]]; then
  echo '{}'
  exit 0
fi

# Only protect files inside the repo
case "$FILE_PATH" in
  "$REPO_ROOT"/*)
    ;;
  *)
    # File is outside the repo — allow
    echo '{}'
    exit 0
    ;;
esac

# Get current branch for the TARGET FILE's repo (handles worktrees correctly)
BRANCH=$(git -C "$FILE_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null)

if [[ "$BRANCH" == "main" || "$BRANCH" == "master" ]]; then
  echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Cannot edit files on main/master branch. Create a feature branch first."}}'
  exit 0
fi

echo '{}'
exit 0
