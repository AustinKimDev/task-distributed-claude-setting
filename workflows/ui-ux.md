# Workflow: UI/UX Improvement

Classification: **Standard**
Branch: `feat/[description]`

## Skill Hooks

| Step | Active Skills | Notes |
|---|---|---|
| STEP 1 | /critique + /audit (Impeccable) | Diagnose BEFORE fixing. UX review + technical inspection |
| STEP 2 | design-shotgun (gstack) | Generate variants → user picks direction |
| STEP 2 Design | /typeset, /arrange | Typography + layout system if needed |
| STEP 3 | /clarify (microcopy), /animate (motion) | During implementation |
| STEP 3 | /harden | a11y hardening during implementation, not after |
| STEP 4 | Build + test | — |
| STEP 5 | /audit (re-run), /critique (re-run) | Verify improvements against initial diagnosis |
| STEP 5 | /qa (gstack) | Browser test the visual changes |
| STEP 5 | /polish (ALWAYS LAST) | Final detail pass |

## Skipped Skills
- office-hours (visual improvement, not product direction)
- /cso (no security surface)
- /benchmark (unless performance is part of the improvement)

## Merge Report
Must include:
- Changed screens / components
- UX improvement points (what got better and why)
- a11y changes (WCAG compliance improvements)

## Example
"대시보드 UI가 AI슬롭 느낌이야, 개선해줘"
→ STEP 1: /critique → Inter 폰트, 보라 그라디언트, 카드 중첩 감지
          /audit → 터치타겟 32px, ARIA 누락 3건
→ STEP 2: design-shotgun → 3가지 시안 (미니멀/볼드/클래식)
→ STEP 3: /clarify (대시보드 레이블 개선) + /animate (차트 전환) + /harden (ARIA 추가)
→ STEP 5: /audit 재실행 (이슈 0건) → /polish (간격 미세 조정)