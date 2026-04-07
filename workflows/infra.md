# Workflow: Infrastructure Change

Classification: **Critical**
Branch: `chore/infra-[description]`

⚠️ /guard must be activated FIRST.

## Skill Hooks

| Step | Active Skills | Notes |
|---|---|---|
| STEP 1 | /guard (gstack) | Activate safety mode immediately. Snapshot current config |
| STEP 2A | plan-eng-review | Architecture impact, cost analysis, rollback plan |
| STEP 2B | writing-plans | Step-by-step with verification at each step |
| STEP 3 | devops-engineer (Fullstack Dev) | IaC changes, config updates |
| STEP 4 | Build + test (staging FIRST, always) | Never apply to production without staging verification |
| STEP 5 | /review, /cso (if security boundary changes) | Focus on: misconfig, exposed ports, permission drift |
| Post-merge | /canary (gstack) | Continuous monitoring post-deploy |

## Merge Report
Must include:
- Changed components (services, configs, networking)
- Cost impact (if any)
- Rollback procedure (exact steps)
- Deploy order (if multiple services involved)

## Example
"Redis 캐시 레이어 추가해줘"
→ STEP 1: /guard 활성화 + 현재 인프라 스냅샷
→ STEP 2A: "ElastiCache vs self-hosted, 비용 비교, 장애 시 폴백"
→ STEP 3: Terraform 변경 + 앱 캐시 클라이언트 코드
→ STEP 4: 스테이징에서 캐시 히트/미스 검증
→ Post-merge: /canary → 메모리 사용량, 레이턴시 모니터링
→ 머지 리포트: "ElastiCache t3.micro ($15/mo), 롤백: 환경변수 REDIS_URL 제거로 폴백"