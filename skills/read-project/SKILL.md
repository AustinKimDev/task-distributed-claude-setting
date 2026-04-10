---
name: read-project
description: |
  wiki CLI의 summary 명령으로 vault에서 프로젝트 컨텍스트를 빠르게 로드한다.
  /open의 경량 하위 스킬. 단일 CLI 호출로 즉시 반환.
  Use when needing quick project context before starting work, without full session initialization.
---

# read-project — wiki CLI로 프로젝트 컨텍스트 빠르게 로드

`/open`의 경량 하위 스킬. wiki CLI `summary` 한 번으로 즉시 반환한다.

## Wiki CLI

```bash
WIKI_CLI="bun run ~/.claude/skills/wiki/cli/src/index.ts"
```

## open vs read-project

| | open | read-project |
|---|---|---|
| 프로젝트명 감지 | O | O |
| 스택 자동 탐지 | O | X |
| vault 개요 | O (wiki summary) | O (wiki summary) |
| 결정/배운점 개별 파일 | 최근 3개씩 | X (인덱스만) |
| 노하우 검색 | O (wiki semantic) | X |
| git 상태 | O | X |
| 워크트리 탐지 | O | X |
| wiki CLI 사용 | summary + semantic | summary 1회 |
| 용도 | 세션 시작 | 작업 중 빠른 참조 |

## 실행 절차

### 1. 프로젝트명 감지

```bash
basename "$(pwd)"
```

결과를 `$PROJECT`로 사용.

### 2. wiki summary 호출

```bash
$WIKI_CLI summary "$PROJECT"
```

- vault 경로 하드코딩 불필요 — wiki CLI가 내부적으로 처리한다.
- 이 한 번의 호출로 **개요 + 결정 인덱스 + 배운점 인덱스**를 모두 반환.
- 결과가 없으면 프로젝트 노트가 없는 것.

### 3. 여기서 멈춘다

**절대 하지 않는 것:**
- 개별 결정/배운점 파일 열기 (인덱스로 충분)
- git status, git log 실행
- package.json/Cargo.toml 등 스택 스캔
- 노하우/ 폴더 검색
- 워크트리 목록 조회

필요하면 사용자가 `/open`을 호출하거나 개별 파일을 직접 요청한다.

### 4. 출력 형식

wiki CLI 출력 데이터를 기반으로 다음 형식으로 표시:

```
프로젝트: $PROJECT
상태: [개요의 현재 상태]
스택: [개요의 기술 스택]

최근 결정: [결정 인덱스에서 마지막 3줄]
최근 배운점: [배운점 인덱스에서 마지막 3줄]

컨텍스트 로드 완료.
```

vault에 프로젝트 노트가 없으면:
```
프로젝트: $PROJECT — vault 노트 없음.
```
