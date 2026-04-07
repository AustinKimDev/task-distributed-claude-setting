# Workflow: New Feature

Classification: **Standard**
Branch: `feat/[name]`

## Skill Hooks

| Step | Active Skills | Notes |
|---|---|---|
| STEP 1 | office-hours (if scope unclear), brainstorming (if vague) | Skip if requirements are already concrete |
| STEP 2 | plan-eng-review, writing-plans | Architecture + task decomposition |
| STEP 2 Design | design-shotgun → design-html, /typeset, /arrange | Only if UI involved |
| STEP 3 | TDD (always), /clarify + /animate (if UI) | TDD auto-fires for all logic |
| STEP 4 | Build + test | — |
| STEP 5 | /review, /cso (if auth/input), /audit + /critique + /harden + /polish (if UI) | /polish always last |
| Post-merge | /document-release (if behavior changed), /learn | — |

## Example
"사용자 프로필에 팔로우 기능 추가해줘"
→ STEP 1: office-hours로 재프레이밍 (팔로우? 구독? 알림?)
→ STEP 2: plan-eng-review (DB 관계, API 설계) + writing-plans (5개 태스크)
→ STEP 3: TDD (팔로우/언팔로우 테스트 먼저) + /clarify (버튼 레이블)
→ STEP 5: /review + /audit (팔로우 버튼 터치타겟)