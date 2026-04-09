---
name: read-project
description: Use when needing quick project context from the LLM wiki vault before starting work, without full session initialization. Lighter alternative to /open when git state and stack detection are unnecessary.
---

# read-project — vault에서 프로젝트 컨텍스트만 빠르게 로드

`/open`의 경량 하위 스킬. vault 힌트 파일만 읽고 즉시 반환한다.

## open vs read-project

| | open | read-project |
|---|---|---|
| 프로젝트명 감지 | O | O |
| 스택 자동 탐지 | O | X |
| vault 개요 | O | O |
| 결정/배운점 개별 파일 | 최근 3개씩 | X (인덱스만) |
| 노하우 검색 | O | X |
| git 상태 | O | X |
| 워크트리 탐지 | O | X |
| 용도 | 세션 시작 | 작업 중 빠른 참조 |

## 실행 절차

### 1. 프로젝트명 감지

```bash
basename "$(pwd)"
```

결과를 `$PROJECT`로 사용.

### 2. vault 힌트 파일 3개만 읽기

```bash
# wiki.env에서 vault 경로 로드
source ~/.claude/wiki.env 2>/dev/null
VAULT="$CLAUDE_WIKI_VAULT"

if [ -z "$VAULT" ]; then
  echo "프로젝트: $PROJECT — vault 경로 미설정. setup/install.sh를 실행하세요."
  # 여기서 종료
fi
```

**병렬로 읽기** (3개 동시):
1. `$VAULT/프로젝트/$PROJECT/개요.md` — 프로젝트 요약
2. `$VAULT/프로젝트/$PROJECT/결정.md` — 결정 인덱스 (링크+한줄 요약)
3. `$VAULT/프로젝트/$PROJECT/배운점.md` — 배운점 인덱스 (링크+한줄 요약)

파일이 없으면 조용히 건너뛴다.

### 3. 여기서 멈춘다

**절대 하지 않는 것:**
- 개별 결정/배운점 파일 열기 (인덱스로 충분)
- git status, git log 실행
- package.json/Cargo.toml 등 스택 스캔
- 노하우/ 폴더 검색
- 워크트리 목록 조회

필요하면 사용자가 `/open`을 호출하거나 개별 파일을 직접 요청한다.

### 4. 출력 형식

```
프로젝트: $PROJECT
상태: [개요.md의 현재 상태]
스택: [개요.md의 기술 스택]

최근 결정: [인덱스에서 마지막 3줄]
최근 배운점: [인덱스에서 마지막 3줄]

컨텍스트 로드 완료.
```

vault에 프로젝트 노트가 없으면:
```
프로젝트: $PROJECT — vault 노트 없음.
```
