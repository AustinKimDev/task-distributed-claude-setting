# Workflow: Bug Investigation (No Fix)

Classification: **— (no worktree)**

This workflow produces a report only. No code changes.

## Steps

| Step | Active Skills | Notes |
|---|---|---|
| 1 | investigate (gstack) | /freeze auto-applied. Hypothesis-based root cause analysis. Never fix without investigation |
| 2 | systematic-debugging (Superpowers) | Structured debugging, not random trial-and-error |
| 3 | /qa-only (gstack) | Report only, no code changes |

## Output
Investigation report containing:
- Root cause (confirmed or hypothesized)
- Impact scope (what else is affected)
- Reproduction conditions (exact steps)
- Fix directions: A / B / C with pros/cons each

→ Ask user to choose fix direction. If approved, switch to Bug Fix workflow.

## Example
"결제 후 주문 상태가 업데이트 안 돼"
→ investigate: /freeze 활성화 → 결제 웹훅 로그 분석 → 가설 3개 수립
→ systematic-debugging: 각 가설 검증 → 웹훅 타임아웃이 원인으로 확인
→ 보고서: "원인: 웹훅 처리 10초 초과 시 재시도 로직 없음"
  A안: 재시도 큐 추가 / B안: 타임아웃 연장 / C안: 비동기 처리 전환