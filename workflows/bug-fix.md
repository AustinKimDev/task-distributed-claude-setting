# Workflow: Bug Fix

Classification: **Standard**
Branch: `fix/[description]`

## Pre-condition
If no investigation exists → run Bug Investigation workflow first.

## Skill Hooks

| Step | Active Skills | Notes |
|---|---|---|
| STEP 1 | (skip if investigation already done) | Use investigation report as input |
| STEP 2 | writing-plans | Plan MUST include regression test for the exact bug |
| STEP 3 | TDD (always) | Write regression test FIRST (must fail), then fix (must pass) |
| STEP 4 | Build + test | Regression test must be in the suite |
| STEP 5 | /review, /qa (if UI bug) | Focus: does fix actually resolve the bug? Any side effects? |
| Post-merge | /learn | Record root cause for future reference |

## Skipped Skills
- office-hours, brainstorming (problem is already identified)
- Design skills (unless bug is visual)
- autoplan (scope is narrow)

## Merge Report
Must include: root cause / what was fixed / how recurrence is prevented

## Example
"결제 웹훅 타임아웃 버그 수정" (investigation에서 A안 선택됨)
→ STEP 2: 계획에 "재시도 큐 추가 + 웹훅 타임아웃 재현 테스트" 포함
→ STEP 3: 먼저 타임아웃 시 실패하는 테스트 작성 → 재시도 로직 구현 → 테스트 통과
→ STEP 5: /review (재시도 무한루프 가능성 체크)
→ 머지 리포트: "원인: 재시도 없음 / 수정: 3회 재시도 큐 / 방지: 재시도 실패 알림 추가"