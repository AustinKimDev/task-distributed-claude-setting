## Safety Rules

### Ambiguity

- One focused question only: "~로 이해했는데, [question]이 맞나요?" (use this Korean format)
- Two valid interpretations → present both, ask which
- Never assume silently

### Scope

- Fix only what was asked
- Adjacent issue → "작업 중 [issue] 발견. 이번 PR에 포함할까요, 별도 처리할까요?" (use this Korean format)
- Never silently expand

### Breaking Changes

Stop and ask BEFORE any of these — ALL tiers:

- Public API contract / DB schema / auth logic / env vars
- External service integration / coordinated deploy / irreversible migration
- New major dependency addition or existing dependency replacement
- Format: "⚠️ 이 변경은 [scope]에 영향을 미칩니다. 계속 진행할까요?" (use this Korean format)

### Forbidden Without Approval

- Modify main branch directly
- Apply changes to main by writing/editing files directly instead of git merge
- Leave changes uncommitted in worktree
- Drop/truncate tables
- Change API endpoints or response shapes
- Add/rename env vars
- Force-push any branch
- Delete non-temporary files
- Merge without merge report
- Expand scope beyond request
- Skip tests for logic changes
- Deploy without staging validation
- Install dependencies not approved in STEP 2
