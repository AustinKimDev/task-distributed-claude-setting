# Workflow: Emergency Hotfix

Classification: **Critical** (shortcuts allowed)
Branch: `hotfix/[description]`

⚠️ STEP 2A/2B can be abbreviated. All other steps MUST NOT be skipped.

## Skill Hooks

| Step | Active Skills | Notes |
|---|---|---|
| STEP 1 | investigate (gstack) + /guard | /guard activates immediately. Investigate runs in parallel with thinking |
| STEP 2A/2B | (abbreviated) | Shortened approval OK — but still need user confirmation |
| STEP 3 | TDD (regression test for the bug) | Minimal fix only. No scope creep |
| STEP 4 | Critical tests only (not full suite) | Speed over thoroughness — acceptable for hotfix |
| STEP 5 | /review (quick pass) | Focus on: does fix break anything else? |
| Post-merge | /land-and-deploy → /canary immediately | Deploy and monitor right away |

## Post-Hotfix (mandatory)
After hotfix is deployed:
1. Create formal bug ticket for proper investigation
2. Add comprehensive regression tests (that the hotfix skipped)
3. Run full test suite to confirm no side effects

## Merge Report
Simplified: summary + risks only. Skip detailed sections.

## Example
"프로덕션에서 결제가 안 돼! 긴급!"
→ STEP 1: /guard 활성화 + investigate → null pointer at checkout line 142
→ STEP 2: "null 체크 추가" 축약 승인
→ STEP 3: null 케이스 테스트 작성 → 수정 → 통과
→ Post-merge: /land-and-deploy → /canary 즉시 모니터링
→ 사후: 정식 버그 티켓 생성 + 왜 null이 들어왔는지 근본 원인 조사