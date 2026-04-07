# Workflow: Legacy Migration

Classification: **Critical**
Branch: `chore/migration-[phase]` (separate branch per phase)

## Skill Hooks

| Step | Active Skills | Notes |
|---|---|---|
| STEP 1 | spec-miner + legacy-modernizer (Fullstack Dev) | Understand legacy behavior completely before touching anything |
| STEP 2A | plan-eng-review (gstack) | Phased plan — NEVER migrate everything at once |
| STEP 2B | writing-plans | Each phase must be independently deployable and rollbackable |
| STEP 3 | TDD | Write tests for legacy behavior FIRST, then migrate |
| STEP 4 | Build + test + /benchmark | Performance comparison: legacy vs migrated |
| STEP 5 | /review | Behavioral equivalence is the primary concern |
| Post-merge | /learn | Document migration patterns for future phases |

## Critical Rules
- Each phase gets its own worktree, branch, and merge
- Never migrate all at once — one module/layer per phase
- Each phase must be independently rollbackable
- Keep legacy and new code running in parallel until migration is verified

## Example
"jQuery 기반 프론트를 React로 마이그레이션해줘"
→ STEP 1: spec-miner → 현재 페이지별 동작 목록화 (12 pages, 34 interactions)
→ STEP 2A: "Phase 1: 공통 컴포넌트 (헤더, 사이드바) / Phase 2: 목록 페이지 / Phase 3: 폼 페이지"
→ Phase 1 STEP 3: jQuery 헤더의 동작 테스트 먼저 → React 헤더 구현 → 테스트 통과
→ Phase 1 머지 후 → Phase 2 시작 (별도 워크트리)