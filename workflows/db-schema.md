# Workflow: DB Schema Change

Classification: **Critical**
Branch: `feat/[name]` or `chore/[name]`

⚠️ Breaking Change Protocol auto-applied.

## Skill Hooks

| Step | Active Skills | Notes |
|---|---|---|
| STEP 1 | database-optimizer + postgres-pro (Fullstack Dev) | Analyze impact: which tables, which queries, which services |
| STEP 2A | Notify user: affected tables/columns, migration plan, rollback feasibility | User must understand full impact before approving |
| STEP 2B | writing-plans | Plan MUST include: migration script + rollback script + verification query |
| STEP 3 | TDD | Test migration up AND down. Test queries with new schema |
| STEP 4 | Build + test (local → staging order) | Verify locally first, then staging. Never skip staging |
| STEP 5 | /review | Focus on: data integrity, migration safety, index impact |
| Post-merge | /canary, /learn | Monitor query performance post-migration |

## Merge Report
Must include:
- Schema diff (tables/columns changed)
- Migration execution order
- Rollback procedure (exact commands)
- Estimated migration duration for production data volume

## Example
"사용자 테이블에 subscription_tier 컬럼 추가해줘"
→ STEP 1: 영향 분석 → users 테이블 (500K rows), 관련 쿼리 12개
→ STEP 2A: "nullable VARCHAR 추가 → 기본값 'free' → 이후 NOT NULL 변경" 2단계 제안
→ STEP 2B: 마이그레이션 + 롤백 스크립트 + 검증 쿼리 계획
→ STEP 4: 로컬 → 스테이징 순서 검증
→ 머지 리포트: "ALTER TABLE 예상 3초 (500K rows), 롤백: ALTER TABLE DROP COLUMN"