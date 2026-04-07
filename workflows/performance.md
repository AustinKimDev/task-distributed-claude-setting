# Workflow: Performance Optimization

Classification: **Standard**
Branch: `perf/[description]`

## Skill Hooks

| Step | Active Skills | Notes |
|---|---|---|
| STEP 1 | /benchmark (gstack) | Baseline measurement REQUIRED before any optimization |
| STEP 1 | database-optimizer + monitoring-expert (Fullstack Dev) | If DB-related perf issue |
| STEP 2 | plan-eng-review, writing-plans | Approach based on measured bottleneck, not guessing |
| STEP 3 | TDD | Performance test as part of TDD where possible |
| STEP 4 | Build + test + /benchmark (re-run) | Before/after numbers mandatory |
| STEP 5 | /review | Check for correctness regression |
| Post-merge | /learn | Record what optimization worked and by how much |

## Skipped Skills
- office-hours, brainstorming (problem is measurable, not vague)
- Design skills (no UI change)
- /cso (unless optimization touches auth/security paths)

## Merge Report
Must be numbers-focused:
- Metric: [what was measured]
- Before: [value]
- After: [value]
- Improvement: [percentage]

## Example
"API 응답이 2초 넘게 걸려"
→ STEP 1: /benchmark → GET /api/places P95 = 2.3s, DB query = 1.8s
→ STEP 1: database-optimizer → N+1 쿼리 발견, 인덱스 누락 확인
→ STEP 2: "JOIN으로 변경 + 복합 인덱스 추가" 제안
→ STEP 3: TDD (응답시간 500ms 이하 테스트)
→ STEP 4: /benchmark 재실행 → P95 = 0.4s (83% 개선)