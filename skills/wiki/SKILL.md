---
name: wiki
description: |
  Obsidian vault에서 프로젝트 지식을 검색하고 조회하는 스킬.
  키워드 검색, 시맨틱 검색, 최근 기록, 프로젝트 요약을 제공한다.
  Use when: "위키", "기록 찾아", "전에 뭐했지", "배운점", "결정", "노하우", "wiki"
allowed-tools:
  - Bash
  - Read
---

# /wiki — Obsidian Wiki 검색

사용자의 요청에 따라 적절한 wiki CLI 커맨드를 실행한다.

## CLI 경로

```bash
bun run ~/.claude/skills/wiki/cli/src/index.ts <command> [args]
```

## 사용법

### 키워드 검색

사용자가 특정 키워드로 검색하고 싶을 때:

```bash
bun run ~/.claude/skills/wiki/cli/src/index.ts search "<검색어>"
bun run ~/.claude/skills/wiki/cli/src/index.ts search "<검색어>" --project <프로젝트명>
bun run ~/.claude/skills/wiki/cli/src/index.ts search "<검색어>" --type learning
```

### 시맨틱 검색

사용자가 자연어로 관련 노트를 찾고 싶을 때:

```bash
bun run ~/.claude/skills/wiki/cli/src/index.ts semantic "<자연어 쿼리>"
bun run ~/.claude/skills/wiki/cli/src/index.ts semantic "<쿼리>" --top 3 --project <프로젝트명>
```

### 최근 기록

사용자가 최근 작성한 노트를 보고 싶을 때:

```bash
bun run ~/.claude/skills/wiki/cli/src/index.ts recent
bun run ~/.claude/skills/wiki/cli/src/index.ts recent --project <프로젝트명> --days 7
```

### 프로젝트 요약

사용자가 특정 프로젝트 컨텍스트를 빠르게 파악하고 싶을 때:

```bash
bun run ~/.claude/skills/wiki/cli/src/index.ts summary <프로젝트명>
bun run ~/.claude/skills/wiki/cli/src/index.ts summary --all
```

### 인덱스 갱신

사용자가 검색 인덱스를 갱신하고 싶을 때:

```bash
bun run ~/.claude/skills/wiki/cli/src/index.ts reindex
bun run ~/.claude/skills/wiki/cli/src/index.ts reindex --embeddings-only
```

### 노트 읽기

특정 노트의 전체 내용이 필요할 때:

```bash
bun run ~/.claude/skills/wiki/cli/src/index.ts read "프로젝트/baegopax/배운점/2025-03-15-slug.md"
```

## 인자 없이 호출 시

사용자가 `/wiki`만 입력하면:
"무엇을 찾으시나요? 키워드, 자연어 질문, 또는 프로젝트명을 알려주세요." 라고 물어본 뒤 적절한 커맨드로 라우팅한다.

## 라우팅 가이드

| 사용자 의도 | 커맨드 |
|------------|--------|
| 정확한 키워드로 찾기 | `search` |
| "~관련 뭐 있었지" 식 질문 | `semantic` |
| "최근에 뭐 기록했지" | `recent` |
| "이 프로젝트 상태가 뭐지" | `summary` |
| 특정 노트 전문 보기 | `read` |
