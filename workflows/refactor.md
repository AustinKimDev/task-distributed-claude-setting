# Workflow: Improvement / Refactor

Classification: **Standard**
Branch: `refactor/[description]`

## Skill Hooks

| Step | Active Skills | Notes |
|---|---|---|
| STEP 1 | spec-miner (Fullstack Dev) | Reverse-engineer current behavior first |
| STEP 2 | writing-plans | Confirm change scope with user before planning |
| STEP 3 | TDD (always) | Existing tests must keep passing throughout |
| STEP 4 | Build + test | All existing tests pass = primary completion criteria |
| STEP 5 | /review | Focus on behavioral equivalence |
| Post-merge | — | — |

## Skipped Skills
- office-hours, brainstorming (scope is already defined)
- Design skills (no UI change typically)
- /cso (no security surface change)

## Merge Report
Must explicitly state: "기능적 변화 없음. 내부 구조만 개선."

## Example
"인증 미들웨어를 리팩토링해줘"
→ STEP 1: spec-miner로 현재 동작 역추출 (어떤 라우트가 어떤 권한?)
→ STEP 2: 변경 범위 확인 ("미들웨어 파일만? 아니면 라우트 핸들러도?")
→ STEP 3: 기존 테스트 전부 통과 유지하며 구조 변경
→ STEP 5: /review (동작 동일성 확인)