---
name: stop
version: 2.1.0
description: |
  세션 종료 전 환경 정리 + 위키 기록을 수행한다.
  워크트리/브랜치 잔재 정리, uncommitted 변경 경고, 태스크 정리,
  git stash 경고 후 옵시디언 vault에 배운점/결정/노하우를 기록한다.
  Use when: "stop", "끝", "마무리", "정리", "세션 종료", "여기까지"
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# /stop — 세션 종료: 환경 정리 + 위키 기록

세션을 마무리하면서 환경 잔재를 정리하고, 작업 내용을 옵시디언 위키에 기록한다.

## Part A: 환경 정리 (항상 실행)

위키 기록보다 먼저 실행. 코드 변경이 없어도 실행한다.

### A1. Uncommitted 변경 경고

```bash
git status --short
```

- 변경/추가 파일이 있으면 **경고 출력**: `⚠️ 커밋되지 않은 변경이 있습니다: [파일 목록]. 커밋하시겠습니까?`
- 유저 응답 대기. 커밋 원하면 커밋, 아니면 경고만 남기고 계속 진행.

### A2. Worktree 정리

```bash
git worktree list
```

- 메인 worktree(프로젝트 루트) 외에 다른 worktree가 있으면:
  1. **lock 파일로 사용 중 여부 확인**:
     ```bash
     for wt in .git/worktrees/*/; do
       name=$(basename "$wt")
       if [ -f "$wt/locked" ]; then
         echo "🔒 $name — 사용 중 (skip)"
       else
         echo "🗑️ $name — 유휴 (삭제 가능)"
       fi
     done
     ```
  2. **locked가 없는 유휴 worktree만 자동 삭제**
  3. **locked인 worktree는 절대 건드리지 않음** — 다른 에이전트가 사용 중
  4. locked worktree가 있으면 보고: `🔒 worktree N개 사용 중 (유지): [목록]`
  ```bash
  git worktree remove <path> --force  # locked가 없는 것만
  ```
- 마지막에 prune:
  ```bash
  git worktree prune
  ```
- 결과 보고: `🧹 worktree N개 정리 완료` 또는 `✓ 정리할 worktree 없음`

### A3. 병합 완료 브랜치 정리

```bash
git branch --merged
```

- `worktree-*` 패턴의 이미 병합된 브랜치를 삭제:
  ```bash
  git branch -d <branch>
  ```
- main, master, 현재 브랜치는 절대 삭제하지 않음
- 결과 보고: `🧹 병합 완료 브랜치 N개 정리` 또는 `✓ 정리할 브랜치 없음`

### A4. Task list 정리

- 완료된(completed) 태스크나 stale 태스크가 남아있으면 정리
- TaskList로 확인 후 완료된 것은 그대로 두되, 보고에 포함:
  `📋 태스크 현황: N개 완료, M개 미완료`

### A5. Git stash 경고

```bash
git stash list
```

- stash가 있으면 경고: `⚠️ git stash N개 남아있음 — 필요 없으면 git stash drop으로 정리하세요`

---

## Part B: 위키 기록 (코드 변경이 있을 때만)

### B1. 세션 변경 사항 파악

```bash
git log --oneline -10
git diff --stat HEAD~5..HEAD 2>/dev/null || git diff --stat
```

코드 변경이 없었으면 (읽기/질문만) → **"코드 변경 없음, 위키 기록 스킵"** 출력 후 Part C로.

### B2. Vault 경로 및 스키마 확인

```bash
# wiki.env에서 vault 경로 로드
source ~/.claude/wiki.env 2>/dev/null
VAULT="$CLAUDE_WIKI_VAULT"

if [ -z "$VAULT" ]; then
  echo "⚠️ CLAUDE_WIKI_VAULT가 설정되지 않았습니다. 위키 기록을 건너뜁니다."
  # Part C로 바로 이동
fi
```

- `$VAULT/_위키-스키마.md` 의 자동 저장 규칙을 따른다
- 현재 프로젝트에 해당하는 `$VAULT/프로젝트/[프로젝트명]/` 폴더가 있는지 확인
- 없으면 스키마 §7에 따라 프로젝트 페이지 구조 생성

