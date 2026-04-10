## Skill Routing

When the user's request matches a trigger below, invoke the skill as FIRST action.
Do NOT answer directly. Do NOT use other tools first.

| Trigger                       | Skill               | Purpose                                  |
| ----------------------------- | -------------------- | ---------------------------------------- |
| 새 아이디어, "만들 가치 있나" | office-hours        | Reframe + design doc                     |
| "전체 리뷰해줘"               | autoplan            | CEO→Design→Eng auto review               |
| 설계 검토, 아키텍처           | plan-eng-review     | Finalize architecture, edge cases        |
| 버그, 에러, "왜 안 돼"        | investigate         | Hypothesis-based root cause analysis     |
| "코드 리뷰해줘"               | /review             | Detect production bugs                   |
| "보안 점검"                   | /cso                | OWASP+STRIDE analysis                    |
| "디자인이 별로"               | /critique → /audit  | UX + technical diagnosis                 |
| "디자인 시스템 만들자"        | design-consultation | Research + build design system           |
| 디자인 시안 필요              | design-shotgun      | Multiple mockups → compare → pick        |
| 배포, PR, "배포해줘"          | /ship               | Sync main → test → PR                    |
| "프로덕션 반영"               | /land-and-deploy    | Merge PR → CI → health check             |
| "스테이징 테스트"             | /qa [url]           | Browser test → fix → re-verify           |
| 성능, "느려"                  | /benchmark          | Core Web Vitals baseline                 |
| "배포 후 모니터링"            | /canary             | Error/perf monitoring loop               |
| "문서 업데이트"               | /document-release   | Diff-based doc update                    |
| "이번 주 회고"                | /retro              | Deploy streak, test health               |
| "이거 기억해"                 | /learn              | Save session learnings                   |
| "조심해"                      | /guard              | Activate /careful + /freeze              |
| 아이디어 구조화 필요          | brainstorming       | Expose assumptions, explore alternatives |
| 태스크 분해 필요              | writing-plans       | Break into 2-5 min tasks                 |

### Always Active (auto-fires on every interaction)

- Writing code → test-driven-development
- Bug or error mentioned → systematic-debugging
- Claiming "done" → verification-before-completion
- UI/frontend context → Impeccable commands available
- Tech stack keyword → Fullstack Dev expert activates
- Marketing context → Marketing skills activate
