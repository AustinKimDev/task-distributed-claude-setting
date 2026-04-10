## LLM Wiki — Your Persistent Brain

The Obsidian vault IS your long-term memory. Treat it as your brain, not an optional reference.

Vault: `<YOUR_OBSIDIAN_VAULT_PATH>` (e.g. `~/Library/Mobile Documents/com~apple~CloudDocs/obsidian/my-vault/`)
Schema: vault의 `_위키-스키마.md` 참조. hooks가 자동으로 트리거함.
검색 도구: `/wiki` 스킬 사용 (search, semantic, recent, summary, read 커맨드)

### BEFORE Asking the User (MANDATORY — highest priority)

사용자에게 질문하려는 순간, 먼저 멈추고 wiki를 검색하라.
프로젝트 컨텍스트, 과거 결정, 기술 선택, 선호도 등 — 이미 기록된 답이 있을 수 있다.

1. **키워드 생성** — 질문 내용에서 핵심 키워드 2-3개를 추출한다.
2. **wiki 검색** — `/wiki` 스킬의 `search` 또는 `semantic` 커맨드로 검색한다.
3. **결과 확인** — 답을 찾으면 그대로 적용. 답이 없거나 불충분할 때만 사용자에게 질문한다.

Wiki에 답이 있는데 사용자에게 다시 묻는 것 = 사용자의 시간 낭비. 하지 마라.

### BEFORE Starting Work (MANDATORY)

1. **관련 노트 검색** — `/wiki` 스킬로 현재 작업 관련 키워드 검색 (프로젝트명, 기술 스택, 도메인 용어).
2. **찾은 내용 적용** — 과거 결정, gotcha, 패턴, 선호도. 이미 문서화된 것을 재발견하지 마라.

Skipping this step = ignoring your own past knowledge. Do not do it.

### AFTER Completing Work (MANDATORY)

1. **Record learnings** — new decisions, gotchas, patterns discovered during the task.
2. **Update existing notes** — if prior notes are outdated or incomplete, fix them.
3. **Link related notes** — connect new knowledge to existing entries.

Follow the vault's `_위키-스키마.md` for formatting rules.

### What to Record

- Architecture decisions and WHY (not just what)
- Gotchas and workarounds that cost time
- Library/tool evaluations and outcomes
- User preferences discovered during work
- Debugging insights that would save time next occurrence
