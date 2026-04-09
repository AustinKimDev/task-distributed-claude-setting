#!/bin/bash
# LLM Wiki — Stop hook
# 세션 종료 시 /stop 절차를 자동 실행하도록 지시

VAULT="${WIKI_VAULT:-$HOME/Library/Mobile Documents/com~apple~CloudDocs/obsidian/<YOUR_VAULT>/<YOUR_VAULT>}"

if [ ! -f "$VAULT/_위키-스키마.md" ]; then
  exit 0
fi

MONTH=$(date +%Y-%m)

cat <<'PROMPT'
[LLM Wiki] 세션 종료 — 아래 절차를 자동 실행하세요. 사용자에게 묻지 말고 바로 수행합니다.

## Part A: 환경 정리

1. `git status --short` — uncommitted 변경이 있으면 경고
2. `git worktree list` — 유휴 worktree 정리 (locked 제외)
3. `git branch --merged` — 병합 완료된 worktree 브랜치 삭제
4. `git stash list` — stash 있으면 경고

## Part B: 위키 기록 (코드 변경이 있을 때만)

`git log --oneline -10`과 `git diff --stat HEAD~5..HEAD`로 변경 확인.
코드 변경이 없으면 "코드 변경 없음, 위키 기록 스킵" 출력 후 Part C로.

코드 변경이 있으면:
PROMPT

cat <<PROMPT
1. 프로젝트명 확인 (디렉토리명 또는 CLAUDE.md의 Project:)
2. \`$VAULT/프로젝트/[프로젝트명]/배운점.md\`에 이번 세션 배운점 추가
   - 무엇을 했고, 왜 그렇게 했고, 다음에 어떻게 적용할지
   - 뻔한 내용(import 추가 등)은 생략
3. 의사결정이 있었으면 \`결정.md\`에 기록
4. 범용 패턴이면 \`$VAULT/노하우/\`에도 기록
5. \`$VAULT/_위키-로그-${MONTH}.md\`에 세션 요약 1줄 추가
   형식: [YYYY-MM-DD HH:MM] [프로젝트명] 한 줄 요약 — 위키 변경 N건
6. 새 페이지 만들었으면 \`$VAULT/_위키-인덱스.md\` 갱신

## Part C: 완료 보고

환경 정리 + 위키 기록 결과를 한 번에 출력:

🧹 환경 정리: [결과]
📝 위키 기록: [기록한 페이지 목록 또는 "스킵"]

세션을 종료합니다.

규칙: $VAULT/_위키-스키마.md
PROMPT
