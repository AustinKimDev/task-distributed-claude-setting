# Workflow: Security Hardening

Classification: **Critical**
Branch: `chore/security-[date]`

## Skill Hooks

| Step | Active Skills | Notes |
|---|---|---|
| STEP 1 | /cso (gstack) | Full OWASP+STRIDE scan first |
| STEP 1 | secure-code-guardian + security-reviewer (Fullstack Dev) | Automated + manual review |
| STEP 2A | Prioritized findings → user approves fix scope | Don't fix everything — user decides priority |
| STEP 2B | writing-plans | Plan per vulnerability, ordered by severity |
| STEP 3 | TDD | Security test for each vulnerability (exploit → fix → verify) |
| STEP 4 | Build + test | — |
| STEP 5 | /review + /cso re-scan | Verify all vulnerabilities are resolved |
| Post-merge | /canary, /learn | Monitor for exploit attempts post-deploy |

## Merge Report
Must include:
- Vulnerability severity (Critical/High/Medium/Low)
- What was fixed (with exploit scenario)
- Residual risks (what was NOT fixed and why)

## Example
"보안 점검해줘"
→ STEP 1: /cso → 5건 발견 (Critical 1, High 2, Medium 2)
  Critical: JWT 검증 없이 API 접근 가능 (exploit: curl로 토큰 없이 호출)
→ STEP 2A: "Critical + High 3건 수정. Medium 2건은 다음 스프린트" 승인
→ STEP 3: 각 취약점에 exploit 재현 테스트 먼저 → 수정 → 통과
→ STEP 5: /cso 재스캔 → 추가 발견 0건