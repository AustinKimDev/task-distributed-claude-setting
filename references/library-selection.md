# Library & Tool Selection

Evaluate build vs adopt for every implementation task at STEP 2.
Do NOT default to building from scratch. Check existing solutions first.

## Evaluation flow

1. For each task: "Does a well-maintained library/package solve this?"
2. Check knowledge first → if unsure or need latest info, web search
   - npm/pip/nuget/cargo/pub trends, GitHub stars, last commit date
   - Bundle size, dependency count, license compatibility
3. Check project compatibility: existing stack, version conflicts, bundle impact
4. Present recommendation with alternatives

## Decision criteria

Use library when:
- Mature solution exists (>1k stars, active maintenance, recent commits)
- Saves >2 hours of implementation
- Handles edge cases you'd miss (dates, i18n, a11y, crypto)
- Well-tested (library's own test suite)

Build from scratch when:
- Core business logic (competitive advantage)
- Simple utility (<20 lines)
- No good library exists for the exact need
- Library would add excessive bundle size for minimal use

## Rules

⚠️ Adding a new dependency requires user approval in the STEP 2 proposal.
⚠️ Replacing an existing dependency is a Breaking Change — stop and ask separately.
