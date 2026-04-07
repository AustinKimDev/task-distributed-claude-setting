# Workflow: New Project Setup

Classification: **Critical**
Branch: `feat/initial-setup`

## Skill Hooks

| Step | Active Skills | Notes |
|---|---|---|
| STEP 1 | office-hours, brainstorming | Full discovery — reframe the entire product |
| STEP 2A | autoplan (CEO→Design→Eng) | All 3 reviews mandatory for new project |
| STEP 2B | writing-plans | Break into phases, not one giant PR |
| STEP 2 Design | /teach-impeccable → design-consultation → design-shotgun → design-html, /typeset, /arrange | Full design system from scratch. /teach-impeccable runs once only |
| STEP 3 | TDD, executing-plans | Phase-by-phase implementation |
| STEP 4 | Build + test | — |
| STEP 5 | /review, /cso, /audit, /critique, /harden, /polish | Full review + full UI quality pass |
| Post-merge | /document-release, /learn | Document initial architecture decisions |

## Notes
- /teach-impeccable runs once per project. Skip if .impeccable.md exists.
- autoplan runs plan-ceo-review + plan-design-review + plan-eng-review in sequence.
- Consider splitting into multiple PRs by phase (auth, core features, UI).