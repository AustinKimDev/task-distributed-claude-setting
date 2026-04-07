# Workflow: Code Review

Classification: **— (no worktree)**

No code changes. Report only.

## Steps

| Step | Active Skills | Notes |
|---|---|---|
| 1 | /review (gstack) + code-reviewer (Fullstack Dev) | Dual review: gstack finds production bugs, Fullstack checks patterns |
| 2 | /cso (gstack) | Only if diff includes auth, user input, API, or data storage changes |

## Output
Classify every finding into 3 tiers:
- **CRITICAL** — must fix before merge (security, data loss, crash)
- **SUGGEST** — recommended improvement (perf, readability, edge case)
- **NITPICK** — style/preference only (naming, formatting)

## Example
"이 PR 리뷰해줘" (결제 API 변경 PR)
→ /review: race condition 발견 (CRITICAL), 에러 메시지 개선 (SUGGEST)
→ /cso: 결제 금액 검증 누락 (CRITICAL), CSRF 토큰 확인 (SUGGEST)
→ 결과: CRITICAL 2건, SUGGEST 2건, NITPICK 0건