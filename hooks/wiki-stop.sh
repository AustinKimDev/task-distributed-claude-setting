#!/bin/bash
# LLM Wiki — Stop hook
# 세션 종료 시 위키 기록을 강제한다.

# Set your Obsidian vault path here (or export WIKI_VAULT in your shell profile)
VAULT="${WIKI_VAULT:-$HOME/Library/Mobile Documents/com~apple~CloudDocs/obsidian/<YOUR_VAULT>/<YOUR_VAULT>}"

if [ ! -f "$VAULT/_위키-스키마.md" ]; then
  exit 0
fi

MONTH=$(date +%Y-%m)

cat <<PROMPT
[LLM Wiki] 세션 종료 — 위키 업데이트 필수 체크:

이번 세션에서 코드 변경(Edit/Write/Bash로 파일 수정)이 있었다면 아래를 반드시 수행:

1. 해당 프로젝트 배운점.md에 이번 세션에서 배운 것 추가
   - 무엇을 했고, 왜 그렇게 했고, 다음에 어떻게 적용할지
   - 디버깅/보안/리팩토링/새기능 모두 해당
2. 범용 패턴이면 노하우/개발/ 또는 노하우/도구/에도 기록
3. 의사결정이 있었으면 결정.md에 기록
4. $VAULT/_위키-로그-${MONTH}.md 에 세션 요약 한 줄 추가
5. 새 페이지를 만들었다면 $VAULT/_위키-인덱스.md 갱신

코드 변경이 없었던 세션(읽기/질문만)이면 무시.
규칙: $VAULT/_위키-스키마.md
PROMPT
