# Workflow: Documentation Update

Classification: **Fast or Standard**
Branch: `docs/[description]`

## Skill Hooks

| Step | Active Skills | Notes |
|---|---|---|
| STEP 1 | (simplified) | Identify what changed and what docs are stale |
| STEP 2 | (simplified) | — |
| STEP 3 | /document-release (gstack) | Auto-update docs from diff |
| STEP 4 | Build only (no tests needed) | No logic change |
| STEP 5 | (skip) | No code review needed for docs |

## Skipped Skills
- All planning, design, QA, security skills
- TDD (no logic)

## Notes
- Fast if 1-2 doc files, no ambiguity
- Standard if restructuring docs or writing new architecture docs