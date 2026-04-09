---
name: open
version: 2.0.0
description: |
  세션 시작 시 장기기억(옵시디언 위키)에서 프로젝트 컨텍스트를 로드한다.
  프로젝트명을 디렉토리명→git remote→CLAUDE.md 순으로 자동 감지하고,
  프로젝트 파일(package.json, Cargo.toml 등)에서 기술 스택을 자동 탐지한다.
  최근 3개 결정 + 3개 배운점 + 관련 노하우를 로드하고, git 상태를 요약한다.
  Use when: "open", "시작", "컨텍스트 로드", "이전 작업", "어디까지 했지", 세션 시작 시
allowed-tools:
  - Bash
  - Read
  - Glob
  - Grep
---

# /open — 세션 시작: 장기기억 로드 + 컨텍스트 복원

세션 시작 시 옵시디언 vault에서 현재 프로젝트의 컨텍스트를 로드하고,
이전 세션에서 중단된 작업이 있으면 상태를 복원한다.

## Step 1: 프로젝트명 감지 (우선순위 순)

다음 순서로 프로젝트명을 결정한다. 성공하면 즉시 사용.

```bash
# 1순위: 현재 디렉토리명
basename "$(pwd)"
```

```bash
# 2순위: git remote origin에서 레포 이름 추출
git remote get-url origin 2>/dev/null | sed 's/.*[:/]\([^/]*\)\.git$/\1/' | sed 's/.*[:/]\([^/]*\)$/\1/'
```

```bash
# 3순위: CLAUDE.md의 "Project:" 라인 (플레이스홀더 [name] 제외)
grep -m1 "^- Project:" CLAUDE.md 2>/dev/null | sed 's/- Project: *//' | grep -v '^\[name\]$'
```

감지된 프로젝트명을 `$PROJECT`로 사용.

## Step 2: 기술 스택 자동 탐지

프로젝트 파일을 스캔하여 기술 스택 키워드를 동적으로 추출한다.

```bash
# package.json — 주요 dependencies 추출
if [ -f package.json ]; then
  python3 -c "
import json
p = json.load(open('package.json'))
deps = {**p.get('dependencies',{}), **p.get('devDependencies',{})}
keys = [k.split('/')[-1] for k in deps]
print(' '.join(keys[:20]))
" 2>/dev/null
fi

# requirements.txt — Python 패키지 추출
[ -f requirements.txt ] && grep -v '^#' requirements.txt | sed 's/[>=<!].*//' | tr '\n' ' ' | head -c 200

# pyproject.toml — Python 패키지 추출
[ -f pyproject.toml ] && grep -E '^\s+"[a-zA-Z]' pyproject.toml | sed 's/.*"\([a-zA-Z][^"]*\)".*/\1/' | tr '\n' ' ' | head -c 200

# Cargo.toml — Rust 크레이트 추출
[ -f Cargo.toml ] && grep -A100 '^\[dependencies\]' Cargo.toml | grep -E '^[a-zA-Z]' | sed 's/ *=.*//' | tr '\n' ' ' | head -c 200

# .sln / .csproj — .NET 프로젝트 감지
ls *.sln *.csproj 2>/dev/null | head -3
```

추출한 키워드를 `$STACK_KEYWORDS`로 사용 (vault 검색에 활용).

## Step 3: Vault 로드

```bash
# wiki.env에서 vault 경로 로드
source ~/.claude/wiki.env 2>/dev/null
VAULT="$CLAUDE_WIKI_VAULT"

if [ -z "$VAULT" ]; then
  echo "⚠️ CLAUDE_WIKI_VAULT가 설정되지 않았습니다. setup/install.sh를 실행하세요."
  # vault 없이 git 상태만 표시하고 계속 진행
fi
```

### 3a. 프로젝트 노트 존재 확인

```bash
ls "$VAULT/프로젝트/$PROJECT/" 2>/dev/null
```

- 있으면 → Step 3b, 3c로
- 없으면 → "이 프로젝트의 위키 노트가 없습니다. 작업 후 /stop에서 자동 생성됩니다." 출력 후 Step 4로

### 3b. 결정 기록 로드 (최근 3개)

```bash
ls -t "$VAULT/프로젝트/$PROJECT/결정/" 2>/dev/null | head -3
```

- `결정/` 폴더에서 최근 수정 3개 파일만 읽기
- 각 결정의 **제목 + 결정 + 이유**만 요약
- 폴더가 없으면 `결정.md` 인덱스에서 마지막 3개 링크의 파일을 읽기

### 3c. 배운점 로드 (최근 3개)

```bash
ls -t "$VAULT/프로젝트/$PROJECT/배운점/" 2>/dev/null | head -3
```

- `배운점/` 폴더에서 최근 수정 3개 파일만 읽기
- 각 항목의 **제목 + 배운 점**만 요약
- 폴더가 없으면 `배운점.md` 인덱스에서 마지막 3개 링크의 파일을 읽기

### 3d. 관련 노하우 검색 (탐지된 스택 키워드 활용)

```bash
# 탐지된 스택 키워드로 vault 노하우 검색 (하드코딩 없음)
KEYWORDS=$(echo "$STACK_KEYWORDS" | tr ' ' '|' | head -c 100)
grep -rl "$KEYWORDS" "$VAULT/노하우/" 2>/dev/null | head -5
```

- 발견된 노하우 파일의 제목만 나열 (본문은 필요시 참조)
- 키워드가 없으면 프로젝트명으로만 검색

## Step 4: Git 상태 요약

```bash
git branch --show-current
git log --oneline -3
git status --short
git worktree list
git stash list 2>/dev/null | head -3
```

## Step 5: 미완료 작업 탐지

```bash
git worktree list | grep -v "$(pwd)" | grep -v "bare"
```

- 활성 워크트리가 있으면: "이전 세션의 워크트리가 남아있습니다: [브랜치명]. 이어서 작업할까요?"
- 없으면: "클린 상태입니다."

## Step 6: 컨텍스트 요약 출력

```
프로젝트: $PROJECT
브랜치: [현재 브랜치]
최근 커밋: [최근 1줄]
감지된 스택: [탐지된 주요 기술 3-5개]

최근 결정 (3개):
- [결정 1 제목]
- [결정 2 제목]
- [결정 3 제목]

최근 배운점 (3개):
- [배운점 1 제목]
- [배운점 2 제목]
- [배운점 3 제목]

관련 노하우: [N개 발견 / 없음]

주의사항: [uncommitted 변경/stash/워크트리 등 — 없으면 생략]

컨텍스트 로드 완료. 무엇을 할까요?
```
