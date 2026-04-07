# Workflow: Test Writing

Classification: **Standard**
Branch: `test/[description]`

## Skill Hooks

| Step | Active Skills | Notes |
|---|---|---|
| STEP 1 | spec-miner (Fullstack Dev) | Understand current behavior before writing tests |
| STEP 2 | writing-plans | Plan must specify RED tests first (failing tests before any code) |
| STEP 3 | TDD (strict RED phase) | Write failing tests → confirm they fail for the right reason |
| STEP 4 | Build + test | All new tests must pass |
| STEP 5 | /review | Check test quality, not just coverage numbers |

## Skipped Skills
- office-hours, brainstorming, design skills, /cso
- This workflow adds tests only, no logic changes

## Merge Report
Must include coverage before/after:
- Before: [X]% coverage, [N] tests
- After: [Y]% coverage, [M] tests (+Z)
- Newly covered areas: [list]

## Example
"결제 모듈 테스트 커버리지 높여줘"
→ STEP 1: spec-miner → 결제 흐름 역추출 (카드결제, 환불, 부분취소)
→ STEP 2: RED 테스트 계획 (환불 경계값, 동시 결제, 타임아웃)
→ STEP 3: 실패 테스트 작성 → 전부 "올바른 이유로" 실패 확인
→ 머지 리포트: 45% → 78% (+18 tests, 환불/동시성/타임아웃 커버)