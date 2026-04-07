#!/bin/bash
# LLM Wiki — SessionStart hook
# 세션 시작 시 위키를 반드시 읽도록 강제한다.

# Set your Obsidian vault path here (or export WIKI_VAULT in your shell profile)
VAULT="${WIKI_VAULT:-$HOME/Library/Mobile Documents/com~apple~CloudDocs/obsidian/<YOUR_VAULT>/<YOUR_VAULT>}"

if [ ! -d "$VAULT" ]; then
  exit 0
fi

# Collect recent wiki files (modified in last 14 days) related to current project
PROJECT_NAME=$(basename "$(pwd)")
RECENT_FILES=$(find "$VAULT" -name "*.md" -mtime -14 -not -name "_*" 2>/dev/null | head -10)
PROJECT_FILES=$(find "$VAULT" -iname "*${PROJECT_NAME}*" -name "*.md" 2>/dev/null | head -5)
DECISION_FILES=$(find "$VAULT" -name "결정.md" -o -name "배운점.md" 2>/dev/null | head -5)

cat <<EOF
[LLM Wiki] MANDATORY — 작업 시작 전 위키를 반드시 읽으세요.

이것은 당신의 장기 기억입니다. 무시하면 과거에 이미 해결한 문제를 다시 삽질합니다.

Vault: $VAULT
스키마: $VAULT/_위키-스키마.md

## 반드시 수행할 것 (작업 시작 전):
1. _위키-스키마.md 를 Read 로 읽어서 vault 구조를 파악
2. 현재 작업과 관련된 키워드로 vault 를 Grep 검색
3. 발견된 관련 노트를 Read 로 읽고 내용을 작업에 반영

## 이번 프로젝트 관련 파일:
${PROJECT_FILES:-"(없음 — 키워드로 직접 검색 필요)"}

## 최근 수정된 노트:
${RECENT_FILES:-"(없음)"}

## 결정/배운점 파일:
${DECISION_FILES:-"(없음)"}

이 단계를 건너뛰고 바로 코드를 작성하면 안 됩니다.
EOF