### B3. 배운점 기록

해당 프로젝트의 `배운점/` 폴더에 **개별 파일** 생성:

**파일 경로**: `$VAULT/프로젝트/[프로젝트명]/배운점/YYYY-MM-DD-슬러그.md`
- 슬러그: 한글 가능, 공백은 하이픈, 핵심 키워드 2-4개
- 같은 날짜에 여러 건이면 슬러그로 구분

```markdown
---
type: learning
tags: [프로젝트명, 관련 키워드]
created: YYYY-MM-DD
project: 프로젝트명
---

# [한 줄 제목]

**상황**: [무엇을 하다가]

**배운 점**: [핵심 인사이트. 다음에 같은 상황에서 어떻게 해야 하는지]

**적용**: [어디에 적용할 수 있는지]
```

그 다음 `배운점.md` **인덱스에 한 줄 추가** (맨 아래):

```markdown
- [[배운점/YYYY-MM-DD-슬러그]] — 한 줄 요약
```

⚠️ 폴더가 없으면 `mkdir -p`로 생성.

기록 기준:
- **이번 세션에서 코드를 왜 그렇게 수정했는지** — 동기와 판단 근거
- **예상과 달랐던 것** — 삽질, 의외의 원인, 놓쳤던 포인트
- **다음에 재사용할 패턴** — 보안, 아키텍처, 디버깅 기법
- 뻔한 내용은 생략. "import 추가함" 같은 건 기록하지 않음

### B4. 범용 노하우 분리 (해당 시)

배운 점 중 **이 프로젝트에 한정되지 않는 범용 패턴**이 있으면:
- `$VAULT/노하우/개발/[토픽명].md` 에 별도 파일 생성
- 프론트매터 포함 (스키마 §2)
- 프로젝트 배운점에서 `[[노하우/개발/토픽명]]` 링크 추가
- `$VAULT/_위키-인덱스.md` 갱신

### B5. 결정 기록 (해당 시)

기술 선택, 아키텍처 변경, 접근법 결정이 있었으면:
- `$VAULT/프로젝트/[프로젝트명]/결정/` 폴더에 **개별 파일** 생성

**파일 경로**: `$VAULT/프로젝트/[프로젝트명]/결정/YYYY-MM-DD-슬러그.md`

```markdown
---
type: decision
tags: [프로젝트명, 관련 키워드]
created: YYYY-MM-DD
project: 프로젝트명
---

# [결정 제목]

**맥락**: [왜 결정이 필요했는지]

**결정**: [무엇을 선택했는지]

**이유**: [왜 그렇게 선택했는지]

**대안**: [고려했지만 선택하지 않은 것]
```

그 다음 `결정.md` **인덱스에 한 줄 추가** (맨 아래):

```markdown
- [[결정/YYYY-MM-DD-슬러그]] — 한 줄 요약
```

⚠️ 폴더가 없으면 `mkdir -p`로 생성.

### B6. 위키 로그 업데이트

`$VAULT/_위키-로그-YYYY-MM.md` 에 세션 요약 1줄 추가:

```
[YYYY-MM-DD HH:MM] [프로젝트명] 한 줄 세션 요약 — 위키 변경 N건
```

한 세션 = 한 줄. 액션별 기록이 아닌 세션 단위로 기록한다.
파일이 없으면 생성.

### B7. 인덱스 갱신 (새 페이지가 있을 때만)

새 파일을 만들었으면 `$VAULT/_위키-인덱스.md` 에 항목 추가.

---

## Part C: 완료 보고

환경 정리 결과 + 위키 기록 결과를 한 번에 보고:

```
🧹 환경 정리:
- worktree: N개 정리 (또는 ✓ 없음)
- 브랜치: N개 정리 (또는 ✓ 없음)
- uncommitted: ✓ 없음 (또는 ⚠️ N개 파일)
- stash: ✓ 없음 (또는 ⚠️ N개)
- 태스크: N개 완료, M개 미완료

📝 위키 기록:
- [페이지명] — [한 줄 요약]
- [페이지명] — [한 줄 요약]
(또는: 코드 변경 없음, 위키 기록 스킵)

세션을 종료합니다.
```
