# Workflow: Dependency Update

Classification: **Standard** (never Fast)
Branch: `chore/deps-[date]`

## Skill Hooks

| Step | Active Skills | Notes |
|---|---|---|
| STEP 1 | (baseline) | Run full test suite BEFORE any changes → establish baseline |
| STEP 2 | writing-plans | Group updates: patch vs minor vs major. Major = separate commits |
| STEP 3 | (no TDD needed) | Update deps, resolve conflicts |
| STEP 4 | Build + full test suite | Compare against baseline. Any new failures = investigate |
| STEP 5 | /review | Check for breaking API changes in updated packages |

## Skipped Skills
- office-hours, brainstorming, design skills, /cso (unless security patch)

## Merge Report
Must include:
- Updated packages list (name: old → new)
- Major version changes highlighted
- Breaking changes noted (if any)
- Test results: baseline vs post-update

## Example
"의존성 업데이트해줘"
→ STEP 1: 기존 테스트 42개 전부 통과 확인 (baseline)
→ STEP 2: patch 12개 (일괄), minor 3개 (개별), major 1개 (별도 커밋)
→ STEP 5: /review → major 업데이트에서 API 변경 감지
→ 머지 리포트: 16 packages updated, 1 major (next-auth 4→5, 마이그레이션 포함)